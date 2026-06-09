# 🆓 ANÁLISE DE VIABILIDADE — OPERAÇÃO ZERO CUSTO
**Data**: 27 de Maio de 2026  
**Objetivo**: Operar CondoSync com R$0/mês em infraestrutura e serviços  
**Veredicto Final**: ✅ **VIÁVEL — com stack 100% gratuita**

---

## 📊 RESUMO EXECUTIVO

O CondoSync pode operar com **R$0 de custo operacional** utilizando apenas:

- Free tiers de serviços cloud
- Alternativas open-source self-hosted
- Serviços permanentemente gratuitos

**Custo atual estimado** (stack pago): R$150-400/mês  
**Custo com stack gratuita**: R$0/mês  
**Viabilidade**: 100% — todos os componentes têm alternativa gratuita

**Único custo não eliminável (opcional)**: Domínio (~R$50/ano ≈ R$4/mês)

---

## 🗺️ MAPEAMENTO DO STACK ATUAL vs ALTERNATIVAS GRATUITAS

### 1. 🖥️ SERVIDOR / HOSPEDAGEM

| Atual | Custo | Alternativa Gratuita | Limite Free |
|-------|-------|----------------------|-------------|
| VPS Hostinger (2.24.211.167) | R$50-100/mês | **Render.com** | 512MB RAM, dorme após 15min |
| Railway (deploy prod) | US$5-20/mês | **Railway Free Tier** | 500 horas/mês |
| Docker Compose local | R$0 (já tem PC) | **Fly.io** | 3 VMs 256MB |

#### ✅ RECOMENDAÇÃO: Render.com + Railway Free

```
OPÇÃO A — Railway Free (Mais simples)
├── 500 horas/mês gratuito
├── Postgres integrado (1GB free)
├── Redis integrado
├── Sleep mode desativável com cronjob de ping
└── ⚠️ Limite: 512MB RAM por serviço

OPÇÃO B — Render.com Free (Mais recursos)
├── Web Service: 512MB RAM
├── PostgreSQL: 1GB storage
├── Redis: 25MB
├── ⚠️ Dorme após 15 min de inatividade
└── ✅ Acorda automaticamente na primeira request

OPÇÃO C — Fly.io (Melhor disponibilidade)
├── 3 máquinas 256MB gratuitas
├── Sem cold start involuntário
├── 160GB/mês bandwidth gratuito
└── ✅ Mais adequado para produção free
```

**Problema do Sleep Mode**:
- Render/Railway free "dorme" serviços sem tráfego
- Solução: **UptimeRobot** (gratuito) faz ping a cada 5 min → serviço fica acordado

---

### 2. 🗄️ BANCO DE DADOS (PostgreSQL)

| Atual | Custo | Alternativa Gratuita | Limite Free |
|-------|-------|----------------------|-------------|
| PostgreSQL 16 (Docker local) | R$0 (local) | **Supabase** | 500MB storage, 2 projetos |
| PostgreSQL em VPS | Incluso no VPS | **Neon.tech** | 512MB storage, serverless |
| Railway Postgres | US$5+/mês | **Railway Free Tier** | 1GB database |

#### ✅ RECOMENDAÇÃO: Supabase ou Neon

```
SUPABASE (Melhor para CondoSync)
├── ✅ 500MB PostgreSQL free
├── ✅ 50MB file storage free
├── ✅ 1GB bandwidth/mês
├── ✅ Built-in autenticação (complementa JWT)
├── ✅ Dashboard web para gerenciar
├── ✅ Pausa projeto após 1 semana inativo (reativa em 1 clique)
└── ❌ 500MB pode ser limitado em crescimento

NEON.TECH (Mais generoso)
├── ✅ 512MB armazenamento gratuito
├── ✅ Serverless PostgreSQL
├── ✅ Sem cold start no banco
├── ✅ 10GB bandwidth/mês
├── ✅ Branching de banco (dev/prod separados)
└── ✅ Não pausa banco nunca (free tier permanente)

RAILWAY FREE (Mais conveniente)
├── ✅ Postgres + Redis integrado
├── ✅ 1GB database
└── ⚠️ Limite de 500h/mês para os containers
```

