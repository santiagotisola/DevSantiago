# CondoSync — Documentação do Sistema

> Gerado em 2026-05-13. Produção: https://condosync.app

---

## 1. Visão Geral

**CondoSync** é um SaaS multi-tenant para gestão condominial, com isolamento por condomínio e RBAC. Cobre portaria digital, financeiro (com integração ASAAS — PIX/boleto), manutenção, comunicação interna, reservas, assembleias, marketplace, painéis digitais, PWA para moradores e assistente de IA.

### Papéis (RBAC)

| Papel | Escopo |
|------|--------|
| `SUPER_ADMIN` | Administrador da plataforma (multi-condomínio, planos, billing). |
| `CONDOMINIUM_ADMIN` | Administrador do condomínio. |
| `SYNDIC` / `SUB_SYNDIC` | Síndico e subsíndico. |
| `DOORMAN` | Portaria. |
| `EMPLOYEE` | Funcionário. |
| `RESIDENT` | Morador. |

O vínculo usuário ↔ condomínio é feito por `CondominiumUser (userId, condominiumId, role, isActive)`. Quase toda query é escopada por esse join.

---

## 2. Arquitetura

```
┌─────────────────────────┐        ┌─────────────────────────┐
│  Web (React 18 + Vite)  │◄──────►│  API (Express + TS)     │
│  PWA / Tailwind / Zust. │  HTTPS │  Prisma + PostgreSQL    │
└─────────────────────────┘        │  Socket.IO              │
                                   │  BullMQ + Redis         │
┌─────────────────────────┐        │  Sentry (prod)          │
│  Mobile (PWA)           │◄──────►│                         │
└─────────────────────────┘        └────────┬────────────────┘
                                            │
                       ┌────────────────────┼────────────────────┐
                       │                    │                    │
                  ASAAS API           Resend / SMTP         OpenAI (GPT-4o-mini)
                  (PIX/boleto)        (e-mail)              (assistente IA)
```

### Stack

| Camada | Tecnologia |
|--------|-----------|
| Backend | Node.js 20, Express, TypeScript, Prisma, Socket.IO, BullMQ, ioredis, Winston, Helmet, Zod |
| Banco | PostgreSQL |
| Frontend | React 18, Vite, TypeScript, Tailwind, Radix UI, Zustand (persist), TanStack Query, React Hook Form + Zod, Recharts, `vite-plugin-pwa` |
| Auth | JWT (access + refresh), bcryptjs, 2FA (TOTP), WebAuthn |
| Infra | Docker, Cloudflare (Full strict + Origin Cert), nginx, Railway / VPS, GitHub Actions |
| Observabilidade | Sentry (prod), Winston + Morgan |

---

## 3. Layout do Repositório

```
Condominios/
├── package-lock.json
└── DevSantiago/
    ├── DevSantiago.sln
    ├── Dockerfile.api / Dockerfile.web
    ├── deploy.ps1, setup-vps.sh, update-vps.sh
    ├── railway.json
    └── condosync/                  ← monorepo npm workspaces
        ├── apps/
        │   ├── api/                ← Express + Prisma  (porta 3333)
        │   ├── web/                ← React + Vite      (porta 5173)
        │   └── mobile/             ← PWA mobile
        ├── e2e/                    ← testes ponta-a-ponta
        └── condosync-encomendas/   ← microsserviço C# (encomendas)
```

> **Sempre** `cd DevSantiago/condosync` antes de rodar npm.

---

## 4. Backend (`apps/api/src`)

### 4.1 Entry point — `server.ts`

1. Sentry init (somente `NODE_ENV=production`).
2. Middlewares: `helmet`, `compression`, `cors` (origens em `env.CORS_ORIGINS`, lista separada por vírgula), `morgan` → Winston, `rateLimiter` global.
3. Rotas montadas sob o prefixo `API = "/api/v1"`.
4. HTTP + Socket.IO compartilham o mesmo `httpServer`.
5. Após `listen`: workers BullMQ agendados — manutenção, financeiro, contratos, cobrança, balancete.

**Para adicionar um módulo novo:**

```ts
// src/modules/<nome>/<nome>.routes.ts
// em server.ts:
import nomeRoutes from "./modules/<nome>/<nome>.routes";
app.use(`${API}/<nome>`, nomeRoutes);
```

### 4.2 Módulos (`apps/api/src/modules`)

> 44 módulos. Cada um segue o padrão `routes → controller → service → prisma`.

