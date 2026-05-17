# CondoSync Production - API + Web in One Container
# Simple approach: Compile both, run both services

FROM node:22-alpine AS dependencies

WORKDIR /build

# Install both apps' dependencies
COPY apps/api/package.json ./api/
COPY apps/web/package.json ./web/

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

RUN apk add --no-cache nginx curl bash

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
RUN echo '#!/bin/bash' > /start.sh && \
    echo 'set -e' >> /start.sh && \
    echo 'echo "🚀 Starting CondoSync API..."' >> /start.sh && \
    echo 'cd /app/api && node dist/server.js > /tmp/api.log 2>&1 &' >> /start.sh && \
    echo 'API_PID=$!' >> /start.sh && \
    echo 'sleep 3' >> /start.sh && \
    echo 'if ! kill -0 $API_PID 2>/dev/null; then' >> /start.sh && \
    echo '  echo "❌ API failed to start"' >> /start.sh && \
    echo '  cat /tmp/api.log' >> /start.sh && \
    echo '  exit 1' >> /start.sh && \
    echo 'fi' >> /start.sh && \
    echo 'echo "🌐 Starting Nginx..."' >> /start.sh && \
    echo 'nginx -g "daemon off;"' >> /start.sh && \
    chmod +x /start.sh

ENV NODE_ENV=production PORT=3333

EXPOSE 80

CMD ["/start.sh"]
