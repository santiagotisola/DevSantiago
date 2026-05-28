# 🚀 ANÁLISE DEPLOY & VARIÁVEIS DE AMBIENTE — Free Tier Impact
**Data**: 27 de Maio de 2026  
**Objetivo**: Entender setup de deploy, env vars necessárias, custo operacional e impacto de usar FREE  
**Foco**: Desenvolvimento atual + deploy futuro (sem criar contas ainda)

---

## 📋 ÍNDICE

1. Arquitetura de Deploy (Atual vs Produção)
2. Variáveis de Ambiente por Servidor
3. Comparativo: Servers e Custos
4. Impacto Técnico de usar FREE Tier
5. Roadmap: Do Dev para Produção

---

## 1️⃣ ARQUITETURA DE DEPLOY

### Desenvolvimento (Hoje)

```
┌─────────────────────────────────────────────────────────┐
│              STACK DESENVOLVIMENTO                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Seu Computador Local (Windows)                         │
│  ├── API (Node.js)      → npm run dev   (porta 3333)   │
│  ├── Web (React)        → npm run dev   (porta 5173)   │
│  ├── Mobile (PWA)       → npm run dev   (porta 5174)   │
│  └── Containers:                                        │
│      ├── PostgreSQL     → docker (5432)                 │
│      ├── Redis          → docker (6379)                 │
│      ├── MongoDB        → docker (27017)                │
│      └── Mailpit (SMTP) → docker (1025, 8025)          │
│                                                         │
│  Banco de dados: Local (docker compose)                 │
│  Emails: Capturados em Mailpit (dev)                    │
│  IA: (opcional OPENAI_API_KEY ou GROQ_API_KEY)         │
│  WhatsApp: Baileys (local, sem API)                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Produção (Free Tier — Futuro)

```
┌──────────────────────────────────────────────────────────────┐
│         STACK PRODUÇÃO (FREE TIER RECOMENDADO)              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  FRONTEND (Web + Mobile)                                     │
│  ├── Vercel Free Tier                                        │
│  │   ├── Web (React + Vite)    → HTTPS automático           │
│  │   ├── Mobile PWA            → HTTPS automático            │
│  │   └── CDN global (KV Store) → Cache automático            │
│  │                                                            │
│  └── Alternativa: Cloudflare Pages (igual)                   │
│                                                              │
│  BACKEND (API)                                               │
│  ├── Render.com Free Tier                                    │
│  │   ├── API Node.js           → 512MB RAM                   │
│  │   ├── Auto deploy (git push)→ Automático                  │
│  │   ├── HTTPS automático      → Let's Encrypt               │
│  │   └── ⚠️ Dorme após 15 min  → UptimeRobot pinga = acordado │
│  │                                                            │
│  └── Alternativas:                                           │
│      ├── Railway Free (500h/mês) ← Mais simples              │
│      ├── Fly.io (3 VMs 256MB)    ← Sem cold start            │
│      └── Heroku dyno (não free mais)                         │
│                                                              │
│  DATABASES (Separados)                                       │
│  ├── PostgreSQL                                              │
│  │   ├── Neon.tech          → 512MB free, serverless         │
│  │   └── Supabase           → 500MB free, + auth built-in    │
│  │                                                            │
│  ├── Redis                                                   │
│  │   ├── Upstash            → 10K req/dia free              │
│  │   └── Redis Cloud        → 30MB free (sem limite req)     │
│  │                                                            │
│  └── MongoDB                                                 │
│      └── MongoDB Atlas M0   → 512MB free para sempre         │
│                                                              │
│  SERVIÇOS EXTERNOS                                           │
│  ├── Email: Resend free tier → 3.000 emails/mês            │
│  ├── IA: Groq free tier      → 14.400 req/dia              │
│  ├── WhatsApp: Baileys      → Gratuito (sem API)            │
│  ├── Push: VAPID            → Gratuito (self-hosted)        │
│  ├── Monitoring: Sentry     → 5K erros/mês free            │
│  ├── Uptime: UptimeRobot    → 50 monitores free             │
│  └── DNS: Cloudflare        → Gratuito + SSL                │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 2️⃣ VARIÁVEIS DE AMBIENTE POR SERVIDOR