---

### 3. 🚀 REDIS (Cache + BullMQ Queue)

| Atual | Custo | Alternativa Gratuita | Limite Free |
|-------|-------|----------------------|-------------|
| Redis 7 local (Docker) | R$0 (local) | **Upstash Redis** | 10.000 req/dia, 256MB |
| Redis em VPS | Incluso no VPS | **Railway Redis** | Incluso no free |

#### ✅ RECOMENDAÇÃO: Upstash Redis

```
UPSTASH REDIS (Perfeito para CondoSync)
├── ✅ 10.000 requests/dia GRATUITO
├── ✅ 256MB armazenamento
├── ✅ Serverless (paga só se usar mais)
├── ✅ Compatível com ioredis (sem mudança de código)
└── ✅ 0 custo para condominios pequenos/médios

Cálculo de uso:
- Rate limiting: ~100 req/min × 1.440 min = 144.000 req/dia
- BullMQ jobs: ~500 jobs/dia
- Cache tokens: ~200 req/dia
TOTAL: ~144.700 req/dia

⚠️ ATENÇÃO: 10.000 req/dia free pode ser insuficiente em produção
Upstash Pay-As-You-Go: $0.20/100K req (praticamente zero)

ALTERNATIVA: Redis Cloud Free
├── 30MB storage free
├── Sem limite de requests
└── ✅ Melhor para BullMQ (sem limite)
```

---

### 4. 🍃 MONGODB (Sessões WhatsApp Baileys)

| Atual | Custo | Alternativa Gratuita | Limite Free |
|-------|-------|----------------------|-------------|
| MongoDB 7 (Docker local) | R$0 (local) | **MongoDB Atlas** | 512MB free |

#### ✅ RECOMENDAÇÃO: MongoDB Atlas Free M0

```
MONGODB ATLAS M0 (Grátis para sempre)
├── ✅ 512MB storage
├── ✅ Free tier permanente (M0)
├── ✅ 3 nós (alta disponibilidade)
├── ✅ Compatível com mongoose (sem mudança de código)
└── ✅ Interface web completa

Para as sessões WhatsApp do Baileys:
- 1 sessão por condomínio ≈ 1-5MB
- 100 condominios = 100-500MB
→ 512MB é suficiente para escalar bem
```

---

### 5. 📧 EMAIL (SMTP / Transacional)

| Atual | Custo | Alternativa Gratuita | Limite Free |
|-------|-------|----------------------|-------------|
| Mailpit (dev) | R$0 | Mailpit (dev) | Ilimitado (apenas dev) |
| Resend (produção) | US$0 free tier | **Resend Free** | 3.000 emails/mês |
| SMTP Gmail | R$0 | **Gmail SMTP** | 500 emails/dia |

#### ✅ RECOMENDAÇÃO: Resend Free Tier

```
RESEND (Melhor opção)
├── ✅ 3.000 emails/mês GRATUITO (100/dia)
├── ✅ 1 domínio customizado free
├── ✅ Dashboard + analytics
├── ✅ API simples (já tem suporte no código)
└── ✅ Excelente entregabilidade

Para 100 condominios com ~30 unidades cada:
- 1-5 emails/dia por condomínio = 100-500 emails/dia
- 3.000/mês cover ~30-100 condominios ativos
→ Suficiente para MVP e early stage

ALTERNATIVAS GRATUITAS:
├── Brevo (Sendinblue): 300 emails/dia, 9.000/mês FREE
├── Gmail SMTP: 500/dia via conta Google
├── Mailgun: 5.000 emails/mês por 3 meses, depois 100/dia
└── Gmail OAuth2: Ilimitado via Nodemailer (técnico)
```

---

### 6. 💬 WHATSAPP (Notificações)

| Atual | Custo | Status |
|-------|-------|--------|
| Baileys WhatsApp Web | **R$0** | ✅ JÁ GRATUITO |

