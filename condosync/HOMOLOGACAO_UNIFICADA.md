# 🏢 Homologação Unificada - CondoSync

## Consolidação de Acesso

A aplicação está **unificada em múltiplos servidores Docker**:

```
http://homologacao/          → Web Admin/Funcionários (SPA React)
http://homologacao/login     → Tela de autenticação
http://homologacao:5174/     → App Mobile PWA (moradores/portaria)
http://homologacao:3333/     → API Backend (Express)
http://homologacao:3333/docs → Documentação Swagger
http://homologacao:8025/     → Mailpit (emails de desenvolvimento)
```

**Nota**: O Vite dev server foi descontinuado. Todas as aplicações são servidas via **Docker + nginx** em suas respectivas portas.

---

## 📍 Endpoints de Acesso

### Aplicação Web (Admin / Funcionários)
- **URL**: `http://homologacao/`
- **Servidor**: Docker nginx (condosync-web)
- **Porta**: 80
- **Tipo**: SPA React + Vite compilado (produção)

### App Mobile PWA (Moradores / Portaria)
- **URL**: `http://homologacao:5174/`
- **Servidor**: Docker nginx (condosync-mobile)
- **Porta**: 5174
- **Tipo**: PWA React + Vite + Capacitor (produção)

### API Backend
- **URL**: `http://homologacao:3333/api/v1/`
- **Servidor Real**: Docker Express (condosync-api)
- **Porta Real**: 3333
- **Documentação**: `http://homologacao:3333/docs` (Swagger)

### Banco de Dados
- **Host**: homologacao
- **Porta**: 5432
- **Database**: condosync
- **User**: condosync
- **Password**: condosync123

### Cache (Redis)
- **Host**: homologacao
- **Porta**: 6379

### Email (Mailpit)
- **Web UI**: `http://homologacao:8025`
- **SMTP**: homologacao:1025

---

## 👥 Credenciais de Acesso para Homologação

### 1️⃣ Super Administrador (SUPER_ADMIN)
```
Email: atendimentoveredasbosque@gmail.com
Senha: Admin@2026
Acesso: Dashboard completo, gestão de condominios, usuários
```

### 2️⃣ Síndico (SYNDIC)
```
Email: sindico@parqueverde.com.br
Senha: Sindico@2026
Acesso: Gestão operacional do condomínio (Veredas do Bosque)
```

### 3️⃣ Porteiro/Portaria (DOORMAN)
```
Email: porteiro@parqueverde.com.br
Senha: Porteiro@2026
Acesso: Controle de visitantes, encomendas, check-in/out
```

### 4️⃣ Atendimento/Suporte (CONDOMINIUM_ADMIN)
```
Email: atendimento@parqueverde.com.br
Senha: Atendimento@2026
Acesso: Suporte e gestão de chamados
```

### 5️⃣ Moradores (RESIDENT) - 5 Usuários
```
morador1@parqueverde.com.br | Morador@2026
morador2@parqueverde.com.br | Morador@2026
morador3@parqueverde.com.br | Morador@2026
morador4@parqueverde.com.br | Morador@2026
morador5@parqueverde.com.br | Morador@2026
Acesso: Painel de morador (consultas, solicitações, documentos)
```

---

## 🏢 Condomínio Demo

- **Nome**: Residencial Veredas do Bosque
- **CNPJ**: 12345678000195
- **Endereço**: Rua das Palmeiras, 500
- **Cidade**: São Paulo, SP
- **CEP**: 01310100
- **Unidades**: 10 unidades (Casa 01 a Casa 10)
- **Moradores**: Associados às unidades (Casa 01-05)

---

## 🚀 Como Usar

### 1. Login na Aplicação
1. Abra `http://homologacao/login`
2. Insira email e senha (veja tabela acima)
3. Confirme autenticação

### 2. Testar Diferentes Papéis
- **Admin**: Vê todas as condominias, gestão global
- **Síndico**: Vê apenas Veredas do Bosque, gestão operacional
- **Porteiro**: Interface simplificada para visitantes
- **Morador**: Acesso limitado a sua unidade
- **Atendimento**: Painel de chamados e suporte

