#!/usr/bin/env powershell

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  VALIDACAO DE CONFIGURACAO DE USUARIOS - CondoSync" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

$usuarios = @(
    @{
        email = "admin@condosync.com.br"
        senha = "Admin@2026"
        papel = "SUPER ADMINISTRADOR"
        desc = "Acesso global a plataforma"
    },
    @{
        email = "sindico@parqueverde.com.br"
        senha = "Sindico@2026"
        papel = "SINDICO"
        desc = "Gestao operacional do condominio"
    },
    @{
        email = "porteiro@parqueverde.com.br"
        senha = "Porteiro@2026"
        papel = "PORTEIRO/PORTARIA"
        desc = "Controle de acesso e encomendas"
    },
    @{
        email = "atendimento@parqueverde.com.br"
        senha = "Atendimento@2026"
        papel = "ATENDIMENTO/SUPORTE"
        desc = "Gestao de chamados e solicitacoes"
    },
    @{
        email = "morador1@parqueverde.com.br"
        senha = "Morador@2026"
        papel = "MORADOR"
        desc = "Acesso limitado a unidade"
    }
)

$contador = 0
$sucessos = 0
$erros = 0

foreach($user in $usuarios) {
    $contador++
    
    try {
        $headers = @{"Content-Type" = "application/json"}
        $body = @{email = $user.email; password = $user.senha} | ConvertTo-Json
        $response = Invoke-WebRequest -Uri "http://localhost:3333/api/v1/auth/login" -Method POST -Headers $headers -Body $body -UseBasicParsing -ErrorAction Stop
        $json = $response.Content | ConvertFrom-Json
        
        Write-Host "$contador. [OK] $($user.papel)" -ForegroundColor Green
        Write-Host "   - Email: $($user.email)"
        Write-Host "   - Senha: $($user.senha)"
        Write-Host "   - Status: Autenticado com sucesso" -ForegroundColor Green
        Write-Host ""
        
        $sucessos++
        
    } catch {
        Write-Host "$contador. [ERRO] $($user.papel)" -ForegroundColor Red
        Write-Host "   - Email: $($user.email)"
        Write-Host "   - Erro: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        
        $erros++
    }
}

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "RESUMO:" -ForegroundColor Yellow
Write-Host "Total: $contador | Sucessos: $sucessos | Erros: $erros" -ForegroundColor Yellow
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Documentacao: CONFIGURACAO_USUARIOS.md" -ForegroundColor Yellow
Write-Host "Acesse: http://localhost/login" -ForegroundColor Yellow
Write-Host ""
