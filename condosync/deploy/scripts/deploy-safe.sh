#!/usr/bin/env bash
# =============================================================================
# deploy-safe.sh — Blue/Green zero-downtime
# =============================================================================
# Fluxo:
#   1. Lock + valida prerequisitos
#   2. Backup obrigatorio (Postgres + volumes)
#   3. Pull da imagem nova na cor IDLE
#   4. (opcional) Aplica migrations expand-only
#   5. Sobe cor IDLE em paralelo, aguarda healthcheck
#   6. Smoke test interno + smoke direto contra container idle via curl-from-caddy
#   7. Atomic switch do snippet do Caddy + caddy reload
#   8. Validacao pos-switch (smoke externo via dominio publico)
#   9. Drena cor antiga (mantem stopped por janela de retencao)
#  10. Atualiza state + meta
#
# Uso:
#   bash deploy/scripts/deploy-safe.sh --tag v1.42.0
#   bash deploy/scripts/deploy-safe.sh --tag v1.42.0 --skip-migrate
#   bash deploy/scripts/deploy-safe.sh --tag v1.42.0 --keep-old running
#
# Env opcionais:
#   ASSUME_YES=1            pula confirmacoes
#   HEALTH_TIMEOUT=180      segundos para cada healthcheck
#   SMOKE_EXTERNAL_RETRIES=10
# =============================================================================
set -Eeuo pipefail
source "$(dirname "$0")/lib/common.sh"

TAG=""
SKIP_MIGRATE=0
KEEP_OLD="stopped"          # stopped | running | removed
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-180}"
SMOKE_RETRIES="${SMOKE_EXTERNAL_RETRIES:-10}"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --tag) TAG="$2"; shift 2 ;;
        --skip-migrate) SKIP_MIGRATE=1; shift ;;
        --keep-old) KEEP_OLD="$2"; shift 2 ;;
        -h|--help)
            sed -n '2,30p' "$0"; exit 0 ;;
        *) die "Argumento desconhecido: $1" ;;
    esac
done

[[ -n "$TAG" ]] || die "--tag obrigatorio (ex: --tag v1.42.0 ou --tag sha-abc1234)"

acquire_lock
load_env

ACTIVE=$(read_active_color)
IDLE=$(read_idle_color)
log "Color ativa  : $ACTIVE"
log "Color idle   : $IDLE"
log "Image tag    : $TAG"
log "Migrations   : $([[ $SKIP_MIGRATE -eq 1 ]] && echo SKIP || echo APPLY)"
log "Manter antiga: $KEEP_OLD"

confirm "Iniciar deploy para $IDLE com tag $TAG?" || die "Abortado pelo operador"

# ─── 1. Pre-flight ──────────────────────────────────────────────────────────
log "▶ 1/9  Pre-flight"
docker info >/dev/null || die "Docker daemon inacessivel"
[[ -f "$SHARED_FILE" ]] || die "compose shared nao encontrado"
docker ps --format '{{.Names}}' | grep -q '^condosync-postgres$' || die "Postgres nao esta rodando — suba a stack shared antes"
docker ps --format '{{.Names}}' | grep -q '^condosync-redis$'    || die "Redis nao esta rodando"
docker ps --format '{{.Names}}' | grep -q '^condosync-caddy$'    || die "Caddy nao esta rodando"

bash "$DEPLOY_ROOT/scripts/healthcheck.sh" "$ACTIVE" >/dev/null \
    || die "Cor ativa ($ACTIVE) nao esta saudavel — corrija antes de deployar"

# ─── 2. Backup obrigatorio ──────────────────────────────────────────────────
log "▶ 2/9  Backup pre-deploy"
DUMP_PATH=$(bash "$DEPLOY_ROOT/scripts/backup.sh" | tail -1)
[[ -f "$DUMP_PATH" ]] || die "Backup falhou — abortando deploy"
ok "Backup salvo: $DUMP_PATH"

# ─── 3. Pull da imagem ──────────────────────────────────────────────────────
log "▶ 3/9  Pull imagens (api + web) tag=$TAG"
export IMAGE_TAG_BLUE="${IMAGE_TAG_BLUE:-$TAG}"
export IMAGE_TAG_GREEN="${IMAGE_TAG_GREEN:-$TAG}"
# Cada cor pulla a tag dela. Quando deploy muda IDLE, sobrescrevemos a tag dela.
if [[ "$IDLE" == "blue" ]]; then export IMAGE_TAG_BLUE="$TAG"; else export IMAGE_TAG_GREEN="$TAG"; fi

compose_color "$IDLE" pull \
    || die "docker pull falhou — verifique credenciais do registry"

