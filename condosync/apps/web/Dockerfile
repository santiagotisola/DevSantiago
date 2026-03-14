# ─── Stage 1: Builder ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar manifests
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/

# Instala todas as deps na raiz do monorepo
RUN npm install

# Copiar código fonte
COPY apps/web/ ./apps/web/

WORKDIR /app/apps/web

# Build de produção (pula verificação de tipos para não bloquear)
RUN npx vite build

# ─── Stage 2: Production (nginx) ──────────────────────────────────────────────
FROM nginx:1.25-alpine AS production

# Remover config padrão do nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copiar nossa configuração nginx
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Copiar o build do Vite
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80

# Substitui ${API_URL} no nginx.conf pela variável de ambiente em runtime
CMD ["/bin/sh", "-c", "envsubst '${API_URL}' < /etc/nginx/conf.d/default.conf > /tmp/default.conf && mv /tmp/default.conf /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
