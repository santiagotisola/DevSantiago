# Dockerfile do serviço Web (contexto = condosync/)
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY apps/web/package*.json ./apps/web/

RUN npm install

COPY apps/web/ ./apps/web/

WORKDIR /app/apps/web

RUN npx vite build

FROM nginx:1.25-alpine AS production

RUN rm /etc/nginx/conf.d/default.conf

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
