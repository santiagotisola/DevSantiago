# 📐 ARQUITETURA - Módulo WhatsApp MVP

**Data**: 15 de maio de 2026  
**Versão**: 1.0 MVP  
**Status**: ✅ Pronto para implementação

---

## 🏗️ DIAGRAMA ARQUITETURAL

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         MUNDO EXTERNO                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  WhatsApp Web/Desktop                                                  │
│  (Número dedicado para bot)                                            │
│  📱 +55 11 9999-9999                                                   │
│                                                                         │
└──────────────────────────┬──────────────────────────────────────────────┘
                           │
                           │ WebSocket + Baileys SDK
                           │ (conexão 24/7)
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              API CondoSync (Node.js + Express)                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────┐           │
│  │  modules/whatsapp/                                      │           │
│  │  ├─ whatsapp.routes.ts          [6 endpoints]         │           │
│  │  ├─ whatsapp.controller.ts       [6 handlers]         │           │
│  │  ├─ services/                                          │           │
│  │  │   ├─ baileys.service.ts       [Conexão WA]         │           │
│  │  │   ├─ visitante.service.ts     [Integração DB]      │           │
│  │  │   └─ notificacao.service.ts   [Notificar morador]  │           │
│  │  ├─ flows/                                             │           │
│  │  │   └─ processor.flow.ts        [Máquina 4 estados]  │           │
│  │  ├─ models/                                            │           │
│  │  │   ├─ whatsapp-session.schema.ts  [MongoDB]         │           │
│  │  │   └─ whatsapp-message.schema.ts  [Histórico]       │           │
│  │  ├─ types/                                             │           │
│  │  │   ├─ whatsapp.types.ts        [Interfaces]         │           │
│  │  │   └─ session.types.ts         [Session DTO]        │           │
│  │  ├─ dto/                                               │           │
│  │  │   └─ whatsapp.dto.ts          [Zod schemas]        │           │
│  │  └─ utils/                                             │           │
│  │      ├─ qrcode.util.ts           [Gerar QR]           │           │
│  │      └─ logger.ts                [Logs]               │           │
│  └─────────────────────────────────────────────────────────┘           │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────┐          │
│  │  Middleware & Middlewares Existentes                    │          │
│  │  ├─ authenticate (JWT verificação)                      │          │
│  │  ├─ authorize (roles: ADMIN, DOORMAN, etc)             │          │
│  │  └─ errorHandler (respostas padronizadas)              │          │
│  └──────────────────────────────────────────────────────────┘          │
│                                                                         │
│  🔌 Integração com módulos existentes:                                 │
│  ├─ modules/visitors    (criar visitante)                  │          │
│  ├─ modules/units       (validar unidades)                 │          │
│  ├─ modules/residents   (notificar morador)               │          │
│  └─ modules/auth        (JWT + roles)                      │          │
│                                                                         │
└────────┬──────────────┬────────────────┬──────────────────────────────┘
         │              │                │
         ▼              ▼                ▼
    ┌─────────┐   ┌─────────┐     ┌──────────┐
    │ MongoDB │   │PostgreSQL    │  Redis   │
    │ (novo)  │   │ (existente)  │ (existe) │
    │         │   │              │          │
    │ Sessions│   │ Visitantes   │ Cache +  │
    │ Msgs    │   │ Visitas      │ Rate     │
    └─────────┘   │ Moradores    │ Limit    │
                  │ Unidades     │          │
                  └──────────────┘          │
                                            └──────────────┘