| Domínio | Módulos |
|---------|---------|
| Identidade & segurança | `auth`, `users`, `sessions`, `permissions`, `twofactor`, `webauthn`, `invitations`, `lgpd`, `audit` |
| Condomínio (núcleo) | `condominiums`, `condominium-contracts`, `units`, `residents`, `employees`, `service-providers` |
| Portaria | `visitors`, `visitor-qrcode`, `vehicles`, `parcels`, `panic`, `digital-signage` |
| Financeiro | `finance`, `collection-rules`, `fines`, `webhooks` (ASAAS) |
| Operação | `maintenance`, `tickets`, `stock`, `renovations`, `common-areas`, `assemblies` |
| Comunicação | `communication`, `notification-preferences`, `push`, `gallery`, `lost-and-found`, `documents` |
| Adicionais | `marketplace`, `ai`, `pets`, `reports`, `dashboard`, `plans` |

### 4.3 Banco de Dados (Prisma)

- Cliente compartilhado: `src/config/prisma.ts`.
- Schema: `apps/api/prisma/schema.prisma` — **69 modelos**.
- Multi-tenancy: tabela join `CondominiumUser` é o gatekeeper. Toda consulta deve filtrar por `condominiumId` autorizado.
- Migrations em `apps/api/prisma/migrations/`.
- Seeds: `seed.ts`, `seed-demo.js`, `seed-base.js`, `seed-units-70.js`, etc.

Principais entidades:

```
User ──< CondominiumUser >── Condominium
                                  │
        ┌─────────────────────────┼─────────────────────────┐
       Unit                  FinancialAccount           Announcement
        │                         │                         │
    Resident                FinancialTransaction        Notification
    Dependent               Charge / Fine               Poll / Occurrence
    Vehicle                 CollectionRule
    Visitor / Parcel
```

Outros: `ServiceOrder`, `MaintenanceSchedule`, `Contract`, `CommonArea`, `Reservation`, `Assembly` + `AssemblyVotingItem` / `AssemblyVote` / `AssemblyAttendee`, `Pet`, `LostAndFound`, `CondominiumDocument`, `Renovation`, `StockItem` + `StockMovement`, `Ticket` + `TicketMessage`, `Photo`, `MarketplacePartner` + `MarketplaceOffer`, `PanicAlert`, `VisitorRecurrence`, `VisitorQRCode` + `VisitorQRUse`, `AuditLog`, `FinalizedAssembly`.

### 4.4 Autenticação & Autorização

- **JWT**: access + refresh (`jsonwebtoken`). Hash de senha com `bcryptjs`.
- Middleware: `src/middleware/auth.ts` exporta `JwtPayload`.
- **2FA TOTP**: módulo `twofactor`.
- **WebAuthn / Passkeys**: módulo `webauthn`.
- **Permissões**: tabela `Permission` + `RolePermission` (RBAC granular além do enum de papéis).
- **Auditoria**: `AuditLog` + módulo `audit`.

### 4.5 Tempo Real (Socket.IO)

Toda conexão exige JWT no handshake (`auth.token` **ou** `Authorization: Bearer`). Após autenticar, o cliente emite:

| Evento | Validação |
|--------|-----------|
| `join:user` | usuário só entra na própria room. |
| `join:condominium` | server verifica `CondominiumUser` ativo. |
| `join:unit` | server verifica vínculo da unidade. |

Papéis de staff (`DOORMAN`, `CONDOMINIUM_ADMIN`, `SYNDIC`, `SUPER_ADMIN`) auto-entram em `condominium:<id>:staff`.

> Regra: **nunca** adicione `socket.join` sem repetir a verificação de membership.

### 4.6 Workers em background (BullMQ + Redis)

Importados via efeito colateral em `server.ts`:

- `notifications/notification.worker`
- Schedules registrados após `listen`:
  - `registerMaintenanceAlertsSchedule`
  - `registerFinanceSchedule`
  - `registerContractAlertsSchedule`
  - `registerCollectionSchedule`
  - `registerBalanceteSchedule`

> Redis é obrigatório em produção.

### 4.7 Integrações externas

| Serviço | Uso |
|---------|-----|
| **ASAAS** | Cobranças PIX/boleto. Webhook em `modules/webhooks`. Chaves criptografadas (`encrypt-gateway-keys.ts`). |
| **OpenAI GPT-4o-mini** | Assistente IA (`modules/ai`). |
| **Resend / Nodemailer (SMTP)** | E-mails transacionais. |
| **Web Push / FCM** | Notificações push (`modules/push`). |
| **Sentry** | Erros em produção. |

---

## 5. Frontend Web (`apps/web`)

- React 18 + Vite + TypeScript.
- Estado: **Zustand** (com `persist`) + **TanStack React Query**.
- UI: **Tailwind** + **Radix** + `class-variance-authority` + `tailwind-merge`.
- Formulários: `react-hook-form` + `zod` via `@hookform/resolvers`.
- Realtime: `socket.io-client`.
- Gráficos: `Recharts`.
- PWA: `vite-plugin-pwa` (service worker em `src/sw.ts`).
- Páginas em `src/pages/` agrupadas por domínio: `access`, `admin`, `assemblies`, `auth`, `common-areas`, `communication`, `contracts`, `dashboard`, `digital-signage`, `documents`, `employees`, `finance`, `fines`, `gallery`, `landing`, `maintenance`, `marketplace`, `minha-portaria`, `obras`, `pets`, `portaria`, `profile`, `public`, `reports`, `residents`, `service-providers`, `settings`, `stock`, `tickets`, `units`.

