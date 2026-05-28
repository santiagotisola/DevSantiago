# 🗺️ TOPOLOGIA DEPLOY — Como os Servidores Se Conectam
**Data**: 27 de Maio de 2026  
**Objetivo**: Visualizar arquitetura, conectividade e finalidade de cada servidor  
**Para**: Entender "por que preciso de tantos servidores?"

---

## 📍 VISUALIZAÇÃO: ARQUITETURA DE DEPLOY

```
╔════════════════════════════════════════════════════════════════════════════╗
║                                  INTERNET                                   ║
║  usuário.com.br:443 (HTTPS via Cloudflare)                                ║
╚════════════════════════════════════════════════════════════════════════════╝
                                      ↓
                     ┌─────────────────────────────┐
                     │    CLOUDFLARE (FREE)        │
                     │ • DNS                        │
                     │ • HTTPS/SSL                  │
                     │ • CDN global                 │
                     │ • DDoS básico                │
                     └──────────┬────────┬──────────┘
                    ↙                    ↘
        ┌──────────────────┐      ┌──────────────────┐
        │  VERCEL (FREE)   │      │  VERCEL (FREE)   │
        │ WEB - React      │      │ MOBILE - PWA     │
        │ :443/web/*       │      │ :443/app/*       │
        │                  │      │                  │
        │ • HTML+CSS+JS    │      │ • Service Worker │
        │ • Vite build     │      │ • Offline mode   │
        │ • React Router   │      │ • Push subs      │
        │ • Zustand state  │      │ • Capacitor      │
        └─────────┬────────┘      └────────┬─────────┘
                  │                        │
                  └──────────────┬─────────┘
                                 ↓
                    ┌──────────────────────┐
                    │  RENDER (FREE)       │
                    │  API - Node.js       │
                    │  :443/api/v1/*       │
                    │                      │
                    │  • Express           │
                    │  • TypeScript        │
                    │  • JWT Auth          │
                    │  • 29 módulos        │
                    │  • Rate limiter      │
                    │  • Socket.IO         │
                    │  • BullMQ jobs       │
                    │                      │
                    │  512MB RAM (Limite)  │
                    │  Cold start: 30-60s  │
                    │  Sleep: 15min idle   │
                    └────┬─────────┬───────┘
                         ↓         ↓
        ┌────────────────────┐   ┌──────────────────────┐
        │ NEON.TECH (FREE)   │   │ UPSTASH (FREE)       │
        │ PostgreSQL         │   │ Redis                │
        │ Host: *.neon.tech  │   │ :6379 (SSL)          │
        │                    │   │                      │
        │ • Users            │   │ • Rate limiter       │
        │ • Condominiums     │   │ • Session cache      │
        │ • Residents        │   │ • Queue jobs         │
        │ • Transactions     │   │ • Real-time cache    │
        │ • Etc (29 models)  │   │                      │
        │                    │   │ Limit: 10K req/day   │
        │ 512MB storage      │   │ (Use MemStore if↑)   │
        │ Auto-backup 24h    │   │                      │
        │ Pause após 1 week  │   │ Alt: Redis Cloud     │
        │ inativo            │   │ (30MB free)          │
        └────────┬───────────┘   └──────────────────────┘
                 │
        ┌────────┴──────────┐
        ↓                   ↓
    ┌──────────────────┐  ┌────────────────────┐
    │ MONGODB ATLAS    │  │ RESEND (FREE)      │
    │ (FREE M0)        │  │ Email Service      │
    │                  │  │                    │
    │ • Baileys        │  │ • API: resend.com  │
    │   sessions       │  │ • 3K emails/month  │
    │ • Chat history   │  │ • Analytics        │
    │ • Media files    │  │ • Webhooks         │
    │                  │  │                    │
    │ 512MB storage    │  │ Backup: Brevo      │
    │ 3 nodes HA       │  │ (9K emails/month)  │
    │ No auto-pause    │  │                    │
    └──────────────────┘  └────────────────────┘

        ┌──────────────────────────┐
        │ SERVIÇOS EXTERNOS (FREE)  │
        ├──────────────────────────┤
        │ • Groq (IA)              │
        │   14.4K req/dia free     │
        │   Fallback: OpenAI paid  │
        │                          │
        │ • Sentry (Monitoring)    │
        │   5K errors/month free   │
        │                          │
        │ • UptimeRobot (Ping)     │
        │   50 monitors free       │
        │   → Mantém Render acordado
        │                          │
        │ • Baileys (WhatsApp)     │
        │   Gratuito (não-oficial) │
        │   Gera QR code           │
        └──────────────────────────┘
```

