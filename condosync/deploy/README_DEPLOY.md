# CondoSync — Deploy Production-Grade (Hostinger VPS)

Solução blue/green com Docker Compose + Caddy. Sem Kubernetes, sem Swarm.
Zero downtime, rollback em segundos, backup obrigatório, healthcheck real.

---

## 1. Arquitetura

```
                       Internet (80/443)
                              │
                       ┌──────┴──────┐
                       │    Caddy    │  ← TLS automático (Let's Encrypt)
                       │  (shared)   │  ← snippet decide cor ativa
                       └──┬───────┬──┘
                          │       │
            ┌─────────────┘       └─────────────┐
            ▼                                   ▼
      ┌───────────┐                       ┌───────────┐
      │   BLUE    │                       │   GREEN   │
      │ api_blue  │                       │ api_green │
      │ web_blue  │                       │ web_green │
      │ wkr_blue  │                       │ wkr_green │
      └─────┬─────┘                       └─────┬─────┘
            │  rede: condosync_proxy            │
            └────────────┬──────────────────────┘
                         ▼
                ┌──────────────────┐
                │ rede: condosync_data (internal: true)
                │  - condosync-postgres
                │  - condosync-redis
                └──────────────────┘
```

**Componentes**

| Componente | Stack | Restart em deploy? |
|---|---|---|
| Postgres | shared | Não |
| Redis | shared | Não |
| Caddy | shared | Não (apenas `caddy reload`) |
| api_blue/green | blue/green | Cor IDLE recriada |
| worker_blue/green | blue/green | Cor IDLE recriada |
| web_blue/green | blue/green | Cor IDLE recriada |

**Redes**

- `condosync_proxy` — Caddy ↔ apps (com saída para internet)
- `condosync_data` — apps ↔ postgres + redis. `internal: true` (DB e Redis sem rota para internet)

**Volumes (todos persistentes)**

- `condosync_postgres_data` — `/var/lib/postgresql/data`
- `condosync_redis_data` — AOF + snapshots
- `condosync_uploads_data` — uploads/anexos da API
- `condosync_api_logs` — logs estruturados
- `condosync_caddy_data` / `condosync_caddy_config` — certificados ACME

---

## 2. Estrutura de diretórios

```
DevSantiago/condosync/
├── deploy/
│   ├── compose/
│   │   ├── docker-compose.shared.yml   # postgres + redis + caddy
│   │   ├── docker-compose.blue.yml     # api_blue + web_blue + worker_blue
│   │   └── docker-compose.green.yml    # api_green + web_green + worker_green
│   ├── caddy/
│   │   ├── Caddyfile
│   │   └── snippets/
│   │       ├── active-api.caddy        # reescrito a cada deploy
│   │       └── active-web.caddy
│   ├── scripts/
│   │   ├── lib/common.sh
│   │   ├── deploy-safe.sh
│   │   ├── rollback.sh
│   │   ├── backup.sh
│   │   ├── restore.sh
│   │   └── healthcheck.sh
│   ├── state/                          # runtime (gitignored)
│   │   ├── active_color
│   │   ├── previous_color
│   │   └── last_deploy.json
│   ├── backups/                        # runtime (gitignored)
│   │   ├── postgres/
│   │   └── volumes/
│   ├── .env.production.example
│   └── README_DEPLOY.md  ← este arquivo
└── .env.production                     # (NÃO commit; secrets)
```

> Importante: o `.env.production` fica em `condosync/.env.production` (um nível acima de `deploy/`), e é apontado pelos scripts via `ENV_FILE` (default já configurado).

---

## 3. Implantação inicial (one-time setup)

### 3.1 VPS

```bash
# Como root na VPS:
apt-get update && apt-get install -y curl git ufw fail2ban
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker

# Firewall
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Fail2ban com jail SSH default ja basta
systemctl enable --now fail2ban
```

### 3.2 Clonar e configurar

```bash
mkdir -p /opt && cd /opt
git clone https://github.com/<sua-org>/<repo>.git condosync
cd condosync/DevSantiago/condosync

# Copiar e preencher env
cp deploy/.env.production.example .env.production
chmod 600 .env.production
nano .env.production
```

Gere os secrets:

