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

ENV_FILE="$APP_DIR/condosync/.env"

# Se o .env já existe, preservar as credenciais existentes e não sobrescrever
if [ -f "$ENV_FILE" ]; then
    echo "   .env já existe — mantendo credenciais atuais."
else
    # Gerar secrets aleatórios (nunca ficam expostos no repositório)
    DB_PASSWORD=$(openssl rand -base64 32 | tr -dc 'A-Za-z0-9' | head -c 40)
    JWT_SECRET=$(openssl rand -base64 64 | tr -dc 'A-Za-z0-9' | head -c 64)
    JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -dc 'A-Za-z0-9' | head -c 64)

    cat > "$ENV_FILE" <<EOF
# ── Banco de Dados ────────────────────────────────────────────
POSTGRES_USER=condosync
POSTGRES_PASSWORD=${DB_PASSWORD}
POSTGRES_DB=condosync

# ── JWT ───────────────────────────────────────────────────────
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}

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
    echo "   .env criado com secrets gerados aleatoriamente."
    echo "   Guarde este arquivo em local seguro: $ENV_FILE"
fi

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
