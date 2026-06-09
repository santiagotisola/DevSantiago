#!/usr/bin/env pwsh
# Script de Deploy em Producao - CondoSync
# Execute: .\deploy-prod.ps1

$IP = "2.24.211.167"
$USER = "root"
$PATH_PROD = "/opt/condosync/condosync"

Write-Host "=== CondoSync - DEPLOY EM PRODUCAO ===" -ForegroundColor Cyan
Write-Host "Servidor: $IP" -ForegroundColor Cyan
Write-Host ""

function Invoke-SSH {
    param([string]$Command, [string]$Description)
    Write-Host "> $Description" -ForegroundColor Green
    ssh -o ConnectTimeout=10 "$USER@$IP" $Command
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERRO: $Description" -ForegroundColor Red
        return $false
    }
    Write-Host "OK" -ForegroundColor Green
    Write-Host ""
    return $true
}

# PASSO 1: Git Pull
Write-Host "--- PASSO 1: GIT PULL ---" -ForegroundColor Yellow
Invoke-SSH "cd $PATH_PROD && git pull origin main" "Git Pull"

# PASSO 2: Prisma Migrate
Write-Host "--- PASSO 2: PRISMA MIGRATE DEPLOY ---" -ForegroundColor Yellow
Invoke-SSH "cd $PATH_PROD/apps/api && npx prisma migrate deploy" "Prisma Migrate Deploy"

# PASSO 3: Docker Build
Write-Host "--- PASSO 3: DOCKER BUILD ---" -ForegroundColor Yellow
Invoke-SSH "cd $PATH_PROD && docker compose build api web mobile" "Docker Compose Build"

# PASSO 4: Docker Compose Up
Write-Host "--- PASSO 4: DOCKER COMPOSE UP ---" -ForegroundColor Yellow
Invoke-SSH "cd $PATH_PROD && docker compose up -d --no-deps api web mobile" "Docker Compose Up"

# Aguardar estabilizacao
Write-Host "Aguardando containers ficarem healthy (30s)..." -ForegroundColor Cyan
Start-Sleep -Seconds 30

# PASSO 5: Validacoes
Write-Host "--- PASSO 5: VALIDACOES ---" -ForegroundColor Yellow
Write-Host "> Status dos Containers:" -ForegroundColor Green
ssh "$USER@$IP" "cd $PATH_PROD && docker compose ps"
Write-Host ""

Write-Host "> Health Check API:" -ForegroundColor Green
ssh "$USER@$IP" "curl -s http://localhost:3333/health"
Write-Host ""

Write-Host "> Ultimos logs da API:" -ForegroundColor Green
ssh "$USER@$IP" "cd $PATH_PROD && docker compose logs --tail=10 api"
Write-Host ""

# RESUMO
Write-Host "=== DEPLOYMENT CONCLUIDO ===" -ForegroundColor Green
Write-Host ""
Write-Host "URLs:" -ForegroundColor Cyan
Write-Host "  Web:    https://condosync.app/" -ForegroundColor Cyan
Write-Host "  Mobile: https://condosync.app/mobile/" -ForegroundColor Cyan
Write-Host "  API:    http://2.24.211.167:3333" -ForegroundColor Cyan
Write-Host ""
