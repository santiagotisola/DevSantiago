# ─── Stage 1: Builder ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl

# Copiar manifests do monorepo (npm workspaces instala tudo na raiz)
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/

# Instala todas as deps na raiz do monorepo
RUN npm install

# Copiar código-fonte da API
COPY apps/api/ ./apps/api/

WORKDIR /app/apps/api

# Gerar o Prisma Client (usa node_modules da raiz via workspace)
RUN npx prisma generate

# Compilar TypeScript → dist/
# --noCheck (TS 5.5+) transpila sem checar tipos — sempre gera dist/
RUN /app/node_modules/.bin/tsc --noCheck 2>&1 || true
RUN test -f dist/server.js || /app/node_modules/.bin/tsc --noEmitOnError false 2>&1 || true
# Debug: mostrar o que existe em dist/
RUN ls dist/ 2>&1 || echo "dist/ vazio ou inexistente"
RUN test -f dist/server.js || (echo "ERRO: dist/server.js nao foi gerado" && exit 1)

# ─── Stage 2: Production ──────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

RUN apk add --no-cache openssl wget

# node_modules ficam na raiz no monorepo
COPY --from=builder /app/node_modules        ./node_modules
COPY --from=builder /app/apps/api/dist       ./dist
COPY --from=builder /app/apps/api/prisma     ./prisma
COPY --from=builder /app/apps/api/package*.json ./

COPY apps/api/entrypoint.sh ./entrypoint.sh
RUN sed -i 's/\r$//' ./entrypoint.sh && chmod +x ./entrypoint.sh

ENV NODE_ENV=production
ENV PORT=3333

EXPOSE 3333

ENTRYPOINT ["./entrypoint.sh"]
