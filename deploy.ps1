#!/usr/bin/env pwsh
# ============================================================
# deploy.ps1 — Deploy CondoSync para Railway
# ============================================================
# USO:
#   .\deploy.ps1                    -> deploya API e Web
#   .\deploy.ps1 -Service web       -> so o frontend
#   .\deploy.ps1 -Service api       -> so a API
#   .\deploy.ps1 -SkipHealthCheck   -> pula verificacao de saude pos-deploy
#
# COMO FUNCIONA:
#   - Ambos os servicos usam o mesmo diretorio condosync/ como contexto
#   - railway.toml em condosync/ e compartilhado; o script troca seu conteudo
#     temporariamente para cada servico e restaura ao final
#   - --no-gitignore e necessario para enviar Dockerfile.api e railway.toml
#     (que podem estar no .gitignore) para o Railway
#   - O toml padrao (comittado) aponta para Dockerfile.api (API)
# ============================================================

param(
    [ValidateSet("web", "api", "all")]
    [string]$Service = "all",
    [switch]$SkipHealthCheck
)

$Root   = $PSScriptRoot
$Condo  = Join-Path $Root "condosync"

# IDs Railway — nao alterar sem motivo
$WEB_SERVICE = "f34230c3-0753-4a8e-b46d-e4a9a8341b9a"
$API_SERVICE = "154c9107-8661-4d15-9493-f10e419bb4e9"

$WEB_URL = "https://web-production-916b1.up.railway.app"
$API_URL = "https://devsantiago-production.up.railway.app"

# Conteudo do railway.toml para cada servico
$TOML_API = @"
[build]
builder = "dockerfile"
dockerfilePath = "Dockerfile.api"

[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 60
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
"@

$TOML_WEB = @"
[build]
builder = "dockerfile"
dockerfilePath = "Dockerfile"

[deploy]
healthcheckPath = "/"
healthcheckTimeout = 60
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
"@

$script:DeployErrors = @()

function Show-Header($msg) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  $msg" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
}

function Show-CommitsSummary {
    Write-Host ""
    Write-Host "-- Ultimos commits no branch main --" -ForegroundColor DarkGray
    git -C $Root log --oneline -8 2>$null | ForEach-Object {
        Write-Host "  $_" -ForegroundColor DarkGray
    }
    $branch = git -C $Root rev-parse --abbrev-ref HEAD 2>$null
    $sha    = git -C $Root rev-parse --short HEAD 2>$null
    Write-Host "  Branch: $branch  |  HEAD: $sha" -ForegroundColor DarkGray
    Write-Host ""
}

function Set-RailwayToml($content) {
    $tomlPath = Join-Path $Condo "railway.toml"
    [System.IO.File]::WriteAllText($tomlPath, $content, [System.Text.UTF8Encoding]::new($false))
}

