#!/usr/bin/env pwsh
# ============================================================
# deploy-prod.ps1 — Deploy CondoSync em PRODUCAO (VPS Hostinger)
# ============================================================
# Producao roda em VPS (NAO Railway): root@2.24.211.167,
# repo em /opt/condosync, stack via docker-compose.railway.yml
# (servicos: postgres, redis, api, web — NAO existe "mobile").
#
# USO:
#   .\deploy-prod.ps1                  -> backup + pull + build + up + validacao
#   .\deploy-prod.ps1 -SkipBackup      -> pula o backup (NAO recomendado)
#   .\deploy-prod.ps1 -IdentityFile C:\path\key  -> chave SSH especifica
#
# COMO FUNCIONA (corrige a versao antiga, que estava quebrada):
#   - Backup pre-deploy OBRIGATORIO (backup-vps.sh) antes de tocar o schema.
#   - Move automaticamente arquivos untracked que colidem com o upstream
#     (senao 'git pull' aborta com "would be overwritten").
#   - NAO roda 'npx prisma migrate deploy' no host (npx nao existe la):
#     as migrations rodam DENTRO do container api (entrypoint.sh) na subida.
#   - Usa 'docker-compose.railway.yml' e somente os servicos api+web
#     (postgres/redis nao sao recriados).
# ============================================================

param(
    [switch]$SkipBackup,
    [string]$IdentityFile = "C:\tmp\condosync_deploy_key"
)

# "Continue" (não "Stop"): o ssh escreve progresso do git no stderr, que o
# PowerShell 5.1 transforma em ErrorRecord — com "Stop" isso abortava o deploy
# no meio. O sucesso/falha é determinado pelo $LASTEXITCODE do ssh (o bash
# remoto usa `set -euo pipefail`, então erro real retorna exit != 0).
$ErrorActionPreference = "Continue"
# UTF-8 sem BOM ao enviar o script para o ssh — senão o PowerShell 5.1
# prepende um BOM e a 1a linha do bash vira "comando nao encontrado".
$OutputEncoding = New-Object System.Text.UTF8Encoding $false
$IP   = "2.24.211.167"
$USER = "root"

Write-Host "=== CondoSync - DEPLOY EM PRODUCAO (VPS) ===" -ForegroundColor Cyan
Write-Host "Servidor: $USER@$IP" -ForegroundColor Cyan

# Auth: usa chave dedicada se existir; senao cai para senha interativa.
$sshArgs = @("-o", "ConnectTimeout=20")
if (Test-Path $IdentityFile) {
    $sshArgs += @("-i", $IdentityFile, "-o", "IdentitiesOnly=yes", "-o", "BatchMode=yes")
    Write-Host "Auth: chave SSH ($IdentityFile)" -ForegroundColor DarkGray
} else {
    Write-Host "Auth: senha interativa (chave $IdentityFile nao encontrada)" -ForegroundColor DarkGray
}
Write-Host ""

# Flag de backup injetada no script remoto.
# (nome distinto do parametro $SkipBackup — PowerShell e case-insensitive
# em nomes de variavel, entao reusar o nome colidiria com o [switch].)
$skipBackupFlag = if ($SkipBackup.IsPresent) { "1" } else { "0" }
$header = "SKIP_BACKUP=$skipBackupFlag`n"

$body = @'
set -euo pipefail
REPO=/opt/condosync
APP="$REPO/condosync"
COMPOSE="docker compose -f $APP/docker-compose.railway.yml"

echo "=========================================="
echo "  CondoSync - Deploy producao"
echo "=========================================="

# 1. Backup pre-deploy (obrigatorio salvo SKIP_BACKUP=1)
if [ "${SKIP_BACKUP:-0}" = "1" ]; then
  echo ">> [1] BACKUP PULADO (-SkipBackup)"
else
  echo ">> [1] Backup pre-deploy (backup-vps.sh)"
  bash "$REPO/backup-vps.sh"
fi

# 2. Fetch + tratar untracked que colidem com arquivos versionados no upstream
echo ">> [2] fetch + tratar conflitos de untracked"
cd "$APP"
git fetch origin main
TOP="$(git rev-parse --show-toplevel)"
cd "$TOP"
for f in $(git diff --name-only HEAD..origin/main); do
  if [ -e "$f" ] && ! git ls-files --error-unmatch "$f" >/dev/null 2>&1; then
    mv "$f" "$f.prod-bak" && echo "   untracked conflitante movido: $f -> $f.prod-bak"
  fi
done

# 3. Pull (fast-forward esperado)
echo ">> [3] git pull origin main"
cd "$APP"
git pull origin main
echo "   HEAD agora: $(git rev-parse --short HEAD)"

# 4. Build (api + web; nao ha servico 'mobile' neste compose)
echo ">> [4] build api web"
$COMPOSE build api web

# 5. Up sem recriar deps. Na subida, o entrypoint do api roda
#    'prisma migrate deploy' + seed-auto.
echo ">> [5] up -d --no-deps api web"
$COMPOSE up -d --no-deps api web

# 6. Validacao
echo ">> [6] aguardando entrypoint (migrate + seed) ~40s"
sleep 40
echo "--- containers ---"
$COMPOSE ps
echo "--- health ---"
curl -s -m 10 http://localhost:3333/health || true
echo
echo "--- ultima migration aplicada ---"
set -a; . "$APP/.env" 2>/dev/null || true; set +a
docker exec -e PGPASSWORD="${POSTGRES_PASSWORD:-}" condosync-postgres \
  psql -U "${POSTGRES_USER:-condosync}" -d "${POSTGRES_DB:-condosync}" -tAc \
  "SELECT migration_name FROM _prisma_migrations ORDER BY finished_at DESC NULLS LAST LIMIT 1" 2>/dev/null || true
echo "--- erros recentes no log da api (exceto seed) ---"
$COMPOSE logs --tail=40 api 2>&1 | grep -iE "error|exception" | grep -vi seed | tail -5 || echo "   (nenhum)"

echo ""
echo "=========================================="
echo "  Deploy concluido"
echo "  Web: https://condosync.app/   API: http://2.24.211.167:3333"
echo "=========================================="
'@

$remote = $header + $body
# Normaliza para LF — o arquivo .ps1 e CRLF (Windows); sem isso o bash
# remoto recebe "\r" e quebra (ex.: "set -euo pipefail\r").
$remote = $remote -replace "`r`n", "`n" -replace "`r", "`n"
# Envia via base64 — evita BOM/encoding do pipe nativo do PowerShell 5.1
# (Encoding.UTF8.GetBytes nao adiciona BOM; base64 e ASCII-safe como arg).
$b64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($remote))
ssh @sshArgs "$USER@$IP" "echo $b64 | base64 -d | bash"
$code = $LASTEXITCODE

Write-Host ""
if ($code -eq 0) {
    Write-Host "OK Deploy concluido com sucesso." -ForegroundColor Green
} else {
    Write-Host "ERRO Deploy falhou (exit $code). Containers anteriores seguem no ar (build/up so rodam apos backup+pull OK)." -ForegroundColor Red
    Write-Host "  Diagnostico: ssh $USER@$IP 'cd /opt/condosync/condosync && docker compose -f docker-compose.railway.yml logs --tail=50 api'" -ForegroundColor Yellow
}
exit $code
