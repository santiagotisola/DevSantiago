#!/usr/bin/env pwsh
# ============================================================
# deploy.ps1 — Deploy CondoSync para Railway
# ============================================================
# USO:
#   .\deploy.ps1             → deploya Web e API
#   .\deploy.ps1 -Service web  → só o frontend
#   .\deploy.ps1 -Service api  → só a API
# ============================================================

param(
    [ValidateSet("web", "api", "all")]
    [string]$Service = "all"
)

$Root   = $PSScriptRoot                             # C:\...\DevSantiago
$Condo  = Join-Path $Root "condosync"               # C:\...\DevSantiago\condosync

# IDs Railway (não alterar sem motivo)
$PROJECT_ID = "6d78f8d7-d2f0-43c1-9d55-fc6e42064c37"
$WEB_SERVICE = "f34230c3-0753-4a8e-b46d-e4a9a8341b9a"   # serviço "Web"
$API_SERVICE = "154c9107-8661-4d15-9493-f10e419bb4e9"   # serviço "DevSantiago"

function Show-Header($msg) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  $msg" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
}

function Ensure-ServiceInConfig($path, $serviceId) {
    $configPath = "$env:USERPROFILE\.railway\config.json"
    $cfg = Get-Content $configPath | ConvertFrom-Json
    $key = $path.Replace("/", "\")
    if ($cfg.projects.PSObject.Properties[$key]) {
        $cfg.projects.$key.service = $serviceId
    }
    $cfg | ConvertTo-Json -Depth 10 | Set-Content $configPath
}

# ── Deploy WEB ───────────────────────────────────────────────
function Deploy-Web {
    Show-Header "Deployando WEB (nginx + React)"
    Write-Host ">> Contexto: $Condo" -ForegroundColor Yellow
    Write-Host ">> Serviço : Web ($WEB_SERVICE)" -ForegroundColor Yellow
    Write-Host ">> Dockerfile: condosync/Dockerfile (multi-stage: vite build + nginx)" -ForegroundColor DarkGray
    Write-Host ""

    Ensure-ServiceInConfig $Condo $WEB_SERVICE

    # Railway CLI lê railway.toml — copiar temporariamente o web toml
    $tomlPath = Join-Path $Condo "railway.toml"
    Copy-Item (Join-Path $Condo "railway.web.toml") $tomlPath -Force

    Push-Location $Condo
    try {
        railway up --service "Web"
        if ($LASTEXITCODE -eq 0) {
            Write-Host "`n✅ Web deployada com sucesso!" -ForegroundColor Green
            Write-Host "   URL: https://web-production-916b1.up.railway.app" -ForegroundColor Green
        } else {
            Write-Host "`n❌ Deploy Web falhou. Verifique os logs:" -ForegroundColor Red
            Write-Host "   railway logs --service Web" -ForegroundColor Red
        }
    } finally {
        Pop-Location
        Remove-Item $tomlPath -ErrorAction SilentlyContinue
    }
}

# ── Deploy API ───────────────────────────────────────────────
function Deploy-Api {
    Show-Header "Deployando API (Node + Prisma)"
    Write-Host ">> Contexto: $Condo" -ForegroundColor Yellow
    Write-Host ">> Servico : DevSantiago ($API_SERVICE)" -ForegroundColor Yellow
    Write-Host ">> Dockerfile: condosync/Dockerfile.api (via railway.toml + --no-gitignore)" -ForegroundColor DarkGray
    Write-Host ""

    # Cria railway.toml temporario apontando para Dockerfile.api
    # IMPORTANTE: usa --no-gitignore para que arquivos nao commitados (Dockerfile.api e railway.toml) sejam enviados
    $tomlPath = Join-Path $Condo "railway.toml"
    Set-Content $tomlPath -Value "[build]`nbuilder = `"dockerfile`"`ndockerfilePath = `"Dockerfile.api`"" -Encoding UTF8

    Ensure-ServiceInConfig $Condo $API_SERVICE

    Push-Location $Condo
    try {
        railway up --no-gitignore --service "DevSantiago"
        if ($LASTEXITCODE -eq 0) {
            Write-Host "`n>> API deployada com sucesso!" -ForegroundColor Green
            Write-Host "   URL: https://devsantiago-production.up.railway.app" -ForegroundColor Green
        } else {
            Write-Host "`n>> Deploy API falhou. Verifique os logs:" -ForegroundColor Red
            Write-Host "   railway logs --service DevSantiago" -ForegroundColor Red
        }
    } finally {
        Pop-Location
        Remove-Item $tomlPath -ErrorAction SilentlyContinue
    }
}

# ── Execução ─────────────────────────────────────────────────
switch ($Service) {
    "web" { Deploy-Web }
    "api" { Deploy-Api }
    "all" {
        Deploy-Api
        Deploy-Web
    }
}

Write-Host ""
Write-Host "Pronto!" -ForegroundColor Cyan
