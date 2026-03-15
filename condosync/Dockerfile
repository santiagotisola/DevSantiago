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

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist/ /usr/share/nginx/html/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
