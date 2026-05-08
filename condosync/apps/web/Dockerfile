# ─── Stage 1: Builder ─────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Lockfile junto = build determinístico (npm ci).
COPY apps/web/package.json apps/web/package-lock.json* ./

RUN if [ -f package-lock.json ]; then \
      npm ci; \
    else \
      npm install; \
    fi

# Copiar código fonte
COPY apps/web/ ./

# Build de produção (inclui TypeScript check, sem `|| true`)
RUN npm run build

# ─── Stage 2: Production (nginx unprivileged) ─────────────────────────────────
# nginxinc/nginx-unprivileged roda como uid 101 (não-root) por
# padrão e escuta em 8080 internamente. O compose mapeia 80→8080.
FROM nginxinc/nginx-unprivileged:1.27-alpine AS production

USER root
RUN rm -f /etc/nginx/conf.d/default.conf
USER nginx

# Copiar template nginx (envsubst substitui ${API_URL} na inicialização)
COPY --chown=nginx:nginx apps/web/nginx.conf.template /etc/nginx/templates/default.conf.template

# Copiar o build do Vite
COPY --from=builder --chown=nginx:nginx /app/dist /usr/share/nginx/html

# API_URL é obrigatório em runtime; sem default que aponte para
# infra de outro tenant. Falhar amigável com mensagem clara é
# preferível a apontar acidentalmente para produção alheia.
ENV API_URL=

EXPOSE 8080

# nginxinc/nginx-unprivileged já tem ENTRYPOINT que roda envsubst e nginx -g "daemon off;"
