# CondoSync — Documentação Completa do Sistema

> Arquivo gerado para análise e migração do ambiente de desenvolvimento.
> Produção: https://web-production-916b1.up.railway.app/home

---

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Stack Técnico](#2-stack-técnico)
3. [Estrutura de Diretórios](#3-estrutura-de-diretórios)
4. [Setup Rápido](#4-setup-rápido)
   - [Com Docker](#41-com-docker-recomendado)
   - [Sem Docker (local)](#42-sem-docker-windows--linux)
5. [Variáveis de Ambiente](#5-variáveis-de-ambiente)
6. [Banco de Dados](#6-banco-de-dados)
7. [API REST](#7-api-rest)
8. [Frontend Web](#8-frontend-web)
9. [Mobile PWA](#9-mobile-pwa)
10. [Microsserviço C# — Encomendas](#10-microsserviço-c--encomendas)
11. [Deploy — Railway](#11-deploy--railway)
12. [CI/CD — GitHub Actions](#12-cicd--github-actions)
13. [Testes](#13-testes)
14. [Código-Chave da API](#14-código-chave-da-api)
15. [Credenciais Demo](#15-credenciais-demo)

---

## 1. Visão Geral

**CondoSync** é um SaaS multi-tenant para gestão condominial. O sistema permite que diferentes condomínios usem a mesma plataforma de forma isolada, com controle de acesso baseado em papéis (RBAC).

**Funcionalidades principais:**
- Portaria digital (visitantes, veículos, encomendas)
- Financeiro (cobranças, transações, relatórios) com integração ASAAS (PIX/boleto)
- Manutenção e ordens de serviço
- Comunicação interna (avisos, ocorrências, assembleias, enquetes)
- Reservas de áreas comuns
- App mobile PWA para moradores
- Assistente IA via OpenAI GPT-4o-mini
- Relatórios e dashboard gerencial
- Notificações em tempo real via Socket.IO

---

## 2. Stack Técnico

| Camada         | Tecnologia                                                               |
|----------------|--------------------------------------------------------------------------|
| **Runtime**    | Node.js 22                                                               |
| **API**        | Express 4 + TypeScript 5 + `express-async-errors`                       |
| **ORM**        | Prisma 5 (PostgreSQL 16+)                                                |
| **Cache/Jobs** | Redis 7+ (BullMQ para filas, rate-limiter)                               |
| **Auth**       | JWT (access 1h + refresh 7d) + bcrypt                                    |
| **Real-time**  | Socket.IO 4                                                              |
| **Email**      | Resend (produção) / Nodemailer + Mailpit (dev)                           |
| **Monitoring** | Sentry (`@sentry/node`)                                                  |
| **Pagamentos** | ASAAS (PIX, boleto)                                                      |
| **IA**         | OpenAI GPT-4o-mini (`OPENAI_API_KEY`)                                    |
| **Frontend**   | React 18 + Vite 5 + TypeScript + Tailwind CSS 3 + Zustand + React Query |
| **Mobile**     | React 18 + Vite 5 + Tailwind + PWA (`vite-plugin-pwa`)                  |
| **Microsserv.**| ASP.NET Core 10 (C#) — gestão de encomendas (standalone)                |
| **Logger**     | Winston (JSON em prod, colorido em dev)                                  |
| **Testes**     | Vitest 4 + vitest-mock-extended                                          |
| **CI/CD**      | GitHub Actions → Railway                                                 |
| **Container**  | Docker Compose (dev) + Railway (prod)                                    |

---

## 3. Estrutura de Diretórios

```
DevSantiago/                         ← raiz do repositório
├── Dockerfile.api                   ← Dockerfile da API (usado pelo Railway)
├── railway.json                     ← config de deploy Railway (API)
├── deploy.ps1                       ← script de deploy PowerShell
├── DevSantiago.sln                  ← solution .NET (C#)
├── ROADMAP.md
├── SISTEMA.md                       ← este arquivo
├── .gitignore
├── .github/
│   ├── agents/
│   │   └── condosync-dev.agent.md  ← agente VS Code Copilot
│   ├── skills/
│   │   └── condosync-test-env/
│   │       └── SKILL.md
│   └── workflows/
│       └── ci.yml                  ← CI/CD (test + build + deploy)
└── condosync/                       ← monorepo principal
    ├── package.json                 ← raiz do monorepo (workspaces)
    ├── docker-compose.yml           ← ambiente local completo
    ├── docker-compose.railway.yml   ← railway (sem portas expostas)
    ├── railway.web.toml             ← config do serviço web no Railway
    ├── .gitignore
    ├── apps/
    │   ├── api/                     ← API REST
    │   │   ├── package.json
    │   │   ├── tsconfig.json
    │   │   ├── vitest.config.ts
    │   │   ├── Dockerfile
    │   │   ├── entrypoint.sh
    │   │   ├── prisma/
    │   │   │   ├── schema.prisma    ← schema completo do banco
    │   │   │   ├── migrations/      ← 8 migrations
    │   │   │   ├── seed-base.js     ← dados mínimos (admin, síndico, porteiro)
    │   │   │   ├── seed-demo.js     ← dados demo realistas
    │   │   │   └── seed.ts
    │   │   └── src/
    │   │       ├── server.ts        ← ponto de entrada + registro de rotas
    │   │       ├── config/
    │   │       │   ├── env.ts       ← validação Zod das env vars
    │   │       │   ├── prisma.ts    ← cliente Prisma singleton
    │   │       │   ├── logger.ts    ← Winston logger
    │   │       │   ├── mail.ts      ← Resend / Nodemailer
    │   │       │   └── redis.ts     ← cliente Redis (ioredis)
    │   │       ├── middleware/
    │   │       │   ├── auth.ts      ← JWT authenticate + authorize
    │   │       │   ├── errorHandler.ts ← handler central de erros
    │   │       │   ├── rateLimiter.ts
    │   │       │   └── notFoundHandler.ts
    │   │       ├── modules/         ← 30 módulos (routes + controller + service)
    │   │       │   ├── ai/
    │   │       │   ├── assemblies/
    │   │       │   ├── auth/
    │   │       │   ├── common-areas/
    │   │       │   ├── communication/
    │   │       │   ├── condominiums/
    │   │       │   ├── dashboard/
    │   │       │   ├── documents/
    │   │       │   ├── employees/
    │   │       │   ├── finance/
    │   │       │   ├── finance-categories/
    │   │       │   ├── gallery/
    │   │       │   ├── lost-and-found/
    │   │       │   ├── maintenance/
    │   │       │   ├── marketplace/
    │   │       │   ├── panic/
    │   │       │   ├── parcels/
    │   │       │   ├── pets/
    │   │       │   ├── renovations/
    │   │       │   ├── reports/
    │   │       │   ├── residents/
    │   │       │   ├── service-providers/
    │   │       │   ├── stock/
    │   │       │   ├── tickets/
    │   │       │   ├── units/
    │   │       │   ├── users/
    │   │       │   ├── vehicles/
    │   │       │   ├── visitor-recurrences/
    │   │       │   ├── visitors/
    │   │       │   └── webhooks/
    │   │       ├── notifications/
    │   │       ├── services/        ← serviços compartilhados
    │   │       ├── shared/          ← utils compartilhados
    │   │       └── utils/
    │   ├── web/                     ← painel admin/funcionários (React)
    │   │   ├── package.json
    │   │   ├── tsconfig.json
    │   │   ├── vite.config.ts       ← alias @/, proxy /api → :3333
    │   │   ├── tailwind.config.js
    │   │   ├── index.html
    │   │   ├── Dockerfile
    │   │   ├── nginx.conf.template  ← template nginx com ${API_URL}
    │   │   └── src/
    │   │       ├── App.tsx          ← roteamento React Router v6
    │   │       ├── main.tsx
    │   │       ├── index.css        ← variáveis CSS / Tailwind
    │   │       ├── components/
    │   │       │   ├── ai/          ← AiAssistantChat.tsx
    │   │       │   ├── layouts/     ← AppLayout.tsx, AuthLayout.tsx
    │   │       │   ├── navigation/  ← Header.tsx, Sidebar.tsx
    │   │       │   └── ui/          ← toaster.tsx
    │   │       ├── pages/           ← ver seção 8
    │   │       ├── services/
    │   │       │   └── api.ts       ← axios client + interceptors
    │   │       └── store/
    │   │           └── authStore.ts ← Zustand + persist
    │   └── mobile/                  ← app morador PWA (React)
    │       ├── package.json
    │       ├── vite.config.ts       ← PWA + alias @/ + proxy
    │       ├── tailwind.config.js
    │       ├── index.html
    │       ├── Dockerfile
    │       └── src/
    │           ├── App.tsx
    │           ├── pages/           ← auth/, home/, marketplace/, morador/, portaria/, shared/
    │           ├── components/
    │           ├── services/
    │           └── store/
    └── condosync-encomendas/        ← microsserviço C# .NET 10
        ├── condosync-encomendas.csproj
        └── src/
            ├── Program.cs
            ├── Startup.cs
            ├── appsettings.json
            ├── controllers/
            │   ├── EncomendaController.cs
            │   └── MoradorController.cs
            ├── Data/AppDbContext.cs
            ├── dtos/
            ├── interfaces/
            ├── repositories/
            └── services/
```

---

## 4. Setup Rápido

### 4.1 Com Docker (recomendado)

```bash
# 1. Clonar o repositório
git clone <REPO_URL> devsantiago
cd devsantiago/condosync

# 2. Copiar e preencher as variáveis de ambiente
cp apps/api/.env.example apps/api/.env
# Editar apps/api/.env (mínimo: DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET, REDIS_URL)

# 3. Subir todos os serviços
docker compose up -d

# 4. Aplicar migrations e popular banco
docker compose exec api npx prisma migrate dev
docker compose exec api node prisma/seed-base.js
docker compose exec api node prisma/seed-demo.js

# Acessar:
# Web:    http://localhost:5173
# Mobile: http://localhost:5174
# API:    http://localhost:3333
# Mailpit: http://localhost:8025  (visualizar emails)
```

**Serviços no docker-compose.yml:**

| Serviço   | Imagem              | Porta    |
|-----------|---------------------|----------|
| postgres  | postgres:16-alpine  | 5432     |
| redis     | redis:7-alpine      | 6379     |
| api       | ./apps/api          | 3333     |
| web       | ./apps/web          | 5173     |
| mobile    | ./apps/mobile       | 5174     |
| mailpit   | axllent/mailpit     | 1025/8025|

---

### 4.2 Sem Docker (Windows / Linux)

#### Pré-requisitos

- Node.js 22+ (`node --version`)
- PostgreSQL 16+ rodando localmente
- Redis 7+ rodando localmente

#### Windows via Scoop (alternativa)

```powershell
# Instalar Scoop
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex

# Instalar PostgreSQL e Redis
scoop bucket add main
scoop install postgresql redis

# Inicializar e iniciar PostgreSQL
initdb -D "$env:USERPROFILE\postgresql\data" -U postgres -A scram-sha-256 --pwprompt
pg_ctl -D "$env:USERPROFILE\postgresql\data" -l logfile start

# Criar banco e usuário
psql -U postgres -c "CREATE USER condosync WITH PASSWORD 'condosync123';"
psql -U postgres -c "CREATE DATABASE condosync OWNER condosync;"

# Iniciar Redis
redis-server --daemonize yes
```

#### Subir a API (modo dev)

```bash
cd condosync/apps/api

# Instalar dependências
npm install

# Configurar variáveis
cp .env.example .env
# Editar .env com os dados do banco local

# Verificar e aplicar migrations
npx prisma generate
npx prisma migrate dev

# Popular banco
node prisma/seed-base.js
node prisma/seed-demo.js

# Iniciar com hot-reload
npm run dev
# API disponível em http://localhost:3333
```

#### Subir o Frontend Web

```bash
cd condosync/apps/web
npm install
npm run dev
# Disponível em http://localhost:5173
```

#### Subir o Mobile PWA

```bash
cd condosync/apps/mobile
npm install
npm run dev
# Disponível em http://localhost:5174
```

---

## 5. Variáveis de Ambiente

Arquivo: `condosync/apps/api/.env`

```env
# ─── Ambiente ────────────────────────────────────────────────
NODE_ENV=development           # development | test | production

# ─── Servidor ────────────────────────────────────────────────
PORT=3333

# ─── Banco de Dados ──────────────────────────────────────────
DATABASE_URL=postgresql://condosync:condosync123@localhost:5432/condosync

# ─── JWT ─────────────────────────────────────────────────────
JWT_SECRET=sua_chave_secreta_jwt_minimo_32_caracteres_aqui
JWT_REFRESH_SECRET=outra_chave_secreta_refresh_minimo_32_chars
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# ─── CORS ────────────────────────────────────────────────────
CORS_ORIGINS=http://localhost:5173,http://localhost:5174

# ─── Uploads ─────────────────────────────────────────────────
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880         # 5MB em bytes

# ─── E-mail ──────────────────────────────────────────────────
SMTP_HOST=localhost            # localhost = Mailpit
SMTP_PORT=1025
SMTP_USER=                     # vazio para Mailpit
SMTP_PASS=                     # vazio para Mailpit
SMTP_FROM=noreply@condosync.com.br

# ─── Redis ───────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379

# ─── Segurança ───────────────────────────────────────────────
BCRYPT_ROUNDS=12

# ─── IA (opcional) ───────────────────────────────────────────
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# ─── Pagamentos (opcional) ───────────────────────────────────
ASAAS_WEBHOOK_TOKEN=seu_token_webhook_asaas

# ─── Frontend ────────────────────────────────────────────────
FRONTEND_URL=http://localhost:5173

# ─── Produção (somente) ──────────────────────────────────────
RESEND_API_KEY=re_...          # e-mail transacional (Resend)
SENTRY_DSN=https://...         # monitoramento de erros (Sentry)
```

**Geração de chaves seguras:**

```bash
# JWT_SECRET e JWT_REFRESH_SECRET (Linux/macOS)
openssl rand -base64 48

# PowerShell (Windows)
[System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
```

---

## 6. Banco de Dados

### 6.1 Enumerações do Schema

```prisma
enum UserRole         { SUPER_ADMIN, CONDOMINIUM_ADMIN, SYNDIC, DOORMAN, RESIDENT, SERVICE_PROVIDER, COUNCIL_MEMBER }
enum UnitStatus       { OCCUPIED, VACANT, UNDER_RENOVATION, BLOCKED }
enum VisitorStatus    { PENDING, AUTHORIZED, DENIED, INSIDE, LEFT }
enum ParcelStatus     { RECEIVED, NOTIFIED, PICKED_UP, RETURNED }
enum ServiceOrderStatus { OPEN, IN_PROGRESS, WAITING_PARTS, COMPLETED, CANCELED }
enum ServiceOrderPriority { LOW, MEDIUM, HIGH, URGENT }
enum FinancialTransactionType { INCOME, EXPENSE }
enum ChargeStatus     { PENDING, PAID, OVERDUE, CANCELED }
enum ReservationStatus { PENDING, CONFIRMED, CANCELED, COMPLETED }
enum OccurrenceStatus  { OPEN, IN_ANALYSIS, RESOLVED, CLOSED }
enum NotificationType  { VISITOR, PARCEL, MAINTENANCE, FINANCIAL, COMMUNICATION, RESERVATION, OCCURRENCE, ASSEMBLY }
enum AssemblyStatus    { SCHEDULED, IN_PROGRESS, FINISHED, CANCELED }
enum GatewayType       { NONE, ASAAS, PJBANK }
enum VehicleType       { CAR, MOTORCYCLE, TRUCK, BICYCLE, OTHER }
enum ShiftType         { MORNING, AFTERNOON, NIGHT, FULL_DAY }
enum RenovationStatus  { PENDING, APPROVED, IN_PROGRESS, COMPLETED, REJECTED }
```

### 6.2 Modelos Principais

| Modelo                | Tabela                   | Descrição                                   |
|-----------------------|--------------------------|---------------------------------------------|
| `User`                | `users`                  | Usuários do sistema (todos os papéis)       |
| `RefreshToken`        | `refresh_tokens`         | Tokens de refresh JWT                       |
| `PasswordReset`       | `password_resets`        | Tokens de reset de senha                    |
| `Condominium`         | `condominiums`           | Condomínios (tenant principal)              |
| `CondominiumUser`     | `condominium_users`      | Associação usuário ↔ condomínio + papel     |
| `Unit`                | `units`                  | Unidades (apartamentos, casas, lotes)       |
| `Dependent`           | `dependents`             | Dependentes dos moradores                   |
| `Vehicle`             | `vehicles`               | Veículos cadastrados                        |
| `VehicleAccessLog`    | `vehicle_access_logs`    | Log de entrada/saída de veículos            |
| `Employee`            | `employees`              | Funcionários do condomínio                  |
| `ServiceProvider`     | `service_providers`      | Prestadores de serviço                      |
| `Visitor`             | `visitors`               | Controle de visitantes                      |
| `Parcel`              | `parcels`                | Encomendas/correspondências                 |
| `Announcement`        | `announcements`          | Avisos/comunicados                          |
| `Notification`        | `notifications`          | Notificações push/in-app                    |
| `ChatConversation`    | `chat_conversations`     | Conversas do chat                           |
| `ChatMessage`         | `chat_messages`          | Mensagens do chat                           |
| `Poll`                | `polls`                  | Enquetes                                    |
| `PollVote`            | `poll_votes`             | Votos em enquetes                           |
| `Occurrence`          | `occurrences`            | Ocorrências/reclamações                     |
| `FinancialAccount`    | `financial_accounts`     | Contas bancárias do condomínio              |
| `FinancialCategory`   | `financial_categories`   | Categorias financeiras                      |
| `FinancialTransaction`| `financial_transactions` | Transações de receita/despesa               |
| `Charge`              | `charges`                | Cobranças (condomínio, IPTU, fundo reserva) |
| `CommonArea`          | `common_areas`           | Áreas comuns (salão, piscina, etc.)         |
| `Reservation`         | `reservations`           | Reservas de áreas comuns                    |
| `ServiceOrder`        | `service_orders`         | Ordens de serviço/manutenção                |
| `MaintenanceSchedule` | `maintenance_schedules`  | Agendamentos de manutenção preventiva       |
| `Contract`            | `contracts`              | Contratos com prestadores                   |
| `Assembly`            | `assemblies`             | Assembleias de condomínio                   |
| `AssemblyAgendaItem`  | `assembly_agenda_items`  | Itens de pauta da assembleia                |
| `AssemblyVote`        | `assembly_votes`         | Votos em assembleias                        |
| `AssemblyMinute`      | `assembly_minutes`       | Atas de assembleia                          |
| `Pet`                 | `pets`                   | Animais de estimação                        |
| `LostAndFound`        | `lost_and_found`         | Achados e perdidos                          |
| `CondominiumDocument` | `condominium_documents`  | Documentos do condomínio                    |
| `Renovation`          | `renovations`            | Obras/reformas nas unidades                 |
| `StockItem`           | `stock_items`            | Itens do estoque do condomínio              |
| `StockMovement`       | `stock_movements`        | Movimentação de estoque                     |
| `Ticket`              | `tickets`                | Chamados de suporte                         |
| `TicketMessage`       | `ticket_messages`        | Mensagens dos chamados                      |
| `GalleryItem`         | `gallery_items`          | Galeria de fotos/documentos                 |
| `MarketplaceItem`     | `marketplace_items`      | Classificados/marketplace                   |
| `PanicAlert`          | `panic_alerts`           | Alertas de pânico                           |
| `VisitorRecurrence`   | `visitor_recurrences`    | Visitantes recorrentes pré-autorizados      |
| `AuditLog`            | `audit_logs`             | Log de auditoria de ações                   |
| `Permission`          | `permissions`            | Permissões granulares                       |
| `RolePermission`      | `role_permissions`       | Associação papel ↔ permissão                |

### 6.3 Migrations (em ordem cronológica)

```
1. 20260311114401_init                                    ← estrutura base completa
2. 20260311141507_add_assemblies                          ← assembleias
3. 20260311152321_add_pets                                ← animais de estimação
4. 20260311152727_add_lost_and_found                      ← achados e perdidos
5. 20260312123000_add_condominium_documents               ← documentos
6. 20260316120000_enforce_resident_unit_integrity         ← integridade moradores-unidades
7. 20260319190000_add_marketplace_panic_and_visitor_recurrence ← marketplace, pânico, recorrências
8. 20260401180300_add_missing_fields                      ← campos faltantes diversos
```

### 6.4 Seeds (dados demo)

```bash
# Dados mínimos (Super Admin + 1 condomínio + funcionários)
node prisma/seed-base.js

# Dados demo realistas (visitantes, encomendas, finanças, etc.)
node prisma/seed-demo.js

# Dados de pets
node prisma/seed-pets.js
```

---

## 7. API REST

**Base URL:** `http://localhost:3333/api/v1`

**Autenticação:** `Authorization: Bearer <accessToken>`

### 7.1 Todas as rotas registradas

| # | Prefixo                          | Módulo                          |
|---|----------------------------------|---------------------------------|
| 1 | `/api/v1/auth`                   | Auth (login, refresh, reset)    |
| 2 | `/api/v1/users`                  | Usuários                        |
| 3 | `/api/v1/condominiums`           | Condomínios                     |
| 4 | `/api/v1/units`                  | Unidades                        |
| 5 | `/api/v1/residents`              | Moradores                       |
| 6 | `/api/v1/visitors`               | Visitantes                      |
| 7 | `/api/v1/parcels`                | Encomendas                      |
| 8 | `/api/v1/vehicles`               | Veículos                        |
| 9 | `/api/v1/communication`          | Avisos e ocorrências             |
| 10 | `/api/v1/finance`               | Financeiro                      |
| 11 | `/api/v1/finance-categories`    | Categorias financeiras          |
| 12 | `/api/v1/maintenance`           | Manutenção / ordens de serviço  |
| 13 | `/api/v1/common-areas`          | Áreas comuns e reservas         |
| 14 | `/api/v1/reports`               | Relatórios                      |
| 15 | `/api/v1/dashboard`             | Dashboard / KPIs                |
| 16 | `/api/v1/employees`             | Funcionários                    |
| 17 | `/api/v1/service-providers`     | Prestadores de serviço          |
| 18 | `/api/v1/webhooks`              | Webhooks (ASAAS)                |
| 19 | `/api/v1/assemblies`            | Assembleias                     |
| 20 | `/api/v1/pets`                  | Animais de estimação            |
| 21 | `/api/v1/lost-and-found`        | Achados e perdidos              |
| 22 | `/api/v1/documents`             | Documentos do condomínio        |
| 23 | `/api/v1/renovations`           | Obras e reformas                |
| 24 | `/api/v1/stock`                 | Estoque                         |
| 25 | `/api/v1/tickets`               | Chamados de suporte             |
| 26 | `/api/v1/gallery`               | Galeria                         |
| 27 | `/api/v1/ai`                    | Assistente IA                   |
| 28 | `/api/v1/marketplace`           | Classificados                   |
| 29 | `/api/v1/panic`                 | Alertas de pânico               |
| 30 | `/api/v1/visitor-recurrences`   | Visitantes recorrentes          |

**Endpoints especiais:**
```
GET  /health          ← health check
POST /socket.io       ← Socket.IO (WebSocket real-time)
```

### 7.2 Autenticação — endpoints principais

```
POST /api/v1/auth/login              ← login (email + password)
POST /api/v1/auth/refresh            ← renovar access token
POST /api/v1/auth/logout             ← invalidar refresh token
POST /api/v1/auth/forgot-password    ← solicitar reset de senha
POST /api/v1/auth/reset-password     ← redefinir senha
GET  /api/v1/auth/me                 ← dados do usuário logado
```

### 7.3 Padrão de resposta da API

```json
// Sucesso
{ "success": true, "data": { ... } }
{ "success": true, "data": [ ... ], "meta": { "total": 50, "page": 1, "limit": 20 } }

// Erro
{ "success": false, "error": { "code": "NOT_FOUND", "message": "..." } }
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "details": { "field": ["msg"] } } }
```

### 7.4 Rate Limiting

| Limiter         | Janela  | Máximo | Store      |
|-----------------|---------|--------|------------|
| `authRateLimiter` | 15 min | 10 req  | MemoryStore |
| `rateLimiter`   | 15 min  | 200 req | MemoryStore |

> **Nota:** O `authRateLimiter` usa MemoryStore (não Redis). Para resetar em dev: reiniciar a API ou aguardar 15 min.

### 7.5 Padrão de módulo da API

Cada módulo em `src/modules/{nome}/` segue o padrão:

```
{nome}.routes.ts       ← definição de rotas + middlewares
{nome}.controller.ts   ← handlers HTTP (thin, delega ao service)
{nome}.service.ts      ← lógica de negócio + acesso ao Prisma
```

---

## 8. Frontend Web

**URL local:** `http://localhost:5173`  
**Diretório:** `condosync/apps/web/`  
**Alias:** `@/` → `src/`

### 8.1 Páginas disponíveis

```
/                       ← LandingPage (landing pública)
/login                  ← LoginPage
/forgot-password        ← ForgotPasswordPage

# Autenticadas (AppLayout com Sidebar + Header)
/home                   ← DashboardPage
/admin/condominiums     ← CondominiumsPage (SUPER_ADMIN)
/units                  ← UnitsPage
/residents              ← ResidentsPage
/visitors               ← VisitorsPage (portaria)
/vehicles               ← VehiclesPage (portaria)
/parcels                ← ParcelsPage (portaria)
/finance                ← FinancePage
/finance/charges        ← ChargesPage
/finance/my-charges     ← MyChargesPage (morador)
/finance/categories     ← FinanceCategoriesPage
/maintenance            ← MaintenancePage
/common-areas           ← CommonAreasPage
/communication/announcements  ← AnnouncementsPage
/communication/occurrences    ← OccurrencesPage
/communication/lost-and-found ← LostAndFoundPage
/employees              ← EmployeesPage
/documents              ← DocumentsPage
/assemblies             ← AssemblyList
/assemblies/:id         ← AssemblyDetail
/minha-portaria/visitors       ← MyVisitorsPage (morador)
/minha-portaria/recurrences   ← VisitorRecurrencesPage
/minha-portaria/obras         ← MinhasObrasPage
/obras                  ← ObrasAdminPage
/reports                ← ReportsPage
/profile                ← ProfilePage
/settings               ← SettingsPage
```

### 8.2 Estado global (Zustand)

```typescript
// store/authStore.ts — persistido em localStorage ('condosync-auth')
interface AuthState {
  user: UserInfo | null;
  accessToken: string | null;
  refreshToken: string | null;
  selectedCondominiumId: string | null;
  isAuthenticated: boolean;

  setAuth(user, accessToken, refreshToken): void;
  setTokens(accessToken, refreshToken): void;
  setUser(user): void;
  setSelectedCondominium(id): void;
  logout(): void;
}
```

### 8.3 Cliente HTTP (Axios)

```typescript
// services/api.ts
// baseURL: /api/v1  (proxy Vite → http://localhost:3333 em dev)
// Interceptors:
//   - request: insere Bearer token de useAuthStore
//   - response: em 401, tenta refresh automático; em falha → logout()
```

---

## 9. Mobile PWA

**URL local:** `http://localhost:5174`  
**Diretório:** `condosync/apps/mobile/`  
**Porta:** 5174 (proxy → :3333)

### 9.1 Funcionalidades

- App instalável (PWA manifest + Service Worker via `vite-plugin-pwa`)
- Visão do morador: entrada de visitantes, encomendas, financeiro
- Notificações push
- Offline-first com workbox

### 9.2 Estrutura de páginas mobile

```
pages/
├── auth/           ← Login mobile
├── home/           ← Dashboard morador
├── marketplace/    ← Classificados
├── morador/        ← Perfil e dependentes
├── portaria/       ← Visitantes e encomendas (visão morador)
└── shared/         ← Componentes e páginas compartilhadas
```

---

## 10. Microsserviço C# — Encomendas

**Diretório:** `condosync/condosync-encomendas/`  
**Framework:** ASP.NET Core 10 (.NET 10)

> Serviço independente para gestão de encomendas. Pode rodar separado da API Node.js.

### 10.1 Estrutura

```
src/
├── Program.cs
├── Startup.cs
├── appsettings.json
├── controllers/
│   ├── EncomendaController.cs
│   └── MoradorController.cs
├── Data/AppDbContext.cs
├── dtos/
│   ├── EncomendaDto.cs
│   ├── MoradorDto.cs
│   └── RegistrarEncomendaDto.cs
├── interfaces/
│   ├── IEncomendaRepository.cs / Service
│   └── IMoradorRepository.cs / Service
├── models/
├── repositories/
└── services/
```

### 10.2 Build e execução

```bash
cd condosync/condosync-encomendas

# Restaurar dependências
dotnet restore

# Build
dotnet build

# Executar
dotnet run --project condosync-encomendas.csproj

# Testes
dotnet test
```

---

## 11. Deploy — Railway

### 11.1 Serviços Railway

| Serviço | Dockerfile | Descrição |
|---------|-----------|-----------|
| API     | `Dockerfile.api` (raiz) | API Express — `devsantiago-production.up.railway.app` |
| Web     | `condosync/apps/web/Dockerfile` | Painel React — `web-production-916b1.up.railway.app` |

### 11.2 railway.json (raiz — serviço API)

```json
{
  "$schema": "https://railway.app/railway-schema.json",
  "build": { "dockerfilePath": "Dockerfile.api" },
  "deploy": {
    "startCommand": "node dist/server.js",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

### 11.3 condosync/railway.web.toml (serviço Web)

```toml
[build]
  dockerfilePath = "apps/web/Dockerfile"
  watchPatterns = ["apps/web/**"]

[deploy]
  startCommand = "/docker-entrypoint.d/envsubst.sh"
  healthcheckPath = "/"
  healthcheckTimeout = 300
  restartPolicyType = "ON_FAILURE"
  restartPolicyMaxRetries = 3
```

### 11.4 Dockerfile.api (raiz)

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY condosync/apps/api/package*.json ./
COPY condosync/apps/api/tsconfig.json ./
RUN npm ci
COPY condosync/apps/api/src ./src
COPY condosync/apps/api/prisma ./prisma
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
ENV NODE_ENV=production PORT=3333
EXPOSE 3333
CMD ["node", "dist/server.js"]
```

### 11.5 apps/web/Dockerfile

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
EXPOSE 80
```

### 11.6 entrypoint.sh (API — prisma migrate em prod)

```bash
#!/bin/sh
set -e
echo "Running prisma migrate deploy..."
npx prisma migrate deploy
exec "$@"
```

### 11.7 Variáveis Railway necessárias

**Serviço API (Railway Variables):**
```
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=<32+ chars>
JWT_REFRESH_SECRET=<32+ chars>
NODE_ENV=production
FRONTEND_URL=https://web-production-916b1.up.railway.app
RESEND_API_KEY=re_...
SENTRY_DSN=https://...
CORS_ORIGINS=https://web-production-916b1.up.railway.app
```

**Serviço Web (Railway Variables):**
```
VITE_API_URL=https://devsantiago-production.up.railway.app
API_URL=https://devsantiago-production.up.railway.app
```

---

## 12. CI/CD — GitHub Actions

Arquivo: `.github/workflows/ci.yml`

### 12.1 Jobs

| Job             | Trigger          | Descrição                                      |
|-----------------|------------------|------------------------------------------------|
| `test-api`      | push + PR        | Vitest + cobertura (PostgreSQL + Redis services)|
| `build-web`     | push + PR        | TypeScript check + `npm run build`             |
| `build-mobile`  | push + PR        | Build PWA mobile                               |
| `typecheck-api` | push + PR        | `tsc --noEmit`                                 |
| `deploy`        | push → `main`    | Railway deploy via `railway up`                |

### 12.2 Secrets/Vars necessários no GitHub

```
# Secrets
RAILWAY_TOKEN          ← token de deploy do Railway

# Variables (não secrets)
VITE_API_URL           ← https://devsantiago-production.up.railway.app
RAILWAY_SERVICE_API    ← nome do serviço API no Railway
RAILWAY_SERVICE_WEB    ← nome do serviço Web no Railway
```

---

## 13. Testes

### 13.1 Executar testes

```bash
cd condosync/apps/api

# Modo watch (desenvolvimento)
npm run test

# Com cobertura
npm run test:coverage

# TypeScript check
npx tsc --noEmit
```

### 13.2 Configuração (vitest.config.ts)

```typescript
// Limiares de cobertura (40% geral mínimo)
thresholds: { lines: 30, functions: 30, branches: 25, statements: 30 }

// Apenas arquivos de service testados
include: [
  'src/modules/auth/auth.service.test.ts',
  'src/modules/finance/finance.service.test.ts',
  'src/modules/visitors/visitor.service.test.ts',
  'src/modules/parcels/parcel.service.test.ts',
]
```

### 13.3 Status atual dos testes

| Arquivo                      | Testes | Status |
|------------------------------|--------|--------|
| `auth.service.test.ts`       | 15     | ✅ pass |
| `visitor.service.test.ts`    | 9      | ✅ pass |
| `parcel.service.test.ts`     | 10     | ✅ pass |
| `finance.service.test.ts`    | 4      | ✅ pass |
| `marketplace.test.ts`        | 25     | ✅ pass |
| `resident.service.test.ts`   | 4      | ✅ pass |
| **Total**                    | **67** | **67/67** |

**Cobertura atual:** ~45.6% (apenas services incluídos no vitest.config)

### 13.4 Padrão de mock Prisma

```typescript
import { mockDeep, mockReset } from 'vitest-mock-extended';
import { PrismaClient } from '@prisma/client';

vi.mock('../../../config/prisma', () => ({
  prisma: mockDeep<PrismaClient>()
}));

beforeEach(() => {
  mockReset(prismaMock);
});
```

---

## 14. Código-Chave da API

### 14.1 server.ts — Registro de middlewares e rotas

```typescript
// condosync/apps/api/src/server.ts
// Ordem: Sentry → Helmet → CORS → Morgan → RateLimit → Routes → ErrorHandler

// Rate limiting
app.use('/api/v1/auth', authRateLimiter);
app.use('/api/v1', rateLimiter);

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok', ... }));

// Todas as 30 rotas registradas sob /api/v1
app.use('/api/v1/auth', authRoutes);
// ...

// Error handling (último middleware)
app.use(notFoundHandler);
app.use(errorHandler);
```

### 14.2 middleware/auth.ts

```typescript
// authenticate — verifica Bearer token + usuário ativo no banco
// authorize(...roles) — verifica papel do usuário
// authorizeCondominium — verifica se usuário pertence ao condomínio

// Uso típico em routes:
router.get('/', authenticate, authorize('SYNDIC', 'DOORMAN'), controller.list);
router.post('/', authenticate, authorize('SUPER_ADMIN'), controller.create);
```

### 14.3 middleware/errorHandler.ts — Erros tipados

```typescript
// Lançar erro no service:
throw new NotFoundError('Visitante', id);
throw new ValidationError('E-mail inválido', { email: ['Formato inválido'] });
throw new ConflictError('E-mail já cadastrado');
throw new UnauthorizedError('Token inválido');
throw new ForbiddenError('Acesso negado');

// Erros Prisma P2002 (unique) e P2025 (not found) são tratados automaticamente
```

### 14.4 config/env.ts — Validação Zod

```typescript
// Variáveis obrigatórias:
DATABASE_URL    // string min 1
JWT_SECRET      // string min 32 chars
JWT_REFRESH_SECRET // string min 32 chars
REDIS_URL       // string min 1

// Todas as outras têm defaults ou são opcionais
// Se inválido: processo encerra com process.exit(1)
```

### 14.5 config/mail.ts — Envio de e-mail

```typescript
// Lógica de seleção:
// 1. NODE_ENV === 'test' → não envia nada
// 2. RESEND_API_KEY configurado → usa Resend (produção)
// 3. Caso contrário → SMTP/Nodemailer (dev com Mailpit em localhost:1025)

await sendMail(to, subject, html);
```

---

## 15. Credenciais Demo

Após rodar `seed-base.js` e `seed-demo.js`:

| Papel             | E-mail                        | Senha          |
|-------------------|-------------------------------|----------------|
| Super Admin       | `admin@condosync.com.br`      | `Admin@123`    |
| Síndico           | `sindico@condosync.com.br`    | `Sindico@123`  |
| Porteiro          | `porteiro@condosync.com.br`   | `Porteiro@123` |
| Morador           | `morador1@condosync.com.br`   | `Morador@123`  |

**Banco de dados local:**

| Campo    | Valor          |
|----------|----------------|
| Host     | `localhost`    |
| Porta    | `5432`         |
| Database | `condosync`    |
| Usuário  | `condosync`    |
| Senha    | `condosync123` |

---

## 16. Comandos Úteis

```bash
# API
npm run dev              # iniciar em modo desenvolvimento
npm run build            # compilar TypeScript
npm run test             # vitest watch
npm run test:coverage    # relatório de cobertura
npm run lint             # eslint

# Prisma
npx prisma generate      # regenerar cliente Prisma
npx prisma migrate dev   # criar + aplicar nova migration (dev)
npx prisma migrate deploy # aplicar migrations pendentes (prod)
npx prisma studio        # GUI do banco (http://localhost:5555)
npx prisma db seed       # rodar seed definido no package.json

# Seeds manuais
node prisma/seed-base.js   # dados base
node prisma/seed-demo.js   # dados demo
node prisma/seed-pets.js   # dados de pets

# Web / Mobile
npm run dev              # Vite dev server
npm run build            # build produção
npm run preview          # preview do build

# Docker
docker compose up -d     # subir todos os serviços
docker compose down      # parar
docker compose logs -f api  # logs da API
docker compose exec api npx prisma studio  # Prisma Studio no container

# Git
git pull origin main         # atualizar
git push origin main         # subir alterações
```

---

## 17. Packages & Dependências (resumo)

### API (`condosync/apps/api/package.json`)

```json
// Produção
"@prisma/client": "^5.x",
"@sentry/node": "^8.x",
"bcryptjs": "^2.x",
"bullmq": "^5.x",
"cors": "^2.x",
"express": "^4.x",
"express-async-errors": "^3.x",
"express-rate-limit": "^7.x",
"helmet": "^7.x",
"ioredis": "^5.x",
"jsonwebtoken": "^9.x",
"morgan": "^1.x",
"nodemailer": "^6.x",
"openai": "^4.x",
"resend": "^4.x",
"socket.io": "^4.x",
"winston": "^3.x",
"zod": "^3.x"

// Dev
"@types/...": "...",
"prisma": "^5.x",
"ts-node-dev": "^2.x",
"typescript": "^5.x",
"vitest": "^4.x",
"vitest-mock-extended": "^2.x"
```

### Web (`condosync/apps/web/package.json`)

```json
// Produção
"@radix-ui/*": "...",            // componentes UI acessíveis
"@tanstack/react-query": "^5.x", // data fetching
"axios": "^1.x",
"lucide-react": "^0.x",          // ícones
"react": "^18.x",
"react-dom": "^18.x",
"react-router-dom": "^6.x",
"recharts": "^2.x",              // gráficos
"socket.io-client": "^4.x",
"zustand": "^4.x",
"tailwind-merge": "^x",
"class-variance-authority": "^x"

// Dev
"@vitejs/plugin-react": "^4.x",
"tailwindcss": "^3.x",
"typescript": "^5.x",
"vite": "^5.x"
```

### Mobile (`condosync/apps/mobile/package.json`)

```json
"react": "^18.x",
"react-router-dom": "^6.x",
"zustand": "^4.x",
"axios": "^1.x"
// + vite-plugin-pwa para PWA
```

---

*Gerado em: 2025 | Versão do sistema: monorepo CondoSync*
