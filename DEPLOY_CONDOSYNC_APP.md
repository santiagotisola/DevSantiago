# Deploy condosync.app (Cloudflare + VPS Hostinger)

## Estado em 2026-05-13

✅ Domínio `condosync.app` registrado e ativo na Cloudflare.
✅ DNS records criados: A apex/www → 2.24.211.167, AAAA apex → IPv6 do VPS, CNAME api → apex.
✅ SSL mode `Full (strict)`, Always Use HTTPS on, Min TLS 1.2, Auto HTTPS Rewrites on.
✅ Token API usado: `lingering-bird-9f2f` (expira 2026-05-20). **Revogar após o deploy**.

⏳ Falta:
- Gerar Origin Certificate no Cloudflare dashboard.
- Configurar nginx do VPS pra escutar 443 com esse cert.
- Atualizar `.env` da api com `CORS_ORIGINS=https://condosync.app,https://www.condosync.app`.
- Build do web com `VITE_API_URL=/api/v1` (same-origin via nginx).
- Push das mudanças e `update-vps.sh`.

---

## 1) Origin Certificate (UI)

Dashboard CF → seleciona condosync.app → **SSL/TLS → Origin Server → Create Certificate**.
- Hostnames: `*.condosync.app, condosync.app` (já preenchido)
- Validity: **15 years**
- Key type: **RSA (2048)**

Clica Create. Salva os 2 blocos PEM em arquivos:
- `origin.pem` (Origin Certificate)
- `origin.key` (Private Key)

⚠️ Private key só aparece uma vez. Se perder, gera outro cert.

## 2) Copiar pro VPS

```bash
# do Windows local, com WinSCP ou:
scp origin.pem origin.key root@2.24.211.167:/etc/ssl/condosync/
ssh root@2.24.211.167 'chmod 600 /etc/ssl/condosync/origin.key'
```

## 3) nginx site config

No VPS, criar `/etc/nginx/sites-available/condosync.app`:

```nginx
# Redirect HTTP -> HTTPS (não estritamente necessário porque
# Cloudflare já faz Always Use HTTPS, mas mantém defense in depth)
server {
    listen 80;
    listen [::]:80;
    server_name condosync.app www.condosync.app api.condosync.app;
    return 301 https://$host$request_uri;
}

# Frontend (condosync.app + www)
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name condosync.app www.condosync.app;

    ssl_certificate     /etc/ssl/condosync/origin.pem;
    ssl_certificate_key /etc/ssl/condosync/origin.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    # HSTS (CF já faz pra .app mas ok ter)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Static (já está no container web)
    location / {
        proxy_pass http://127.0.0.1:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Same-origin proxy /api -> backend (evita CORS no browser)
    location /api/ {
        proxy_pass http://127.0.0.1:3333;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:3333;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 3600s;
    }
}

# Subdomain api.condosync.app (opcional — útil pra integrações terceiras)
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.condosync.app;

    ssl_certificate     /etc/ssl/condosync/origin.pem;
    ssl_certificate_key /etc/ssl/condosync/origin.key;
    ssl_protocols       TLSv1.2 TLSv1.3;

    location / {
        proxy_pass http://127.0.0.1:3333;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Habilitar e testar:
```bash
ln -s /etc/nginx/sites-available/condosync.app /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

## 4) Firewall

```bash
ufw allow 443/tcp
ufw allow 80/tcp
```

Cloudflare proxia, então 80 só pra redirect. Pode até bloquear 80 se preferir e deixar CF fazer o redirect direto.

## 5) Atualizar `.env` da api no VPS

```
CORS_ORIGINS=https://condosync.app,https://www.condosync.app,https://api.condosync.app
```

Restart container api:
```bash
docker compose restart api
```

## 6) Build do web com VITE_API_URL same-origin

No host do build (ou no VPS antes do build):
```
VITE_API_URL=/api/v1
```

Rebuild:
```bash
docker compose build web
docker compose up -d --force-recreate web
```

## 7) Validar

```bash
curl -I https://condosync.app
# Esperado: HTTP/2 200, header `cf-ray:` (passou por CF)

curl -s https://condosync.app/api/v1/health
# Esperado: {"status":"ok",...}
```

Browser: https://condosync.app → login funcional. Cadeado verde. DevTools → Network → cada request com status 200.

## 8) Revogar token CF

Dashboard CF → My Profile → API Tokens → "lingering-bird-9f2f" → Delete.
