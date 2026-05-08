#!/usr/bin/env bash
# CHAOS-1: Redis indisponível por N segundos.
#
# Uso:
#   ./scripts/chaos/redis-down.sh 60
#
# REQUISITO: rodar em STAGING. Em prod, apenas com aprovação
# explícita + janela documentada.
#
# Comunica em #incidents Slack ANTES de executar (manualmente).

set -euo pipefail

DURATION="${1:-60}"
CONTAINER="${REDIS_CONTAINER:-condosync-redis}"

if [ "${ENVIRONMENT:-}" = "production" ]; then
  echo "❌ NÃO executar em production. Defina ENVIRONMENT=staging para confirmar."
  exit 1
fi

echo "🔴 CHAOS-1: parando Redis ($CONTAINER) por ${DURATION}s..."
echo "   Hora início: $(date -u +%FT%TZ)"
docker stop "$CONTAINER"

echo "   Esperando ${DURATION}s..."
sleep "$DURATION"

echo "🟢 Restaurando Redis..."
docker start "$CONTAINER"
echo "   Hora fim: $(date -u +%FT%TZ)"

echo ""
echo "Validações pós-recovery (próximos 5min):"
echo "  - Workers reconectam (logs)."
echo "  - Leader re-eleito (bullmq_leader_renewal_total)."
echo "  - Webhook backlog drena automaticamente."
echo "  - npm run redrive:webhooks -- --apply (se necessário)."
echo ""
echo "Documentar resultado em docs/chaos-results/$(date +%Y-%m-%d)-redis-down.md"
