# 🔐 Configuração de Usuários - CondoSync

## Status: ✅ Todos os Usuários Configurados

Todos os usuários foram criados via seed e estão prontos para login na plataforma.

---

## 👥 Usuários por Papel/Função

### 1️⃣ SUPER ADMINISTRADOR (SUPER_ADMIN)
**Acesso Global — Gestão de toda a plataforma**

| Campo | Valor |
|-------|-------|
| **Email** | atendimentoveredasbosque@gmail.com |
| **Senha** | Admin@2026 |
| **Papel** | SUPER_ADMIN |
| **Permissões** | Criar condominios, gerenciar usuários globalmente, acessar dashboard executivo |
| **Condomínio** | Todos os condominios |

**Teste de Login:**
```bash
curl -X POST http://localhost:3333/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"atendimentoveredasbosque@gmail.com","password":"Admin@2026"}'
```

---

### 2️⃣ SÍNDICO (SYNDIC)
**Gestão Operacional — Controle geral do condomínio**

| Campo | Valor |
|-------|-------|
| **Email** | sindico@parqueverde.com.br |
| **Senha** | Sindico@2026 |
| **Papel** | SYNDIC |
| **CPF** | 11122233344 |
| **Condomínio** | Residencial Veredas do Bosque |
| **Permissões** | Gestão de unidades, moradores, visitantes, financeiro, encomendas |

**Casos de Uso:**
- Criar/editar unidades
- Cadastrar/remover moradores
- Gerenciar autorização de visitantes
- Visualizar relatórios financeiros
- Gerenciar encomendas

---

### 3️⃣ PORTEIRO / PORTARIA (DOORMAN)
**Controle de Acesso — Gestão de visitantes, encomendas e pânico**

| Campo | Valor |
|-------|-------|
| **Email** | porteiro@parqueverde.com.br |
| **Senha** | Porteiro@2026 |
| **Papel** | DOORMAN |
| **CPF** | 22233344455 |
| **Condomínio** | Residencial Veredas do Bosque |
| **Permissões** | Registrar visitantes, receber encomendas, alertas de pânico |

**Casos de Uso:**
- Check-in/check-out de visitantes
- Receber e registrar encomendas
- Gerar QR code para visitantes
- Ativar alarme de pânico
- Visualizar lista de visitantes autorizados

**Interface Simplificada:**
- Menu reduzido para operações de portaria
- Acesso à listagem de visitantes
- Painel de encomendas

---

### 4️⃣ ATENDIMENTO / SUPORTE (CONDOMINIUM_ADMIN)
**Suporte e Gestão de Chamados — Operações de atendimento**

| Campo | Valor |
|-------|-------|
| **Email** | atendimentoveredasbosque@gmail.com |
| **Senha** | 123456 |
| **Papel** | CONDOMINIUM_ADMIN |
| **CPF** | 33344455600 |
| **Condomínio** | Residencial Veredas do Bosque |
| **Permissões** | Gerenciar chamados, responder solicitações, consultar dados |

**Casos de Uso:**
- Receber solicitações de moradores
- Abrir e fechar chamados
- Atribuir a fornecedores/prestadores
- Registrar manutenção corretiva
- Comunicar aos moradores

---

### 5️⃣ MORADORES (RESIDENT) - 5 Usuários
**Acesso Limitado — Consultas e solicitações da unidade**

| Campo | Valor |
|-------|-------|
| **Email** | morador1@parqueverde.com.br a morador5@parqueverde.com.br |
| **Senha** | Morador@2026 |
| **Papel** | RESIDENT |
| **CPF** | 44455566700 a 44455566704 |
| **Condomínio** | Residencial Veredas do Bosque |
| **Unidades** | Casa 01 a Casa 05 (uma por morador) |

**Permissões:**
- Visualizar dados da própria unidade
- Solicitar manutenção/suporte
- Consultar faturas e pagamentos
- Ver avisos e comunicados
- Registrar visitantes

**Detalhamento de Moradores:**

| # | Email | Nome | Unidade |
|---|-------|------|---------|
| 1 | morador1@parqueverde.com.br | Ana Costa | Casa 01 |
| 2 | morador2@parqueverde.com.br | Bruno Oliveira | Casa 02 |
| 3 | morador3@parqueverde.com.br | Carla Santos | Casa 03 |
| 4 | morador4@parqueverde.com.br | Diego Fernandes | Casa 04 |
| 5 | morador5@parqueverde.com.br | Elena Martins | Casa 05 |

---

## 🏢 Condomínio Demo