### 2.1 Desenvolvimento Local (Hoje)

**Arquivo**: `apps/api/.env` (desenvolvimento)

```env
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# DESENVOLVIMENTO LOCAL
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Ambiente
NODE_ENV=development
PORT=3333

# Banco local (Docker Compose)
DATABASE_URL=postgresql://condosync:condosync123@localhost:5432/condosync?schema=public
REDIS_URL=redis://localhost:6379
MONGODB_URI=mongodb://admin:admin123@localhost:27017/condosync-whatsapp

# JWT (valores de dev, não usar em prod)
JWT_SECRET=dev-secret-troque-em-producao-32-chars
JWT_REFRESH_SECRET=dev-refresh-secret-troque-32-chars
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# CORS (localhost para dev)
CORS_ORIGINS=http://localhost:5173,http://localhost:5174

# Email (capturado por Mailpit em dev)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=dev
SMTP_PASS=dev
SMTP_FROM=dev@localhost

# Upload
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880

# Segurança
BCRYPT_ROUNDS=10

# Frontend URL (para links em emails)
FRONTEND_URL=http://localhost:5173

# IA (OPCIONAL em dev)
# Groq (gratuito)
# GROQ_API_KEY=sua-chave-de-dev-aqui

# WhatsApp (Baileys, nenhuma chave necessária)
# (Automático, gera QR code no terminal)

# Push Notifications VAPID (já configurado)
VAPID_PUBLIC_KEY=BP_cWYEC808cU465R7XrVh0UXquJ4Bt0LaClrs5nxMNnRbqz7EoKwsjsAcSmE7xp-qRhiabgUw2n3hc87oyL514
VAPID_PRIVATE_KEY=isa6zWj41mZZLBdCWWB42IAr7yHMdaUWQ8p_fSwfx5M
VAPID_EMAIL=noreply@condosync.com.br

# Sentry (desabilitado em dev, NODE_ENV=development)
# SENTRY_DSN=desabilitado-em-dev

# Pagamento (sandbox para dev)
ASAAS_WEBHOOK_TOKEN=dev-webhook-token
```

**Variáveis necessárias**: Apenas as com valor preenchido  
**Custo**: R$0 (tudo local)  
**Impacto**: Nenhum — desenvolvimento isolado

---

### 2.2 Render.com (Backend — Free Tier)

**Arquivo**: Environment Variables (Render dashboard)

```env
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# RENDER.COM (API NODE.JS)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Ambiente
NODE_ENV=production
PORT=10000  # Render atribui porta automaticamente

# ━━━ BANCO DE DADOS ━━━
# PostgreSQL (Neon.tech)
DATABASE_URL=postgresql://user:password@ep-xxx.neon.tech/condosync?sslmode=require

# Redis (Upstash)
REDIS_URL=rediss://default:token@xxx.upstash.io:6379

# MongoDB (Atlas M0)
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/condosync-whatsapp?retryWrites=true&w=majority

# ━━━ JWT (GERAR VALORES SEGUROS) ━━━
JWT_SECRET=gere-uma-chave-aleatoria-de-32-chars-aqui
JWT_REFRESH_SECRET=gere-outra-chave-aleatoria-32-chars-aqui
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# ━━━ CORS (Domínios de produção) ━━━
CORS_ORIGINS=https://seu-dominio.com,https://condosync.app,https://app.condosync.com

# ━━━ EMAIL (Resend) ━━━
RESEND_API_KEY=re_sua_chave_aqui
# Não precisa SMTP em prod (Resend substitui)

# ━━━ UPLOAD ━━━
UPLOAD_PATH=/app/uploads
MAX_FILE_SIZE=5242880

# ━━━ SEGURANÇA ━━━
BCRYPT_ROUNDS=12

# ━━━ FRONTEND URL ━━━
FRONTEND_URL=https://seu-dominio.com

# ━━━ IA (Groq — gratuito) ━━━
GROQ_API_KEY=gsk_sua_chave_aqui
GROQ_MODEL=llama-3.3-70b-versatile

# ━━━ PUSH NOTIFICATIONS ━━━
VAPID_PUBLIC_KEY=BP_cWYEC808cU465R7XrVh0UXquJ4Bt0LaClrs5nxMNnRbqz7EoKwsjsAcSmE7xp-qRhiabgUw2n3hc87oyL514
VAPID_PRIVATE_KEY=isa6zWj41mZZLBdCWWB42IAr7yHMdaUWQ8p_fSwfx5M
VAPID_EMAIL=noreply@condosync.com.br

# ━━━ MONITORING (Sentry) ━━━
SENTRY_DSN=https://xxx@sentry.io/yyy
# Ativo apenas em NODE_ENV=production

# ━━━ PAGAMENTO ━━━
ASAAS_WEBHOOK_TOKEN=seu-token-webhook-asaas-aqui
```