O `Dockerfile.web` usa `nginx.conf.template` com substituição de envs em tempo de execução.

---

## 6. Mobile

PWA em `apps/mobile/`, instalável a partir do navegador; compartilha contratos de API com a web. Notificações push via Web Push.

---

## 7. Microsserviço C# — Encomendas

`condosync-encomendas/` é um serviço auxiliar para o módulo de encomendas (parcels). Construído via `DevSantiago.sln`.

---

## 8. Variáveis de Ambiente

Backend (`apps/api/src/config/env.ts` valida via Zod):

| Variável | Descrição |
|----------|-----------|
| `NODE_ENV` | `development` / `production`. |
| `PORT` | Padrão `3333`. |
| `DATABASE_URL` | PostgreSQL. |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Segredos. |
| `CORS_ORIGINS` | Lista separada por vírgula. |
| `REDIS_URL` | Para BullMQ. |
| `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN` | Pagamentos. |
| `OPENAI_API_KEY` | IA. |
| `RESEND_API_KEY` ou SMTP_* | E-mail. |
| `SENTRY_DSN` | Erros (prod). |
| `WEB_PUSH_PUBLIC_KEY` / `PRIVATE_KEY` | Push. |

Frontend (`apps/web/.env`):

| Variável | Descrição |
|----------|-----------|
| `VITE_API_URL` | URL base da API. |
| `VITE_SOCKET_URL` | URL do Socket.IO. |
| `VITE_SENTRY_DSN` | (opcional). |

---

## 9. Comandos Comuns

A partir de `DevSantiago/condosync/`:

```bash
npm run dev               # api + web em paralelo
npm run dev:all           # api + web + mobile
npm run build             # build api + web
npm run db:generate       # prisma generate
npm run db:migrate        # prisma migrate dev
npm run db:seed           # ts-node prisma/seed.ts
npm run lint              # lint em todos os workspaces
```

API (`apps/api/`):

```bash
npm run dev                # ts-node-dev --respawn --transpile-only src/server.ts
npm run build              # tsc
npm run start              # node dist/server.js
npm run db:migrate:prod    # prisma migrate deploy
npm run db:studio          # prisma studio
npm test                   # vitest
npm run test:coverage
npx vitest run path/to/file.test.ts
npx vitest -t "nome do teste"
```

Web (`apps/web/`):

```bash
npm run dev | build | preview | lint
```

> O `dev` da API usa **`ts-node-dev`**, não `tsx` (o README antigo está desatualizado).

---

## 10. Deploy

### Produção atual
- Domínio: **https://condosync.app**
- Cloudflare em **Full (strict)** + Origin Certificate.
- nginx no host (frontend + reverse proxy para a API).
- Banco PostgreSQL + Redis.

### Artefatos
- `DevSantiago/Dockerfile.api`, `Dockerfile.web`.
- `condosync/docker-compose.yml` (stack local).
- `docker-compose.railway.yml`, `railway.toml`, `railway.web.toml` (Railway).
- VPS: `setup-vps.sh`, `update-vps.sh`, `update-vps-safe.sh`, `backup-vps.sh`.
- Deploy local-para-VPS: `deploy.ps1`.

### Sinais de produção
- `NODE_ENV=production` liga Sentry.
- Obrigatórios: `JWT_SECRET`, `DATABASE_URL`, `CORS_ORIGINS`, Redis, credenciais de e-mail.

---

## 11. Testes

- Backend: **Vitest** (`apps/api`). `npm test`, `npm run test:coverage`.
- Frontend: lint + build (`tsc + vite`).
- E2E: pasta `condosync/e2e/`.

---

## 12. Convenções de Edição

- O `README.md` em `condosync/` está parcialmente desatualizado — **a fonte da verdade é `server.ts` + `package.json`**.
- `server.ts` contém **mojibake** em comentários de seção (UTF-8 corrompido em round-trip). **Não "corrigir"** os comentários a menos que solicitado; preservar bytes ao editar trechos vizinhos.
- Credenciais demo ficam em `prisma/seed.ts` e no README — **não** expor em configs de produção.
- Toda nova consulta deve respeitar o filtro de `CondominiumUser`.
- Não adicione `socket.join` sem revalidar membership.

---

## 13. Roadmap & Histórico

- `DevSantiago/ROADMAP.md` — roadmap.
- `DevSantiago/SISTEMA.md` — documentação anterior (mantida para referência).
- `DevSantiago/DEPLOY_CONDOSYNC_APP.md` — runbook de deploy.
- Deploy mais recente: **2026-05-13** (42 commits — 2FA, sidebar, preferências de notificação, dashboards, 4 migrations).
