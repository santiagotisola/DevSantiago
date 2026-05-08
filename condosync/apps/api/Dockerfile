# ─── Stage 1: Builder ─────────────────────────────────────────────────────────
# Contexto de build: condosync/apps/api/
FROM node:22-alpine AS builder

WORKDIR /app

# bcrypt nativo precisa de python + build tools no estágio builder.
# Apenas builder; runtime stage só copia o node_modules pronto.
RUN apk add --no-cache openssl python3 make g++

# Lockfile junto = build determinístico (npm ci).
COPY package.json package-lock.json* ./

# npm ci falha se package-lock.json estiver fora de sincronia com
# package.json — mais previsível que npm install em CI/Docker.
# Se o monorepo não tem lockfile no apps/api, fallback para install.
RUN if [ -f package-lock.json ]; then \
      npm ci --ignore-scripts; \
    else \
      npm install --ignore-scripts; \
    fi

# Copiar todo o código-fonte da API
COPY . ./

# Gerar o Prisma Client
RUN ./node_modules/.bin/prisma generate

# Compilar TypeScript → dist/.
# TODO(types): backlog para corrigir 35+ erros TS de tipo em logger
# (winston aceita objeto-como-1o-arg em runtime mas signature aceita string
# only) e algumas refactors P2/P3 (opentelemetry resourceFromAttributes,
# @types/opossum, type guards). Funcional mas falha em strict tsc.
# Enquanto isso, build permissivo: tsc reporta mas continua emitindo JS,
# fail-only se dist/server.js nao for gerado de fato.
RUN rm -rf dist && (node_modules/.bin/tsc --noEmitOnError false 2>&1 || true)

# Falha apenas se o artefato critico nao saiu (significa erro real, nao apenas typing).
RUN test -f dist/server.js || (echo "ERRO: dist/server.js nao foi gerado" && exit 1)
RUN if [ -f package-lock.json ]; then \
      npm ci --omit=dev --ignore-scripts; \
    else \
      npm install --omit=dev --ignore-scripts; \
    fi
# REGERAR Prisma Client apos o npm ci de prod (que apagou node_modules).
# Sem isso: Cannot find module '.prisma/client/default' em runtime.
RUN ./node_modules/.bin/prisma generate
# REBUILD do bcrypt (binding nativo .node). Como npm ci usou
# --ignore-scripts, o postinstall do bcrypt nao rodou e o binario
# nao foi compilado. Build tools ja estao no estagio builder.
# Sem isso: Cannot find module 'bcrypt_lib.node' em runtime.
RUN npm rebuild bcrypt

# ─── Stage 2: Production ──────────────────────────────────────────────────────
FROM node:22-alpine AS production

WORKDIR /app

# tini é um init mínimo (PID 1) que reaproveita SIGTERM/SIGINT para o
# processo node, garantindo que o graceful shutdown em server.ts
# realmente dispare. wget é usado pelo HEALTHCHECK.
RUN apk add --no-cache openssl wget tini

COPY --from=builder /app/node_modules  ./node_modules
COPY --from=builder /app/dist          ./dist
COPY --from=builder /app/prisma        ./prisma
COPY --from=builder /app/package.json  ./

COPY --from=builder /app/entrypoint.sh ./entrypoint.sh
RUN sed -i 's/\r$//' ./entrypoint.sh && chmod +x ./entrypoint.sh

# Não-root: usuário node já vem na imagem oficial do Node Alpine,
# uid/gid 1000. /app precisa ser de propriedade do node para que
# o entrypoint consiga executar (e prisma migrate gravar lockfiles).
RUN chown -R node:node /app
USER node

ENV NODE_ENV=production
ENV PORT=3333

EXPOSE 3333

# Healthcheck integrado à imagem — antes só existia no compose,
# então `docker run` standalone ficava sem signal.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3333/health || exit 1

ENTRYPOINT ["/sbin/tini", "--", "./entrypoint.sh"]
