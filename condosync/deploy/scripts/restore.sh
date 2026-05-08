#!/usr/bin/env bash
# =============================================================================
# restore.sh — Restore destrutivo de backup
# =============================================================================
# RESTAURA o banco e os volumes de um backup. DESTRUTIVO.
# Exige confirmacao por digitacao explicita.
#
# Uso:
#   bash deploy/scripts/restore.sh --pg /path/to/condosync-YYYYMMDD.dump
#   bash deploy/scripts/restore.sh --pg <dump> --volumes <archive.tar.gz>
#   bash deploy/scripts/restore.sh --latest               # ultimo dump+volumes
# =============================================================================
set -Eeuo pipefail
source "$(dirname "$0")/lib/common.sh"

PG_FILE=""
VOL_FILE=""
USE_LATEST=0

while [[ $# -gt 0 ]]; do
    case "$1" in
        --pg) PG_FILE="$2"; shift 2 ;;
        --volumes) VOL_FILE="$2"; shift 2 ;;
        --latest) USE_LATEST=1; shift ;;
        *) die "Argumento desconhecido: $1" ;;
    esac
done

load_env

if (( USE_LATEST == 1 )); then
    PG_FILE=$(ls -1t "$BACKUP_DIR/postgres"/condosync-*.dump 2>/dev/null | head -1 || true)
    VOL_FILE=$(ls -1t "$BACKUP_DIR/volumes"/condosync-volumes-*.tar.gz 2>/dev/null | head -1 || true)
    [[ -n "$PG_FILE" ]] || die "Nenhum dump encontrado em $BACKUP_DIR/postgres"
fi

[[ -f "$PG_FILE" ]] || die "Dump Postgres nao encontrado: $PG_FILE"
log "Postgres dump  : $PG_FILE"
[[ -n "$VOL_FILE" ]] && log "Volumes archive: $VOL_FILE" || warn "Sem archive de volumes — manterao estado atual"

cat <<'WARN' >&2

╔══════════════════════════════════════════════════════════════════╗
║  ATENCAO: OPERACAO DESTRUTIVA                                    ║
║  - Todas as conexoes serao cortadas                              ║
║  - O banco condosync sera DROPADO e recriado                     ║
║  - Volumes uploads/logs serao SOBRESCRITOS                       ║
║                                                                  ║
║  Antes de prosseguir:                                            ║
║    1) Garanta que existe um BACKUP RECENTE do estado atual       ║
║    2) Comunique a equipe                                         ║
║    3) Espere a janela de manutencao                              ║
╚══════════════════════════════════════════════════════════════════╝

WARN

read -r -p "Digite EXATAMENTE  RESTORE-PRODUCAO  para confirmar: " ans
[[ "$ans" == "RESTORE-PRODUCAO" ]] || die "Confirmacao invalida — abortado"

# ─── Snapshot pre-restore (paranoia) ────────────────────────────────────────
log "Tirando snapshot pre-restore (caso queira reverter o restore)"
PRE_TS="pre-restore-$(date -u +%Y%m%dT%H%M%SZ)"
docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" condosync-postgres \
    pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc --no-owner --no-acl \
    > "$BACKUP_DIR/postgres/condosync-${PRE_TS}.dump"
ok "Snapshot pre-restore salvo"

# ─── Parar apps ─────────────────────────────────────────────────────────────
log "Parando containers de aplicacao (postgres/redis/caddy permanecem)"
ACTIVE=$(read_active_color)
for c in api web worker; do
    docker stop "condosync-${c}-blue"  2>/dev/null || true
    docker stop "condosync-${c}-green" 2>/dev/null || true
done
ok "Apps paradas"

# ─── Postgres restore ──────────────────────────────────────────────────────
log "Dropando e recriando banco $POSTGRES_DB"
docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" condosync-postgres \
    psql -U "$POSTGRES_USER" -d postgres -c \
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$POSTGRES_DB' AND pid <> pg_backend_pid();" \
    >/dev/null
docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" condosync-postgres \
    psql -U "$POSTGRES_USER" -d postgres -c "DROP DATABASE IF EXISTS \"$POSTGRES_DB\";"
docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" condosync-postgres \
    psql -U "$POSTGRES_USER" -d postgres -c "CREATE DATABASE \"$POSTGRES_DB\" OWNER \"$POSTGRES_USER\";"

log "Restaurando dump (pode levar varios minutos)..."
docker exec -i -e PGPASSWORD="$POSTGRES_PASSWORD" condosync-postgres \
    pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-acl --exit-on-error \
    < "$PG_FILE"
ok "Postgres restaurado"

# ─── Volumes restore ───────────────────────────────────────────────────────
if [[ -n "$VOL_FILE" && -f "$VOL_FILE" ]]; then
    log "Restaurando volumes uploads + logs"
    docker run --rm \
        -v condosync_uploads_data:/dst/uploads \
        -v condosync_api_logs:/dst/logs \
        -v "$(dirname "$VOL_FILE"):/src:ro" \
        alpine:3 \
        sh -c "cd /dst && rm -rf uploads/* logs/* && tar xzf /src/$(basename "$VOL_FILE")"
    ok "Volumes restaurados"
fi

# ─── Religar apps ──────────────────────────────────────────────────────────
log "Subindo cor ativa = $ACTIVE"
compose_color "$ACTIVE" up -d
wait_healthy "condosync-api-${ACTIVE}" 180 || die "API nao subiu apos restore"
wait_healthy "condosync-web-${ACTIVE}" 60  || warn "Web demorou — verifique"
wait_healthy "condosync-worker-${ACTIVE}" 60 || warn "Worker demorou — verifique"

ok "Restore concluido. Snapshot pre-restore: $BACKUP_DIR/postgres/condosync-${PRE_TS}.dump"
