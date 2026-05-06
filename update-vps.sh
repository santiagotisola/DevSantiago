#!/bin/bash
# ================================================================
# update-vps.sh — Atualiza CondoSync na VPS Hostinger
# VPS IP: 2.24.211.167
# Executar como root: bash update-vps.sh
# ================================================================
set -e

APP_DIR="/opt/condosync"
COMPOSE="docker compose -f $APP_DIR/condosync/docker-compose.railway.yml"

echo ""
echo "========================================"
echo "  CondoSync — Update VPS"
echo "========================================"

# ── 1. Puxar últimas alterações ───────────────────────────────
echo ""
echo ">> [1/3] Atualizando código..."
cd "$APP_DIR"
git pull

# ── 2. Rebuild e restart dos containers ──────────────────────
echo ""
echo ">> [2/3] Reconstruindo containers (banco preservado)..."
cd "$APP_DIR/condosync"
$COMPOSE up -d --build

# Workaround: após rebuild o container api pode ficar em "Created"
sleep 5
if [ "$(docker inspect -f '{{.State.Status}}' condosync-api 2>/dev/null)" = "created" ]; then
  echo "   ⚠  condosync-api estava em Created, iniciando..."
  docker start condosync-api
fi

# ── 3. Verificar status ──────────────────────────────────────
echo ""
echo ">> [3/3] Verificando containers..."
sleep 15
$COMPOSE ps

echo ""
echo "========================================"
echo "  Update concluído!"
echo "========================================"
echo ""
echo "  Logs: $COMPOSE logs -f api"
echo ""