**Variáveis críticas**: DATABASE_URL, REDIS_URL, JWT_*, CORS_ORIGINS  
**Custo**: R$0/mês (Render free)  
**Impacto**: 
- ⚠️ Cold start: 30-60s se dorme (mitigado com UptimeRobot ping)
- ⚠️ 512MB RAM (limite para API + dependencies)
- ✅ Auto-deploy em push para GitHub
- ✅ HTTPS automático

---

### 2.3 Neon.tech (PostgreSQL — Free Tier)

**URL de Conexão**:
```env
DATABASE_URL=postgresql://user:password@ep-xxxx.neon.tech/condosync?sslmode=require
```

**Como obter**:
1. Criar conta em neon.tech
2. Criar projeto "condosync"
3. Copiar connection string
4. Substituir {user}, {password}, endpoint

**Variáveis**:
- Uma única variável: `DATABASE_URL`
- Já inclui SSL (sslmode=require obrigatório)

**Custo**: R$0/mês  
**Impacto**:
- ✅ 512MB storage (suficiente para 50-100 condominios)
- ✅ Auto-backup
- ⚠️ Pausa projeto após 1 semana inativo (reativa com 1 clique)
- ✅ Sem limite de conexões simultâneas

---

### 2.4 Upstash Redis (Cache/Queue — Free Tier)

**URL de Conexão**:
```env
REDIS_URL=rediss://default:token@xxx.upstash.io:6379
```

**Como obter**:
1. Criar conta em console.upstash.com
2. Criar database "condosync-redis"
3. Copiar REST URL ou Redis URL
4. Usar `rediss://` (com SSL)

**Variáveis**:
- Uma única variável: `REDIS_URL`

**Custo**: R$0/mês (com limite de 10K req/dia)  
**Impacto**:
- ✅ 256MB storage
- ✅ Sem cold start (serverless)
- ⚠️ 10K requests/dia pode ser limitante
  - Rate limiter: ~144K req/dia (EXCEDE)
  - Solução: Usar MemoryStore (já implementado no código)
- ✅ Pay-as-you-go: $0.20/100K req (ainda barato)

**Alternativa**: Redis Cloud (30MB free, sem limite de requests)

---

### 2.5 MongoDB Atlas (Sessões WhatsApp — Free Tier)

**URL de Conexão**:
```env
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/condosync-whatsapp?retryWrites=true&w=majority
```

**Como obter**:
1. Criar conta em mongodb.com/atlas
2. Criar cluster M0 Free
3. Criar database user
4. Copiar connection string
5. Substituir {user}, {password}

**Variáveis**:
- Uma única variável: `MONGODB_URI`

**Custo**: R$0/mês (para sempre)  
**Impacto**:
- ✅ 512MB storage
- ✅ 3 nós (alta disponibilidade)
- ✅ Sem limite de conexões
- ✅ Sem pausa automática
- ✅ Backup automático

---