---

## 🔌 FLUXO DE DADOS

### 1️⃣ Usuário Abre App

```
Usuário Browser
     ↓
Cloudflare DNS
     ↓ (IP de Vercel)
Vercel CDN (Web/Mobile)
     ↓ (HTML+CSS+JS)
Browser Local
     ↓
[Load React App]
     ↓
[Service Worker inicializa]
     ↓ (Request VAPID public key)
Render API
     ↓
[Retorna chave + push subscription form]
     ↓
Browser se inscreve em notificações
     ↓ (POST /push/subscribe com endpoint)
Render API
     ↓ (Salva subscription)
PostgreSQL (Neon)
     ↓
✅ User pronto para notificações
```

### 2️⃣ Usuário Faz Login

```
Browser
     ↓ (POST /auth/login)
Cloudflare (rota para Render)
     ↓
Render API
     ├─ Valida credenciais
     ├─ Verifica PostgreSQL
     ├─ Gera JWT token
     └─ Retorna access + refresh tokens
     ↓
Browser armazena tokens (localStorage)
     ↓ (Headers: Authorization: Bearer {token})
Qualquer request subsequente
     ↓
Render valida JWT
     ✅ Request autorizado
```

### 3️⃣ Usuário Tira Foto (Parcel)

```
Browser/Mobile
     ↓ (Captura foto local)
[Service Worker Offline: armazena em IndexedDB]
     ↓ (quando online)
Render API
     ↓ (POST /parcels with file)
┌─ Valida JWT
├─ Faz upload da imagem
├─ Salva metadata no PostgreSQL
├─ Enfileira job em Redis (BullMQ)
└─ Retorna 201 Created
     ↓
BullMQ Worker (Render)
     ├─ Comprime imagem
     ├─ Gera thumbnail
     └─ Envia notificação (multi-canal)
     ↓
Notificação enviada via:
├─ Email (Resend API) → Caixa postal usuário
├─ WhatsApp (Baileys) → +55 DDD morador
├─ Push (web-push + VAPID) → Browser
└─ In-app (WebSocket/Socket.IO) → Abas abertas
     ↓
✅ Usuário notificado por todos os canais
```

### 4️⃣ Relatório Financeiro (IA)

```
Browser
     ↓ (POST /ai/chat com pergunta)
Render API
     ↓
getAIConfig() → Escolhe provider
     ↓
┌────────────────────────┬─────────────────┐
│ Groq (gratuito)        │ OpenAI (pago)   │
│ 14.4K req/dia free     │ 5-30 USD/mês    │
│ llama-3.3-70b          │ gpt-4o-mini     │
│ ~200ms latência        │ ~500ms latência │
│ Escolhido se           │ Fallback se     │
│ GROQ_API_KEY existe    │ Groq indisponível
└────────────────────────┴─────────────────┘
     ↓
AI API (Groq)
     ↓ (stream análise)
Render recebe resposta + custos
     ↓
Salva resposta em PostgreSQL (Neon)
     ↓
Retorna ao Browser em tempo real
     ✅ Análise entregue
```

### 5️⃣ Monitoramento

```
┌─ Sentry (5K errors/month free)
│  ├─ Qualquer erro em Render
│  ├─ Capturado por Sentry.captureException()
│  ├─ Enviado para Sentry cloud
│  └─ Dashboard mostra erros em tempo real
│
├─ UptimeRobot (50 monitors free)
│  ├─ Ping para Render /health a cada 5 minutos
│  ├─ Se Render dormiu, requestq acorda (30-60s)
│  ├─ Se /health retorna erro, alerta enviado
│  └─ Dashboard mostra uptime histórico
│
└─ Logs
   ├─ Winston escreve em /app/logs (stdout)
   ├─ Render captura stdout
   └─ Acessível via Render dashboard
```

---

