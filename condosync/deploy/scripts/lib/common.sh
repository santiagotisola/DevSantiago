#!/usr/bin/env bash
# =============================================================================
# common.sh — utilitarios compartilhados pelos scripts de deploy
# =============================================================================
# Variaveis padrao + funcoes de log/lock/healthcheck/state.
# NAO executavel diretamente. Source via: source "$(dirname "$0")/lib/common.sh"
# =============================================================================
set -Eeuo pipefail

# Resolve paths absolutos a partir da localizacao do script chamador
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[1]}")" && pwd)"
DEPLOY_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_DIR="$DEPLOY_ROOT/compose"
CADDY_DIR="$DEPLOY_ROOT/caddy"
SNIPPETS_DIR="$CADDY_DIR/snippets"
STATE_DIR="$DEPLOY_ROOT/state"
BACKUP_DIR="$DEPLOY_ROOT/backups"
LOCK_FILE="$STATE_DIR/.deploy.lock"
ENV_FILE="${ENV_FILE:-$DEPLOY_ROOT/../.env.production}"

mkdir -p "$STATE_DIR" "$BACKUP_DIR/postgres" "$BACKUP_DIR/volumes"

# ─── Logging ────────────────────────────────────────────────────────────────
_ts() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
log()  { printf "\033[36m[%s]\033[0m %s\n" "$(_ts)" "$*" >&2; }
ok()   { printf "\033[32m[%s] OK   %s\033[0m\n" "$(_ts)" "$*" >&2; }
warn() { printf "\033[33m[%s] WARN %s\033[0m\n" "$(_ts)" "$*" >&2; }
err()  { printf "\033[31m[%s] ERR  %s\033[0m\n" "$(_ts)" "$*" >&2; }
die()  { err "$*"; exit 1; }

# ─── Lock global de deploy ──────────────────────────────────────────────────
acquire_lock() {
    if [[ -e "$LOCK_FILE" ]]; then
        local pid
        pid=$(cat "$LOCK_FILE" 2>/dev/null || echo "?")
        if kill -0 "$pid" 2>/dev/null; then
            die "Deploy ja em andamento (pid=$pid). Aborte com: rm $LOCK_FILE (apenas se certo)."
        fi
        warn "Lock orfao detectado — limpando."
        rm -f "$LOCK_FILE"
    fi
    echo "$$" > "$LOCK_FILE"
    trap 'rm -f "$LOCK_FILE"' EXIT INT TERM
}

# ─── Env ────────────────────────────────────────────────────────────────────
load_env() {
    [[ -f "$ENV_FILE" ]] || die ".env.production nao encontrado em $ENV_FILE"
    # shellcheck disable=SC1090
    set -a; source "$ENV_FILE"; set +a
    : "${POSTGRES_USER:?POSTGRES_USER ausente em .env.production}"
    : "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD ausente}"
    : "${POSTGRES_DB:?POSTGRES_DB ausente}"
    : "${REDIS_PASSWORD:?REDIS_PASSWORD ausente}"
    : "${JWT_SECRET:?JWT_SECRET ausente}"
    : "${JWT_REFRESH_SECRET:?JWT_REFRESH_SECRET ausente}"
    : "${APP_ENCRYPTION_KEY:?APP_ENCRYPTION_KEY ausente}"
    : "${DOMAIN:?DOMAIN ausente}"
    : "${ACME_EMAIL:?ACME_EMAIL ausente}"
    : "${IMAGE_REGISTRY:?IMAGE_REGISTRY ausente}"
    [[ "$JWT_SECRET" != "$JWT_REFRESH_SECRET" ]] || die "JWT_SECRET == JWT_REFRESH_SECRET (proibido)"
}

# ─── State (active color) ───────────────────────────────────────────────────
ACTIVE_FILE="$STATE_DIR/active_color"
PREV_FILE="$STATE_DIR/previous_color"
META_FILE="$STATE_DIR/last_deploy.json"

read_active_color() {
    if [[ -f "$ACTIVE_FILE" ]]; then
        cat "$ACTIVE_FILE"
    else
        echo "blue"
    fi
}
read_idle_color() {
    local active; active=$(read_active_color)
    [[ "$active" == "blue" ]] && echo "green" || echo "blue"
}
write_active_color() {
    local prev; prev=$(read_active_color)
    echo "$prev" > "$PREV_FILE"
    echo "$1"   > "$ACTIVE_FILE"
}