### 3. Testar Isolamento de Múltiplos Condominios
- Super Admin pode criar novos condominios
- Cada usuário SYNDIC é isolado ao seu condomínio
- Tentativa de acesso cruzado retorna **403 Forbidden**

---

## 🐳 Infraestrutura Docker

```bash
# Ver status dos containers
docker ps

# Logs em tempo real
docker logs -f condosync-web    # Nginx
docker logs -f condosync-api    # Express API
docker logs -f condosync-postgres # PostgreSQL

# Reiniciar (se necessário)
docker compose down
docker compose up -d
```

---

## 🔍 Verificação de Saúde

### API Health Check
```
GET http://homologacao:3333/health
```

### Nginx Status
```bash
docker exec condosync-web nginx -t
```

### Database Connection
```bash
docker exec condosync-postgres pg_isready -U condosync -d condosync
```

---

## 📝 Checklist de Homologação

- [ ] **Login**: Testar com todos os 5 papéis de usuário
- [ ] **Dashboard**: Verificar se cada papel vê dados corretos
- [ ] **Isolamento**: Super Admin vê tudo, outros papéis veem apenas seu condominio
- [ ] **Negação de Acesso**: Tentar acessar condomínio de outro usuário (deve dar 403)
- [ ] **API Proxy**: Requisições `/api/*` chegam na Express
- [ ] **Socket.IO**: Conexão WebSocket com eventos em tempo real
- [ ] **Emails**: Verificar captura em `http://homologacao:8025`
- [ ] **Performance**: Verificar tempo de resposta API e carregamento da SPA

---

## 📚 Documentação Adicional

- **Architecture**: `apps/api/README.md`
- **API Routes**: `apps/api/src/modules/*/`
- **Frontend Components**: `apps/web/src/components/` e `apps/web/src/pages/`
- **Database Schema**: `apps/api/prisma/schema.prisma`

---

## 🐛 Troubleshooting

### A aplicação não carrega em homologacao/
```bash
# Verificar se Docker Web está saudável
docker ps | grep condosync-web

# Verificar logs
docker logs condosync-web
```

### Login falha
```bash
# Verificar se API está respondendo
curl http://homologacao:3333/health

# Verificar credenciais (seed deve ter rodado)
docker exec condosync-postgres psql -U condosync -d condosync -c "SELECT email, role FROM public.user LIMIT 5;"
```

### Porta 80 já está em uso
```bash
# Encontrar o processo ocupando porta 80
netstat -ano | findstr :80

# Se necessário, mudar docker-compose.yml para porta diferente
# Modificar: ports: ["8080:80"] 
```

---

**Gerado em**: 15 de maio de 2026
**Versão**: v1.1.0 — Rebuild completo (API + Web + Mobile)
**Status**: ✅ Homologação Pronta para Testes

---

## 📋 Changelog v1.1.0 (15/05/2026)

### ✨ Novas Funcionalidades
- App Mobile PWA adicionado ao Docker Compose (porta 5174)
- Suporte a múltiplos moradores por unidade
- Dependentes na unidade
- Redesign global de ícones (lucide-react v1.14.0)
- Criação de condomínio + CONDOMINIUM_ADMIN em fluxo unificado
- Reset de senha do admin
- Módulos: multas, regras de cobrança, contratos, sinalização digital, QR code de visitante

### 🐛 Correções
- Upload de imagem (ImageUpload) — sintaxe corrigida
- Moradores já vinculados ocultos no dropdown de vínculo
- Atualização de email sem unique constraint violation
- Exibição de múltiplos moradores no card de unidade
- Status OCCUPIED atualizado ao vincular morador
- Ordenação numérica de unidades

### 🏗️ Infraestrutura
- Serviço `mobile` adicionado ao `docker-compose.yml`
- Rebuild das imagens sem cache (api, web, mobile)
- Backup automático: `backup_homolog_20260515_110652.sql`