#### ✅ JÁ GRATUITO — Baileys não tem custo

```
BAILEYS WHATSAPP WEB
├── ✅ 100% GRATUITO
├── ✅ Usa protocolo WhatsApp Web (sem API oficial)
├── ✅ Sem rate limiting (humano + bot)
├── ⚠️ Termos: Não é oficial (pode ser banido)
└── ✅ Para condominios, risco baixo (uso legítimo)

ALTERNATIVAS PAGAS (para referência):
├── WhatsApp Business API (Meta): R$0,06 por mensagem
├── Twilio WhatsApp: US$0,005 por mensagem
└── 360dialog: €49/mês + mensagens

CUSTO BAILEYS vs OFICIAL:
Cenário: 100 condominios × 50 msgs/mês = 5.000 msgs/mês
├── Baileys: R$0
└── Oficial Meta: R$300/mês

→ Economia: R$300/mês usando Baileys
```

---

### 7. 🔔 PUSH NOTIFICATIONS (VAPID)

| Atual | Custo | Status |
|-------|-------|--------|
| web-push + VAPID keys | **R$0** | ✅ JÁ GRATUITO |

```
VAPID PUSH NOTIFICATIONS
├── ✅ 100% GRATUITO (protocolo W3C)
├── ✅ Sem servidor de terceiros
├── ✅ Push vai direto do servidor → browser
├── ✅ Funciona em Chrome, Firefox, Safari (iOS 16.4+)
└── ✅ Sem custo por notificação

→ Push Notifications: ZERO CUSTO PERMANENTE
```

---

### 8. 🤖 IA (Assistente OpenAI)

| Atual | Custo | Alternativa Gratuita | Limite Free |
|-------|-------|----------------------|-------------|
| OpenAI GPT-4o-mini | US$0,01/1K tokens | **Groq API** | 14.400 req/dia, 30K tokens/min |

#### ✅ RECOMENDAÇÃO: Groq API (100% gratuita)

```
GROQ API FREE TIER (Melhor alternativa)
├── ✅ llama-3.3-70b-versatile (mais capaz que gpt-4o-mini)
├── ✅ 14.400 requests/dia GRATUITOS
├── ✅ 30.000 tokens/minuto
├── ✅ Latência ~200ms (mais rápido que OpenAI)
└── ✅ API compatível com OpenAI (mudança mínima no código)

MUDANÇA NO CÓDIGO (ai.routes.ts):
// ANTES:
const url = "https://api.openai.com/v1/chat/completions";
const model = env.OPENAI_MODEL; // gpt-4o-mini
const headers = { Authorization: `Bearer ${env.OPENAI_API_KEY}` };

// DEPOIS (Groq):
const url = "https://api.groq.com/openai/v1/chat/completions";
const model = "llama-3.3-70b-versatile";
const headers = { Authorization: `Bearer ${env.GROQ_API_KEY}` };
// → Apenas 3 linhas de mudança!

OUTRAS ALTERNATIVAS GRATUITAS:
├── Google Gemini: 15 req/min, 1.500 req/dia FREE
├── OpenRouter Free: Múltiplos modelos free
└── Ollama (self-hosted): 100% gratuito, requer GPU/CPU local
```

---

### 9. 📊 MONITORING / ERROR TRACKING

| Atual | Custo | Alternativa Gratuita | Limite Free |
|-------|-------|----------------------|-------------|
| Sentry | US$0 (free tier) | **Sentry Free** | 5.000 erros/mês |

#### ✅ JÁ GRATUITO — Sentry tem free tier

```
SENTRY FREE TIER
├── ✅ 5.000 erros/mês
├── ✅ 1 usuário free
├── ✅ 7 dias de retenção
└── ✅ Já integrado no código (opcional)

ALTERNATIVAS OPEN-SOURCE SELF-HOSTED:
├── GlitchTip: Clone do Sentry, self-hosted (free)
├── Winston + arquivo: Já implementado (logs locais)
└── Prometheus + Grafana: Free, self-hosted

UPTIME MONITORING (Gratuito):
├── UptimeRobot: 50 monitores, check 5 min - FREE
├── FreshPing: 50 monitores, check 1 min - FREE
└── Betterstack: 10 monitores - FREE
```