### 2.6 Resend (Email Transacional — Free Tier)

**Variáveis**:
```env
RESEND_API_KEY=re_sua_chave_aqui
```

**Como obter**:
1. Criar conta em resend.com
2. Criar API key
3. Copiar e adicionar ao .env

**Custo**: R$0/mês (3.000 emails/mês)  
**Impacto**:
- ✅ 3.000 emails/mês (100/dia)
- ✅ Dashboard + analytics
- ✅ Entregabilidade excelente
- ✅ Sem custo de configuração SMTP

**Alternativas gratuitas** (se precisar mais):
- Brevo: 9.000 emails/mês
- Mailgun: 5.000 emails/mês (primeiros 3 meses)

---

### 2.7 Groq API (IA — Free Tier)

**Variáveis**:
```env
GROQ_API_KEY=gsk_sua_chave_aqui
GROQ_MODEL=llama-3.3-70b-versatile
```

**Como obter**:
1. Criar conta em console.groq.com
2. Gerar API key
3. Copiar e adicionar ao .env

**Custo**: R$0/mês (14.400 req/dia)  
**Impacto**:
- ✅ 14.400 requisições/dia (480/hora)
- ✅ Modelo llama-3.3-70b-versatile (melhor que gpt-4o-mini)
- ✅ Latência ~200ms
- ✅ API compatível com OpenAI (mudança mínima no código)

---

### 2.8 Vercel (Frontend — Web + Mobile)

**Deployment automático** (sem variáveis de ambiente necessárias no Vercel, usa .env local)

```env
# apps/web/.env (React)
VITE_API_URL=https://api.seu-dominio.com
# (Construído durante build, não em runtime)

# apps/mobile/.env (PWA)
VITE_API_URL=https://api.seu-dominio.com
VITE_VAPID_PUBLIC_KEY=BP_cWYEC808...
```

**Como deploy**:
1. Conectar GitHub ao Vercel
2. Importar repo
3. Configurar root directory (`apps/web` e `apps/mobile`)
4. Deploy automático em push

**Custo**: R$0/mês  
**Impacto**:
- ✅ 100GB bandwidth/mês
- ✅ Deployments ilimitados
- ✅ HTTPS automático
- ✅ CDN global
- ✅ Sem cold start
- ✅ Preview de branches

---

### 2.9 Sentry (Error Monitoring)

**Variáveis**:
```env
SENTRY_DSN=https://xxx@sentry.io/yyy
```

**Como obter**:
1. Criar conta em sentry.io
2. Criar projeto Node.js
3. Copiar DSN
4. Adicionar ao .env

**Custo**: R$0/mês (5K erros/mês)  
**Impacto**:
- ✅ 5.000 erros capturados/mês
- ✅ Stack traces completos
- ✅ Alertas por email
- ⚠️ Desabilitado automaticamente em `NODE_ENV=development`

---

### 2.10 Cloudflare (DNS + CDN + SSL)

**Variáveis**: Configuradas via dashboard (não em .env)

```
DNS Records:
├── @ → seu-dominio.com (A record para IP do Render)
└── www → CNAME para seu-dominio.com
```

**Como configurar**:
1. Transferir domínio ou apontar nameservers para Cloudflare
2. Adicionar A record apontando para Render IP
3. Ativar "Full SSL/TLS"

**Custo**: R$0/mês  
**Impacto**:
- ✅ SSL/TLS automático
- ✅ CDN global
- ✅ DDoS protection básico
- ✅ Sem downtimes de setup

---

## 3️⃣ COMPARATIVO: SERVERS E CUSTOS

### Por Componente

