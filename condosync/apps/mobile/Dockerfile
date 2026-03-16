# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json* ./
COPY apps/mobile/package.json ./apps/mobile/

# Install all workspace dependencies
RUN npm install --workspace=apps/mobile

# Copy source
COPY apps/mobile/ ./apps/mobile/

# Build
WORKDIR /app/apps/mobile
RUN npm run build

# Production stage
FROM nginx:1.25-alpine AS production

COPY --from=builder /app/apps/mobile/dist /usr/share/nginx/html
COPY apps/mobile/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
