# Runbook — Backup, Restore e Disaster Recovery

> Este documento define a estratégia operacional de backup, restore
> e DR do CondoSync. **Sem drill mensal, este doc é ficção** —
> agendar teste em staging no calendário.

## SLOs operacionais

| Indicador | Alvo |
|---|---|
| **RPO** (Recovery Point Objective) | ≤ 1 hora |
| **RTO** (Recovery Time Objective) | ≤ 4 horas |
| Frequência de backup full | Diário |
| Frequência de WAL archiving / PITR | Contínuo (5min granularidade) |
| Retenção snapshot diário | 7 dias |
| Retenção snapshot semanal | 4 semanas |
| Retenção mensal | 12 meses |
| Drill de restore | Mensal em staging |

## 1. Postgres — Backup

### Em Railway (managed)

Railway Postgres tem snapshots automáticos diários. Confirmar:

1. Settings → Postgres service → Backups.
2. Ativar **"Daily backups"** (incluso no plano Pro+).
3. Retenção 7 dias é o default.

**Limitações:**
- Sem PITR granular (snapshots = imagem do dia).
- Restore só recria nova instância — DOWNTIME da DATABASE_URL.
- Não há WAL archiving exposto ao cliente.

**Mitigação:** complementar com backup externo via `pg_dump`
agendado.

### Backup externo (recomendado para complemento)

Cron diário em ambiente próprio (GitHub Actions scheduled, AWS
Lambda, ou VPS dedicado) que executa:

```bash
#!/usr/bin/env bash
set -euo pipefail
DATE=$(date -u +%Y%m%dT%H%M%SZ)
PGPASSWORD="$DATABASE_PASSWORD" pg_dump \
  --host="$DATABASE_HOST" \
  --port="$DATABASE_PORT" \
  --username="$DATABASE_USER" \
  --format=custom \
  --compress=9 \
  --verbose \
  --file="/tmp/condosync-${DATE}.dump" \
  condosync

# Cifrar com chave assimétrica (recipient-only decrypt)
gpg --encrypt --recipient backup@condosync.com.br \
  --output "/tmp/condosync-${DATE}.dump.gpg" \
  "/tmp/condosync-${DATE}.dump"
rm "/tmp/condosync-${DATE}.dump"

# Upload para S3 com object lock (compliance/imutável)
aws s3 cp "/tmp/condosync-${DATE}.dump.gpg" \
  "s3://condosync-backups/db/${DATE}.dump.gpg" \
  --storage-class GLACIER_IR \
  --metadata "checksum=$(sha256sum /tmp/condosync-${DATE}.dump.gpg | cut -d' ' -f1)"

rm "/tmp/condosync-${DATE}.dump.gpg"
```

Workflow GitHub Actions (`.github/workflows/backup-pg.yml`):

```yaml
name: Backup PG diário
on:
  schedule:
    - cron: "0 4 * * *"  # 04:00 UTC = 01:00 BRT (baixa atividade)
  workflow_dispatch:
jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install postgresql-client
        run: |
          sudo apt-get update
          sudo apt-get install -y postgresql-client gnupg
      - name: Run backup script
        env:
          DATABASE_HOST: ${{ secrets.PG_HOST }}
          DATABASE_PORT: ${{ secrets.PG_PORT }}
          DATABASE_USER: ${{ secrets.PG_USER }}
          DATABASE_PASSWORD: ${{ secrets.PG_PASSWORD }}
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          GPG_PUBLIC_KEY: ${{ secrets.GPG_PUBLIC_KEY }}
        run: |
          echo "$GPG_PUBLIC_KEY" | gpg --import
          ./scripts/backup-pg.sh
```

### Validação automatizada (não pula)

Cada backup é seguido de smoke test:

```bash
# Restaura para PG ephemeral
docker run -d --name pg-validate -e POSTGRES_PASSWORD=test -p 5433:5432 postgres:16-alpine
sleep 5
gpg --decrypt /tmp/condosync-${DATE}.dump.gpg | pg_restore -h localhost -p 5433 -U postgres -d postgres --create
docker exec pg-validate psql -U postgres -d condosync -c "SELECT count(*) FROM users; SELECT count(*) FROM charges;"
docker rm -f pg-validate
```

Falha aqui = page on-call. Backup corrompido é pior que sem backup
(falsa segurança).

