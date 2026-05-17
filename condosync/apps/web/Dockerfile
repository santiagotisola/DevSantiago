# ─── Stage 1: Builder (Web + Mobile) ──────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copiar manifests
COPY package.json package-lock.json* ./
COPY apps/web/package.json ./apps/web/
COPY apps/mobile/package.json ./apps/mobile/

# Instalar dependências
RUN npm install

# Copiar código fonte
COPY apps/web/ ./apps/web/
COPY apps/mobile/ ./apps/mobile/

# Build de Web
WORKDIR /app/apps/web
RUN npm run build
RUN mkdir -p /app/dist-merged/web && cp -r dist/* /app/dist-merged/web/

# Build de Mobile (com base='/app/')
WORKDIR /app/apps/mobile
RUN npm run build
RUN mkdir -p /app/dist-merged/app && cp -r dist/* /app/dist-merged/app/

# ─── Stage 2: Production (nginx com Web + Mobile) ────────────────────────────
FROM nginx:1.27-alpine AS production

# Remover config padrão do nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copiar template nginx (envsubst substitui ${API_URL} na inicialização)
COPY apps/web/nginx.conf.template /etc/nginx/templates/default.conf.template

# Copiar os builds (Web na raiz, Mobile em /app/)
COPY --from=builder /app/dist-merged/web /usr/share/nginx/html
COPY --from=builder /app/dist-merged/app /usr/share/nginx/html/app

# Fallback para API_URL
ENV API_URL=https://devsantiago-production.up.railway.app

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