---

### 10. 💳 GATEWAY DE PAGAMENTO (ASAAS)

| Atual | Custo | Status |
|-------|-------|--------|
| ASAAS / PJBANK | % por transação | Modelo comissionado |

#### ✅ ASAAS — SEM custo fixo (apenas % por transação)

```
ASAAS MODELO DE COBRANÇA
├── ✅ SEM mensalidade
├── ✅ SEM custo de cadastro
├── ✅ Cobra apenas % por transação processada
├── ├── PIX: R$0,99 por cobrança
├── ├── Boleto: 1,5% + R$1,99
├── └── Cartão: 2,5% + R$0,50
└── ✅ SANDBOX GRATUITO para dev/homologação

→ Para CondoSync SaaS:
Cenário: Você cobra ASAAS nas cobranças DOS MORADORES
→ Repassa taxa ao condomínio (não paga do seu bolso)
→ Custo real para CondoSync como produto: R$0

ESTRATÉGIA SEM CUSTO:
1. Condomínio registra cobranças no CondoSync
2. Morador paga via ASAAS
3. ASAAS cobra taxa do morador/condomínio
4. CondoSync recebe % como parceiro ASAAS (receita adicional!)
→ Pode virar FONTE DE RECEITA (3-8% de comissão)
```

---

### 11. 🌐 CDN / DNS / SSL