write_meta() {
    local color="$1" tag="$2" git_sha="$3"
    cat > "$META_FILE" <<EOF
{
  "color": "$color",
  "image_tag": "$tag",
  "git_sha": "$git_sha",
  "deployed_at": "$(_ts)",
  "deployer": "${SUDO_USER:-${USER:-root}}"
}
EOF
}

# ─── Compose helpers ────────────────────────────────────────────────────────
COMPOSE="docker compose --env-file $ENV_FILE"
SHARED_FILE="$COMPOSE_DIR/docker-compose.shared.yml"
compose_blue()   { $COMPOSE -f "$COMPOSE_DIR/docker-compose.blue.yml"  "$@"; }
compose_green()  { $COMPOSE -f "$COMPOSE_DIR/docker-compose.green.yml" "$@"; }
compose_shared() { $COMPOSE -f "$SHARED_FILE" "$@"; }

compose_color() {
    local color="$1"; shift
    if [[ "$color" == "blue" ]]; then compose_blue "$@"; else compose_green "$@"; fi
}

# ─── Healthcheck ────────────────────────────────────────────────────────────
# Aguarda container ficar healthy via docker inspect.
# Args: container_name max_wait_seconds
wait_healthy() {
    local name="$1" max="${2:-120}"
    local start=$SECONDS
    log "Aguardando $name ficar healthy (timeout ${max}s)..."
    while (( SECONDS - start < max )); do
        local status
        status=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$name" 2>/dev/null || echo "missing")
        case "$status" in
            healthy) ok "$name healthy ($((SECONDS-start))s)"; return 0 ;;
            unhealthy) err "$name unhealthy"; docker logs --tail 100 "$name" >&2 || true; return 1 ;;
            none|missing|"") sleep 2 ;;
            *) sleep 2 ;;
        esac
    done
    err "$name nao ficou healthy em ${max}s"
    docker logs --tail 100 "$name" >&2 || true
    return 1
}

# Smoke HTTP interno: bate em /health do container via rede docker
smoke_internal() {
    local container="$1" path="${2:-/health}" port="${3:-3333}"
    docker exec "$container" wget -qO- --timeout=5 "http://localhost:${port}${path}" >/dev/null 2>&1
}

# Smoke HTTP externo: bate via Caddy (rota publica)
smoke_external() {
    local url="${1:?url}"
    curl -fsS --max-time 10 "$url" >/dev/null
}

# ─── Caddy snippet switch ───────────────────────────────────────────────────
# Reescreve snippets atomicamente e aciona reload (sem dropar conexoes).
switch_caddy_to() {
    local color="$1"
    log "Reescrevendo snippets do Caddy para color=$color"

    cat > "$SNIPPETS_DIR/active-api.caddy" <<EOF
# Cor ativa da API. Atualizado em $(_ts) -> $color
reverse_proxy condosync-api-${color}:3333 {
    health_uri      /health
    health_interval 5s
    health_timeout  3s
    fail_duration   10s
    max_fails       3
    transport http {
        keepalive 30s
        keepalive_idle_conns 100
    }
    header_up X-Real-IP {remote_host}
    header_up X-Forwarded-For {remote_host}
    header_up X-Forwarded-Proto {scheme}
}
EOF

    cat > "$SNIPPETS_DIR/active-web.caddy" <<EOF
# Cor ativa do frontend. Atualizado em $(_ts) -> $color
reverse_proxy condosync-web-${color}:80 {
    health_uri      /
    health_interval 10s
    health_timeout  3s
    fail_duration   15s
    max_fails       3
}
EOF

    log "Validando Caddyfile..."
    docker exec condosync-caddy caddy validate --config /etc/caddy/Caddyfile \
        || die "Caddy validate falhou — snippet invalido (rollback dos arquivos antes de prosseguir)"

    log "Recarregando Caddy (reload atomico)..."
    docker exec condosync-caddy caddy reload --config /etc/caddy/Caddyfile \
        || die "Caddy reload falhou"
    ok "Caddy roteando para $color"
}

# ─── Git / image helpers ────────────────────────────────────────────────────
git_short_sha() { git -C "$DEPLOY_ROOT/.." rev-parse --short HEAD 2>/dev/null || echo "unknown"; }

confirm() {
    local msg="${1:-Confirma?}"
    if [[ "${ASSUME_YES:-0}" == "1" ]]; then
        log "$msg [auto-yes]"; return 0
    fi
    read -r -p "$msg [yes/NO]: " ans
    [[ "$ans" == "yes" ]]
}
