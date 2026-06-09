# Bloco nginx para VPS/Hostinger — Mobile em subdomínio

Adicione ao seu arquivo de configuração do nginx na VPS (ex: `/etc/nginx/sites-available/condosync`):

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

- Reinicie o nginx após salvar: `sudo systemctl reload nginx`
- Certifique-se que o container mobile está rodando na porta 5174 (`docker-compose.yml` local).
- Se usar domínio real, aponte o DNS do subdomínio para o IP da VPS.

---

**Checklist:**
- [ ] Adicionar bloco acima ao nginx
- [ ] Subir container mobile localmente: `docker compose up -d mobile`
- [ ] Acessar http://app.2.24.211.167/
