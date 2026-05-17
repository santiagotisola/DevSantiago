# CondoSync Production - API + Web in One Container
# Simple approach: Compile both, run both services

FROM node:22-alpine AS dependencies

WORKDIR /build

# Install both apps' dependencies
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json

RUN apk add --no-cache openssl

WORKDIR /build/api
RUN npm install

WORKDIR /build/web
RUN npm install

# Build stage
FROM dependencies AS builder

# Compile API
WORKDIR /build/api
COPY apps/api . 
RUN npx prisma generate && npm run build

# Compile Web
WORKDIR /build/web
COPY apps/web .
RUN npm run build

# Runtime stage
FROM node:22-alpine

RUN apk add --no-cache nginx curl

WORKDIR /app

# Copy API
COPY --from=builder /build/api/dist ./api/dist
COPY --from=builder /build/api/node_modules ./api/node_modules
COPY --from=builder /build/api/prisma ./api/prisma
COPY --from=builder /build/api/package.json ./api/

# Copy Web
COPY --from=builder /build/web/dist ./web/dist

# Copy nginx config
COPY nginx.conf.production /etc/nginx/nginx.conf

# Create startup script
RUN echo '#!/bin/sh' > /start.sh && \
    echo 'cd /app/api && node dist/server.js &' >> /start.sh && \
    echo 'sleep 2' >> /start.sh && \
    echo 'nginx -g "daemon off;"' >> /start.sh && \
    chmod +x /start.sh

ENV NODE_ENV=production PORT=3333

EXPOSE 80

CMD ["/start.sh"]