| Componente | Servidor Free | Custo | Limite | Adequado? |
|-----------|---|-------|--------|----------|
| **API** | Render.com | R$0 | 512MB RAM | ✅ (50-100 cond) |
| **PostgreSQL** | Neon.tech | R$0 | 512MB | ✅ (50-100 cond) |
| **Redis** | Upstash/Cloud | R$0 | 10K-30MB | ⚠️ (usar MemStore) |
| **MongoDB** | Atlas M0 | R$0 | 512MB | ✅ (50-100 cond) |
| **Email** | Resend | R$0 | 3K msgs/mês | ✅ (100+ cond) |
| **IA** | Groq | R$0 | 14.4K req/dia | ✅ (ilimitado) |
| **Web** | Vercel | R$0 | 100GB BW/mês | ✅ |
| **Mobile** | Vercel | R$0 | 100GB BW/mês | ✅ |
| **DNS+CDN** | Cloudflare | R$0 | Ilimitado | ✅ |
| **Monitoring** | Sentry | R$0 | 5K errors/mês | ✅ |
| **Uptime** | UptimeRobot | R$0 | 50 monitors | ✅ |

### Cenário: 100 Condominios (10-50 moradores cada)

```
┌─────────────────────────────────────────────────────┐
│ CUSTO OPERACIONAL — 100 CONDOMINIOS                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Render.com (API)          R$0/mês                   │
│ Neon.tech (PostgreSQL)    R$0/mês                   │
│ Upstash (Redis)           R$0/mês*                  │
│ MongoDB Atlas (M0)        R$0/mês                   │
│ Resend (Email)            R$0/mês                   │
│ Groq (IA)                 R$0/mês                   │
│ Vercel (Web+Mobile)       R$0/mês                   │
│ Sentry (Monitoring)       R$0/mês                   │
│ Cloudflare (DNS/CDN)      R$0/mês                   │
│ UptimeRobot (Uptime)      R$0/mês                   │
│ Domínio .com.br           ~R$50/ano (~R$4/mês)     │
│                                                     │
├─────────────────────────────────────────────────────┤
│ TOTAL MENSAL              R$4/mês (domínio)         │
│ Receita (100 × R$200)     R$20.000/mês              │
│ Margem Operacional        99,98% ✅                 │
│                                                     │
│ *Upstash: 10K req/dia pode ser insuficiente        │
│  → Use Redis Cloud (30MB free) ou MemStore          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 4️⃣ IMPACTO TÉCNICO DE USAR FREE TIER

### 4.1 Performance

| Métrica | Free Tier | Impacto | Mitigação |
|---------|-----------|--------|-----------|
| **Latência API** | <500ms | ✅ Aceitável | — |
| **Database** | <100ms | ✅ Excelente | SSL requerido |
| **Redis** | Serverless, <100ms | ✅ Bom | Sem rate limit em memory |
| **Email** | ~5s entrega | ✅ Bom | Async via queue |
| **IA Groq** | ~200ms | ✅ Mais rápido que OpenAI | — |
| **Cold start (Render)** | 30-60s | ⚠️ Problema | UptimeRobot ping a cada 5min |

**Resultado**: Performance aceitável para MVP

---

### 4.2 Disponibilidade

| Componente | Free Tier | SLA | Impacto |
|-----------|-----------|-----|---------|
| **Render** | Auto-sleep 15min | 99% | ⚠️ Cold start; mitigar com ping |
| **Neon** | 99.95% | SLA explícito | ✅ Confiável |
| **Upstash** | 99.9% | SLA explícito | ✅ Confiável |
| **Atlas** | 99.95% | SLA por contrato | ✅ Confiável |
| **Vercel** | 99.95% | SLA explícito | ✅ Confiável |
| **Cloudflare** | 99.9% | Garantido | ✅ Confiável |

**Resultado**: Uptime bom (99%+) se UptimeRobot ping configurado

---

### 4.3 Escalabilidade

#### Quando Atingir Limites Free:

```
TRIGGERS PARA UPGRADE:

1. PostgreSQL (512MB → 10GB)
   ├── Quando: 100+ condominios com 5+ anos de dados
   ├── Custo: Neon → US$19/mês
   └── Impacto: Mudança apenas de DB URL

