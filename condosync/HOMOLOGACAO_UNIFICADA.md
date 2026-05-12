# 🏢 Homologação Unificada - CondoSync

## Consolidação de Acesso

A aplicação está **unificada em um único servidor** na porta **80**:

```
http://localhost/          → Raiz (SPA React)
http://localhost/login     → Tela de autenticação
http://localhost/moradores → Painel do morador
http://localhost/admin     → Painel administrativo
```

**Nota**: O Vite dev server (porta 5175) foi descontinuado. Toda a aplicação web é agora servida via **Docker + nginx** na porta 80.

---

## 📍 Endpoints de Acesso

### Aplicação Web
- **URL**: `http://localhost/`
- **Servidor**: Docker nginx (condosync-web)
- **Porta**: 80
- **Tipo**: SPA React + Vite compilado (produção)

### API Backend
- **URL**: `http://localhost/api/` (via proxy nginx)
- **Servidor Real**: Docker Express (condosync-api)
- **Porta Real**: 3333
- **Documentação**: `http://localhost:3333/docs` (Swagger)

### Banco de Dados
- **Host**: localhost
- **Porta**: 5432
- **Database**: condosync
- **User**: condosync
- **Password**: condosync123

### Cache (Redis)
- **Host**: localhost
- **Porta**: 6379

### Email (Mailpit)
- **Web UI**: `http://localhost:8025`
- **SMTP**: localhost:1025

---

## 👥 Credenciais de Acesso para Homologação

### 1️⃣ Super Administrador (SUPER_ADMIN)
```
Email: admin@condosync.com.br
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
1. Abra `http://localhost/login`
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
GET http://localhost:3333/health
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
- [ ] **Emails**: Verificar captura em `http://localhost:8025`
- [ ] **Performance**: Verificar tempo de resposta API e carregamento da SPA

---

## 📚 Documentação Adicional

- **Architecture**: `apps/api/README.md`
- **API Routes**: `apps/api/src/modules/*/`
- **Frontend Components**: `apps/web/src/components/` e `apps/web/src/pages/`
- **Database Schema**: `apps/api/prisma/schema.prisma`

---

## 🐛 Troubleshooting

### A aplicação não carrega em localhost/
```bash
# Verificar se Docker Web está saudável
docker ps | grep condosync-web

# Verificar logs
docker logs condosync-web
```

### Login falha
```bash
# Verificar se API está respondendo
curl http://localhost:3333/health

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

**Gerado em**: 11 de maio de 2026
**Status**: ✅ Homologação Pronta para Testes
