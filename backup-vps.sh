#!/bin/bash
# ================================================================
# backup-vps.sh — Backup do CondoSync antes de qualquer deploy
# Compativel com o setup atual (docker-compose.railway.yml).
# ================================================================
set -e

APP_DIR="/opt/condosync"
COMPOSE_FILE="$APP_DIR/condosync/docker-compose.railway.yml"
BACKUP_ROOT="/opt/condosync-backups"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="$BACKUP_ROOT/$TS"

echo ""
echo "========================================"
echo "  CondoSync — Backup pre-deploy"
echo "========================================"

mkdir -p "$BACKUP_DIR"

# ── 1. Carrega .env ─────────────────────────────────────────────
ENV_FILE="$APP_DIR/condosync/.env"
[ -f "$ENV_FILE" ] || { echo "❌ .env nao encontrado em $ENV_FILE"; exit 1; }
set -a; source "$ENV_FILE"; set +a
: "${POSTGRES_USER:?POSTGRES_USER ausente}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD ausente}"
: "${POSTGRES_DB:?POSTGRES_DB ausente}"

# ── 2. Confere container postgres rodando ────────────────────────
if ! docker ps --format '{{.Names}}' | grep -q '^condosync-postgres$'; then
    echo "❌ Container condosync-postgres nao esta rodando"
    exit 1
fi

# ── 3. pg_dump ──────────────────────────────────────────────────
PG_DUMP="$BACKUP_DIR/condosync-${TS}.dump"
echo ">> [1/3] Postgres dump (custom format) -> $PG_DUMP"
docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" condosync-postgres \
    pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc --no-owner --no-acl \
    > "$PG_DUMP"

# Validacao basica
SIZE=$(stat -c%s "$PG_DUMP")
[ "$SIZE" -gt 1024 ] || { echo "❌ Dump suspeitosamente pequeno (${SIZE}B)"; exit 1; }
echo "   OK $(du -h "$PG_DUMP" | cut -f1)"

# Validacao via pg_restore --list (detecta corrupcao)
docker run --rm -v "$BACKUP_DIR:/b:ro" postgres:16-alpine \
    pg_restore --list "/b/condosync-${TS}.dump" >/dev/null \
    || { echo "❌ Dump invalido (pg_restore --list falhou)"; exit 1; }
echo "   OK Dump validado"

# ── 4. Volumes (uploads + logs) ─────────────────────────────────
VOL_TAR="$BACKUP_DIR/volumes-${TS}.tar.gz"
echo ""
echo ">> [2/3] Volumes (uploads + api_logs) -> $VOL_TAR"

# Detecta nomes reais dos volumes (compose name pode prefixar)
UPLOADS_VOL=$(docker volume ls --format '{{.Name}}' | grep -E '(condosync[_-])?uploads_data$' | head -1)
LOGS_VOL=$(docker volume ls --format '{{.Name}}' | grep -E '(condosync[_-])?api_logs$' | head -1)
[ -n "$UPLOADS_VOL" ] || { echo "❌ volume uploads_data nao encontrado"; docker volume ls; exit 1; }
[ -n "$LOGS_VOL" ]    || { echo "❌ volume api_logs nao encontrado"; docker volume ls; exit 1; }
echo "   uploads: $UPLOADS_VOL"
echo "   logs:    $LOGS_VOL"

docker run --rm \
    -v "$UPLOADS_VOL:/src/uploads:ro" \
    -v "$LOGS_VOL:/src/logs:ro" \
    -v "$BACKUP_DIR:/dst" \
    alpine:3 \
    sh -c "cd /src && tar czf /dst/volumes-${TS}.tar.gz uploads logs"
echo "   OK $(du -h "$VOL_TAR" | cut -f1)"

# ── 5. Manifest ─────────────────────────────────────────────────
echo ""
echo ">> [3/3] Manifest"
GIT_SHA=$(cd "$APP_DIR" && git rev-parse --short HEAD 2>/dev/null || echo "unknown")
DB_SIZE=$(docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" condosync-postgres \
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc \
    "SELECT pg_size_pretty(pg_database_size('$POSTGRES_DB'))" 2>/dev/null || echo "?")

cat > "$BACKUP_DIR/manifest.txt" <<EOF
timestamp:        $TS
git_sha_at_vps:   $GIT_SHA
postgres_dump:    $(basename "$PG_DUMP")
postgres_size:    $SIZE bytes
db_size_human:    $DB_SIZE
volumes_archive:  $(basename "$VOL_TAR")
volumes_size:     $(stat -c%s "$VOL_TAR") bytes
postgres_version: $(docker exec condosync-postgres postgres --version | awk '{print $3}')
backup_dir:       $BACKUP_DIR
EOF
cat "$BACKUP_DIR/manifest.txt"

# ── 6. Retencao: manter ultimos 14 backups ──────────────────────
echo ""
echo ">> Aplicando retencao (manter 14 mais recentes em $BACKUP_ROOT)"
ls -1dt "$BACKUP_ROOT"/*/ 2>/dev/null | tail -n +15 | xargs -r rm -rf

echo ""
echo "========================================"
echo "  Backup concluido com sucesso"
echo "  Local: $BACKUP_DIR"
echo "========================================"
echo ""
echo "Para restaurar (em caso de emergencia):"
echo "  docker exec -i -e PGPASSWORD=\"\$POSTGRES_PASSWORD\" condosync-postgres \\"
echo "    pg_restore -U \$POSTGRES_USER -d \$POSTGRES_DB --clean --if-exists --no-owner --no-acl \\"
echo "    < $PG_DUMP"
echo ""