2. Redis (10K req/dia → pay-as-you-go)
   ├── Quando: Rate limiter ativa (144K req/dia)
   ├── Solução atual: MemStore (já implementado)
   ├── Custo: Upstash pay-per-use ~US$5/mês (se usar)
   └── Impacto: Nenhum (código já adaptado)

3. MongoDB (512MB → 2GB)
   ├── Quando: 1K+ sessões WhatsApp ativas
   ├── Custo: Atlas → US$10/mês (M2)
   └── Impacto: Mudança de connection string apenas

4. Email (3K/mês → 10K/mês)
   ├── Quando: 300+ condominios ativos
   ├── Custo: Resend → US$20/mês
   └── Impacto: Nenhum (API igual)

5. API (512MB RAM → 1GB+)
   ├── Quando: 200+ usuários simultâneos
   ├── Custo: Render → US$7/mês (Starter)
   └── Impacto: Mudança apenas de plano
```

---

### 4.4 Segurança

| Aspecto | Free Tier | Nível |
|--------|-----------|-------|
| **SSL/TLS** | Cloudflare automático | ✅ Excelente |
| **Database SSL** | Neon exige (sslmode=require) | ✅ Obrigatório |
| **Auth** | JWT 1h + refresh 7d | ✅ Seguro |
| **Rate limiter** | MemStore em memória | ⚠️ Single-instance |
| **DDoS** | Cloudflare básico | ⚠️ Básico (não adequado para volume alto) |
| **Backups** | Neon automático + Atlas automático | ✅ 24h retention |

**Resultado**: Seguro para MVP; DDoS pode ser problema em ataque direcionado

---

### 4.5 Operacional

| Operação | Free Tier | Complexidade |
|----------|-----------|-------------|
| **Setup inicial** | 6-7 horas (contas + deploy) | 🟡 Médio |
| **Deploy** | Git push → automático | ✅ Simples |
| **Scaling horizontal** | Não suportado em free | ❌ Não |
| **Database backup** | Automático | ✅ Automático |
| **Monitoring** | Sentry + UptimeRobot | ✅ Completo |
| **Updates** | Automáticos (npm via CI/CD) | ✅ Automático |
| **Gerenciamento de secrets** | Variáveis env no Render | ⚠️ Manual |

---

## 5️⃣ ROADMAP: DO DEV PARA PRODUÇÃO

### Fase 1: Hoje (Desenvolvimento)

```
✅ Tudo em localhost:3333, 5173, 5174
✅ Docker Compose para infra
✅ Emails em Mailpit
✅ Código com suporte a Groq (gratuito) e OpenAI
✅ Rate limiter com MemStore
✅ Nenhuma conta criada ainda
✅ Custo: R$0
```

### Fase 2: Próximos 2-4 Meses (Early Stage)

```
⏳ Primeira versão rodando localmente completa
⏳ Testes com 1-2 condominios beta
⏳ Feedback coletado
⏳ Código pronto para deploy

Decisão: Continuar dev ou fazer deploy?
├── SE continuar dev → volta para Fase 1
└── SE fazer deploy → vai para Fase 3
```

### Fase 3: Quando Tiver Clientes Reais (4+ semanas antes de launch)

**Criar contas gratuitas** (apenas as que serão usadas):

```
Timeline: 6-7 horas de setup

1. Criar conta Vercel (5 min)
   └── Conectar GitHub
   
2. Criar conta Render (5 min)
   └── Conectar GitHub
   
3. Criar conta Neon.tech (10 min)
   └── Criar projeto + DB + copiar URL
   
4. Criar conta Upstash/Redis Cloud (10 min)
   └── Criar database + copiar URL
   
5. Criar conta MongoDB Atlas (10 min)
   └── Criar cluster M0 + user + copiar URL
   
6. Criar conta Resend (5 min)
   └── Gerar API key
   
7. Criar conta Groq (5 min)
   └── Gerar API key
   
8. Criar conta Sentry (5 min)
   └── Criar projeto + copiar DSN
   
9. Criar conta Cloudflare (10 min)
   └── Apontar DNS
   
10. Criar conta UptimeRobot (5 min)
    └── Adicionar monitor para Render API
    