| Atual | Custo | Alternativa Gratuita |
|-------|-------|----------------------|
| DNS manual | Incluso domínio | **Cloudflare Free** |
| SSL (Let's Encrypt) | R$0 | Cloudflare SSL (FREE) |

#### ✅ CLOUDFLARE FREE — CDN + DNS + SSL gratuito

```
CLOUDFLARE FREE TIER
├── ✅ CDN global (200 PoPs)
├── ✅ DNS gerenciado gratuito
├── ✅ SSL automático (Universal SSL)
├── ✅ DDoS protection básica
├── ✅ Analytics de tráfego
├── ✅ Rules e redirects básicos
└── ✅ Cache estático automático

→ Nenhum custo para DNS + SSL + CDN básico
```

---

### 12. 🔀 CI/CD (Deploy Automático)

| Atual | Custo | Alternativa Gratuita |
|-------|-------|----------------------|
| Deploy manual | R$0 | **GitHub Actions** |

#### ✅ GITHUB ACTIONS — 2.000 min/mês gratuitos

```
GITHUB ACTIONS FREE TIER
├── ✅ 2.000 minutos/mês (repo público)
├── ✅ Ilimitado para repos públicos
├── ✅ Deploy automático ao push
├── ✅ Testes automáticos
└── ✅ Build Docker automatizado

Para CondoSync:
- Build API: ~3 min
- Build Web: ~2 min
- Build Mobile: ~2 min
TOTAL por deploy: ~7 min
Com 2.000 min/mês: ~285 deploys/mês = 9 deploys/dia
→ Mais que suficiente
```

---

## 💰 COMPARATIVO FINANCEIRO

### Stack Atual (Pago)

```
┌─────────────────────────────────────────────────────┐
│ INFRAESTRUTURA ATUAL (ESTIMATIVA)                   │
├─────────────────────────────────────────────────────┤
│ VPS Hostinger (2GB RAM)        R$50-100/mês         │
│ Railway (produção)             US$5-20/mês          │
│ Domínio condosync.app          R$4/mês (anual)      │
│ OpenAI GPT-4o-mini             US$5-30/mês*         │
│ Resend email transacional      US$0 (free tier)     │
│ Sentry monitoring              US$0 (free tier)     │
├─────────────────────────────────────────────────────┤
│ TOTAL ESTIMADO                 R$150-300/mês        │
└─────────────────────────────────────────────────────┘
* Depende do uso
```

### Stack Gratuita (Zero Custo)

```
┌─────────────────────────────────────────────────────┐
│ INFRAESTRUTURA ZERO CUSTO                           │
├─────────────────────────────────────────────────────┤
│ Render.com (hosting)           R$0/mês              │
│ Neon.tech (PostgreSQL)         R$0/mês              │
│ Upstash Redis                  R$0/mês              │
│ MongoDB Atlas M0               R$0/mês              │
│ Resend (3.000 emails/mês)      R$0/mês              │
│ Baileys WhatsApp               R$0/mês              │
│ VAPID Push                     R$0/mês              │
│ Groq API (IA)                  R$0/mês              │
│ Cloudflare (DNS+CDN+SSL)       R$0/mês              │
│ Sentry (5K erros/mês)          R$0/mês              │
│ UptimeRobot (uptime)           R$0/mês              │
│ GitHub Actions (CI/CD)         R$0/mês              │
├─────────────────────────────────────────────────────┤
│ TOTAL                          R$0/mês ✅            │
│                                                     │
│ Opcional: Domínio próprio      R$4/mês (~R$50/ano)  │
└─────────────────────────────────────────────────────┘
```

---

## ⚠️ LIMITAÇÕES DO STACK GRATUITO

### 1. Cold Start (Inicialização a Frio)

```
PROBLEMA:
- Render.com free: serviço "dorme" após 15 min sem tráfego
- Primeira request após sleep: 30-60 segundos para acordar

SOLUÇÃO:
- UptimeRobot: Faz ping a cada 5 min → serviço nunca dorme
- Setup: Criar conta em uptimerobot.com, adicionar monitor HTTP
- Custo: R$0
- Resultado: Sem cold start em produção
```

### 2. Limites de Storage

```
PROBLEMA:
- PostgreSQL: 500MB (Supabase) / 512MB (Neon)
- MongoDB: 512MB
- Redis: 25-30MB

CAPACIDADE ESTIMADA:
- 1 condomínio: ~5-10MB dados
- 50 condominios: ~250-500MB dados
→ Suficiente para MVP e early stage (50+ condominios)

QUANDO PAGAR:
- PostgreSQL 10GB (Neon): US$19/mês
- Apenas quando você tiver receita garantida
- Trigger: 100+ condominios ativos
```

### 3. Limites de Requests

```
REDIS (Upstash Free):
- 10.000 requests/dia
- Rate limiter usa ~144.000 req/dia (EXCEDE!)

SOLUÇÃO para Rate Limiter:
- Usar memory store (express-rate-limit built-in) em vez de Redis
- Menos preciso em multi-instância, mas funciona
- OU usar Redis Cloud Free (sem limite de requests)

CÓDIGO (sem Redis para rate limiting):
// apps/api/src/server.ts
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  // Remover: store: new RedisStore(...)
  // Usa MemoryStore por default (gratuito, sem Redis)
});
```

### 4. WhatsApp Baileys — Risco de Bloqueio

```
RISCO:
- Baileys usa protocolo não-oficial do WhatsApp
- Meta pode banir números que usam bots
- Risco maior com volume alto de mensagens

MITIGAÇÃO:
- Número dedicado para cada condomínio
- Limitar volume de mensagens
- Usar apenas para notificações legítimas (visitantes, encomendas)
- Não fazer spam/marketing

ALTERNATIVA FREE OFICIAL:
- WhatsApp Business App (manual, sem API)
- Telegram Bot API: 100% gratuito, sem restrições
  → Se morador instalar Telegram, funciona sem custo
```

### 5. Railway Free — Horas Mensais

```
RAILWAY FREE:
- 500 horas/mês = 20 horas/dia
- 7 containers × 24h = 168h/dia (EXCEDE)

SOLUÇÃO:
- Usar apenas para API (não web/mobile)
- Web/Mobile: deploy no Vercel (gratuito)
- Ou trocar Railway por Render.com/Fly.io
```

---

## 🏗️ ARQUITETURA ZERO CUSTO RECOMENDADA

### Configuração Otimizada

```
┌──────────────────────────────────────────────────────────┐
│             ARQUITETURA FREE TIER CONDOSYNC              │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  USUÁRIOS                                                │
│      │                                                   │
│      ▼                                                   │
│  ┌─────────────────┐                                     │
│  │  Cloudflare     │ ← DNS + SSL + CDN (FREE)            │
│  │  Free Tier      │                                     │
│  └────────┬────────┘                                     │
│           │                                              │
│      ┌────┴──────────────────────────────┐               │
│      │           │                       │               │
│      ▼           ▼                       ▼               │
│  ┌────────┐  ┌────────┐            ┌──────────┐          │
│  │Vercel  │  │Vercel  │            │Render.com│          │
│  │Web     │  │Mobile  │            │ API      │          │
│  │(FREE)  │  │(FREE)  │            │ (FREE)   │          │
│  └────────┘  └────────┘            └────┬─────┘          │
│                                         │                │
│                              ┌──────────┼──────────┐    │
│                              │          │          │    │
│                              ▼          ▼          ▼    │
│                         ┌────────┐ ┌────────┐ ┌──────┐  │
│                         │Neon.   │ │Upstash │ │Atlas │  │
│                         │tech    │ │Redis   │ │Mongo │  │
│                         │Postgre │ │(FREE)  │ │(FREE)│  │
│                         │(FREE)  │ └────────┘ └──────┘  │
│                         └────────┘                      │
│                                                          │
│  SERVIÇOS EXTERNOS GRATUITOS:                            │
│  ├── Resend (email transacional) - FREE 3K/mês           │
│  ├── Groq API (IA) - FREE 14K req/dia                    │
│  ├── Sentry (monitoring) - FREE 5K erros/mês             │
│  ├── UptimeRobot (uptime) - FREE                         │
│  └── GitHub Actions (CI/CD) - FREE 2K min/mês            │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Por que Vercel para Web/Mobile?

```
VERCEL FREE TIER
├── ✅ 100GB bandwidth/mês
├── ✅ 100 deploys/dia
├── ✅ HTTPS automático
├── ✅ CDN global
├── ✅ Preview de branches
├── ✅ Analytics básico
└── ✅ Sem cold start (sempre ativo)

→ Web (React) e Mobile (PWA) são estáticos após build
→ Vercel é perfeito para frontend estático
→ Apenas API precisa de servidor (Render.com)
```

---

## 🔧 MUDANÇAS TÉCNICAS NECESSÁRIAS

### 1. OpenAI → Groq (IA Gratuita)

**Arquivo**: `apps/api/src/modules/ai/ai.routes.ts`

```typescript
// ANTES (pago):
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const model = env.OPENAI_MODEL; // gpt-4o-mini
headers["Authorization"] = `Bearer ${env.OPENAI_API_KEY}`;

// DEPOIS (gratuito):
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const model = "llama-3.3-70b-versatile"; // Melhor que gpt-4o-mini!
headers["Authorization"] = `Bearer ${env.GROQ_API_KEY}`;
```

**Variável no .env**:
```env
# Substituir OPENAI_API_KEY por GROQ_API_KEY
GROQ_API_KEY=gsk_sua_chave_aqui  # Criar em console.groq.com
```

### 2. Rate Limiter → Memory Store (sem Redis)

**Arquivo**: `apps/api/src/server.ts`

```typescript
// ANTES (requer Redis):
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  store: new RedisStore({ client: redisClient }),
});

