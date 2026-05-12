#!/usr/bin/env bash
# =============================================================================
# CondoSync — restore de backup
# =============================================================================
# Baixa o backup mais recente (ou o key específico passado) e aplica.
# CUIDADO: drop+create do schema public por default. Tem flag --safe para
# restaurar em DB temporário e comparar antes.
#
# Uso:
#   ./restore.sh latest                              # último daily
#   ./restore.sh s3://bucket/prod/daily/<key>.sql.gz # key específica
#   ./restore.sh latest --safe                       # restaura em "_restore_test"
# =============================================================================

set -euo pipefail

TARGET="${1:-latest}"
SAFE="${2:-}"

PREFIX="${BACKUP_PREFIX:-prod}"
[ -n "${S3_BUCKET:-}" ] || { echo "S3_BUCKET vazio"; exit 1; }

AWS_EXTRA=()
[ -n "${S3_ENDPOINT_URL:-}" ] && AWS_EXTRA+=(--endpoint-url "${S3_ENDPOINT_URL}")

if [ "$TARGET" = "latest" ]; then
  KEY=$(aws s3 ls "s3://${S3_BUCKET}/${PREFIX}/daily/" "${AWS_EXTRA[@]}" \
        | sort | tail -1 | awk '{print $NF}')
  [ -n "$KEY" ] || { echo "Nenhum backup encontrado"; exit 1; }
  S3_URI="s3://${S3_BUCKET}/${PREFIX}/daily/${KEY}"
else
  S3_URI="$TARGET"
fi

TMP=$(mktemp /tmp/condosync-restore-XXXX.sql.gz)
echo ">> Baixando ${S3_URI}"
aws s3 cp "${S3_URI}" "$TMP" "${AWS_EXTRA[@]}"

if [ "$SAFE" = "--safe" ]; then
  TARGET_DB="${PGDATABASE}_restore_test_$(date +%s)"
  echo ">> Modo --safe: restaurando em DB temporário ${TARGET_DB}"
  PGPASSWORD="${PGPASSWORD}" createdb \
    -h "${PGHOST:-localhost}" -p "${PGPORT:-5432}" -U "${PGUSER:-condosync}" \
    "${TARGET_DB}"
else
  TARGET_DB="${PGDATABASE}"
  echo ">> Restaurando em ${TARGET_DB} (PRODUÇÃO)"
  read -rp "Tem certeza? (digite 'yes-restore-prod'): " CONFIRM
  [ "$CONFIRM" = "yes-restore-prod" ] || { echo "Abortado"; exit 1; }
  echo ">> Limpando schema public"
  PGPASSWORD="${PGPASSWORD}" psql \
    -h "${PGHOST:-localhost}" -p "${PGPORT:-5432}" -U "${PGUSER:-condosync}" \
    -d "${TARGET_DB}" \
    -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
fi

echo ">> Aplicando dump"
gunzip -c "$TMP" | PGPASSWORD="${PGPASSWORD}" psql \
  -h "${PGHOST:-localhost}" -p "${PGPORT:-5432}" -U "${PGUSER:-condosync}" \
  -d "${TARGET_DB}" \
  --single-transaction \
  --set ON_ERROR_STOP=on

rm -f "$TMP"
echo ">> Restore concluído em ${TARGET_DB}"