## 2. Postgres — Restore

### Cenário 1: Restore completo (último backup)

```bash
# 1. Confirmar último backup íntegro
aws s3 ls s3://condosync-backups/db/ | tail -3

# 2. Subir DB destino limpo
psql -h NEW_HOST -U postgres -c "CREATE DATABASE condosync_new;"

# 3. Decrypt + restore
aws s3 cp s3://condosync-backups/db/<DATE>.dump.gpg /tmp/
gpg --decrypt /tmp/<DATE>.dump.gpg | \
  pg_restore -h NEW_HOST -U postgres -d condosync_new --no-owner --verbose

# 4. Validar
psql -h NEW_HOST -U postgres -d condosync_new <<EOF
SELECT count(*) FROM users;
SELECT count(*) FROM charges WHERE status='PENDING';
SELECT max("createdAt") FROM audit_logs;
EOF

# 5. Trocar DATABASE_URL no Railway
railway variables set DATABASE_URL=postgresql://...condosync_new

# 6. Forçar deploy/restart das réplicas
railway redeploy api
railway redeploy worker
```

**Tempo esperado:** 30-90min para condosync com ~10GB.

### Cenário 2: PITR (point-in-time recovery)

Não disponível no Railway managed. Se exigido, migrar para AWS RDS
ou Crunchy Bridge com WAL archiving.

### Cenário 3: Recuperação parcial (1 tabela)

Quando 1 dump diário é suficiente mas só 1 tabela está corrompida:

```bash
gpg --decrypt /tmp/<DATE>.dump.gpg > /tmp/dump
pg_restore -t charges --no-owner --schema-only /tmp/dump > /tmp/charges-schema.sql
pg_restore -t charges --no-owner --data-only /tmp/dump > /tmp/charges-data.sql

# Em DB de produção (ATENÇÃO — janela curta):
psql -h PROD_HOST -U postgres -d condosync <<EOF
BEGIN;
ALTER TABLE charges RENAME TO charges_corrupted;
\i /tmp/charges-schema.sql
\i /tmp/charges-data.sql
-- VALIDAR antes do COMMIT:
SELECT count(*) FROM charges;
COMMIT;  -- ou ROLLBACK
EOF
```

## 3. Redis

### Realidade

Redis é VOLÁTIL. Nunca foi source-of-truth — guarda:
- BullMQ jobs (perda = job não processado).
- Rate limit counters (perda = todos resetam).
- Leader lock (perda = re-eleição instantânea).
- Socket.IO pub/sub (transient — sem perda persistente).

### Mitigação

Para BullMQ, **idempotência dos jobs** é o que protege. Workers
podem reprocessar sem efeito colateral graças a:
- `processedAt` em WebhookEvent.
- UNIQUE INDEX `fin_tx_charge_income`.
- Atomic increment em estoque + CHECK constraint.

Se Redis morrer:
1. Nada que estiver em flight é recuperado — operadores reapresentam.
2. Webhook Asaas: rows pendentes em `webhook_events WHERE
   processedAt IS NULL` podem ser re-enfileiradas via:
   ```sql
   SELECT id FROM webhook_events
   WHERE provider='asaas' AND processedAt IS NULL
     AND receivedAt < now() - interval '5 minutes'
   ORDER BY receivedAt ASC;
   ```
   E enfileirar manualmente via script `scripts/redrive-webhooks.ts`
   (a criar).
3. Cron schedulers: leader vence eleição na nova Redis em <1min;
   próximo tick acontece normal.

### Backup Redis (opcional)

Para máxima resiliência, configurar Redis com `appendonly yes` +
RDB snapshots para disco persistente. Em Railway Redis managed,
isso já é o default. **Sem ação adicional.**

## 4. Disaster Recovery

### Cenários

#### DR-1: Postgres corrompido / dropado

1. Detectar (alerta: `pg_isready` falha 5min seguidos).
2. Comunicar status page (em ferramenta separada).
3. Restore do último backup íntegro (Cenário 1 acima).
4. Estimar perda de dados: `last_backup_time → now()`.
5. RPO ≤ 1h se backup horário; ≤ 24h se diário (atual).
6. RTO ≤ 4h: 1h restore + 1h validação + 2h reconciliação manual
   (cobrança duplicada, etc).