function Ensure-ServiceInConfig($path, $serviceId) {
    $configPath = "$env:USERPROFILE\.railway\config.json"
    if (-not (Test-Path $configPath)) {
        Write-Host "  AVISO: Railway config nao encontrado em $configPath" -ForegroundColor Yellow
        return
    }
    $cfg = Get-Content $configPath -Raw | ConvertFrom-Json
    $key = $path.Replace("/", "\")
    if ($cfg.projects.PSObject.Properties[$key]) {
        $cfg.projects.$key.service = $serviceId
    }
    $cfg | ConvertTo-Json -Depth 10 | Set-Content $configPath
}

function Test-HealthEndpoint($url, $label) {
    if ($SkipHealthCheck) { return }
    Write-Host "  >> Aguardando $label inicializar..." -NoNewline
    $maxAttempts = 12
    for ($i = 1; $i -le $maxAttempts; $i++) {
        Start-Sleep -Seconds 10
        try {
            $resp = Invoke-WebRequest -Uri $url -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
            if ($resp.StatusCode -lt 400) {
                Write-Host " OK (HTTP $($resp.StatusCode))" -ForegroundColor Green
                return
            }
        } catch { }
        Write-Host "." -NoNewline
    }
    Write-Host " AVISO: Sem resposta apos $($maxAttempts * 10)s" -ForegroundColor Yellow
    Write-Host "  -> Verifique: railway logs --service $label" -ForegroundColor Yellow
}

# ── Deploy API ───────────────────────────────────────────────
function Deploy-Api {
    Show-Header "Deployando API (Node.js + Prisma)"
    Write-Host "  Contexto  : $Condo" -ForegroundColor Yellow
    Write-Host "  Servico   : DevSantiago ($API_SERVICE)" -ForegroundColor Yellow
    Write-Host "  Dockerfile: condosync/Dockerfile.api" -ForegroundColor DarkGray
    Write-Host ""

    Set-RailwayToml $TOML_API
    Ensure-ServiceInConfig $Condo $API_SERVICE

    Push-Location $Condo
    try {
        railway up --no-gitignore --service "DevSantiago"
        if ($LASTEXITCODE -eq 0) {
            Write-Host "`n  OK API deployada com sucesso!" -ForegroundColor Green
            Write-Host "     URL: $API_URL" -ForegroundColor Green
            Test-HealthEndpoint "$API_URL/health" "DevSantiago"
        } else {
            Write-Host "`n  ERRO Deploy API falhou." -ForegroundColor Red
            Write-Host "     -> railway logs --service DevSantiago" -ForegroundColor Red
            $script:DeployErrors += "API"
        }
    } finally {
        Pop-Location
        # Garante que railway.toml volta para API apos o deploy
        Set-RailwayToml $TOML_API
    }
}

# ── Deploy WEB ───────────────────────────────────────────────
function Deploy-Web {
    Show-Header "Deployando WEB (nginx + React)"
    Write-Host "  Contexto  : $Condo" -ForegroundColor Yellow
    Write-Host "  Servico   : Web ($WEB_SERVICE)" -ForegroundColor Yellow
    Write-Host "  Dockerfile: condosync/Dockerfile (vite build + nginx)" -ForegroundColor DarkGray
    Write-Host ""

    # Troca railway.toml para apontar para o Dockerfile do Web
    Set-RailwayToml $TOML_WEB
    Ensure-ServiceInConfig $Condo $WEB_SERVICE

    Push-Location $Condo
    try {
        railway up --no-gitignore --service "Web"
        if ($LASTEXITCODE -eq 0) {
            Write-Host "`n  OK Web deployada com sucesso!" -ForegroundColor Green
            Write-Host "     URL: $WEB_URL" -ForegroundColor Green
            Test-HealthEndpoint $WEB_URL "Web"
        } else {
            Write-Host "`n  ERRO Deploy Web falhou." -ForegroundColor Red
            Write-Host "     -> railway logs --service Web" -ForegroundColor Red
            $script:DeployErrors += "Web"
        }
    } finally {
        Pop-Location
        # Restaura railway.toml para API (estado padrao do repositorio)
        Set-RailwayToml $TOML_API
    }
}

# ── Execucao ─────────────────────────────────────────────────
Show-CommitsSummary

switch ($Service) {
    "web" { Deploy-Web }
    "api" { Deploy-Api }
    "all" {
        Deploy-Api
        Deploy-Web
    }
}

# ── Sumario final ─────────────────────────────────────────────
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
if ($script:DeployErrors.Count -eq 0) {
    Write-Host "  Deploy concluido com sucesso!" -ForegroundColor Green
} else {
    Write-Host "  AVISO Deploy concluido com erros: $($script:DeployErrors -join ', ')" -ForegroundColor Yellow
}
Write-Host "  API : $API_URL" -ForegroundColor DarkGray
Write-Host "  Web : $WEB_URL" -ForegroundColor DarkGray
Write-Host "========================================" -ForegroundColor Cyan