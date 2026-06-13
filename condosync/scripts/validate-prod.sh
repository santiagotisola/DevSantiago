#!/usr/bin/env bash
# CondoSync — validação pré-deploy de produção.
#
# IMPORTANTE: rode na VPS (ou em CI de produção), a partir da raiz do repo
# (DevSantiago/condosync), com o .env de produção presente no diretório.
# NÃO use `set -e`: precisamos coletar TODOS os fails, não abortar no primeiro.

echo ""
echo "========================================="
echo " CondoSync Production Validation"
echo "========================================="
echo ""

FAIL=0
WARN=0
check_ok()   { echo "✅ $1"; }
check_warn() { echo "⚠️  $1"; WARN=$((WARN+1)); }
check_fail() { echo "❌ $1"; FAIL=$((FAIL+1)); }

# Carrega o .env do diretório atual (mesma fonte que o docker compose usa),
# sem sobrescrever variáveis já exportadas no ambiente.
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env 2>/dev/null || true
  set +a
  check_ok ".env carregado"
else
  check_warn ".env não encontrado no diretório atual (checks de env podem falhar)"
fi

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.railway.yml}"

echo ""
echo "1. Verificando FRONTEND_URL"
echo "-----------------------------------------"
if [ -z "$FRONTEND_URL" ]; then
  check_fail "FRONTEND_URL não definido"
else
  check_ok "FRONTEND_URL definido: $FRONTEND_URL"
  case "$FRONTEND_URL" in
    *localhost*|*127.0.0.1*) check_fail "FRONTEND_URL aponta para localhost" ;;
  esac
  case "$FRONTEND_URL" in
    https://*) : ;;
    *) check_fail "FRONTEND_URL não usa HTTPS" ;;
  esac
  [ "$FRONTEND_URL" = "https://condosync.app" ] || check_warn "FRONTEND_URL diferente do domínio oficial (confirme se é intencional)"
fi

echo ""
echo "2. Verificando o compose de produção ($COMPOSE_FILE)"
echo "-----------------------------------------"
# `docker compose config` resolve as variáveis (inclui ${FRONTEND_URL:?...}),
# então o .env precisa estar carregado. Em máquina sem Docker isto vira WARN.
if command -v docker >/dev/null 2>&1 && docker compose -f "$COMPOSE_FILE" config >/tmp/compose.out 2>/tmp/compose.err; then
  check_ok "docker compose config OK"
  grep -q "localhost" /tmp/compose.out && check_fail "Compose resolvido ainda contém localhost" || check_ok "Sem localhost no compose resolvido"
  grep -q "FRONTEND_URL" /tmp/compose.out && check_ok "FRONTEND_URL presente no compose" || check_fail "FRONTEND_URL ausente do compose"
else
  check_warn "docker compose config não executado (Docker ausente ou .env incompleto) — pulei este check"
  # Fallback estático: ao menos confirma que a chave existe no arquivo.
  grep -q "FRONTEND_URL" "$COMPOSE_FILE" 2>/dev/null && check_ok "FRONTEND_URL declarado em $COMPOSE_FILE (verificação estática)" || check_fail "FRONTEND_URL ausente de $COMPOSE_FILE"
fi

echo ""
echo "3. Verificando variáveis críticas"
echo "-----------------------------------------"
for VAR in DATABASE_URL JWT_SECRET JWT_REFRESH_SECRET FRONTEND_URL REDIS_URL; do
  if [ -z "${!VAR}" ]; then check_fail "$VAR ausente"; else check_ok "$VAR presente"; fi
done

echo ""
echo "4. Verificando domínio público (VPS/rede)"
echo "-----------------------------------------"
if curl -fsI "${FRONTEND_URL:-https://condosync.app}" --connect-timeout 10 >/tmp/domain.out 2>&1; then
  check_ok "${FRONTEND_URL:-https://condosync.app} acessível"
else
  check_warn "domínio inacessível a partir daqui (normal fora da VPS) — confirme no servidor"
fi

echo ""
echo "5. Build (api + web)"
echo "-----------------------------------------"
if npm run build >/tmp/build.log 2>&1; then
  check_ok "Build OK"
else
  check_fail "Build falhou — ver /tmp/build.log (cheque npm install e prisma generate)"
fi

echo ""
echo "6. Testes (apps/api)"
echo "-----------------------------------------"
# Não há script 'test' no root; a suíte vive em apps/api (vitest).
if npm test --workspace=apps/api >/tmp/test.log 2>&1; then
  check_ok "Testes OK"
else
  check_fail "Falha nos testes — ver /tmp/test.log"
fi

echo ""
echo "========================================="
echo " RESUMO   FAILS: $FAIL   WARNINGS: $WARN"
echo "========================================="
if [ "$FAIL" -eq 0 ]; then
  echo "🟢 GO PARA STAGING"
  exit 0
else
  echo "🔴 NO-GO — corrija os FAILS antes do deploy."
  exit 1
fi
