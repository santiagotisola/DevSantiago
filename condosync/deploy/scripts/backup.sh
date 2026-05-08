#!/usr/bin/env bash
# =============================================================================
# backup.sh — Backup obrigatorio antes de qualquer deploy
# =============================================================================
# Faz:
#   1) pg_dump compactado de TODO o banco (custom format -Fc)
#   2) Snapshot dos volumes uploads_data + api_logs (tar.gz)
#   3) Aplica retencao (default: 30 dias / 30 backups)
#
# Uso:
#   bash deploy/scripts/backup.sh                    # backup completo
#   bash deploy/scripts/backup.sh --pg-only          # so postgres
#   bash deploy/scripts/backup.sh --skip-retention   # nao aplica retencao
# =============================================================================
set -Eeuo pipefail
source "$(dirname "$0")/lib/common.sh"

PG_ONLY=0
APPLY_RETENTION=1
RETENTION_DAYS="${RETENTION_DAYS:-30}"
RETENTION_KEEP="${RETENTION_KEEP:-30}"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --pg-only) PG_ONLY=1; shift ;;
        --skip-retention) APPLY_RETENTION=0; shift ;;
        *) die "Argumento desconhecido: $1" ;;
    esac
done

load_env

TS="$(date -u +%Y%m%dT%H%M%SZ)"
PG_OUT="$BACKUP_DIR/postgres/condosync-${TS}.dump"
VOL_OUT="$BACKUP_DIR/volumes/condosync-volumes-${TS}.tar.gz"

# ─── Postgres ───────────────────────────────────────────────────────────────
log "Backup Postgres -> $PG_OUT"
if ! docker ps --format '{{.Names}}' | grep -q '^condosync-postgres$'; then
    die "Container condosync-postgres nao esta rodando"
fi

# pg_dump com custom format (compactado, restore seletivo possivel)
docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" condosync-postgres \
    pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc --no-owner --no-acl \
    > "$PG_OUT"

# Validar tamanho minimo (>1KB) — protege contra dump vazio
SIZE=$(stat -c%s "$PG_OUT" 2>/dev/null || stat -f%z "$PG_OUT")
(( SIZE > 1024 )) || die "Dump Postgres suspeitosamente pequeno (${SIZE}B)"
ok "Postgres dump: $(du -h "$PG_OUT" | cut -f1)"

# Validar integridade lendo lista de objetos
docker run --rm -v "$BACKUP_DIR/postgres:/backup:ro" postgres:16-alpine \
    pg_restore --list "/backup/$(basename "$PG_OUT")" >/dev/null \
    || die "Dump Postgres corrompido (pg_restore --list falhou)"
ok "Dump validado (pg_restore --list ok)"

# ─── Volumes ────────────────────────────────────────────────────────────────
if (( PG_ONLY == 0 )); then
    log "Backup volumes (uploads + logs) -> $VOL_OUT"
    docker run --rm \
        -v condosync_uploads_data:/src/uploads:ro \
        -v condosync_api_logs:/src/logs:ro \
        -v "$BACKUP_DIR/volumes:/dst" \
        alpine:3 \
        sh -c "cd /src && tar czf /dst/$(basename "$VOL_OUT") uploads logs"
    ok "Volumes: $(du -h "$VOL_OUT" | cut -f1)"
fi

# ─── Manifest ───────────────────────────────────────────────────────────────
cat > "$BACKUP_DIR/postgres/condosync-${TS}.manifest" <<EOF
timestamp: $TS
postgres_dump: $(basename "$PG_OUT")
postgres_size: $SIZE
volumes_archive: $( (( PG_ONLY == 0 )) && basename "$VOL_OUT" || echo "skipped" )
git_sha: $(git_short_sha)
postgres_version: $(docker exec condosync-postgres postgres --version | awk '{print $3}')
db_size: $(docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" condosync-postgres \
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "SELECT pg_size_pretty(pg_database_size('$POSTGRES_DB'))")
EOF

# ─── Retencao ───────────────────────────────────────────────────────────────
if (( APPLY_RETENTION == 1 )); then
    log "Aplicando retencao (manter ${RETENTION_KEEP} mais recentes OU ultimos ${RETENTION_DAYS} dias)"
    # Por idade
    find "$BACKUP_DIR/postgres" -type f -mtime "+${RETENTION_DAYS}" -delete 2>/dev/null || true
    find "$BACKUP_DIR/volumes"  -type f -mtime "+${RETENTION_DAYS}" -delete 2>/dev/null || true
    # Por contagem (manter so os N mais recentes)
    ls -1t "$BACKUP_DIR/postgres"/condosync-*.dump 2>/dev/null \
        | tail -n +"$((RETENTION_KEEP+1))" | xargs -r rm -f
    ls -1t "$BACKUP_DIR/volumes"/condosync-volumes-*.tar.gz 2>/dev/null \
        | tail -n +"$((RETENTION_KEEP+1))" | xargs -r rm -f
fi

ok "Backup concluido: TS=$TS"
echo "$PG_OUT"
