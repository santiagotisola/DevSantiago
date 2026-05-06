#!/bin/sh
set -e

echo "⏳ Aguardando PostgreSQL inicializar (10s)..."
sleep 10

echo "📦 Aplicando migrações no banco de dados..."

# Aplica migrações pendentes com retry caso o postgres ainda não esteja pronto
MAX_RETRIES=10
RETRIES=0
until npx prisma migrate deploy 2>&1; do
  RETRIES=$((RETRIES + 1))
  if [ "$RETRIES" -ge "$MAX_RETRIES" ]; then
    echo "❌ Não foi possível aplicar o schema após ${MAX_RETRIES} tentativas."
    exit 1
  fi
  echo "  Tentativa ${RETRIES}/${MAX_RETRIES} — aguardando 5s..."
  sleep 5
done

echo "🌱 Verificando dados iniciais (seed)..."
node prisma/seed-auto.js 2>&1 || echo "⚠️  Seed falhou, continuando..."

echo "🚀 Iniciando servidor CondoSync na porta 3333..."
exec node dist/server.js