```bash
echo "POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d '/+=' | head -c 40)"
echo "REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d '/+=' | head -c 40)"
echo "JWT_SECRET=$(openssl rand -base64 64 | tr -d '/+=' | head -c 64)"
echo "JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -d '/+=' | head -c 64)"
echo "APP_ENCRYPTION_KEY=$(openssl rand -base64 32)"
```

### 3.3 Subir stack compartilhada

```bash
cd /opt/condosync/DevSantiago/condosync
docker compose --env-file .env.production \
  -f deploy/compose/docker-compose.shared.yml up -d

# Validar
docker compose -f deploy/compose/docker-compose.shared.yml ps
docker logs condosync-caddy --tail 50
```

Caddy pegará certificados Let's Encrypt automaticamente para `${DOMAIN}`.
Aponte o DNS do domínio para o IP da VPS antes deste passo.

### 3.4 Primeiro deploy (BLUE)

```bash
chmod +x deploy/scripts/*.sh
echo "blue" > deploy/state/active_color   # marca cor inicial

# Pull + sobe BLUE
docker compose --env-file .env.production \
  -f deploy/compose/docker-compose.blue.yml up -d

# Validar
bash deploy/scripts/healthcheck.sh blue
```

A partir daqui o sistema está em produção. Próximas atualizações usam `deploy-safe.sh`.

---

## 4. Deploy de uma nova versão

```bash
cd /opt/condosync/DevSantiago/condosync

# 1) Garanta que a imagem nova já está publicada no registry
#    (CI deve ter empurrado condosync-api:vX.Y.Z e condosync-web:vX.Y.Z)

# 2) Execute o deploy
bash deploy/scripts/deploy-safe.sh --tag v1.42.0
```

O script faz, sequencialmente:

1. **Lock** — impede deploys concorrentes
2. **Pré-flight** — Postgres/Redis/Caddy saudáveis, cor ativa OK
3. **Backup** — `pg_dump -Fc` + tar dos volumes (validado com `pg_restore --list`)
4. **Pull** — imagens da cor IDLE
5. **Migrations** — `prisma migrate deploy` em container efêmero (expand-only)
6. **Up IDLE** — sobe api/worker/web da cor idle, espera healthchecks
7. **Smoke interno** — `/health` direto no container + Caddy alcançando o backend
8. **Caddy reload** — reescreve `active-api.caddy` + `active-web.caddy` e dá `caddy reload` (atômico, mantém conexões abertas)
9. **Smoke externo** — bate em `https://${DOMAIN}` com retry; rollback automático se falhar
10. **Drena cor antiga** — `docker stop` (default) ou mantém rodando (`--keep-old running`)
11. **Atualiza state** — `active_color`, `previous_color`, `last_deploy.json`

### Flags úteis

| Flag | Default | Quando usar |
|---|---|---|
| `--tag <v>` | obrigatório | Tag da imagem nova |
| `--skip-migrate` | false | Se já rodou migrations manualmente |
| `--keep-old running` | `stopped` | Rollback **instantâneo** (caro: 2x recursos) |
| `--keep-old removed` | `stopped` | Liberar recursos (rollback exige redeploy) |
| `ASSUME_YES=1` | unset | Pular confirmações (CI) |
| `HEALTH_TIMEOUT=300` | 180 | Apps lentas para subir |

---

## 5. Rollback

### 5.1 Rollback rápido (segundos) — cor antiga ainda existe

```bash
bash deploy/scripts/rollback.sh
```

Sequência:
1. Lê `previous_color`
2. `docker start` dos containers antigos (se em `stopped`)
3. Espera healthcheck
4. Reescreve snippet do Caddy + `caddy reload`
5. Smoke externo de validação
6. Atualiza state (active e previous trocam)

Tempo típico: **5-30s** se containers estavam `stopped`, **<3s** se `running`.

### 5.2 Rollback profundo — cor antiga foi removida

Se foi feito `--keep-old removed`:

```bash
# Redeploy com a tag anterior
bash deploy/scripts/deploy-safe.sh --tag v1.41.0 --skip-migrate
```

> ⚠ Se a v1.42 aplicou migration destrutiva (CONTRACT), `--skip-migrate` não basta — precisa `restore.sh` do dump pré-deploy.

### 5.3 Rollback de banco — usar somente se migrations foram destrutivas