// DEPOIS (sem Redis, memory built-in):
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  // Sem store: usa MemoryStore automaticamente
  standardHeaders: true,
  legacyHeaders: false,
});
```

### 3. Email: Resend (gratuito, já no código)

**Arquivo**: `apps/api/.env`

```env
# Configurar apenas Resend (3.000 emails/mês free)
RESEND_API_KEY=re_sua_chave_aqui  # Criar em resend.com/signup
# SMTP_HOST e SMTP_PORT não precisam para produção
```

**Verificar no código** que Resend tem prioridade sobre SMTP quando configurado.

### 4. Variáveis de Ambiente para Deploy Gratuito

```env
# DATABASE_URL para Neon.tech
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/condosync?sslmode=require

# REDIS para Upstash
REDIS_URL=rediss://default:token@xxx.upstash.io:6379

# Email com Resend
RESEND_API_KEY=re_xxx

# IA com Groq (substitui OpenAI)
GROQ_API_KEY=gsk_xxx

# MongoDB Atlas
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/condosync-whatsapp

# Sentry (free tier)
SENTRY_DSN=https://xxx@sentry.io/yyy
```

---

## 📋 GUIA DE SETUP ZERO CUSTO (Passo-a-Passo)

### Fase 1: Criar Contas Gratuitas (1-2 horas)

```
1. GitHub
   → github.com (já deve ter)
   
