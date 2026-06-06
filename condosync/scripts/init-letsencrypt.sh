#!/bin/bash
# ─── Script de inicialização Let's Encrypt ────────────────────────────────
# Uso: chmod +x scripts/init-letsencrypt.sh && ./scripts/init-letsencrypt.sh
#
# Pré-requisitos:
# - Docker e Docker Compose instalados
# - DNS apontando para o servidor
# - Porta 80 e 443 liberadas no firewall

set -e

DOMAIN=${1:-condosync.com.br}
EMAIL=${2:-admin@condosync.com.br}
STAGING=${3:-0}  # Set to 1 para testar sem rate limit

echo "🔒 Inicializando SSL para: $DOMAIN"
echo "📧 Email: $EMAIL"

# Criar diretórios
mkdir -p certbot/conf certbot/www

# Baixar parâmetros SSL recomendados
if [ ! -e "certbot/conf/options-ssl-nginx.conf" ]; then
  echo "📥 Baixando configurações SSL..."
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > certbot/conf/options-ssl-nginx.conf
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > certbot/conf/ssl-dhparams.pem
fi

# Criar certificado dummy para nginx iniciar
echo "🔑 Criando certificado temporário..."
mkdir -p "certbot/conf/live/$DOMAIN"
openssl req -x509 -nodes -newkey rsa:4096 \
  -days 1 \
  -keyout "certbot/conf/live/$DOMAIN/privkey.pem" \
  -out "certbot/conf/live/$DOMAIN/fullchain.pem" \
  -subj "/CN=$DOMAIN" 2>/dev/null

# Iniciar nginx com cert dummy
echo "🚀 Iniciando nginx..."
docker compose -f docker-compose.prod.yml up -d nginx
sleep 5

# Remover cert dummy
echo "🗑️  Removendo certificado temporário..."
rm -rf "certbot/conf/live/$DOMAIN"

# Solicitar certificado real
echo "📜 Solicitando certificado Let's Encrypt..."
STAGING_FLAG=""
if [ "$STAGING" = "1" ]; then
  STAGING_FLAG="--staging"
fi

docker compose -f docker-compose.prod.yml run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  $STAGING_FLAG \
  -d "$DOMAIN" \
  -d "www.$DOMAIN"

# Recarregar nginx com cert real
echo "🔄 Recarregando nginx..."
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload

echo ""
echo "✅ SSL configurado com sucesso!"
echo "🌐 Acesse: https://$DOMAIN"
echo ""
echo "💡 Para renovar manualmente: docker compose -f docker-compose.prod.yml run --rm certbot renew"
echo "💡 A renovação automática já está configurada no container certbot (a cada 12h)"