#### DR-2: Redis indisponível

1. Detectar (BullMQ workers logam erros + alerta de leader_renew).
2. Provisionar nova Redis (Railway: 1 click; AWS ElastiCache: 10min).
3. Atualizar REDIS_URL → redeploy.
4. Drenar `webhook_events` pendentes via script (acima).
5. RPO: jobs em flight perdidos (idempotência mitiga); até 5min
   de tickets/notifications atrasados.

#### DR-3: Provider (Railway) inteiro down

1. Multi-region não está implementado — esta é a maior dívida de DR.
2. Mitigação atual: backup PG externo (S3) permite restore em
   provider alternativo, mas exige:
   - Imagens Docker em registry externo (Docker Hub, GHCR).
   - DNS configurado para apontar para novo provider.
   - Secrets re-provisioned.
3. RTO neste cenário: **8-24h** com trabalho operacional manual.

**ADR sugerido**: `docs/adr/0005-dr-multi-region.md` documentando
o tradeoff (multi-region custa 2-3× a infra atual; postergado até
SLO de 99.9% ser exigido por contrato).

#### DR-4: Migrations falharam em produção

1. Migration aplicada em parte → schema inconsistente.
2. Em incidente:
   ```bash
   # Ver estado atual
   psql -c "SELECT * FROM _prisma_migrations ORDER BY started_at DESC LIMIT 5;"
   # Marcar como rolled back (Prisma)
   prisma migrate resolve --rolled-back <migration_name>
   # Aplicar SQL DOWN manual
   psql < /path/to/migration_down.sql
   ```
3. Se DOWN não existe (migration antiga), restore parcial da
   tabela afetada via Cenário 3.
4. **Prevenção**: cada migration destrutiva tem `down.sql` formal
   no PR (ver `docs/MIGRATIONS.md`).

#### DR-5: Perda parcial de dados financeiros

1. Cenário: bug derruba 100 charges como CANCELED por engano.
2. Validar via `audit_logs`:
   ```sql
   SELECT * FROM audit_logs
   WHERE entityType='charge' AND action='UPDATE'
     AND createdAt > '2026-05-08'::date
   ORDER BY createdAt DESC LIMIT 1000;
   ```
3. Restore parcial (Cenário 3) DA TABELA charges em DB temporário.
4. Reconciliar: `SELECT id FROM staging.charges EXCEPT SELECT id
   FROM prod.charges WHERE status='CANCELED';`
5. Aplicar UPDATE manual com aprovação dupla (engenharia + financeiro).

## 5. Drill operacional (mensal)

Calendar invite recorrente — nunca pula:

1. Sexta-feira do mês, 14:00 BRT (baixa atividade).
2. Seguir Cenário 1 contra `staging` real.
3. Cronometrar tempo total restore + validação.
4. Documentar achados em `docs/runbooks/drills/<YYYY-MM>.md`.
5. Atualizar este runbook se procedimento mudou.

## 6. Comunicação durante incidente

- **Status page**: ferramenta separada (statuspage.io ou similar).
- **Slack #incidents**: thread única durante todo o incidente.
- **Cliente**: comunicação somente após RTO comprometido (>2h
  visíveis para usuários).
- **Pós-mortem**: em ≤72h após incidente, em
  `docs/postmortems/<YYYY-MM-DD>-<title>.md`.

## 7. Plano de incidentes — checklist do on-call

```
[ ] Confirmou que NÃO é flap transitório (>5min sintomas)
[ ] Abriu thread #incidents no Slack
[ ] Definiu IC (Incident Commander) — quem dirige
[ ] Identificou impacto: usuários afetados, fluxos quebrados
[ ] Comunicou status page em <15min
[ ] Aplicou mitigação (rollback, scale-up, etc)
[ ] Confirmou recuperação (smoke test usuário real)
[ ] Encerrou incidente após 30min de estabilidade
[ ] Agendou pós-mortem em ≤72h
```

## Arquivos relacionados

- `docs/MIGRATIONS.md` — política expand/contract.
- `docs/runbooks/sprint-*.md` — runbooks de promoção.
- `.github/workflows/backup-pg.yml` — backup diário (a criar).
- `scripts/backup-pg.sh` — script (a criar).
- `scripts/redrive-webhooks.ts` — drenar webhooks pendentes (a criar).
