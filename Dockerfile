# CondoSync Production: Combined API + Web via Nginx reverse proxy
# This Dockerfile builds both API and Web, then uses nginx to route between them

# ─── Stage 1: Build API ─────────────────────────────────────────────────────────
FROM node:22-alpine AS api-builder

WORKDIR /api

RUN apk add --no-cache openssl

# Copy API manifests
COPY condosync/apps/api/package.json condosync/apps/api/package-lock.json ./

# Install dependencies
RUN npm ci

# Copy API source
COPY condosync/apps/api/ ./

# Generate Prisma Client
RUN ./node_modules/.bin/prisma generate

# Build TypeScript
RUN node_modules/.bin/tsc --skipLibCheck --noEmitOnError false

# Remove devDependencies
RUN npm ci --omit=dev

# ─── Stage 2: Build Web ────────────────────────────────────────────────────────────
FROM node:22-alpine AS web-builder

WORKDIR /web

# Copy web manifests
COPY condosync/apps/web/package.json condosync/apps/web/package-lock.json ./

# Install dependencies
RUN npm ci

# Copy web source
COPY condosync/apps/web/ ./

# Build Vite production
RUN npm run build

# ─── Stage 3: Production (Node.js API + Nginx frontend) ─────────────────────────
FROM node:22-alpine AS api-runtime

WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy API build from builder stage
COPY --from=api-builder /api/dist ./dist
COPY --from=api-builder /api/package.json ./package.json
COPY --from=api-builder /api/node_modules ./node_modules
COPY --from=api-builder /api/prisma ./prisma

EXPOSE 3333

CMD ["node", "dist/server.js"]

# ─── Stage 4: Production (Nginx for Web) ───────────────────────────────────────
FROM nginx:1.27-alpine AS web-runtime

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY condosync/apps/web/nginx.conf.template /etc/nginx/templates/default.conf.template

# Copy web build from builder stage
COPY --from=web-builder /web/dist /usr/share/nginx/html

ENV API_URL=http://localhost:3333

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