## 📊 MATRIZ: SERVIDOR → FINALIDADE → FREE IMPACT

| Servidor | Finalidade | Alternativa | Limite Free | Impacto | Quando Upgrade? |
|----------|-----------|-------------|------------|---------|-----------------|
| **Vercel** | Servir Web + Mobile | Netlify, Cloudflare Pages | 100GB BW/mês | ✅ Suficiente | 1000+ users |
| **Render** | Rodar API Node.js | Railway, Fly.io | 512MB RAM + sleep | ⚠️ Sleep 15min | 200+ users simultâneos |
| **Neon** | PostgreSQL | Supabase, Railway | 512MB storage | ✅ 5+ anos dados | 1000+ rows/tabela |
| **Upstash** | Redis cache/queue | Redis Cloud | 10K req/dia | ⚠️ Use MemStore | 100K+ cache hits/dia |
| **MongoDB Atlas** | Sessões WhatsApp | Neon (PostgreSQL) | 512MB storage | ✅ Suficiente | 1000+ sessions ativas |
| **Resend** | Email transacional | Brevo, Mailgun | 3K emails/mês | ✅ 300+ clientes | 10K+ emails/mês |
| **Groq** | IA queries | OpenAI | 14.4K req/dia | ✅ Ilimitado (rate) | Nunca (sempre free) |
| **Sentry** | Error monitoring | Rollbar, Datadog | 5K errors/mês | ✅ Suficiente | 100K+ errors/mês |
| **Cloudflare** | DNS + CDN + SSL | Route53, Akamai | Ilimitado | ✅ Ilimitado | Nunca (sempre free) |
| **UptimeRobot** | Monitoring + ping | Pingdom, Better Uptime | 50 monitores | ✅ 1 monitor é suficiente | Nunca (sempre free) |

---

## ⚡ CONECTIVIDADE: QUAL SERVIDOR FALA COM QUAL?

```
┌─────────────────────────────────────────────────────────────────────┐
│ CONEXÕES DE REDE (setas = comunicação)                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Browser              → Vercel (CDN, download HTML/CSS/JS)         │
│ Browser              → Render (HTTPS API calls)                    │
│ Vercel               → Render (internamente, rare)                 │
│                                                                     │
│ Render (API)         → Neon (PostgreSQL queries)                   │
│ Render (API)         → Upstash (Redis cache/queue)                 │
│ Render (API)         → MongoDB Atlas (Baileys sessions)            │
│ Render (API)         → Resend (email API calls)                    │
│ Render (API)         → Groq (AI API calls)                         │
│ Render (API)         → Sentry (error reporting)                    │
│ Render (API)         → Browser (WebSocket, push notify)            │
│                                                                     │
│ BullMQ Worker        → Neon (salvar job results)                   │
│ BullMQ Worker        → Upstash (dequeue jobs)                      │
│ BullMQ Worker        → MongoDB (save data)                         │
│ BullMQ Worker        → Resend/Baileys (enviar notificações)       │
│ BullMQ Worker        → web-push API (push notifications)           │
│                                                                     │
│ UptimeRobot          → Render /health (keep-alive ping)            │
│ UptimeRobot          → Sentry (send alerts se down)                │
│                                                                     │
│ Cloudflare           → Vercel (DNS A record)                       │
│ Cloudflare           → Render (DNS A record para API subdomain)    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔐 SEGURANÇA: COMO AS CHAVES FLUEM

```
Cada servidor precisa de uma "chave" para se conectar ao outro:

┌─────────────────────────────────────────────────────────────────┐
│ CHAVES GUARDADAS EM RENDER (variáveis de ambiente)             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ DATABASE_URL=postgresql://user:PASS@neon.tech/condosync        │
│                           ↑ SENHA ↑ (Render o guarda)          │
│                                                                 │
│ REDIS_URL=rediss://default:TOKEN@upstash.io:6379              │
│                                  ↑ TOKEN (Render o guarda)     │
│                                                                 │
│ MONGODB_URI=mongodb+srv://user:PASS@atlas.mongodb.net/db      │
│                                ↑ SENHA (Render o guarda)       │
│                                                                 │
│ RESEND_API_KEY=re_CHAVE_SECRETA_AQUI                           │
│                  ↑ Chave API (Render o guarda)                 │
│                                                                 │
│ GROQ_API_KEY=gsk_CHAVE_SECRETA_AQUI                            │
│              ↑ Chave API (Render o guarda)                     │
│                                                                 │
│ JWT_SECRET=VALOR_ALEATORIO_32_CHARS                            │
│            ↑ Usado para assinar tokens (Render o guarda)       │
│                                                                 │
│ SENTRY_DSN=https://xxx@sentry.io/yyy                           │
│            ↑ Endpoint para erros (Render o guarda)             │
│                                                                 │
│ VAPID_PRIVATE_KEY=isa6zWj41mZZ...                              │
│                   ↑ Chave para assinar push (Render guarda)    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