11. Deploy Vercel (5 min)
    └── Setup automático
    
12. Deploy Render (10 min)
    └── Setup automático
    
13. Migrações DB (10 min)
    └── `npx prisma migrate deploy`
    
14. Testes E2E em produção (30 min)
    └── Validar tudo funciona
```

**Custo total**: R$0 - R$50/mês (apenas domínio, opcional)

---

## 6️⃣ VARIÁVEIS DE AMBIENTE — SUMMARY

### Mínimo para Produção (Free Tier)

```bash
# Críticas (sem essas, não funciona)
DATABASE_URL=postgresql://...neon.tech/...
REDIS_URL=rediss://...upstash.io:6379
MONGODB_URI=mongodb+srv://...atlas.mongodb.net/...
JWT_SECRET=gere-chave-segura-32-chars
JWT_REFRESH_SECRET=gere-outra-chave-32-chars
CORS_ORIGINS=https://seu-dominio.com

# Email
RESEND_API_KEY=re_sua_chave

# IA (opcional, fallback desabilitado)
GROQ_API_KEY=gsk_sua_chave

# HTTPS/Domínio
NODE_ENV=production

# Notificações
VAPID_PUBLIC_KEY=BP_...
VAPID_PRIVATE_KEY=isa...
```

**Total**: 10-11 variáveis críticas  
**Tempo setup**: ~30 min (após criar contas)

---

## 📊 RESUMO: FREE TIER vs PAGO

```
┌──────────────────────────────────────────────────────┐
│                   FREE vs PAGO                       │
├────────────────────┬──────────────┬──────────────────┤
│ Componente         │ Free Tier    │ Pago (mínimo)    │
├────────────────────┼──────────────┼──────────────────┤
│ API (Render)       │ R$0          │ R$7/mês (512MB)  │
│ PostgreSQL         │ R$0 (512MB)  │ R$19/mês (10GB)  │
│ Redis              │ R$0 (limit)  │ R$10/mês (1GB)   │
│ MongoDB            │ R$0 (512MB)  │ R$10/mês (2GB)   │
│ Email (Resend)     │ R$0 (3K)     │ R$20/mês (10K)   │
│ IA (Groq)          │ R$0 (14K)    │ — (já free)      │
│ Web+Mobile         │ R$0          │ — (já free)      │
│ Monitoring         │ R$0          │ — (já free)      │
│ DNS+CDN            │ R$0          │ — (já free)      │
├────────────────────┼──────────────┼──────────────────┤
│ TOTAL              │ R$0/mês      │ ~R$140/mês       │
└──────────────────────────────────────────────────────┘

Quando migrar? Quando revenue > R$1.000/mês
Seu free tier aguenta até: 100 condominios = R$20.000/mês
→ Pague R$140/mês apenas quando tiver receita garantida
```

---

## ✅ CONCLUSÃO

### Para Desenvolvimento (Hoje)
- ✅ Tudo rodando localmente
- ✅ Sem criar nenhuma conta ainda
- ✅ Código pronto para free tier (Groq + MemStore)
- ✅ Sem custo operacional

### Para Produção (Futuro)
- ✅ Stack 100% free tier
- ✅ Custo: R$0-4/mês (apenas domínio)
- ✅ Suporta 50-100 condominios sem upgrade
- ✅ Setup 6-7 horas (criar contas + deploy)
- ✅ Performance aceitável (99%+ uptime com ping)
- ✅ Segurança adequada para MVP
- ✅ Escalável sem mudança de código

### Impacto Técnico
- ⚠️ Cold start 30-60s (mitigado com UptimeRobot)
- ⚠️ Rate limiter em MemStore (single-instance, OK para MVP)
- ✅ Database automático + backups
- ✅ Deploy automático (git push)
- ✅ HTTPS automático
- ✅ CDN global

---

**Próximo Passo**: Continuar desenvolvimento. Quando tiver clientes reais, volta aqui e cria as contas em Fase 3.
