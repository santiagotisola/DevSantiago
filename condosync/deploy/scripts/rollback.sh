#!/usr/bin/env bash
# =============================================================================
# rollback.sh — Volta para a cor anterior em segundos
# =============================================================================
# Premissa: a cor antiga ainda existe (stopped ou running).
# Se foi removida (--keep-old removed no deploy), use restore.sh + redeploy.
#
# Uso:
#   bash deploy/scripts/rollback.sh                   # interativo
#   ASSUME_YES=1 bash deploy/scripts/rollback.sh      # nao pede confirmacao
# =============================================================================
set -Eeuo pipefail
source "$(dirname "$0")/lib/common.sh"

acquire_lock
load_env

ACTIVE=$(read_active_color)
PREV="$(cat "$PREV_FILE" 2>/dev/null || true)"
[[ -n "$PREV" ]] || die "previous_color desconhecido — sem registro de rollback"
[[ "$PREV" != "$ACTIVE" ]] || die "previous_color = active_color ($ACTIVE) — nada a fazer"

log "Cor ativa atual : $ACTIVE"
log "Cor de rollback : $PREV"

# Verifica se containers da cor anterior existem
for c in "condosync-api-${PREV}" "condosync-web-${PREV}" "condosync-worker-${PREV}"; do
    if ! docker ps -a --format '{{.Names}}' | grep -q "^${c}$"; then
        die "Container $c nao existe — rollback rapido impossivel. Use restore.sh + deploy."
    fi
done

confirm "Rollback de $ACTIVE para $PREV?" || die "Abortado"

# 1. Garante que a cor antiga esta rodando
log "Iniciando containers de $PREV se estiverem parados"
docker start "condosync-api-${PREV}" "condosync-web-${PREV}" "condosync-worker-${PREV}" 2>/dev/null || true

wait_healthy "condosync-api-${PREV}" 90 \
    || die "api_${PREV} nao voltou healthy — rollback abortado, mantendo $ACTIVE"
wait_healthy "condosync-web-${PREV}" 60 || warn "web_${PREV} demorou — seguindo"
wait_healthy "condosync-worker-${PREV}" 60 || warn "worker_${PREV} demorou — seguindo"

# 2. Switch atomico
switch_caddy_to "$PREV"

# 3. Validar
sleep 3
if ! smoke_external "https://${DOMAIN}/api/v1/health"; then
    err "Smoke pos-rollback falhou — investigando, mas Caddy ja apontando para $PREV"
fi

# 4. Atualiza state (active e previous trocam)
write_active_color "$PREV"   # PREV agora e ativa, e PREV_FILE recebe o que era ATIVO
write_meta "$PREV" "rollback-from-${ACTIVE}" "$(git_short_sha)"

ok "Rollback concluido — cor ativa = $PREV (cor revertida $ACTIVE permanece em standby)"
warn "Investigue a causa raiz antes do proximo deploy."