```bash
# Recupera o dump pre-deploy mais recente
ls -lt deploy/backups/postgres/ | head

bash deploy/scripts/restore.sh --pg deploy/backups/postgres/condosync-YYYYMMDDTHHMMSSZ.dump \
                               --volumes deploy/backups/volumes/condosync-volumes-YYYYMMDDTHHMMSSZ.tar.gz
```

**O restore é destrutivo.** Pede confirmação digitada `RESTORE-PRODUCAO`. Tira snapshot pré-restore antes (caso queira reverter o restore).

---

## 6. Backup

### 6.1 Manual

```bash
bash deploy/scripts/backup.sh                # postgres + volumes
bash deploy/scripts/backup.sh --pg-only      # só postgres (rápido)
```

Saída em `deploy/backups/postgres/condosync-<TS>.dump` + manifest.

### 6.2 Automático (cron na VPS)

```bash
# crontab -e (root)
0 */6 * * * cd /opt/condosync/DevSantiago/condosync && bash deploy/scripts/backup.sh >> /var/log/condosync-backup.log 2>&1
```

A cada 6h. Retenção default: **30 backups OU 30 dias** (o que for menor). Ajuste com `RETENTION_DAYS` / `RETENTION_KEEP`.

### 6.3 Off-site (recomendado)

Adicione um sync para storage remoto (S3, B2, R2, Hostinger Object Storage):

```bash
# Adicionar a um cron diario:
rclone sync deploy/backups remote:condosync-backups --max-age 7d
```

---

## 7. Restore

```bash
# Mais recente
bash deploy/scripts/restore.sh --latest

# Específico
bash deploy/scripts/restore.sh --pg deploy/backups/postgres/condosync-20260508T120000Z.dump \
                               --volumes deploy/backups/volumes/condosync-volumes-20260508T120000Z.tar.gz
```

O script:
1. Tira snapshot pré-restore (antiparanoia)
2. Para apps (postgres/redis/caddy permanecem)
3. Mata conexões → DROP DATABASE → CREATE DATABASE → pg_restore
4. Restaura volumes (se fornecido)
5. Religa apps na cor ativa atual
6. Valida healthchecks

Tempo: depende do tamanho do dump (1GB ≈ 2-5min).

---

## 8. Healthcheck manual

```bash
bash deploy/scripts/healthcheck.sh                 # cor ativa
bash deploy/scripts/healthcheck.sh blue            # cor específica
bash deploy/scripts/healthcheck.sh --external      # só smoke externo
```

Verifica:
- Postgres / Redis / Caddy `healthy`
- API / Worker / Web da cor alvo `healthy`
- Smoke `/health` interno
- `SELECT 1` no Postgres
- `PING` no Redis
- Smoke externo via `https://${DOMAIN}/__edge_health` e `/api/v1/health`

---

## 9. Troca blue ↔ green (sem novo deploy)

```bash
# Util para drills de rollback ou validar stack idle
bash deploy/scripts/rollback.sh
```

Ou manualmente (operação de emergência, **não use em produção sem motivo**):

```bash
docker exec condosync-caddy sh -c '
  cat > /etc/caddy/snippets/active-api.caddy <<EOF
reverse_proxy condosync-api-green:3333 { health_uri /health health_interval 5s }
EOF'
docker exec condosync-caddy caddy reload --config /etc/caddy/Caddyfile
```

(Mas o `rollback.sh` faz isso de forma segura, com healthcheck antes do switch.)

---

## 10. Atualização do sistema operacional

Postgres/Redis/Caddy não são derrubados em deploy de aplicação. Quando precisar atualizá-los:

```bash
# 1) Backup completo
bash deploy/scripts/backup.sh

# 2) Pull das imagens novas
docker compose --env-file .env.production -f deploy/compose/docker-compose.shared.yml pull

# 3) Recreate UM serviço por vez
docker compose --env-file .env.production -f deploy/compose/docker-compose.shared.yml up -d caddy
# Validar: bash deploy/scripts/healthcheck.sh

docker compose --env-file .env.production -f deploy/compose/docker-compose.shared.yml up -d redis
# Validar

# Postgres exige janela de manutencao:
# - Avise usuarios
# - Pare apps: docker stop condosync-api-* condosync-worker-* condosync-web-*
# - Update postgres: docker compose ... up -d postgres
# - Aguarde healthy
# - Religue apps: docker start condosync-api-<active>  (etc.)
```