FLUXO SEGURO:
1. Você cria conta em Neon, gera DATABASE_URL
2. Copia DATABASE_URL inteira
3. Cola em Render dashboard → Environment Variables
4. Render armazena criptografado
5. Ao iniciar, Render injeta variável em memória
6. Código acessa via process.env.DATABASE_URL
7. Conexão estabelecida com SSL/TLS
8. Neon nunca sabe sua senha (só Render sabe)

SEGURANÇA:
✅ Chaves nunca em código (.env não commitado)
✅ Chaves criptografadas em Render
✅ Connexões com SSL/TLS
✅ JWT assinado (valida autenticidade)
✅ Nenhuma chave em logs públicos
```

---

## 💡 PERGUNTAS FREQUENTES

### P: Por que preciso de tantos servidores?

```
R: Não precisa! É apenas melhor prática em produção.

Alternativa "1 servidor para tudo":
└─ Railway: Roda API + PostgreSQL + Redis no mesmo dyno
   ├─ Simples: 1 variável (DATABASE_URL)
   ├─ Custo: Free 500h/mês (suficiente)
   └─ Tradeoff: Menos escalável depois

Mas nós separamos porque:
├─ Vercel para web (CDN global, sem cold start)
├─ Render para API (escalável independente)
├─ Neon para DB (backup automático)
├─ Upstash para cache (latência baixa)
└─ Especialização = performance melhor
```

### P: Render vai entrar em custo quando?

```
R: Render Free = 512MB RAM, hibernação após 15min

Quando fica caro?
├─ Se você tira hibernação: US$7/mês (Starter)
├─ Se escala para 1GB: US$14/mês (Standard)
└─ Se múltiplas instâncias: US$14+ cada

Para MVP (você):
├─ Deixa hibernação ligada (Free)
├─ UptimeRobot ping a cada 5min (mantém acordado)
└─ Custo: R$0/mês
```

### P: E se Upstash ficar caro?

```
R: Upstash Free = 10K req/dia

Se passar:
├─ Opção 1: Pagar Upstash pay-as-you-go (~US$5/mês)
├─ Opção 2: Trocar para Redis Cloud (30MB free, sem limite req)
└─ Opção 3: Usar MemStore (já implementado no código)

Seu código suporta todos os 3 automaticamente:
└─ Se REDIS_URL vazio → MemStore
└─ Se REDIS_URL presente → Redis
└─ Sem mudança de código
```

### P: Quanto tempo dormir Render?

```
R: Render hibernação automática:
├─ Após 15 minutos sem tráfego
├─ Acorda em ~30-60 segundos (cold start)
└─ Usuário vê lentidão naquele request

Para manter acordado:
├─ UptimeRobot ping a cada 5 minutos
├─ Qualquer request do usuário
└─ Resultado: Sempre acordado, sem sleep
```

### P: A Vercel pode ficar lenta?

```
R: Não. Vercel:
├─ Sem hibernação
├─ Sem cold start
├─ CDN global (distribuído mundo inteiro)
├─ Unlimited requests (100GB BW/mês)
└─ Resultado: Ultra rápido, sempre
```

### P: MongoDB Atlas pode virar pago?

```
R: MongoDB M0 (Free):
├─ Sempre gratuito
├─ 512MB storage
├─ 3 nós (alta disponibilidade)
├─ Sem limite de conexões
├─ Sem limite de requisições
└─ Nunca fica pago automaticamente

