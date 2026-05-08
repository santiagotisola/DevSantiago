#!/bin/bash
# ================================================================
# update-vps-safe.sh — Update CondoSync com BACKUP automatico antes
# Mantem o setup atual (docker-compose.railway.yml).
# Substitui o update-vps.sh em uso, adicionando:
#   - backup obrigatorio pre-deploy
#   - confirmacao se ASSUME_YES=0 (default 1 = nao confirma)
#   - healthcheck pos-deploy com timeout
#   - resumo final com link de rollback
# ================================================================
set -e

APP_DIR="/opt/condosync"
COMPOSE_FILE="$APP_DIR/condosync/docker-compose.railway.yml"
COMPOSE="docker compose -f $COMPOSE_FILE"
ASSUME_YES="${ASSUME_YES:-1}"

echo ""
echo "========================================"
echo "  CondoSync — Update VPS (safe)"
echo "========================================"

# ── 0. Confirmacao opcional ─────────────────────────────────────
SHA_BEFORE=$(cd "$APP_DIR" && git rev-parse --short HEAD)
echo "  HEAD atual na VPS: $SHA_BEFORE"
echo "  Buscando ultimas alteracoes do origin/main..."
cd "$APP_DIR" && git fetch origin main --quiet
SHA_AFTER=$(cd "$APP_DIR" && git rev-parse --short origin/main)
echo "  HEAD remoto       : $SHA_AFTER"

if [ "$SHA_BEFORE" = "$SHA_AFTER" ]; then
    echo "  Sem alteracoes novas. Saindo."
    exit 0
fi

COMMITS_AHEAD=$(cd "$APP_DIR" && git log --oneline ${SHA_BEFORE}..${SHA_AFTER} | wc -l)
echo "  Commits novos     : $COMMITS_AHEAD"
echo ""
echo "  Resumo dos commits novos:"
cd "$APP_DIR" && git log --oneline ${SHA_BEFORE}..${SHA_AFTER} | head -15
[ "$COMMITS_AHEAD" -gt 15 ] && echo "  ... (mais $((COMMITS_AHEAD - 15)) commits)"
echo ""

if [ "$ASSUME_YES" != "1" ]; then
    read -r -p "Prosseguir com o deploy? [yes/NO]: " ans
    [ "$ans" = "yes" ] || { echo "Abortado."; exit 1; }
fi

# ── 1. BACKUP OBRIGATORIO ───────────────────────────────────────
echo ""
echo ">> [1/5] Backup pre-deploy"
bash "$APP_DIR/backup-vps.sh" || { echo "❌ Backup falhou — DEPLOY ABORTADO"; exit 1; }

# ── 2. Pull do codigo ───────────────────────────────────────────
echo ""
echo ">> [2/5] git pull"
cd "$APP_DIR"
git pull --ff-only origin main || { echo "❌ git pull falhou (merge nao fast-forward?)"; exit 1; }

# ── 3. Build + restart ──────────────────────────────────────────
echo ""
echo ">> [3/5] Rebuild + restart containers (mantendo volumes)"
cd "$APP_DIR/condosync"
$COMPOSE up -d --build

# Workaround conhecido: api as vezes fica em "Created" apos rebuild
sleep 5
if [ "$(docker inspect -f '{{.State.Status}}' condosync-api 2>/dev/null)" = "created" ]; then
    echo "   ⚠ condosync-api em Created, iniciando..."
    docker start condosync-api
fi

# ── 4. Healthcheck com timeout ──────────────────────────────────
echo ""
echo ">> [4/5] Aguardando API ficar healthy (timeout 180s)"
MAX_WAIT=180
ELAPSED=0
HEALTHY=0
while [ "$ELAPSED" -lt "$MAX_WAIT" ]; do
    STATUS=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' condosync-api 2>/dev/null || echo "missing")
    case "$STATUS" in
        healthy)
            HEALTHY=1
            echo "   OK API healthy apos ${ELAPSED}s"
            break
            ;;
        unhealthy)
            echo "   ❌ API unhealthy"
            docker logs --tail 100 condosync-api
            break
            ;;
        *)
            sleep 5
            ELAPSED=$((ELAPSED + 5))
            printf "."
            ;;
    esac
done
echo ""

if [ "$HEALTHY" != "1" ]; then
    echo ""
    echo "❌ API NAO ficou healthy em ${MAX_WAIT}s — verifique os logs:"
    echo "   docker logs --tail 200 condosync-api"
    echo ""
    echo "Para rollback:"
    echo "   cd $APP_DIR && git reset --hard $SHA_BEFORE"
    echo "   cd $APP_DIR/condosync && $COMPOSE up -d --build"
    exit 1
fi

# Smoke local
echo ""
echo ">> Smoke test local"
if curl -fsS --max-time 10 http://localhost:3333/health >/dev/null; then
    echo "   OK /health respondendo"
else
    echo "   ⚠ /health nao respondeu — investigue"
fi

# ── 5. Status final ─────────────────────────────────────────────
echo ""
echo ">> [5/5] Status"
$COMPOSE ps

echo ""
echo "========================================"
echo "  Update concluido com sucesso"
echo "  $SHA_BEFORE  →  $SHA_AFTER"
echo "========================================"
echo ""
echo "  Frontend : http://2.24.211.167"
echo "  API      : http://2.24.211.167:3333"
echo "  Logs     : $COMPOSE logs -f api"
echo ""
echo "  Em caso de problema (rollback rapido):"
echo "    cd $APP_DIR && git reset --hard $SHA_BEFORE"
echo "    cd $APP_DIR/condosync && $COMPOSE up -d --build"
echo "    # E se precisar restaurar dados:"
echo "    # ls /opt/condosync-backups/ | tail -3"
echo "    # docker exec -i -e PGPASSWORD=... condosync-postgres pg_restore ... < <dump>"
echo ""