> ⚠ Major version do Postgres exige `pg_upgrade` ou dump+restore.

---

## 11. Checklist pré-deploy

- [ ] Healthcheck atual verde: `bash deploy/scripts/healthcheck.sh`
- [ ] Build CI verde para a tag alvo
- [ ] Imagens publicadas no registry (`docker manifest inspect ${REGISTRY}/condosync-api:<tag>`)
- [ ] Migrations da release são **expand-only** (nada de DROP/RENAME/SET NOT NULL sem CHECK validado prévio)
- [ ] Backup ≤6h disponível (`ls -lt deploy/backups/postgres | head -3`)
- [ ] Disco com ≥3GB livre (`df -h /var/lib/docker`)
- [ ] CHANGELOG atualizado e tag git pushada
- [ ] Comunicado em canal interno
- [ ] Janela de baixa demanda escolhida (se mudança não-trivial)

## 12. Checklist pós-deploy

- [ ] `bash deploy/scripts/healthcheck.sh` 100% verde
- [ ] Smoke manual de fluxos críticos (login, dashboard, criar charge)
- [ ] Sentry sem novos issues P0/P1 nos últimos 30min
- [ ] Métricas (se Prometheus): p95 ≤ baseline × 1.2; 5xx ≤ baseline + 0.1pp
- [ ] Logs Caddy sem 5xx em loop: `docker logs condosync-caddy --since 10m | grep -c '"status":5'`
- [ ] Workers consumindo (queue depth não crescendo): `docker exec condosync-redis redis-cli -a "$REDIS_PASSWORD" LLEN bull:notification:wait`
- [ ] `last_deploy.json` reflete a tag esperada
- [ ] Cor antiga ainda em standby (rollback disponível)
- [ ] Confirmar saúde 1h depois antes de remover cor antiga

---

## 13. Troubleshooting

### Caddy não consegue obter certificado

```bash
docker logs condosync-caddy --tail 100 | grep -i acme
# Causas comuns:
# - DNS nao apontando para a VPS: dig +short ${DOMAIN}
# - Porta 80 bloqueada por firewall: ufw status
# - Rate limit Lets Encrypt (>5 falhas em 1h): aguardar
```

### Deploy trava em "Aguardando api healthy"

```bash
docker logs --tail 200 condosync-api-<idle>
# Causas comuns:
# - DATABASE_URL incorreto
# - Migration nova exige coluna que ainda nao existe -> rodar migrate
# - REDIS_PASSWORD errado
# - APP_ENCRYPTION_KEY incompativel com dados ja cifrados (rotacao mal feita)
```

### Smoke externo falha mas interno passa

```bash
docker exec condosync-caddy wget -qO- http://condosync-api-<idle>:3333/health
# Se OK, Caddy rede ok. Verifique:
docker exec condosync-caddy cat /etc/caddy/snippets/active-api.caddy
# Validar Caddyfile:
docker exec condosync-caddy caddy validate --config /etc/caddy/Caddyfile
# Forcar reload:
docker exec condosync-caddy caddy reload --config /etc/caddy/Caddyfile
```

### Lock orfao apos crash

```bash
ls -la deploy/state/.deploy.lock
# Se o PID nao existe mais:
rm deploy/state/.deploy.lock
```

### Backup falhando ("dump suspeitosamente pequeno")

```bash
docker logs condosync-postgres --tail 50
docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" condosync-postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT count(*) FROM pg_stat_activity"
# Banco em recovery? Connection refused? Investigue antes de qualquer deploy.
```

### Workers acumulando jobs

```bash
docker exec condosync-redis redis-cli -a "$REDIS_PASSWORD" --no-auth-warning \
  --scan --pattern 'bull:*:wait' | head
# Verificar se worker esta processando:
docker logs condosync-worker-<active> --tail 100
# Verificar leader lock:
docker exec condosync-redis redis-cli -a "$REDIS_PASSWORD" GET leader:schedulers
```

### Disco cheio

```bash
docker system df
# Limpar imagens antigas (CUIDADO: nao remova a tag em uso):
docker image prune -a --filter "until=168h"   # >7 dias sem uso
# Logs Docker:
truncate -s 0 /var/lib/docker/containers/*/*-json.log
# Backups antigos: deploy/scripts/backup.sh ja aplica retencao
```

---

## 14. Segurança aplicada