```

---

## 🗂️ ESTRUTURA DE ARQUIVOS

```
apps/api/src/modules/whatsapp/
│
├── 📄 whatsapp.routes.ts
│   └─ Definições de rota
│   └─ 6 endpoints: iniciar, status, qr, sessões, send, webhook
│
├── 📄 whatsapp.controller.ts
│   └─ Handlers HTTP
│   └─ Validação de input
│   └─ Resposta padronizada
│
├── 📄 whatsapp.service.ts
│   └─ Orquestração de lógica
│   └─ Coordena flows + services
│
├── 📁 services/
│   ├── baileys.service.ts
│   │   └─ initBaileyConnection()
│   │   └─ getSocket()
│   │   └─ disconnectWhatsApp()
│   │   └─ Event handlers (messages, connection)
│   │
│   ├── visitante.service.ts
│   │   └─ buscarOuCriarVisitante()
│   │   └─ criarVisita()
│   │   └─ listarUnidades()
│   │   └─ Integração com modules/visitors
│   │
│   └── notificacao.service.ts
│       └─ notificarMoradorNovaVisita()
│       └─ notificarMoradorAtualizacao()
│
├── 📁 flows/
│   ├── processor.flow.ts
│   │   └─ procesarMensagem(telefone, msg)
│   │   └─ Máquina de 4 estados
│   │   └─ Lógica de transição
│   │   └─ criarVisitacao()
│   │
│   ├── flow.inicio.ts (futura separação)
│   ├── flow.identificacao.ts
│   ├── flow.unidade.ts
│   └── flow.motivo.ts
│
├── 📁 models/
│   ├── whatsapp-session.schema.ts
│   │   └─ MongoDB: Sessão ativa
│   │   └─ TTL: 24h
│   │   └─ Campos: phone, estado, dadosParciais
│   │
│   └── whatsapp-message.schema.ts
│       └─ MongoDB: Histórico de msgs
│       └─ Campos: sessionId, direcao, conteudo
│
├── 📁 types/
│   ├── whatsapp.types.ts
│   │   └─ interface IWhatsAppSession
│   │   └─ interface IWhatsAppMessage
│   │   └─ type Estado = "inicio" | "identificacao" | ...
│   │
│   └── session.types.ts
│       └─ type SessionData
│       └─ type DadosParciais
│
├── 📁 dto/
│   └── whatsapp.dto.ts
│       └─ Zod schemas para validação
│       └─ schema: EnviarMensagemDTO
│       └─ schema: ReceberMensagemDTO
│
├── 📁 utils/
│   ├── qrcode.util.ts
│   │   └─ gerarQRCode()
│   │   └─ salvarQREmRedis()
│   │   └─ gerarQRDataURL()
│   │
│   ├── parser.util.ts
│   │   └─ extrairNumero()
│   │   └─ normalizarTelefone()
│   │   └─ validarTelefone()
│   │
│   └── logger.ts
│       └─ logWhatsApp()
│       └─ Estruturado: [timestamp] [level] [mensagem]
│
├── 📄 whatsapp-auth/
│   └─ Pasta auto-criada por Baileys
│   └─ Armazena sessão persistente
│   └─ NÃO commitar (add .gitignore)
│
└── 📄 index.ts
    └─ Exportar públicos
    └─ export { whatsappRoutes }
    └─ export { initBaileyConnection }
```

---

## 🔄 FLUXO DE DADOS

### Mensagem Recebida

```
WhatsApp
    │
    ├─ Baileys intercepta
    │
    ▼
Socket event: messages.upsert
    │
    ├─ Extrair: telefone, mensagem
    │
    ▼
POST /api/v1/whatsapp/webhook
    │
    ├─ Validar rate limit (Redis)
    │
    ▼
processor.flow.ts: procesarMensagem()
    │
    ├─ Buscar sessão (MongoDB)
    │   └─ Se não existe → criar nova
    │
    ├─ Determinar estado atual
    │   └─ inicio, identificacao, unidade, motivo
    │
    ├─ Processar input conforme estado
    │   └─ Validar input (ex: unidade existe?)
    │   └─ Atualizar dadosParciais
    │
    ├─ Determinar próximo estado
    │   └─ E enviar resposta apropriada
    │
    ├─ SE pronto → criarVisitacao()
    │   ├─ buscarOuCriarVisitante() [PostgreSQL]
    │   ├─ criarVisita() [PostgreSQL]
    │   └─ notificarMorador() [Push/Email]
    │
    ├─ Salvar sessão (MongoDB)
    │
    └─ Enviar resposta via Baileys
          │
          └─ WhatsApp envia para visitante
```

### Conexão WhatsApp

```
POST /api/v1/whatsapp/iniciar (admin)
    │
    ├─ Autorizar (JWT + role)
    │
    ▼
