# Deploy do App Mobile em Produção (Subdomínio)

## Objetivo
Servir o app mobile (PWA) em produção via subdomínio dedicado (ex: `app.2.24.211.167`), separado do painel web.

## Passos

### 1. Dockerfile dedicado
Crie um `Dockerfile.mobile` na raiz do projeto (já criado):

```
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/mobile/package.json ./apps/mobile/
RUN npm install --workspace=apps/mobile
COPY apps/mobile/ ./apps/mobile/
WORKDIR /app/apps/mobile
RUN npm run build

FROM nginx:1.25-alpine AS production
COPY --from=builder /app/apps/mobile/dist /usr/share/nginx/html
COPY apps/mobile/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 2. nginx.conf para subdomínio
Ajuste `apps/mobile/nginx.conf` para:

```
server {
    listen 80;
    server_name app.2.24.211.167;
    root /usr/share/nginx/html;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
    location /api/ {
        proxy_pass http://api:3333/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3. docker-compose.railway.yml
Adicione o serviço `mobile`:

```
  mobile:
    build:
      context: .
      dockerfile: Dockerfile.mobile
    container_name: condosync-mobile
    restart: unless-stopped
    depends_on:
      api:
        condition: service_healthy
    environment:
      - API_URL=http://api:3333
    ports:
      - "5174:80"
```

### 4. Variáveis de ambiente
Crie `.env.production` em `apps/mobile/`:

```
VITE_API_URL=https://api.condosync.com.br
```

### 5. Railway/Hostinger
- Configure o subdomínio `app.2.24.211.167` para apontar para a porta 5174 do container mobile.
- No nginx reverso da VPS, adicione:

```
server {
    listen 80;
    server_name app.2.24.211.167;
    location / {
        proxy_pass http://localhost:5174;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

**Após deploy, acesse:**
- Web: http://2.24.211.167/
- Mobile: http://app.2.24.211.167/

**Obs:** Ajuste o DNS se for domínio real. Para IP, use hosts locais para testar.