Você só pagaria se:
└─ Quiser trocar para M2 (2GB) manualmente
```

---

## 📈 CRESCIMENTO: LIMITES E QUANDO UPGRADE

```
┌──────────────────────────────────────────────────────────┐
│ CENÁRIOS DE CRESCIMENTO                                  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ 10 Clientes (1-50 moradores)                            │
│ ├─ Free tier aguenta: ✅ SIM                            │
│ ├─ Limite atingido: Nenhum                              │
│ └─ Custo: R$0/mês                                       │
│                                                          │
│ 50 Clientes (250 moradores)                             │
│ ├─ Free tier aguenta: ✅ SIM                            │
│ ├─ Limite atingido: Nenhum                              │
│ └─ Custo: R$0/mês                                       │
│                                                          │
│ 100 Clientes (500 moradores)                            │
│ ├─ Free tier aguenta: ✅ SIM (limite máximo confortável) │
│ ├─ Limite atingido: Nenhum                              │
│ └─ Custo: R$0/mês                                       │
│                                                          │
│ 200 Clientes (1K moradores)                             │
│ ├─ Free tier aguenta: ⚠️ BORDERLINE                     │
│ ├─ Limite atingido: CPU API (Render 512MB)              │
│ ├─ Opção 1: Upgrade Render para US$7/mês                │
│ ├─ Opção 2: Cache mais (Upstash ou Redis Cloud)         │
│ └─ Custo: US$7/mês                                      │
│                                                          │
│ 500 Clientes (2.5K moradores)                           │
│ ├─ Free tier aguenta: ❌ NÃO                            │
│ ├─ Limite atingido: RAM API + DB connections            │
│ ├─ Necessário: PostgreSQL upgrade (US$19/mês)           │
│ ├─ Necessário: Render upgrade (US$7/mês)                │
│ └─ Custo: US$26/mês (~R$130)                            │
│                                                          │
│ 1000 Clientes (5K moradores)                            │
│ ├─ Free tier aguenta: ❌ NÃO                            │
│ ├─ Limite atingido: Tudo (DB, RAM, BW)                  │
│ ├─ Necessário: PostgreSQL US$29/mês (100GB)             │
│ ├─ Necessário: Render Standard US$14/mês                │
│ ├─ Necessário: Upstash pay-as-you-go (~US$10/mês)       │
│ └─ Custo: US$53/mês (~R$265)                            │
│                                                          │
│ Fórmula: Receita estimada = Clientes × R$200            │
│                                                          │
│ 100 clientes = R$20.000/mês                             │
│ Custo: R$0 = Margem: 100% ✅                            │
│                                                          │
│ 500 clientes = R$100.000/mês                            │
│ Custo: R$130 = Margem: 99.87% ✅                        │
│                                                          │
│ 1000 clientes = R$200.000/mês                           │
│ Custo: R$265 = Margem: 99.87% ✅                        │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## ✅ RESUMO: PARA LEMBRAR

```
┌─────────────────────────────────────────────────────────┐
│ O ESSENCIAL                                             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 1. Cada servidor tem uma função específica              │
│    ├─ Vercel: Servir site + app                        │
│    ├─ Render: Rodar API                                │
│    ├─ Neon: Guardar dados (PostgreSQL)                 │
│    ├─ Upstash: Cache rápido (Redis)                    │
│    ├─ MongoDB: Sessões WhatsApp                        │
│    └─ Resend/Groq/Sentry: Serviços especializados     │
│                                                         │
│ 2. Todos se conectam via HTTPS + chaves API             │
│    └─ Render guarda todas as chaves (variáveis env)   │
│                                                         │
│ 3. Custo é ~R$0/mês até 100 clientes                    │
│    ├─ Depois, paga progressivo (US$7-50/mês)          │
│    └─ Receita compensa custo até 1000+ clientes       │
│                                                         │
│ 4. Performance é boa (latência <500ms)                  │
│    ├─ Exceto Render que dorme (mitigado com ping)     │
│    └─ Uptime é 99%+ (bom para MVP)                    │
│                                                         │
│ 5. Setup é ~7 horas (criar contas + deploy)            │
│    ├─ Mas isso é futura (quando tiver clientes)       │
│    └─ Agora continua dev local (R$0/mês)              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

**Próximo**: Quando tiver clientes reais, volta aqui e segue a checklist de setup!