baileys.service.ts: initBaileyConnection()
    │
    ├─ Gerar QR code
    │   ├─ Salvar em Redis (5 min TTL)
    │   └─ Mostrar no terminal (printQRInTerminal)
    │
    ├─ Aguardar escan do celular
    │
    ├─ Conexão estabelecida
    │   ├─ Salvar credentials (auto, pasta whatsapp-auth)
    │   └─ Status → "conectado"
    │
    └─ Socket pronto para enviar/receber mensagens
```

---

## 🔑 ESTADOS DA MÁQUINA

```
Estados: 4

┌──────────────────────────────────────────────────────────┐
│ ESTADO: "inicio"                                         │
├──────────────────────────────────────────────────────────┤
│ Input: "1", "2", "3"                                     │
│ Resposta: Menu com 3 opções                             │
│ Próximo: "identificacao" (se "1")                       │
│ Dados coletados: nenhum                                 │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ ESTADO: "identificacao"                                  │
├──────────────────────────────────────────────────────────┤
│ Input: Qualquer texto (nome)                            │
│ Validação: min 3 chars, max 100 chars                   │
│ Resposta: "Qual unidade?"                               │
│ Próximo: "unidade"                                      │
│ Dados coletados: nome                                   │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ ESTADO: "unidade"                                        │
├──────────────────────────────────────────────────────────┤
│ Input: Número da unidade (ex: "501", "102")            │
│ Validação: Deve existir no condomínio                   │
│ Resposta: "Qual motivo?"                                │
│ Próximo: "motivo"                                       │
│ Dados coletados: nome + unidade                         │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ ESTADO: "motivo"                                         │
├──────────────────────────────────────────────────────────┤
│ Input: "1", "2", "3", "4"                               │
│ Validação: Número válido                                │
│ Ação: Criar visitação (PostgreSQL)                      │
│ Resposta: "✅ Visitação registrada"                      │
│ Próximo: "inicio" (recomeçar)                           │
│ Dados coletados: nome + unidade + motivo                │
└──────────────────────────────────────────────────────────┘
```

---

## 🗄️ SCHEMA MONGODB

### Collection: whatsapp_sessions

```typescript
{
  _id: ObjectId,
  
  // Identificação
  phone: "5511999999999",           // E.164 sem +
  nome: "João Silva",
  
  // Estado atual
  estado: "motivo",                 // Uno dos 4 estados
  
  // Dados coletados parcialmente
  dadosParciais: {
    nome: "João Silva",
    unidade: "501",
    motivo: "Entrega"
  },
  
  // Rastreamento
  ultimaMensagem: ISODate(),
  criadoEm: ISODate(),
  atualizadoEm: ISODate(),
  
  // Flags
  ativo: true,
  
  // Referências
  visitorId: "uuid-postgres",       // Link Portaria/Visitantes
  ultimoTicketId: null,             // Se usar Jitbit
  
  // TTL para auto-delete (24h)
  // Index: db.whatsapp_sessions.createIndex({ "criadoEm": 1 }, { expireAfterSeconds: 86400 })
}
```

### Collection: whatsapp_messages

```typescript
{
  _id: ObjectId,
  
  // Referência session
  sessionId: "uuid-mongo",
  
  // Conteúdo
  direcao: "entrada",               // "entrada" ou "saida"
  conteudo: "Oi, preciso fazer uma visitação",
  tipo: "texto",                    // "texto", "imagem", "arquivo"
  
  // Metadata
  criadoEm: ISODate(),
  
  // Para imagens (future)
  mediaUrl: null,
}
```

---

## 🔌 ENDPOINTS

```
┌─────────────────────────────────────────────────────────┐
│ 1. Iniciar conexão WhatsApp                            │
├─────────────────────────────────────────────────────────┤
│ POST /api/v1/whatsapp/iniciar                          │
│ Auth: JWT (role: ADMIN)                                │
│ Response: { ok, status, mensagem }                    │
│                                                         │
│ 2. Obter status conexão                                │
├─────────────────────────────────────────────────────────┤
│ GET /api/v1/whatsapp/status                           │
│ Auth: Nenhuma (público)                                │
│ Response: { status, numero, qr_pendente }            │
│                                                         │
│ 3. Obter QR code                                       │
├─────────────────────────────────────────────────────────┤
│ GET /api/v1/whatsapp/qr                               │
│ Auth: Nenhuma (público)                                │
│ Response: { ok, qr: "data:image/png..." }            │
│                                                         │
│ 4. Listar sessões ativas                               │
├─────────────────────────────────────────────────────────┤
│ GET /api/v1/whatsapp/sessoes                          │
│ Auth: JWT (role: ADMIN)                                │
│ Response: { ok, total, sessoes }                      │
│                                                         │
│ 5. Detalhes de uma sessão                              │
├─────────────────────────────────────────────────────────┤
│ GET /api/v1/whatsapp/sessao/:phone                    │
│ Auth: JWT (role: ADMIN)                                │
│ Response: { ok, sessao }                              │
│                                                         │
│ 6. Enviar mensagem manual (admin/doorman)             │
├─────────────────────────────────────────────────────────┤
│ POST /api/v1/whatsapp/send                            │
│ Auth: JWT (role: ADMIN, DOORMAN)                      │
│ Body: { telefone, mensagem }                          │
│ Response: { ok, mensagem }                            │
│                                                         │
│ 7. Webhook receber mensagem (Baileys)                 │
├─────────────────────────────────────────────────────────┤
│ POST /api/v1/whatsapp/webhook                         │
│ Auth: Nenhuma (webhook)                                │
│ Body: { telefone, mensagem }                          │
│ Response: { ok }                                       │
│                                                         │
│ 8. Listar unidades do condomínio                       │
├─────────────────────────────────────────────────────────┤
│ GET /api/v1/whatsapp/unidades                         │
│ Auth: Nenhuma (público - dado para validar)           │
│ Response: { ok, total, unidades: ["501", "502"] }   │
└─────────────────────────────────────────────────────────┘
```

---

## 🔐 SEGURANÇA

```
Rate Limiting:
├─ Por telefone: 1 mensagem / 60s
├─ Global: 100 mensagens / min
└─ Redis key: whatsapp:rate:{phone}