2. Neon.tech (PostgreSQL)
   → neon.tech/signup
   → Criar projeto "condosync"
   → Copiar DATABASE_URL
   
3. Upstash Console (Redis)
   → console.upstash.com
   → Criar database "condosync-redis"
   → Copiar REDIS_URL
   
4. MongoDB Atlas (MongoDB)
   → mongodb.com/atlas/register
   → Criar cluster M0 Free
   → Criar DB "condosync-whatsapp"
   → Copiar connection string

5. Resend (Email)
   → resend.com/signup
   → Verificar domínio (ou usar subdomínio)
   → Copiar API Key
   
6. Groq (IA)
   → console.groq.com
   → Criar API Key
   → Substitui OpenAI
   
7. Render.com (API Hosting)
   → render.com/register
   → Conectar GitHub
   → New Web Service → deploy API
   
8. Vercel (Web + Mobile Hosting)
   → vercel.com/signup
   → Importar repositório
   → Deploy web e mobile
   
9. Cloudflare (DNS)
   → cloudflare.com/sign-up
   → Adicionar domínio
   → Ativar SSL/TLS
   
10. UptimeRobot (Monitoramento uptime)
    → uptimerobot.com/signUp
    → Criar monitor para API (ping a cada 5 min)
    → Evita cold start no Render
    
11. Sentry (Error monitoring)
    → sentry.io/signup
    → Criar projeto Node.js
    → Copiar SENTRY_DSN
```

### Fase 2: Configurar Variáveis de Ambiente (30 min)

```bash
# Render.com → Environment Variables:
NODE_ENV=production
DATABASE_URL=postgresql://...neon.tech/...
REDIS_URL=rediss://...upstash.io:6379
MONGODB_URI=mongodb+srv://...atlas.mongodb.net/...
RESEND_API_KEY=re_...
GROQ_API_KEY=gsk_...
JWT_SECRET=gere-chave-aleatoria-aqui
JWT_REFRESH_SECRET=gere-outra-chave-aleatoria-aqui
VAPID_PUBLIC_KEY=BP_cWYEC808cU...  # Já gerado
VAPID_PRIVATE_KEY=isa6zWj41mZZL...  # Já gerado
VAPID_EMAIL=noreply@condosync.com.br
CORS_ORIGINS=https://condosync.app,https://mobile.condosync.app
SENTRY_DSN=https://...sentry.io/...
```

### Fase 3: Deploy (1-2 horas)

```bash
# 1. Aplicar migrations no Neon
DATABASE_URL=postgresql://...neon.tech npx prisma migrate deploy

# 2. Commit + Push para GitHub
git push origin main

