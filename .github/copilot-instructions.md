# CondoSync — Diretrizes do Workspace

SaaS multi-tenant para gestão de condomínios. O repositório é um monorepo com uma API REST em Node.js/TypeScript, um painel web em React, um app mobile em React e um microsserviço em C# para gestão de encomendas.

## Arquitetura

```
condosync/
├── apps/api/          # Express + TypeScript + Prisma + PostgreSQL (porta 3333)
├── apps/web/          # React 18 + Vite + Tailwind (porta 5173) — painel admin/funcionários
├── apps/mobile/       # React + Vite + Tailwind — visão mobile do morador
└── condosync-encomendas/   # Microsserviço ASP.NET Core 10 — fluxo de encomendas
```

**Padrão de módulo da API** (29 módulos em `apps/api/src/modules/`): cada módulo possui:
- `{modulo}.routes.ts` — definições de rotas
- `{modulo}.controller.ts` — handlers HTTP (thin, delega para o service)
- `{modulo}.service.ts` — lógica de negócio, acesso direto ao Prisma client

**Arquivos-chave de infraestrutura:**
- Entrada: [`apps/api/src/server.ts`](../condosync/apps/api/src/server.ts)
- Schema: [`apps/api/prisma/schema.prisma`](../condosync/apps/api/prisma/schema.prisma)
- Cliente de API web: [`apps/web/src/services/api.ts`](../condosync/apps/web/src/services/api.ts)

## Build & Testes

```bash
# API — a partir de condosync/apps/api/
npm run dev              # ts-node-dev com hot reload
npm run build            # tsc
npm run test             # vitest (modo watch)
npm run test:coverage    # vitest run --coverage
npm run lint             # eslint src --ext .ts

# Banco de dados
npx prisma generate
npx prisma migrate dev
npm run db:seed          # ts-node prisma/seed.ts (dados demo)

# Docker (a partir de condosync/)
docker compose up        # sobe postgres + api + web + mobile
```

## Convenções

- **Auth**: JWT access token (1h) + refresh token (7d). Papéis: `SUPER_ADMIN`, `CONDOMINIUM_ADMIN`, `SYNDIC`, `DOORMAN`, `RESIDENT`, `SERVICE_PROVIDER`, `COUNCIL_MEMBER`.
- **Tempo real**: Socket.IO para eventos ao vivo (notificações, alertas de visitantes, pânico).
- **Estado — web**: Zustand (persistido) para estado global de auth/UI; React Query para dados do servidor.
- **Imports**: Use o alias `@/` para `apps/api/src/` e `apps/web/src/`.
- **Tratamento de erros**: `express-async-errors` captura rejeições de promises; lance erros tipados nos services e deixe o middleware central `errorHandler` formatar as respostas.
- **Middlewares de segurança**: Helmet, rate limiter e CORS já estão configurados em `server.ts` — não adicione guards redundantes nos controllers.
- **Seed**: `prisma/seed-demo.js` popula dados demo realistas; `seed-base.js` para fixtures mínimas.

## Banco de Dados

PostgreSQL 16 via Prisma. Modelos principais: `Unit`, `Resident`, `Visitor`, `Parcel`, `ServiceOrder`, `FinancialTransaction`, `Charge`, `Reservation`, `Assembly`, `Occurrence`. Gateways de pagamento: `ASAAS`, `PJBANK`.

Ao adicionar migration: `npx prisma migrate dev --name <descricao>`, depois atualize os arquivos de seed se novos campos obrigatórios forem adicionados.

## Deploy

- **Local**: Docker Compose (`condosync/docker-compose.yml`) — credenciais do Postgres: `condosync/condosync123`, API na porta 3333.
- **Produção**: Railway (`railway.json`, `condosync/docker-compose.railway.yml`). Use `npm run db:migrate:prod` (não `migrate dev`) em produção.
- **Ambiente**: Copie `apps/api/.env.example` → `apps/api/.env`. Nunca faça commit de arquivos `.env`.