# ─── 4. Migrations (expand-only) ────────────────────────────────────────────
if (( SKIP_MIGRATE == 0 )); then
    log "▶ 4/9  Aplicando migrations (expand-only) com a imagem nova"
    # Roda Prisma migrate em container efemero, nao em api_idle (idle nao subiu ainda).
    docker run --rm \
        --network condosync_data \
        --env-file "$ENV_FILE" \
        -e DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@condosync-postgres:5432/${POSTGRES_DB}?schema=public" \
        "${IMAGE_REGISTRY}/condosync-api:${TAG}" \
        npx prisma migrate deploy \
        || die "Migrations falharam — banco nao foi alterado se prisma usa transacao; investigue"
    ok "Migrations aplicadas"
else
    warn "Migrations PULADAS (--skip-migrate)"
fi

# ─── 5. Subir IDLE em paralelo ──────────────────────────────────────────────
log "▶ 5/9  Subindo cor $IDLE (api+worker+web)"
compose_color "$IDLE" up -d --no-deps --remove-orphans api_${IDLE} worker_${IDLE} web_${IDLE} 2>/dev/null \
    || compose_color "$IDLE" up -d

wait_healthy "condosync-api-${IDLE}"    "$HEALTH_TIMEOUT" || die "api_${IDLE} nao ficou healthy"
wait_healthy "condosync-web-${IDLE}"    60                || die "web_${IDLE} nao ficou healthy"
wait_healthy "condosync-worker-${IDLE}" "$HEALTH_TIMEOUT" || die "worker_${IDLE} nao ficou healthy"

# ─── 6. Smoke interno ───────────────────────────────────────────────────────
log "▶ 6/9  Smoke interno (rede docker)"
smoke_internal "condosync-api-${IDLE}" /health 3333 \
    || die "api_${IDLE} /health falhou no smoke interno"
# Smoke pelo proprio Caddy contra a cor idle SEM trocar tracfego ainda:
docker exec condosync-caddy wget -qO- --timeout=5 "http://condosync-api-${IDLE}:3333/health" >/dev/null \
    || die "Caddy nao consegue alcancar api_${IDLE} — checar rede proxy"
ok "Smoke interno OK"

# ─── 7. Atomic switch ──────────────────────────────────────────────────────
log "▶ 7/9  Trocando trafego para $IDLE"
switch_caddy_to "$IDLE"
write_active_color "$IDLE"

# ─── 8. Smoke externo ──────────────────────────────────────────────────────
log "▶ 8/9  Smoke externo via dominio publico"
SUCCESS=0
for i in $(seq 1 "$SMOKE_RETRIES"); do
    if smoke_external "https://${DOMAIN}/__edge_health" \
       && smoke_external "https://${DOMAIN}/api/v1/health"; then
        SUCCESS=1; break
    fi
    log "Tentativa $i/$SMOKE_RETRIES falhou, aguardando 3s..."
    sleep 3
done

if (( SUCCESS == 0 )); then
    err "Smoke externo falhou apos $SMOKE_RETRIES tentativas — fazendo rollback automatico"
    switch_caddy_to "$ACTIVE"
    write_active_color "$ACTIVE"
    die "Deploy revertido. Logs: docker logs --tail 200 condosync-api-${IDLE}"
fi
ok "Smoke externo OK"

# Pequena janela de observacao para deixar metricas estabilizarem
log "Janela de observacao 30s..."
sleep 30
smoke_external "https://${DOMAIN}/__edge_health" || warn "Edge health flapping pos-deploy — investigar"

# ─── 9. Drenar cor antiga ──────────────────────────────────────────────────
log "▶ 9/9  Aplicando politica para cor antiga ($ACTIVE): $KEEP_OLD"
case "$KEEP_OLD" in
    running)
        log "Mantendo $ACTIVE rodando (rollback instantaneo via switch_caddy_to)"
        ;;
    stopped)
        log "Parando containers de $ACTIVE (rollback rapido: docker start + switch)"
        docker stop "condosync-api-${ACTIVE}" "condosync-web-${ACTIVE}" "condosync-worker-${ACTIVE}" 2>/dev/null || true
        ;;
    removed)
        warn "Removendo containers de $ACTIVE (rollback exige redeploy completo)"
        compose_color "$ACTIVE" down 2>/dev/null || true
        ;;
    *) die "Valor invalido para --keep-old: $KEEP_OLD" ;;
esac

write_meta "$IDLE" "$TAG" "$(git_short_sha)"

ok "Deploy concluido — cor ativa = $IDLE, tag = $TAG"
log "Rollback rapido: bash deploy/scripts/rollback.sh"
