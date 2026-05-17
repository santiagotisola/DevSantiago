#!/usr/bin/env pwsh
# Script de Deploy em Produção - CondoSync
# Execute: .\deploy-prod.ps1

$IP = "2.24.211.167"
$USER = "root"
$PATH_PROD = "/opt/condosync/condosync"

Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║ CondoSync - DEPLOY EM PRODUÇÃO                                ║" -ForegroundColor Cyan
Write-Host "║ Servidor: $IP" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Função auxiliar para executar comandos SSH
function Run-SSH {
    param([string]$Command, [string]$Description)
    Write-Host "▶ $Description" -ForegroundColor Green
    ssh -o ConnectTimeout=10 "$USER@$IP" $Command
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Erro ao executar: $Description" -ForegroundColor Red
        return $false
    }
    Write-Host "✓ Sucesso" -ForegroundColor Green
    Write-Host ""
    return $true
}

# PASSO 1: Git Pull
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "PASSO 1: GIT PULL (Trazer alterações do repositório)" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host ""

Run-SSH "cd $PATH_PROD && git pull origin main" "Git Pull"

# PASSO 2: Prisma Migrate
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "PASSO 2: PRISMA MIGRATE DEPLOY (Aplicar migrations)" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host ""

Run-SSH "cd $PATH_PROD/apps/api && npx prisma migrate deploy" "Prisma Migrate Deploy"

# PASSO 3: Docker Build
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "PASSO 3: DOCKER BUILD (Compilar imagens)" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host ""

Run-SSH "cd $PATH_PROD && docker compose build api web mobile" "Docker Compose Build"

# PASSO 4: Docker Compose Up
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "PASSO 4: DOCKER COMPOSE UP (Iniciar containers)" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host ""

Run-SSH "cd $PATH_PROD && docker compose up -d --no-deps api web mobile" "Docker Compose Up"

# Aguardar estabilização
Write-Host "⏳ Aguardando containers ficarem healthy (30s)..." -ForegroundColor Cyan
Start-Sleep -Seconds 30

# PASSO 5: Validações
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "PASSO 5: VALIDAÇÕES" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host ""

# Status dos containers
Write-Host "▶ Status dos Containers:" -ForegroundColor Green
ssh "$USER@$IP" "cd $PATH_PROD && docker compose ps"
Write-Host ""

# Health check API
Write-Host "▶ Health Check API:" -ForegroundColor Green
ssh "$USER@$IP" "curl -s http://localhost:3333/health"
Write-Host ""
Write-Host ""

# Últimos logs
Write-Host "▶ Últimos logs da API (últimas 15 linhas):" -ForegroundColor Green
ssh "$USER@$IP" "cd $PATH_PROD && docker compose logs --tail=15 api"
Write-Host ""

Write-Host "▶ Últimos logs do Mobile (últimas 15 linhas):" -ForegroundColor Green
ssh "$USER@$IP" "cd $PATH_PROD && docker compose logs --tail=15 mobile"
Write-Host ""

Write-Host "▶ Últimos logs do Web (últimas 15 linhas):" -ForegroundColor Green
ssh "$USER@$IP" "cd $PATH_PROD && docker compose logs --tail=15 web"
Write-Host ""

# RESUMO FINAL
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║ ✓ DEPLOYMENT CONCLUÍDO COM SUCESSO!                           ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Próximos Passos:" -ForegroundColor Cyan
Write-Host "  1. Abra https://condosync.app/ no navegador" -ForegroundColor Cyan
Write-Host "  2. Faça login com as credenciais" -ForegroundColor Cyan
Write-Host "  3. Verifique tema escuro no mobile" -ForegroundColor Cyan
Write-Host "  4. Teste carregamento de visitantes (sem spinner)" -ForegroundColor Cyan
Write-Host "  5. Valide encomendas carregando" -ForegroundColor Cyan
Write-Host ""
Write-Host "URLs:" -ForegroundColor Cyan
Write-Host "  Web:    https://condosync.app/" -ForegroundColor Cyan
Write-Host "  Mobile: https://condosync.app/mobile/" -ForegroundColor Cyan
Write-Host "  API:    http://2.24.211.167:3333" -ForegroundColor Cyan
Write-Host ""