Validações:
├─ Telefone: Formato E.164
├─ Nome: 3-100 caracteres, sem injections
├─ Unidade: Deve existir no BD
├─ Motivo: Apenas valores pré-definidos
└─ Zod: Validação em todas as entradas

Autenticação:
├─ JWT para endpoints admin
├─ Roles: SUPER_ADMIN, CONDOMINIUM_ADMIN, DOORMAN
├─ Webhook sem auth (apenas rate limit)
└─ CORS: Apenas domínios permitidos

Criptografia:
├─ Baileys: Credentials armazenadas em arquivo (seguro)
├─ MongoDB: Usar TLS em produção
└─ Senhas: Nunca logar em texto plano
```

---

## 📊 PERFORMANCE

```
Esperado (MVP):
├─ Response time: < 1s
├─ Processamento mensagem: 200-500ms
├─ Rate limit: 100 msgs/min
├─ Conexões simultâneas: 50+
└─ Uptime: 99%+

Monitoramento:
├─ Logs estruturados com timestamp
├─ Métricas: msgs/min, errors/min
├─ Alertas: disconnect, high latency
└─ Dashboard: (future) React admin panel

Escalabilidade:
├─ Horizontalmente: Usar Redis pub/sub para múltiplas instâncias
├─ Verticalmente: Aumentar RAM para MongoDB cache
└─ Async jobs: BullMQ para tarefas pesadas (notificações)
```

---

## 🚀 DEPLOYMENT

```
Homologação:
├─ docker-compose up
├─ MongoDB local
├─ Baileys auto-start
└─ FREE

Produção (future):
├─ Kubernetes (EKS/GKE)
├─ MongoDB Atlas ($57/mês)
├─ Baileys → Meta Cloud API (mais estável)
└─ +$15/mês custo extra
```

---

**Versão**: 1.0 MVP  
**Data**: 15/05/2026  
**Status**: ✅ Pronto para development
