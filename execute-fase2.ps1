# ============================================
# FASE 2: SINCRONIZAÇÃO DE PRODUÇÃO
# ============================================

Write-Host "
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║         FASE 2: SINCRONIZAÇÃO DE PRODUÇÃO                ║
║         (20 minutos - docker compose build web)           ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
" -ForegroundColor Cyan

Write-Host "⏱️  Conectando ao servidor: 2.24.211.167" -ForegroundColor Yellow
Write-Host ""

# STEP 1: Conectar e verificar status atual
Write-Host "📍 STEP 1: Verificar status atual" -ForegroundColor Cyan
ssh root@2.24.211.167 @"
cd /opt/condosync/condosync
echo "=== Status Atual ==="
docker compose ps --format 'table {{.Names}}\t{{.Status}}'
"@

Write-Host ""
Write-Host "📍 STEP 2: Iniciar BUILD da imagem WEB (AGUARDE ~10 MIN)" -ForegroundColor Cyan
Write-Host ""

# STEP 2: Build web image (LENTO - ~10 minutos)
ssh root@2.24.211.167 @"
cd /opt/condosync/condosync
echo "🔨 Iniciando docker compose build web..."
docker compose build web
echo "✅ Build concluído"
"@

Write-Host ""
Write-Host "📍 STEP 3: Restart WEB + MOBILE" -ForegroundColor Cyan

# STEP 3: Restart services
ssh root@2.24.211.167 @"
cd /opt/condosync/condosync
echo "⏳ Aguardando web ficar pronto..."
docker compose up -d --no-deps web
sleep 30
echo "✅ Web restart concluído"
echo ""
echo "🔄 Restarting mobile..."
docker compose restart mobile
echo "✅ Mobile restart concluído"
"@

Write-Host ""
Write-Host "📍 STEP 4: Validar Endpoints" -ForegroundColor Cyan
Write-Host ""

# STEP 4: Validate endpoints
ssh root@2.24.211.167 @"
cd /opt/condosync/condosync
echo "🔍 Teste 1: Health Check API"
curl -s http://2.24.211.167:3333/health -w "Status: %{http_code}\n"
echo ""
echo "🔍 Teste 2: Web Frontend"
curl -s http://2.24.211.167 -w "Status: %{http_code}\n" | head -1
echo ""
echo "🔍 Teste 3: Mobile PWA (era TIMEOUT antes)"
curl -s http://2.24.211.167:5174 -w "Status: %{http_code}\n" | head -1
echo ""
echo "=== Status Final ==="
docker compose ps --format 'table {{.Names}}\t{{.Status}}'
"@

Write-Host ""
Write-Host "🎉 FASE 2 CONCLUÍDA!" -ForegroundColor Green
Write-Host ""
Write-Host "Próximos passos:" -ForegroundColor Yellow
Write-Host "  1. Abra browser: http://localhost" -ForegroundColor White
Write-Host "  2. Faça login com: atendimentoveredasbosque@gmail.com / Admin@2026" -ForegroundColor White
Write-Host "  3. Verifique botão 'Senha' em /moradores" -ForegroundColor White
Write-Host "  4. Abra: https://condosync.app/" -ForegroundColor White
Write-Host "  5. Faça login e verifique sincronização" -ForegroundColor White
Write-Host ""
