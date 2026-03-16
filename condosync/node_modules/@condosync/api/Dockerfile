# ─── Stage 1: Builder ─────────────────────────────────────────────────────────
# Contexto de build: condosync/apps/api/
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl

# Instalar dependências usando o package.json próprio da API
COPY package.json ./
RUN npm install

# Copiar todo o código-fonte da API
COPY . ./

# Gerar o Prisma Client (usa o binário instalado, não baixa versão latest via npx)
RUN ./node_modules/.bin/prisma generate

# Compilar TypeScript → dist/
RUN node_modules/.bin/tsc --noCheck 2>&1 || true
RUN test -f dist/server.js || node_modules/.bin/tsc --noEmitOnError false 2>&1 || true
RUN ls dist/ 2>&1 || echo "dist/ vazio ou inexistente"
RUN test -f dist/server.js || (echo "ERRO: dist/server.js nao foi gerado" && exit 1)

# ─── Stage 2: Production ──────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

RUN apk add --no-cache openssl wget

COPY --from=builder /app/node_modules  ./node_modules
COPY --from=builder /app/dist          ./dist
COPY --from=builder /app/prisma        ./prisma
COPY --from=builder /app/package.json  ./

COPY --from=builder /app/entrypoint.sh ./entrypoint.sh
RUN sed -i 's/\r$//' ./entrypoint.sh && chmod +x ./entrypoint.sh

ENV NODE_ENV=production
ENV PORT=3333

EXPOSE 3333

ENTRYPOINT ["./entrypoint.sh"]
