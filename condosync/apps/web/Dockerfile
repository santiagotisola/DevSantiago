# ─── Stage 1: Builder ─────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copiar manifests do web
COPY apps/web/package.json ./

# Instalar dependências
RUN npm install

# Copiar código fonte
COPY apps/web/ ./

# Build de produção (inclui TypeScript check)
RUN npm run build

# ─── Stage 2: Production (nginx) ──────────────────────────────────────────────
FROM nginx:1.27-alpine AS production

# Remover config padrão do nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copiar template nginx (envsubst substitui ${API_URL} na inicialização)
COPY apps/web/nginx.conf.template /etc/nginx/templates/default.conf.template

# Copiar o build do Vite
COPY --from=builder /app/dist /usr/share/nginx/html

# Fallback para API_URL — substituído pela env var do Railway se definida
ENV API_URL=https://devsantiago-production.up.railway.app

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
