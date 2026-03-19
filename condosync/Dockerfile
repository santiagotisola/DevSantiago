# Dockerfile do serviço Web (contexto = condosync/)
# Stage 1: build React com Vite
FROM node:20-alpine AS builder

WORKDIR /app

COPY apps/web/package.json ./
RUN npm install

COPY apps/web/ ./
RUN npm run build

# Stage 2: servir com nginx
FROM nginx:1.25-alpine

RUN rm /etc/nginx/conf.d/default.conf

# nginx:alpine processa templates em /etc/nginx/templates/ na inicialização via envsubst
# API_URL deve ser definida como variável de ambiente (Railway: HTTPS URL, Docker Compose: http://api:3333)
COPY apps/web/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=builder /app/dist/ /usr/share/nginx/html/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