- **Postgres** sem `ports:` exposto. Apenas alcançável via rede `condosync_data` (`internal: true`).
- **Redis** com `requirepass`, sem `ports:`, mesma rede interna.
- **APP_ENCRYPTION_KEY** criptografa `gatewayKey` no banco (envelope AES-256-GCM com suporte a rotação via `_PREVIOUS`).
- **JWT** com chaves separadas para access/refresh; suporte a `_PREVIOUS` permite rotação sem invalidar tokens em circulação.
- **TLS** automático via Caddy + Let's Encrypt; HSTS preload.
- **Headers** de segurança aplicados (CSP via app, HSTS/X-Frame-Options/XCTO/RP/PP via Caddy).
- **Caddy admin API** exposta só em `127.0.0.1` (loopback do host).
- **firewall** UFW restringe a 22/80/443.
- **fail2ban** ativo no SSH.
- **Logs** rotativos (`max-size: 50m`, `max-file: 5`).
- **Volumes** com nomes externos — sobrevivem a `docker compose down`.
- **Restart policies** `unless-stopped` em todos os serviços críticos.
- **Senhas** geradas localmente, nunca em git, `.env.production` em `chmod 600`.

---

## 15. Observabilidade (preparada)

Stack já instrumentada:

- **Sentry** — `SENTRY_DSN` no `.env.production` ativa captura de erros (backend e workers)
- **OpenTelemetry** — `OTEL_EXPORTER_OTLP_ENDPOINT` ativa export de traces (recomendo Grafana Cloud free tier)
- **Logs estruturados JSON** — Caddy + apps emitem JSON em stdout; coletáveis por Promtail/Vector/Fluent Bit
- **Métricas Prometheus** — endpoint `/metrics` na API (auth fail-closed em produção; expor via Caddy só para Prometheus interno)

Setup recomendado (futuro próximo):

```bash
# Grafana Cloud free tier: 10k series, 50GB logs, 50GB traces
# - alloy (agente unificado) coletando docker logs + scrape de /metrics
# - alerts: SLO multi-burn-rate (ja em ops/prometheus/slos.yml)
```

---

## 16. Estratégia de evolução

| Fase | Ganho | Quando |
|---|---|---|
| Atual (single-VPS, blue/green) | Zero downtime, rollback rápido, integridade | Hoje |
| + Object storage off-site para backups | Resiliência a falha de disco/VPS | +1 semana |
| + Grafana Cloud (logs, traces, métricas, alerts) | MTTR reduzido | +2 semanas |
| + Read-replica Postgres (logical replication para 2ª VPS) | Tolerância a falha de DB primário | +1-2 meses |
| + CDN na frente do Caddy (Cloudflare) | DDoS protection + cache estático | +1 mês |
| + 2ª VPS com keepalived/anycast | HA verdadeira | +3-6 meses (quando volume justificar) |
| Migração para Kubernetes / Railway | Multi-region, autoscale | Quando esta arquitetura travar (>10k usuários ativos / >100 condomínios pagantes) |

A arquitetura atual sustenta confortavelmente **algumas centenas de condomínios** com SLA 99.9%. Não migre antes da hora — a complexidade de K8s introduz mais riscos que resolve nesse porte.

---

## 17. Comandos rápidos (cheat sheet)

```bash
# Status geral
docker ps --format 'table {{.Names}}\t{{.Status}}'
cat deploy/state/active_color
cat deploy/state/last_deploy.json

# Logs ao vivo
docker logs -f condosync-api-$(cat deploy/state/active_color)
docker logs -f condosync-caddy

# Smoke
curl -fsS https://${DOMAIN}/__edge_health
curl -fsS https://${DOMAIN}/api/v1/health

# Forçar reload de Caddy
docker exec condosync-caddy caddy reload --config /etc/caddy/Caddyfile

# Conectar no Postgres (ad-hoc, somente leitura)
docker exec -it -e PGPASSWORD="$POSTGRES_PASSWORD" condosync-postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"

# Conectar no Redis
docker exec -it condosync-redis redis-cli -a "$REDIS_PASSWORD"

# Backup ad-hoc
bash deploy/scripts/backup.sh

# Deploy
bash deploy/scripts/deploy-safe.sh --tag v1.42.0

# Rollback
bash deploy/scripts/rollback.sh

# Health
bash deploy/scripts/healthcheck.sh
```
