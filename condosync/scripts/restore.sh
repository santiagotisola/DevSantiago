#!/bin/bash
# CondoSync - PostgreSQL Restore Script
# Usage: ./scripts/restore.sh <backup_file.sql.gz>
# WARNING: This will DROP and recreate the database!

set -euo pipefail

# ─── Configuration ───────────────────────────────────────────────────────────
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-condosync}"
DB_USER="${DB_USER:-condosync}"

BACKUP_FILE="${1:-}"

# ─── Functions ───────────────────────────────────────────────────────────────

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"; }

usage() {
  echo "Usage: $0 <backup_file.sql.gz>"
  echo ""
  echo "Available backups:"
  find /opt/condosync/backups -name "*.sql.gz" -printf "  %T@ %Tc  %p\n" 2>/dev/null | sort -rn | head -10 | awk '{$1=""; print}'
  exit 1
}

# ─── Validation ──────────────────────────────────────────────────────────────

if [ -z "$BACKUP_FILE" ]; then
  usage
fi

if [ ! -f "$BACKUP_FILE" ]; then
  log "ERROR: File not found: $BACKUP_FILE"
  exit 1
fi

# ─── Confirmation ────────────────────────────────────────────────────────────

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  ⚠️  WARNING: This will DESTROY the current database!   ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  Database: ${DB_NAME}                                    ║"
echo "║  Host:     ${DB_HOST}:${DB_PORT}                         ║"
echo "║  Backup:   $(basename $BACKUP_FILE)                      ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
read -p "Type 'RESTORE' to confirm: " confirm

if [ "$confirm" != "RESTORE" ]; then
  log "Aborted by user."
  exit 0
fi

# ─── Restore ─────────────────────────────────────────────────────────────────

log "Stopping API service..."
docker stop condosync-api 2>/dev/null || true

log "Restoring from: $BACKUP_FILE"
gunzip -c "$BACKUP_FILE" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" --single-transaction

log "Running Prisma migrations..."
cd /opt/condosync/condosync/apps/api && npx prisma migrate deploy

log "Restarting API..."
docker start condosync-api 2>/dev/null || true

log "Restore completed successfully!"
log "Verify: curl http://localhost:3333/health"
