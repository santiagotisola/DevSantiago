# Backup e DR — CondoSync

## RPO / RTO definidos

| Tipo | RPO | RTO | Retenção |
|---|---|---|---|
| Diário | 24h | 30min (restore em DB novo) | 30 dias |
| Semanal | 7d | 30min | 90 dias |
| Mensal | 30d | 30min | 365 dias |
| Snapshot VPS | 7d | 5min | 4 mais recentes |

## Setup na VPS Hostinger (produção)

### 1. Criar conta S3-compatível
Recomendado: **Backblaze B2** (US$0,005/GB/mês, free tier 10GB) ou **Cloudflare R2**.

```bash
# Backblaze: criar bucket + application key em https://secure.backblaze.com/b2_buckets.htm
# Anotar: keyID, applicationKey, bucketName, endpoint (us-west-002 etc)
```

### 2. Instalar deps na VPS
```bash
apt-get install -y postgresql-client awscli
```

### 3. Configurar credenciais
```bash
cat > /opt/condosync/backup.env <<'EOF'
PGHOST=localhost
PGPORT=5432
PGUSER=condosync
PGPASSWORD=...
PGDATABASE=condosync

S3_BUCKET=condosync-backups
S3_ENDPOINT_URL=https://s3.us-west-002.backblazeb2.com
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

BACKUP_PREFIX=prod
EOF
chmod 600 /opt/condosync/backup.env
```

### 4. Copiar scripts e dar permissão
```bash
cp -r /opt/condosync/condosync/backup /opt/condosync/
chmod +x /opt/condosync/backup/backup.sh /opt/condosync/backup/restore.sh
```

### 5. Cron
```bash
crontab -e
```
Adicionar:
```cron
# Backup CondoSync — diário 03:00, semanal domingo 04:00, mensal dia 1 às 05:00
0 3 * * *  . /opt/condosync/backup.env; /opt/condosync/backup/backup.sh daily   >> /var/log/condosync-backup.log 2>&1
0 4 * * 0  . /opt/condosync/backup.env; /opt/condosync/backup/backup.sh weekly  >> /var/log/condosync-backup.log 2>&1
0 5 1 * *  . /opt/condosync/backup.env; /opt/condosync/backup/backup.sh monthly >> /var/log/condosync-backup.log 2>&1
```

### 6. Snapshot semanal do VPS via Hostinger MCP
Não rola por cron na VPS — é chamada ao painel Hostinger. Recomendo configurar via o agendamento da Hostinger OU via assistente IA chamando `VPS_createSnapshotV1` semanalmente.

## Verificação (primeira execução)

```bash
. /opt/condosync/backup.env
/opt/condosync/backup/backup.sh daily
# Saída esperada:
#   [...] Iniciando pg_dump
#   [...] Dump OK: ~X MB
#   [...] Upload para s3://...
#   [...] Backup daily concluído
```

Confirmar no painel B2/R2/S3 que o objeto está lá.

## Teste de restore (drill mensal — RECOMENDADO)

```bash
. /opt/condosync/backup.env
/opt/condosync/backup/restore.sh latest --safe
# Cria DB temporário condosync_restore_test_<ts>, aplica dump.
# Validar:
psql -h localhost -U condosync -d condosync_restore_test_<ts> -c "SELECT count(*) FROM users;"
# Drop quando terminar:
dropdb -h localhost -U condosync condosync_restore_test_<ts>
```

## Restore em emergência (PROD perdida)

```bash
. /opt/condosync/backup.env
/opt/condosync/backup/restore.sh latest
# Prompt de confirmação: digite "yes-restore-prod"
```

Para um backup específico (ex: 3 dias atrás):
```bash
aws s3 ls s3://${S3_BUCKET}/${BACKUP_PREFIX}/daily/ --endpoint-url ${S3_ENDPOINT_URL}
/opt/condosync/backup/restore.sh s3://...sql.gz
```

## Alertas

A falha do cron precisa virar alerta. Sugestões:
- Adicionar `|| curl -X POST https://hc-ping.com/<uuid>/fail` no fim do cron (healthchecks.io grátis).
- OU Sentry: adicionar `sentry-cli send-event` no rescue do shell script.
- Configurar `MAILTO=` no crontab para Postfix local enviar erros do cron por email.

## Lacunas conhecidas (TODO)

- [ ] Encryption-at-rest no bucket (ex: B2 com cifra de servidor — ativar nas configurações do bucket).
- [ ] Encryption client-side antes do upload (ex: `gpg -c` antes do `aws s3 cp`).
- [ ] Backup do Redis (BullMQ states — perda OK em maior parte, mas se houver scheduled jobs longos vale).
- [ ] Backup dos uploads do user (`/app/uploads` em container) — se persistido em volume, criar script paralelo `backup-uploads.sh`.
- [ ] Monitoring de drift de tamanho (alerta se backup ficar 50% menor que o anterior — indica truncamento).
