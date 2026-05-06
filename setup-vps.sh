#!/bin/bash
# ================================================================
# setup-vps.sh — Deploy CondoSync na VPS Hostinger
# VPS IP: 2.24.211.167
# Executar como root: bash setup-vps.sh
# ================================================================
set -e

VPS_IP="2.24.211.167"
REPO="https://github.com/santiagotisola/DevSantiago.git"
APP_DIR="/opt/condosync"

echo ""
echo "========================================"
echo "  CondoSync — Setup VPS Hostinger"
echo "========================================"

# ── 1. Atualizar sistema ──────────────────────────────────────
echo ""
echo ">> [1/6] Atualizando sistema..."
apt-get update -qq && apt-get upgrade -y -qq

# ── 2. Garantir Docker + Docker Compose ──────────────────────
echo ""
echo ">> [2/6] Verificando Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
fi
docker --version
docker compose version

# ── 3. Clonar repositório ────────────────────────────────────
echo ""
echo ">> [3/6] Clonando repositório..."
if [ -d "$APP_DIR" ]; then
    echo "   Diretório existente — atualizando..."
    cd "$APP_DIR" && git pull
else
    git clone "$REPO" "$APP_DIR"
    cd "$APP_DIR"
fi

# ── 4. Criar .env de produção ────────────────────────────────
echo ""
echo ">> [4/6] Criando .env de produção..."
cat > "$APP_DIR/condosync/.env" <<EOF
# ── Banco de Dados ────────────────────────────────────────────
POSTGRES_USER=condosync
POSTGRES_PASSWORD=9QpFPm3LS7DncUVYyZk4IGea6uwrT1RN
POSTGRES_DB=condosync

# ── JWT ───────────────────────────────────────────────────────
JWT_SECRET=PD8gt7RwoIpnuZH0syNlfqU3jLrXGv1x5Td9zYiJb6W2cCKhSAF4BkOmQMVEae
JWT_REFRESH_SECRET=HTiIRlOewjvD7zKAdn0MPcYmpQ2C9yxaq46FGgJh1B58r3fNokWLUVtSubZsXE

# ── URLs ──────────────────────────────────────────────────────
CORS_ORIGINS=http://${VPS_IP}
API_URL=http://api:3333

# ── Pagamento (configurar depois) ────────────────────────────
ASAAS_API_KEY=
PJBANK_CREDENCIAL=
PJBANK_CHAVE=

# ── Email (configurar depois) ────────────────────────────────
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=CondoSync <noreply@condosync.com.br>

# ── OpenAI (opcional) ─────────────────────────────────────────
OPENAI_API_KEY=
EOF
echo "   .env criado em $APP_DIR/condosync/.env"

# ── 5. Subir containers ──────────────────────────────────────
echo ""
echo ">> [5/6] Subindo containers Docker..."
cd "$APP_DIR/condosync"
docker compose -f docker-compose.railway.yml up -d --build

# ── 6. Verificar status ──────────────────────────────────────
echo ""
echo ">> [6/6] Verificando containers..."
sleep 10
docker compose -f docker-compose.railway.yml ps

echo ""
echo "========================================"
echo "  Deploy concluído!"
echo "========================================"
echo ""
echo "  Frontend : http://${VPS_IP}"
echo "  API      : http://${VPS_IP}:3333"
echo "  Health   : http://${VPS_IP}:3333/health"
echo ""
echo "  Para ver logs: docker compose -f /opt/condosync/condosync/docker-compose.railway.yml logs -f"
echo ""