# 3. Render detecta automaticamente e faz deploy
# 4. Vercel detecta automaticamente e faz deploy
# 5. Cloudflare aponta DNS para Render/Vercel
```

---

## 📊 CAPACIDADE DO STACK GRATUITO

### Quantos Condominios Suporta?

```
┌────────────────────────────────────────────────────────┐
│ CAPACIDADE ESTIMADA DO FREE TIER                       │
├────────────────────────────────────────────────────────┤
│                                                        │
│ PostgreSQL (500MB Neon):                               │
│ ├── 1 condomínio = ~5MB dados                          │
│ ├── 50 condominios = ~250MB                            │
│ └── Suporta: ~50-100 condominios ✅                    │
│                                                        │
│ MongoDB (512MB Atlas):                                 │
│ ├── 1 sessão WhatsApp = ~2-5MB                         │
│ └── Suporta: ~50-100 sessões ✅                        │
│                                                        │
│ Email (3.000/mês Resend):                              │
│ ├── 30 emails/condomínio/mês (notificações)            │
│ └── Suporta: ~100 condominios ✅                       │
│                                                        │
│ API (512MB RAM Render):                                │
│ ├── Node.js API ~100MB RAM                             │
│ └── Suporta: ~200 usuários simultâneos ✅              │
│                                                        │
│ IA Groq (14.400 req/dia):                              │
│ ├── 10 consultas/condomínio/dia                        │
│ └── Suporta: ~1.440 condominios ✅                     │
│                                                        │
├────────────────────────────────────────────────────────┤
│ CAPACIDADE TOTAL: 50-100 CONDOMINIOS                   │
│ MRR com 50 clientes @ R$200: R$10.000/mês              │
│ Custo infraestrutura: R$0/mês                          │
│ MARGEM OPERACIONAL: 100% ✅                            │
└────────────────────────────────────────────────────────┘
```

---

## 🚨 QUANDO MIGRAR PARA PAGO?

### Trigger Points

```
MIGRAR QUANDO:
├── 100+ condominios → PostgreSQL 10GB: US$19/mês
├── 50.000+ emails/mês → Resend Pro: US$20/mês
├── API >512MB RAM → Render Starter: US$7/mês
└── Redis >10K req/dia → Upstash Pay-as-you-go: ~US$5/mês

Breakeven para pagar:
├── 100 condominios × R$200/mês = R$20.000 MRR
├── Custo infra pago: ~R$200-400/mês
└── Margem: 98-99%

→ Você pode operar 100% FREE até R$10.000-20.000 MRR
→ Depois disso, infraestrutura representa <2% da receita
```

---

## ✅ CONCLUSÃO FINAL

### Veredicto

**OPERAÇÃO ZERO CUSTO: 100% VIÁVEL**

Todos os componentes do CondoSync têm alternativas gratuitas de alta qualidade:

| Componente | Free Alternative | Custo | Adequado? |
|-----------|-----------------|-------|-----------|
| Servidor API | Render.com | R$0 | ✅ |
| PostgreSQL | Neon.tech | R$0 | ✅ |
| Redis | Upstash/Redis Cloud | R$0 | ✅ |
| MongoDB | MongoDB Atlas M0 | R$0 | ✅ |
| Email | Resend (3K/mês) | R$0 | ✅ |
| WhatsApp | Baileys | R$0 | ✅ |
| Push Notifications | VAPID self-hosted | R$0 | ✅ |
| IA | Groq API | R$0 | ✅ |
| Monitoring | Sentry Free | R$0 | ✅ |
| Uptime | UptimeRobot | R$0 | ✅ |
| CDN/DNS/SSL | Cloudflare Free | R$0 | ✅ |
| CI/CD | GitHub Actions | R$0 | ✅ |

**Capacidade**: 50-100 condominios ativos  
**MRR possível com free tier**: R$10.000-20.000/mês  
**Custo operacional**: R$0/mês  
**Margem**: 100%

### Passos para Migrar para Zero Custo

1. [2h] Criar contas nas plataformas gratuitas
2. [1h] Adaptar 2 arquivos de código (Groq + rate limiter)
3. [1h] Configurar variáveis de ambiente
4. [1h] Aplicar migrations no Neon.tech
5. [30m] Deploy no Render.com + Vercel
6. [30m] Configurar Cloudflare DNS
7. [10m] Setup UptimeRobot (evitar cold start)

**Total**: ~6-7 horas de configuração → **R$0/mês para sempre** ✅

---

**Realizado por**: Análise Técnica CondoSync  
**Data**: 27 de Maio de 2026  
**Próxima Ação**: Implementar mudanças técnicas (Groq + rate limiter) e criar contas gratuitas
