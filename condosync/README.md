# CondoSync — Sistema de Gestão de Condomínios

Plataforma SaaS completa para gestão de condomínios, com suporte a múltiplos condomínios, portal do morador e controle de portaria.

## Tecnologias

| Camada     | Tecnologia                                             |
|------------|-------------------------------------------------------|
| Backend    | Node.js · Express · TypeScript · Prisma · PostgreSQL  |
| Frontend   | React 18 · Vite · TypeScript · Tailwind CSS           |
| Auth       | JWT (access + refresh tokens) · bcryptjs              |
| Real-time  | Socket.IO                                             |
| Estado     | Zustand (persist) · React Query                       |
| Gráficos   | Recharts                                              |

## Estrutura do Monorepo

```
condosync/
├── apps/
│   ├── api/          # Backend Node.js (porta 3333)
│   └── web/          # Frontend React (porta 5173)
└── packages/         # Módulos compartilhados (futuro)
```

## Pré-requisitos

- Node.js 18+
- PostgreSQL 14+
- npm 8+

## Instalação e Configuração

### 1. Instalar dependências

```bash
# Na raiz do projeto
npm install
```

### 2. Configurar variáveis de ambiente

```bash
# Backend
cp apps/api/.env.example apps/api/.env
# Edite apps/api/.env com sua DATABASE_URL e secrets JWT

# Frontend
cp apps/web/.env.example apps/web/.env
```

### 3. Configurar banco de dados

```bash
cd apps/api

# Gerar Prisma client
npx prisma generate

# Aplicar migrations
npx prisma migrate dev --name init

# Popular com dados de demonstração
npx tsx prisma/seed.ts
```

### 4. Iniciar a aplicação

```bash
# Iniciar backend (apps/api)
cd apps/api
npm run dev

# Iniciar frontend (apps/web) — em outro terminal
cd apps/web
npm run dev
```

Acesse [http://localhost:5173](http://localhost:5173)

## Credenciais de Demonstração

| Perfil              | E-mail                            | Senha         |
|---------------------|-----------------------------------|---------------|
| Super Administrador | admin@condosync.com.br            | Admin@2026    |
| Síndico             | sindico@parqueverde.com.br        | Sindico@2026  |
| Porteiro            | porteiro@parqueverde.com.br       | Porteiro@2026 |
| Morador 1           | morador1@parqueverde.com.br       | Morador@2026  |

## Perfis de Acesso

| Role               | Descrição                          |
|--------------------|------------------------------------|
| SUPER_ADMIN        | Acesso total ao sistema            |
| CONDOMINIUM_ADMIN  | Gestão completa do condomínio      |
| SYNDIC             | Síndico — acesso completo          |
| SUB_SYNDIC         | Subsíndico                         |
| DOORMAN            | Porteiro — portaria e encomendas   |
| RESIDENT           | Morador — acesso restrito          |
| EMPLOYEE           | Funcionário                        |

## Módulos do Sistema

### 🏢 Portaria
- Controle de visitantes (entrada, saída, autorização)
- Gerenciamento de encomendas (registro, notificação, retirada)
- Acesso de veículos com log de entrada/saída

### 👥 Cadastros
- Moradores e dependentes
- Unidades (mapa visual com status)
- Funcionários com controle de turno
- Prestadores de serviço com aprovação

### 💰 Financeiro
- Visão geral com gráfico mensal de receitas/despesas
- Cobranças individuais e rateio condominial (igualitário ou por fração ideal)
- Controle de inadimplentes
- Registro de transações financeiras

### 🔧 Manutenção
- Ordens de serviço com prioridade (baixa, média, alta, urgente)
- Fluxo de status: Aberto → Em Andamento → Concluído
- Atribuição de responsáveis
- Agendamentos de manutenção preventiva

### 📅 Áreas Comuns
- Cadastro de áreas com horários e capacidade
- Reservas com verificação de conflito
- Aprovação pelo síndico (configurável por área)

### 📢 Comunicação
- Avisos e comunicados (com fixar no topo e urgente)
- Ocorrências com acompanhamento de status
- Notificações automáticas (entrega, visitante, cobrança)

### 📊 Relatórios
- Visitantes (diário, semanal, mensal)
- Financeiro (receitas, despesas, inadimplência)
- Manutenção (por status, prioridade, tempo de resolução)
- Ocupação do condomínio

## API — Endpoints Principais

Base URL: `http://localhost:3333/api/v1`

| Módulo              | Prefixo                    |
|---------------------|----------------------------|
| Autenticação        | `/auth`                    |
| Condomínios         | `/condominiums`            |
| Unidades            | `/units`                   |
| Moradores           | `/residents`               |
| Visitantes          | `/visitors`                |
| Encomendas          | `/parcels`                 |
| Veículos            | `/vehicles`                |
| Financeiro          | `/finance`                 |
| Manutenção          | `/maintenance`             |
| Áreas Comuns        | `/common-areas`            |
| Comunicação         | `/communication`           |
| Funcionários        | `/employees`               |
| Prestadores         | `/service-providers`       |
| Dashboard           | `/dashboard`               |
| Relatórios          | `/reports`                 |

## Eventos Socket.IO

| Evento              | Gatilho                         |
|---------------------|---------------------------------|
| `announcement:new`  | Novo aviso publicado            |
| `chat:message`      | Nova mensagem no chat           |

### Joins
```js
socket.emit('join:condominium', condominiumId);
socket.emit('join:unit', unitId);
```

## Scripts Disponíveis

```bash
# apps/api
npm run dev          # Iniciar em modo desenvolvimento (tsx watch)
npm run build        # Compilar TypeScript
npm run start        # Produção
npm run db:generate  # prisma generate
npm run db:migrate   # prisma migrate dev
npm run db:seed      # Executar seed

# apps/web
npm run dev          # Vite dev server (porta 5173)
npm run build        # Build de produção
npm run preview      # Pré-visualizar build
```

## Licença

MIT — © 2026 CondoSync
