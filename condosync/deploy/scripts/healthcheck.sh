#!/usr/bin/env bash
# =============================================================================
# healthcheck.sh — verifica saude da stack inteira
# =============================================================================
# Uso:
#   bash deploy/scripts/healthcheck.sh                # cor ativa
#   bash deploy/scripts/healthcheck.sh blue|green     # cor especifica
#   bash deploy/scripts/healthcheck.sh --external     # so smoke externo via Caddy
# =============================================================================
set -Eeuo pipefail
source "$(dirname "$0")/lib/common.sh"

EXTERNAL_ONLY=0
TARGET=""
while [[ $# -gt 0 ]]; do
    case "$1" in
        --external) EXTERNAL_ONLY=1; shift ;;
        blue|green) TARGET="$1"; shift ;;
        *) die "Argumento desconhecido: $1" ;;
    esac
done

load_env
TARGET="${TARGET:-$(read_active_color)}"
FAILED=0

if (( EXTERNAL_ONLY == 0 )); then
    log "── Stack compartilhada ──────────────────────────────────"
    for c in condosync-postgres condosync-redis condosync-caddy; do
        if docker ps --format '{{.Names}}' | grep -q "^${c}$"; then
            status=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$c")
            case "$status" in
                healthy) ok "$c healthy" ;;
                none)    warn "$c sem healthcheck declarado" ;;
                *)       err "$c status=$status"; FAILED=1 ;;
            esac
        else
            err "$c NAO esta rodando"; FAILED=1
        fi
    done

    log "── Stack $TARGET ────────────────────────────────────────"
    for c in "condosync-api-${TARGET}" "condosync-worker-${TARGET}" "condosync-web-${TARGET}"; do
        if docker ps --format '{{.Names}}' | grep -q "^${c}$"; then
            status=$(docker inspect -f '{{.State.Health.Status}}' "$c" 2>/dev/null || echo "none")
            [[ "$status" == "healthy" ]] && ok "$c healthy" || { err "$c status=$status"; FAILED=1; }
        else
            err "$c NAO esta rodando"; FAILED=1
        fi
    done

    log "── Smoke interno ────────────────────────────────────────"
    smoke_internal "condosync-api-${TARGET}" /health 3333 \
        && ok "API /health interno"  || { err "API /health interno falhou"; FAILED=1; }

    log "── Postgres connectivity ────────────────────────────────"
    docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" condosync-postgres \
        psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "SELECT 1" >/dev/null \
        && ok "Postgres SELECT 1" || { err "Postgres SELECT 1 falhou"; FAILED=1; }

    log "── Redis connectivity ───────────────────────────────────"
    docker exec condosync-redis redis-cli -a "$REDIS_PASSWORD" --no-auth-warning ping \
        | grep -q PONG \
        && ok "Redis PONG" || { err "Redis PING falhou"; FAILED=1; }
fi

log "── Smoke externo via Caddy ──────────────────────────────"
if smoke_external "https://${DOMAIN}/__edge_health"; then
    ok "Edge health OK"
else
    err "Edge health falhou em https://${DOMAIN}/__edge_health"; FAILED=1
fi
if smoke_external "https://${DOMAIN}/api/v1/health"; then
    ok "API publica OK"
else
    err "API publica falhou"; FAILED=1
fi

if (( FAILED == 0 )); then
    ok "Healthcheck completo: stack saudavel (color=$TARGET)"
    exit 0
else
    err "Healthcheck reportou falhas — investigue antes de qualquer acao destrutiva"
    exit 1
fi
