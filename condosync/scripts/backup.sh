#!/bin/bash
# CondoSync - PostgreSQL Backup Script
# Usage: ./scripts/backup.sh [daily|weekly|manual]
# Cron example (daily at 2AM): 0 2 * * * /opt/condosync/scripts/backup.sh daily

set -euo pipefail

# ─── Configuration ───────────────────────────────────────────────────────────
BACKUP_DIR="${BACKUP_DIR:-/opt/condosync/backups}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-condosync}"
DB_USER="${DB_USER:-condosync}"
RETENTION_DAILY=7    # Keep 7 daily backups
RETENTION_WEEKLY=4   # Keep 4 weekly backups
RETENTION_MANUAL=10  # Keep 10 manual backups

BACKUP_TYPE="${1:-manual}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${BACKUP_TYPE}/condosync_${BACKUP_TYPE}_${TIMESTAMP}.sql.gz"

# ─── Functions ───────────────────────────────────────────────────────────────

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"; }

ensure_dirs() {
  mkdir -p "${BACKUP_DIR}/daily"
  mkdir -p "${BACKUP_DIR}/weekly"
  mkdir -p "${BACKUP_DIR}/manual"
}

do_backup() {
  log "Starting ${BACKUP_TYPE} backup of ${DB_NAME}..."
  
  pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --no-owner --no-acl --clean --if-exists \
    | gzip > "$BACKUP_FILE"
  
  local size=$(du -sh "$BACKUP_FILE" | cut -f1)
  log "Backup completed: $BACKUP_FILE ($size)"
}

cleanup() {
  local dir="$1"
  local keep="$2"
  local count=$(find "$dir" -name "*.sql.gz" -type f | wc -l)
  
  if [ "$count" -gt "$keep" ]; then
    local to_delete=$((count - keep))
    log "Cleaning up: removing $to_delete old backups from $dir"
    find "$dir" -name "*.sql.gz" -type f -printf '%T@ %p\n' | \
      sort -n | head -n "$to_delete" | awk '{print $2}' | xargs rm -f
  fi
}

verify_backup() {
  if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
    log "Verification: OK (file exists and is non-empty)"
    return 0
  else
    log "ERROR: Backup file is missing or empty!"
    return 1
  fi
}

# ─── Main ────────────────────────────────────────────────────────────────────

ensure_dirs
do_backup
verify_backup

# Cleanup old backups
case "$BACKUP_TYPE" in
  daily)  cleanup "${BACKUP_DIR}/daily" "$RETENTION_DAILY" ;;
  weekly) cleanup "${BACKUP_DIR}/weekly" "$RETENTION_WEEKLY" ;;
  manual) cleanup "${BACKUP_DIR}/manual" "$RETENTION_MANUAL" ;;
esac

log "Done. Total backups: $(find ${BACKUP_DIR} -name '*.sql.gz' | wc -l)"