| Propriedade | Valor |
|-------------|-------|
| **Nome** | Residencial Veredas do Bosque |
| **CNPJ** | 12345678000195 |
| **Endereço** | Rua das Palmeiras, 500 |
| **Cidade** | São Paulo, SP |
| **CEP** | 01310100 |
| **Telefone** | (11) 3000-0000 |
| **Email** | admin@parqueverde.com.br |
| **Unidades Criadas** | 10 (Casa 01 a Casa 10) |
| **Moradores Vinculados** | 5 (Casa 01-05 ocupadas) |

---

## 🔄 Fluxo de Autenticação

```
1. Usuário acessa: http://localhost/login
2. Insere email e senha
3. Backend valida credenciais (bcrypt)
4. Gera JWT access token (1h) + refresh token (7d)
5. Frontend armazena em Zustand (persistido)
6. Redirecionado para dashboard baseado em papel
```

---

## 🔐 Segurança & Isolamento Multi-tenant

### Verificação de Acesso
- **Super Admin**: Acessa todos os condominios
- **Síndico/Porteiro/Atendimento**: Isolados ao próprio condomínio
- **Morador**: Vê apenas sua unidade e dados relacionados
- **Tentativa de Acesso Cruzado**: Retorna `403 Forbidden`

### Middleware de Autorização
Arquivo: `apps/api/src/middleware/auth.ts`

```typescript
authorizeCondominium(req, res, next) {
  // Valida se o usuário tem acesso ao condominiumId da rota
  // Super Admin: sempre permitido
  // Outros: verificar userId_condominiumId
  // Se não autorizado: 403 ForbiddenError
}
```

---

## 📝 Checklist de Configuração

- [x] Super Admin criado
- [x] Condomínio Demo criado
- [x] Síndico vinculado ao condomínio
- [x] Porteiro vinculado ao condomínio
- [x] Atendimento vinculado ao condomínio
- [x] 5 Moradores criados e vinculados
- [x] Unidades criadas (10)
- [x] Senhas hasheadas com bcrypt (12 rounds)
- [x] JWT configurado (1h access, 7d refresh)
- [x] Isolamento multi-tenant ativado

---

## 🧪 Testes de Login

### Teste 1: Super Admin
```bash
POST /api/v1/auth/login
{
  "email": "atendimentoveredasbosque@gmail.com",
  "password": "Admin@2026"
}
# Esperado: 200 OK + accessToken + refreshToken
```

### Teste 2: Síndico
```bash
POST /api/v1/auth/login
{
  "email": "sindico@parqueverde.com.br",
  "password": "Sindico@2026"
}
# Esperado: 200 OK + tokens + condomínio vinculado
```

### Teste 3: Porteiro
```bash
POST /api/v1/auth/login
{
  "email": "porteiro@parqueverde.com.br",
  "password": "Porteiro@2026"
}
# Esperado: 200 OK + interface simplificada
```

### Teste 4: Atendimento
```bash
POST /api/v1/auth/login
{
  "email": "atendimento@parqueverde.com.br",
  "password": "Atendimento@2026"
}
# Esperado: 200 OK + painel de chamados
```

### Teste 5: Morador
```bash
POST /api/v1/auth/login
{
  "email": "morador1@parqueverde.com.br",
  "password": "Morador@2026"
}
# Esperado: 200 OK + acesso limitado à unidade
```

---

## 🛠️ Redefinição de Senhas (Procedimento)

Se necessário resetar senha:

### Via Admin Panel (implementação futura)
1. Super Admin acessa: `/admin/usuarios`
2. Seleciona usuário
3. Clica "Resetar Senha"
4. Nova senha é gerada e enviada por email

### Via API (Admin)
```bash
PATCH /api/v1/users/:userId/password
Authorization: Bearer <admin-token>
{
  "newPassword": "NovaSenha@2026"
}
```

### Via Auto-Serviço (Morador)
1. Acessa `/login`
2. Clica "Esqueci a Senha"
3. Insere email
4. Recebe link de reset no Mailpit (localhost:8025)
5. Cria nova senha

---

## 📬 Email & Notificações

### Captura de Emails (Desenvolvimento)
- **Mailpit UI**: http://localhost:8025
- **SMTP**: localhost:1025 (sem autenticação necessária)
- Todos os emails são capturados e armazenados em memória

### Emails Enviados Automaticamente
- Boas-vindas ao novo usuário
- Recuperação de senha
- Aviso de visitante autorizado (QR code)
- Notificação de nova encomenda
- Alerta de chamado atribuído

---

## 🚀 Próximas Etapas

1. **Teste Completo de Login**: Validar cada papel na UI
2. **Teste de Isolamento**: Super Admin consegue acessar dados de outros, Síndico não
3. **Teste de Permissões**: Cada papel vê apenas suas features
4. **Teste de Email**: Verificar emails em Mailpit
5. **Teste de Refresh Token**: Validar renovação de sessão

---

**Data de Configuração**: 11 de maio de 2026  
**Status**: ✅ Pronto para Homologação
