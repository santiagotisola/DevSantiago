@echo off
REM Script de Deploy em Prodao - CondoSync
REM Execute: deploy-prod.bat

setlocal enabledelayedexpansion

set IP=2.24.211.167
set USER=root
set PATH_PROD=/opt/condosync/condosync

echo.
echo ════════════════════════════════════════════════════════════════
echo CONDOSYNC - DEPLOY EM PRODUCAO
echo Servidor: %IP%
echo ════════════════════════════════════════════════════════════════
echo.

echo.
echo ════════════════════════════════════════════════════════════════
echo PASSO 1: GIT PULL
echo ════════════════════════════════════════════════════════════════
echo.
ssh -o ConnectTimeout=10 %USER%@%IP% "cd %PATH_PROD% && git pull origin main"
if errorlevel 1 (echo [ERRO] Git pull falhou && goto error)
echo [OK] Git pull completado
echo.

echo.
echo ════════════════════════════════════════════════════════════════
echo PASSO 2: PRISMA MIGRATE DEPLOY
echo ════════════════════════════════════════════════════════════════
echo.
ssh -o ConnectTimeout=10 %USER%@%IP% "cd %PATH_PROD%/apps/api && npx prisma migrate deploy"
if errorlevel 1 (echo [ERRO] Prisma migrate falhou && goto error)
echo [OK] Prisma migrate completado
echo.

echo.
echo ════════════════════════════════════════════════════════════════
echo PASSO 3: DOCKER BUILD
echo ════════════════════════════════════════════════════════════════
echo.
ssh -o ConnectTimeout=10 %USER%@%IP% "cd %PATH_PROD% && docker compose build api web mobile"
if errorlevel 1 (echo [ERRO] Docker build falhou && goto error)
echo [OK] Docker build completado
echo.

echo.
echo ════════════════════════════════════════════════════════════════
echo PASSO 4: DOCKER COMPOSE UP
echo ════════════════════════════════════════════════════════════════
echo.
ssh -o ConnectTimeout=10 %USER%@%IP% "cd %PATH_PROD% && docker compose up -d --no-deps api web mobile"
if errorlevel 1 (echo [ERRO] Docker up falhou && goto error)
echo [OK] Docker compose up completado
echo.

echo Aguardando 30 segundos para containers ficarem healthy...
timeout /t 30 /nobreak

echo.
echo ════════════════════════════════════════════════════════════════
echo PASSO 5: VALIDACOES
echo ════════════════════════════════════════════════════════════════
echo.

echo [*] Status dos Containers:
ssh %USER%@%IP% "cd %PATH_PROD% && docker compose ps"
echo.

echo [*] Health Check API:
ssh %USER%@%IP% "curl -s http://localhost:3333/health"
echo.

echo [*] Logs da API (ultimas 15 linhas):
ssh %USER%@%IP% "cd %PATH_PROD% && docker compose logs --tail=15 api"
echo.

echo [*] Logs do Mobile (ultimas 15 linhas):
ssh %USER%@%IP% "cd %PATH_PROD% && docker compose logs --tail=15 mobile"
echo.

echo [*] Logs do Web (ultimas 15 linhas):
ssh %USER%@%IP% "cd %PATH_PROD% && docker compose logs --tail=15 web"
echo.

echo ════════════════════════════════════════════════════════════════
echo DEPLOYMENT CONCLUIDO COM SUCESSO!
echo ════════════════════════════════════════════════════════════════
echo.
echo Proximos Passos:
echo   1. Abra https://condosync.app/ no navegador
echo   2. Faca login com credenciais
echo   3. Verifique tema escuro no mobile
echo   4. Teste visitantes sem spinner
echo   5. Valide encomendas
echo.
echo URLs:
echo   Web:    https://condosync.app
echo   Mobile: https://condosync.app/mobile
echo   API:    http://2.24.211.167:3333
echo.
goto end

:error
echo.
echo [ERRO] Deployment falhou! Verifique os logs acima.
echo.
pause
exit /b 1

:end
echo.
pause
