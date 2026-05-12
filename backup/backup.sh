#!/usr/bin/env bash
# =============================================================================
# CondoSync — pg_dump + upload S3/B2
# =============================================================================
# Roda no VPS via cron. Faz dump comprimido + envia para object storage com
# retenção rotativa (diários 30d, semanais 90d, mensais 365d).
#
# Pré-requisitos:
#   - postgresql-client (pg_dump)
#   - awscli (aws-cli/2.x)
#   - acesso ao bucket S3 (ou compatível, ex: Backblaze B2, R2, Wasabi)
#
# Variáveis (preferir /opt/condosync/backup.env, source no início do cron):
#   PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE  — Postgres
#   S3_BUCKET                  — ex: condosync-backups
#   S3_ENDPOINT_URL            — opcional (B2/R2/Wasabi)
#   AWS_ACCESS_KEY_ID
#   AWS_SECRET_ACCESS_KEY
#   BACKUP_PREFIX              — ex: prod (separa ambientes no mesmo bucket)
#
# Crontab sugerido:
#   0 3 * * *  /opt/condosync/backup/backup.sh daily
#   0 4 * * 0  /opt/condosync/backup/backup.sh weekly
#   0 5 1 * *  /opt/condosync/backup/backup.sh monthly
# =============================================================================

set -euo pipefail

KIND="${1:-daily}"  # daily | weekly | monthly
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
TMPDIR="${TMPDIR:-/tmp}"
LOCAL_FILE="${TMPDIR}/condosync-${KIND}-${TIMESTAMP}.sql.gz"

# Retenção em dias por tipo
case "$KIND" in
  daily)   RETENTION_DAYS=30  ;;
  weekly)  RETENTION_DAYS=90  ;;
  monthly) RETENTION_DAYS=365 ;;
  *)       echo "Uso: $0 daily|weekly|monthly"; exit 1 ;;
esac

PREFIX="${BACKUP_PREFIX:-prod}"
S3_PATH="s3://${S3_BUCKET}/${PREFIX}/${KIND}/condosync-${TIMESTAMP}.sql.gz"

log() { printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"; }
fail() { log "FAIL: $*"; exit 1; }

[ -n "${S3_BUCKET:-}" ] || fail "S3_BUCKET vazio"
[ -n "${PGDATABASE:-}" ] || fail "PGDATABASE vazio"

# ── 1. Dump ────────────────────────────────────────────────────────
log "Iniciando pg_dump de ${PGDATABASE} (kind=${KIND})"
pg_dump \
  --host="${PGHOST:-localhost}" \
  --port="${PGPORT:-5432}" \
  --username="${PGUSER:-condosync}" \
  --dbname="${PGDATABASE}" \
  --format=plain \
  --no-owner \
  --no-acl \
  --verbose \
  2>/tmp/pgdump-${TIMESTAMP}.err \
  | gzip -9 > "${LOCAL_FILE}"

LOCAL_SIZE=$(stat -c%s "${LOCAL_FILE}" 2>/dev/null || stat -f%z "${LOCAL_FILE}")
[ "${LOCAL_SIZE}" -gt 1024 ] || fail "Dump suspeito (< 1KB). Veja /tmp/pgdump-${TIMESTAMP}.err"
log "Dump OK: ${LOCAL_FILE} ($(numfmt --to=iec ${LOCAL_SIZE} 2>/dev/null || echo ${LOCAL_SIZE}b))"

# ── 2. Upload ──────────────────────────────────────────────────────
AWS_EXTRA=()
[ -n "${S3_ENDPOINT_URL:-}" ] && AWS_EXTRA+=(--endpoint-url "${S3_ENDPOINT_URL}")

log "Upload para ${S3_PATH}"
aws s3 cp "${LOCAL_FILE}" "${S3_PATH}" \
  --storage-class STANDARD_IA \
  "${AWS_EXTRA[@]}" \
  || fail "Falha no upload"

# ── 3. Retenção ────────────────────────────────────────────────────
CUTOFF_EPOCH=$(date -u -d "-${RETENTION_DAYS} days" +%s 2>/dev/null \
              || date -u -v-"${RETENTION_DAYS}"d +%s)
log "Limpando objetos anteriores a ${RETENTION_DAYS} dias"
aws s3 ls "s3://${S3_BUCKET}/${PREFIX}/${KIND}/" "${AWS_EXTRA[@]}" 2>/dev/null \
  | while read -r line; do
      DATE_STR=$(awk '{print $1, $2}' <<< "$line")
      KEY=$(awk '{print $NF}' <<< "$line")
      [ -z "${KEY}" ] && continue
      OBJ_EPOCH=$(date -u -d "${DATE_STR}" +%s 2>/dev/null || echo 0)
      if [ "${OBJ_EPOCH}" -lt "${CUTOFF_EPOCH}" ] && [ "${OBJ_EPOCH}" -gt 0 ]; then
        log "Removendo: ${KEY}"
        aws s3 rm "s3://${S3_BUCKET}/${PREFIX}/${KIND}/${KEY}" "${AWS_EXTRA[@]}" || true
      fi
    done

# ── 4. Cleanup local ───────────────────────────────────────────────
rm -f "${LOCAL_FILE}" "/tmp/pgdump-${TIMESTAMP}.err"
log "Backup ${KIND} concluído"
