# 📋 BACKLOG FASE 1 - WhatsApp MVP (2 semanas)

**Objetivo**: Integrar WhatsApp com módulo Portaria/Visitantes  
**Duração**: 10 dias úteis  
**Tecnologia**: Baileys (FREE) + MongoDB (docker)  
**Custo Homolog**: FREE  

---

## 📊 ROADMAP VISUAL

```
DIA 1-2: SETUP & INFRAESTRUTURA
├─ [1] MongoDB no docker-compose
├─ [2] Dependências npm (baileys, etc)
├─ [3] Variáveis de ambiente
└─ [4] Estrutura de pastas

DIA 3-4: BACKEND CORE
├─ [5] Serviço Baileys connection
├─ [6] Rotas WhatsApp API
├─ [7] Controller WhatsApp
└─ [8] Máquina de estados (4 estados básicos)

DIA 5-6: INTEGRAÇÃO PORTARIA
├─ [9] Service visitante/visita
├─ [10] Criar visita automática
├─ [11] Listar unidades do condomínio
└─ [12] Notificação ao morador

DIA 7-8: TESTES & VALIDAÇÃO
├─ [13] Testes endpoint WhatsApp
├─ [14] Fluxo completo (E2E manual)
├─ [15] Validar MongoDB persistence
└─ [16] Logs & debugging

DIA 9-10: DOCUMENTAÇÃO & DEPLOY HOMOLOG
├─ [17] README + instruções setup
├─ [18] Deploy docker compose homolog
├─ [19] Testes finais
└─ [20] Go-live MVP

Total: 20 tasks
```

---

## 🎯 TAREFAS DETALHADAS

### SPRINT 1: Setup (Dias 1-2)

#### [1] MongoDB no docker-compose ✅
**Prioridade**: 🔴 CRÍTICA  
**Tempo**: 1h  
**Responsável**: DevOps/Backend

```yaml
# Adicionar a docker-compose.yml existente:

services:
  mongodb:
    image: mongo:7-alpine
    container_name: condosync-mongodb
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: admin123
      MONGO_INITDB_DATABASE: condosync-whatsapp
    volumes:
      - mongo-data:/data/db
    networks:
      - condosync-network
    healthcheck:
      test: echo 'db.runCommand("ping").ok' | mongosh -u admin -p admin123 --quiet
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  mongo-data:

networks:
  condosync-network:
    driver: bridge
```

**Validação**: `docker-compose up mongodb && mongosh -u admin -p admin123`

---

#### [2] Instalar dependências npm ✅
**Prioridade**: 🔴 CRÍTICA  
**Tempo**: 30min  
**Responsável**: Backend

```bash
cd apps/api

npm install \
  @whiskeysockets/baileys@^7.0.0-rc.9 \
  qrcode@^1.5.4 \
  qrcode-terminal@^0.12.0 \
  mongoose@^9.3.3 \
  sharp@^0.34.5 \
  node-cron@^4.2.1

# Verificar
npm ls @whiskeysockets/baileys mongoose
```

**Arquivo**: `apps/api/package.json` (update)

---

#### [3] Variáveis de ambiente ✅
**Prioridade**: 🟡 IMPORTANTE  
**Tempo**: 30min  
**Responsável**: DevOps

```env
# apps/api/.env (adicionar)

# ═════════════════════════════════════
# MongoDB - WhatsApp Sessions
# ═════════════════════════════════════
MONGODB_URI=mongodb://admin:admin123@localhost:27017/condosync-whatsapp?authSource=admin

# ═════════════════════════════════════
# WhatsApp Baileys
# ═════════════════════════════════════
WHATSAPP_ENABLED=true
WHATSAPP_CONDOMINIUM_ID=1  # ID do condomínio padrão
WHATSAPP_SESSION_TIMEOUT=86400  # 24h em segundos
WHATSAPP_MAX_RETRIES=3

# ═════════════════════════════════════
# OpenAI (deixar em branco por enquanto)
# ═════════════════════════════════════
OPENAI_API_KEY=
```

**Arquivo**: `apps/api/.env`

---

#### [4] Estrutura de pastas ✅
**Prioridade**: 🔴 CRÍTICA  
**Tempo**: 1h  
**Responsável**: Backend

```
apps/api/src/modules/whatsapp/
├── whatsapp.routes.ts              # Rotas (GET, POST)
├── whatsapp.controller.ts          # Handlers HTTP
├── whatsapp.service.ts             # Lógica de negócio
├── services/
│   ├── baileys.service.ts          # Conexão WhatsApp
│   ├── visitante.service.ts        # Integração Portaria
│   └── sessao.service.ts           # Gerenciar sessões
├── models/
│   ├── whatsapp-session.schema.ts  # MongoDB schema
│   └── whatsapp-message.schema.ts  # Histórico mensagens
├── flows/
│   ├── flow.initial.ts             # Estado: inicio
│   ├── flow.identificacao.ts       # Estado: identificacao
│   ├── flow.unidade.ts             # Estado: unidade
│   └── flow.motivo.ts              # Estado: motivo
├── types/
│   ├── whatsapp.types.ts           # Interfaces
│   └── session.types.ts            # tipos Session
├── dto/
│   └── whatsapp.dto.ts             # Zod schemas
└── utils/
    ├── qrcode.util.ts              # Gerar QR code
    └── parser.util.ts              # Parse mensagens
```

**Comando**:
```bash
mkdir -p apps/api/src/modules/whatsapp/{services,models,flows,types,dto,utils}
```

---

### SPRINT 2: Backend Core (Dias 3-4)

#### [5] Serviço Baileys Connection ✅
**Prioridade**: 🔴 CRÍTICA  
**Tempo**: 3h  
**Responsável**: Backend

```typescript
// apps/api/src/modules/whatsapp/services/baileys.service.ts

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import qrcode from "qrcode";
import qrcodeTerminal from "qrcode-terminal";

let sock = null;
let qrCodeData = null;
let connectionStatus = "desconectado";

export async function initBaileyConnection() {
  const { state, saveCreds } = await useMultiFileAuthState("src/whatsapp-auth");
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true, // QR no terminal
    logger: pino({ level: "silent" }), // Sem logs
  });

  // Event: Credentials updated
  sock.ev.on("creds.update", saveCreds);

  // Event: Connection update
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      qrCodeData = qr;
      // Gerar QR code para API
      const qrImage = await qrcode.toDataURL(qr);
      console.log("📱 QR Code atualizado");
      // Salvar em Redis para API consumir
      await redis.set("whatsapp:qr:code", qrImage, "EX", 300); // 5 min
    }

    if (connection === "open") {
      connectionStatus = "conectado";
      console.log("✅ WhatsApp conectado!");
    } else if (connection === "close") {
      const reason = new Boom(lastDisconnect?.error).output?.statusCode;
      if (reason === DisconnectReason.loggedOut) {
        console.log("❌ WhatsApp desconectado (logout)");
        connectionStatus = "desconectado";
      }
    }
  });

  // Event: New messages
  sock.ev.on("messages.upsert", async (m) => {
    const msg = m.messages[0];
    if (!msg.message) return;

    console.log(`📨 ${msg.pushName}: ${msg.body}`);
    // Processar mensagem (ver próxima tarefa)
  });

  return sock;
}

export function getSocket() {
  return sock;
}

export function getQRCode() {
  return qrCodeData;
}

export function getConnectionStatus() {
  return connectionStatus;
}

export async function disconnectWhatsApp() {
  if (sock) {
    await sock.logout();
    sock = null;
    connectionStatus = "desconectado";
  }
}
```

**Arquivo**: `apps/api/src/modules/whatsapp/services/baileys.service.ts`

---

#### [6] Rotas WhatsApp API ✅
**Prioridade**: 🔴 CRÍTICA  
**Tempo**: 1.5h  
**Responsável**: Backend

```typescript
// apps/api/src/modules/whatsapp/whatsapp.routes.ts

import { Router } from "express";
import { authenticate, authorize } from "@/middlewares";
import {
  iniciarConexao,
  statusConexao,
  listarSessoes,
  detalhesSessao,
  enviarManual,
} from "./whatsapp.controller";

export const whatsappRoutes = Router();

// Público (teste)
whatsappRoutes.get("/status", statusConexao);
whatsappRoutes.get("/qr", getQRCode); // GET QR code em base64

// Protegido (admin)
whatsappRoutes.post(
  "/iniciar",
  authenticate,
  authorize(["SUPER_ADMIN", "CONDOMINIUM_ADMIN"]),
  iniciarConexao
);

whatsappRoutes.get(
  "/sessoes",
  authenticate,
  authorize(["SUPER_ADMIN", "CONDOMINIUM_ADMIN"]),
  listarSessoes
);

whatsappRoutes.get(
  "/sessao/:phone",
  authenticate,
  authorize(["SUPER_ADMIN", "CONDOMINIUM_ADMIN"]),
  detalhesSessao
);

// Webhook (receber mensagens)
whatsappRoutes.post("/webhook", receberMensagem); // sem auth

// Enviar manual
whatsappRoutes.post(
  "/send",
  authenticate,
  authorize(["DOORMAN", "ADMIN"]),
  enviarManual
);
```

**Arquivo**: `apps/api/src/modules/whatsapp/whatsapp.routes.ts`

---

#### [7] Controller WhatsApp ✅
**Prioridade**: 🟡 IMPORTANTE  
**Tempo**: 2h  
**Responsável**: Backend

```typescript
// apps/api/src/modules/whatsapp/whatsapp.controller.ts

import {
  initBaileyConnection,
  getSocket,
  getQRCode,
  getConnectionStatus,
} from "./services/baileys.service";
import { WhatsAppSessionModel } from "./models/whatsapp-session.schema";
import { procesarMensagem } from "./flows/processor.flow";

// POST /api/v1/whatsapp/iniciar
export async function iniciarConexao(req, res) {
  try {
    const sock = getSocket();
    if (sock && getConnectionStatus() === "conectado") {
      return res.status(400).json({
        ok: false,
        error: "WhatsApp já está conectado",
      });
    }

    await initBaileyConnection();
    res.json({
      ok: true,
      mensagem: "Iniciando WhatsApp... Escaneie o QR code no terminal",
      status: "qr_pendente",
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
}

// GET /api/v1/whatsapp/status
export async function statusConexao(req, res) {
  const status = getConnectionStatus();
  const qr = getQRCode();
  const sock = getSocket();
  const numero = sock?.user?.id?.split(":")[0];

  res.json({
    status,
    numero: numero ? `55${numero}` : null,
    qr_pendente: !!qr,
  });
}

// GET /api/v1/whatsapp/qr
export async function getQRCodeEndpoint(req, res) {
  const qr = await redis.get("whatsapp:qr:code");
  if (!qr) {
    return res.status(404).json({ ok: false, error: "QR não disponível" });
  }
  res.json({ ok: true, qr });
}

// GET /api/v1/whatsapp/sessoes
export async function listarSessoes(req, res) {
  const sessoes = await WhatsAppSessionModel.find({ ativo: true }).limit(100);
  res.json({
    ok: true,
    total: sessoes.length,
    sessoes: sessoes.map((s) => ({
      phone: s.phone,
      nome: s.nome,
      estado: s.estado,
      ultimaMensagem: s.ultimaMensagem,
    })),
  });
}

// GET /api/v1/whatsapp/sessao/:phone
export async function detalhesSessao(req, res) {
  const { phone } = req.params;
  const sessao = await WhatsAppSessionModel.findOne({ phone });
  if (!sessao) {
    return res.status(404).json({ ok: false, error: "Sessão não encontrada" });
  }
  res.json({ ok: true, sessao });
}

// POST /api/v1/whatsapp/send
export async function enviarManual(req, res) {
  const { telefone, mensagem } = req.body;
  const sock = getSocket();

  if (!sock) {
    return res.status(400).json({
      ok: false,
      error: "WhatsApp não está conectado",
    });
  }

  try {
    const jid = telefone.includes("@whatsapp.net")
      ? telefone
      : `${telefone}@s.whatsapp.net`;

    await sock.sendMessage(jid, { text: mensagem });
    res.json({ ok: true, mensagem: "Enviado com sucesso" });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
}

// POST /api/v1/whatsapp/webhook (receber mensagens)
export async function receberMensagem(req, res) {
  const { telefone, mensagem } = req.body;
  
  // Validar rate limit
  const chaveRate = `whatsapp:rate:${telefone}`;
  const contador = await redis.incr(chaveRate);
  if (contador === 1) {
    await redis.expire(chaveRate, 60); // 1 msg/60s
  }
  if (contador > 1) {
    return res.status(429).json({ ok: false, error: "Rate limit" });
  }

  // Processar mensagem
  await procesarMensagem(telefone, mensagem);
  res.json({ ok: true });
}
```

**Arquivo**: `apps/api/src/modules/whatsapp/whatsapp.controller.ts`

---

#### [8] Máquina de Estados (4 estados básicos) ✅
**Prioridade**: 🔴 CRÍTICA  
**Tempo**: 2.5h  
**Responsável**: Backend

```typescript
// apps/api/src/modules/whatsapp/flows/processor.flow.ts

import { WhatsAppSessionModel } from "../models/whatsapp-session.schema";
import { getSocket } from "../services/baileys.service";
import { criarOuAtualizarVisitante } from "../services/visitante.service";

const ESTADOS = {
  INICIO: "inicio",
  IDENTIFICACAO: "identificacao",
  UNIDADE: "unidade",
  MOTIVO: "motivo",
};

const RESPOSTAS = {
  inicio: `🏢 Olá! Bem-vindo ao CondoSync.\n\n1️⃣  Abrir visitação\n2️⃣  Consultar status\n3️⃣  Falar com atendente\n\nDigite o número:`,
  
  identificacao: `📝 Qual é seu nome completo?`,
  
  unidade: `🏠 Qual é o número da unidade que vai visitar?\n\nExemplo: 501, 102, etc`,
  
  motivo: `🎯 Qual é o motivo da visitação?\n\n1️⃣  Entrega\n2️⃣  Visita social\n3️⃣  Reparo\n4️⃣  Outro\n\nDigite o número:`,
};

export async function procesarMensagem(telefone: string, mensagem: string) {
  // 1. Buscar ou criar sessão
  let sessao = await WhatsAppSessionModel.findOne({ phone: telefone });

  if (!sessao) {
    // Primeira mensagem - criar sessão
    sessao = await WhatsAppSessionModel.create({
      phone: telefone,
      nome: "Novo visitante",
      estado: ESTADOS.INICIO,
      ativo: true,
      ultimaMensagem: new Date(),
    });
  }

  // 2. Processar conforme estado
  let proximoEstado = sessao.estado;
  let resposta = "";

  switch (sessao.estado) {
    case ESTADOS.INICIO:
      if (mensagem.trim() === "1") {
        resposta = RESPOSTAS.identificacao;
        proximoEstado = ESTADOS.IDENTIFICACAO;
      } else if (mensagem.trim() === "2") {
        resposta = "📊 Status: não há visitações ativas";
      } else if (mensagem.trim() === "3") {
        resposta = "👨‍💼 Conectando com atendente...";
      } else {
        resposta = "❌ Opção inválida. " + RESPOSTAS.inicio;
      }
      break;

    case ESTADOS.IDENTIFICACAO:
      sessao.dadosParciais = {
        ...sessao.dadosParciais,
        nome: mensagem.trim(),
      };
      resposta = RESPOSTAS.unidade;
      proximoEstado = ESTADOS.UNIDADE;
      break;

    case ESTADOS.UNIDADE:
      // Validar se unidade existe
      const unidadeValida = await validarUnidade(mensagem.trim());
      if (!unidadeValida) {
        resposta =
          "❌ Unidade não encontrada. " + RESPOSTAS.unidade;
      } else {
        sessao.dadosParciais = {
          ...sessao.dadosParciais,
          unidade: mensagem.trim(),
        };
        resposta = RESPOSTAS.motivo;
        proximoEstado = ESTADOS.MOTIVO;
      }
      break;

    case ESTADOS.MOTIVO:
      const motivos = ["Entrega", "Visita social", "Reparo", "Outro"];
      const indiceMotivo = parseInt(mensagem) - 1;
      if (indiceMotivo >= 0 && indiceMotivo < motivos.length) {
        sessao.dadosParciais = {
          ...sessao.dadosParciais,
          motivo: motivos[indiceMotivo],
        };

        // Criar visitação
        await criarVisitacao(telefone, sessao.dadosParciais);

        resposta = `✅ Visitação registrada!\n\nDados:\n📝 Nome: ${sessao.dadosParciais.nome}\n🏠 Unidade: ${sessao.dadosParciais.unidade}\n🎯 Motivo: ${sessao.dadosParciais.motivo}\n\nAguardando confirmação do morador...`;
        proximoEstado = ESTADOS.INICIO; // Voltar ao menu
      } else {
        resposta = "❌ Opção inválida. " + RESPOSTAS.motivo;
      }
      break;
  }

  // 3. Atualizar sessão
  sessao.estado = proximoEstado;
  sessao.ultimaMensagem = new Date();
  await sessao.save();

  // 4. Enviar resposta
  const sock = getSocket();
  if (sock && resposta) {
    const jid = `${telefone}@s.whatsapp.net`;
    await sock.sendMessage(jid, { text: resposta });
  }
}

async function validarUnidade(numeroUnidade: string) {
  // TODO: Verificar em banco de dados
  return true; // Por enquanto aceitar todas
}

async function criarVisitacao(telefone: string, dados) {
  // TODO: Criar visita em Portaria/Visitantes
  console.log("📍 Criando visitação:", dados);
}
```

**Arquivo**: `apps/api/src/modules/whatsapp/flows/processor.flow.ts`

---

### SPRINT 3: Integração Portaria (Dias 5-6)

#### [9] Service Visitante/Visita ✅
**Prioridade**: 🔴 CRÍTICA  
**Tempo**: 2h  
**Responsável**: Backend

```typescript
// apps/api/src/modules/whatsapp/services/visitante.service.ts

import { prisma } from "@/lib/prisma";

export async function buscarOuCriarVisitante(telefone: string, nome: string) {
  // 1. Buscar por telefone
  let visitor = await prisma.visitor.findFirst({
    where: {
      phone: telefone,
      condominiumId: process.env.WHATSAPP_CONDOMINIUM_ID,
    },
  });

  // 2. Se não existe, criar
  if (!visitor) {
    visitor = await prisma.visitor.create({
      data: {
        name: nome,
        phone: telefone,
        email: `${telefone}@whatsapp.local`,
        condominiumId: process.env.WHATSAPP_CONDOMINIUM_ID,
        status: "ativo",
        documento: null, // Pode pedir depois
      },
    });
  }

  return visitor;
}

export async function criarVisita(
  visitorId: string,
  unitId: string,
  motivo: string
) {
  const visit = await prisma.visit.create({
    data: {
      visitorId,
      unitId,
      entryTime: new Date(),
      purpose: motivo,
      status: "aguardando_aprovacao", // Novo status
    },
  });

  return visit;
}

export async function listarUnidades() {
  const units = await prisma.unit.findMany({
    where: {
      condominiumId: process.env.WHATSAPP_CONDOMINIUM_ID,
    },
    select: {
      id: true,
      number: true,
      resident: true,
    },
  });

  return units;
}

export async function obterResidenteUnidade(unitId: string) {
  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    include: { resident: true },
  });

  return unit?.resident;
}
```

**Arquivo**: `apps/api/src/modules/whatsapp/services/visitante.service.ts`

---

#### [10] Criar Visita Automática ✅
**Prioridade**: 🟡 IMPORTANTE  
**Tempo**: 1.5h  
**Responsável**: Backend

Atualizar `processor.flow.ts`:

```typescript
// apps/api/src/modules/whatsapp/flows/processor.flow.ts (adicionar)

import {
  buscarOuCriarVisitante,
  criarVisita,
  obterResidenteUnidade,
} from "../services/visitante.service";

async function criarVisitacao(telefone: string, dados) {
  try {
    // 1. Buscar/criar visitante
    const visitante = await buscarOuCriarVisitante(
      telefone,
      dados.nome
    );

    // 2. Buscar unidade pelo número
    const unidades = await prisma.unit.findMany({
      where: {
        number: dados.unidade,
        condominiumId: process.env.WHATSAPP_CONDOMINIUM_ID,
      },
    });

    if (unidades.length === 0) {
      throw new Error("Unidade não encontrada");
    }

    const unidade = unidades[0];

    // 3. Criar visita
    const visit = await criarVisita(
      visitante.id,
      unidade.id,
      dados.motivo
    );

    // 4. Notificar morador
    const morador = await obterResidenteUnidade(unidade.id);
    if (morador?.user?.pushTokens?.length > 0) {
      // Enviar notificação push (future)
      console.log(`🔔 Notificando morador: ${morador.name}`);
    }

    return visit;
  } catch (error) {
    console.error("❌ Erro ao criar visitação:", error);
    throw error;
  }
}
```

---

#### [11] Listar Unidades ✅
**Prioridade**: 🟡 IMPORTANTE  
**Tempo**: 1h  
**Responsável**: Backend

Adicionar endpoint para listar unidades:

```typescript
// apps/api/src/modules/whatsapp/whatsapp.controller.ts (adicionar)

export async function listarUnidades(req, res) {
  const units = await prisma.unit.findMany({
    where: {
      condominiumId: process.env.WHATSAPP_CONDOMINIUM_ID,
    },
    select: {
      id: true,
      number: true,
    },
    orderBy: { number: "asc" },
  });

  res.json({
    ok: true,
    total: units.length,
    unidades: units.map((u) => u.number),
  });
}

// Adicionar rota
whatsappRoutes.get("/unidades", listarUnidades);
```

---

#### [12] Notificação ao Morador ✅
**Prioridade**: 🟡 IMPORTANTE  
**Tempo**: 1.5h  
**Responsável**: Backend

```typescript
// apps/api/src/modules/whatsapp/services/notificacao.service.ts

import { prisma } from "@/lib/prisma";

export async function notificarMoradorNovaVisita(visitId: string) {
  const visit = await prisma.visit.findUnique({
    where: { id: visitId },
    include: {
      visitor: true,
      unit: {
        include: {
          resident: {
            include: { user: true },
          },
        },
      },
    },
  });

  if (!visit?.unit?.resident?.user) {
    console.log("⚠️  Morador não possui user associado");
    return;
  }

  // Enviar notificação (implementar conforme sistema existente)
  const msg = `🚪 ${visit.visitor.name} deseja visitar seu apto ${visit.unit.number}\nMotivo: ${visit.purpose}`;

  console.log(`🔔 Enviando notificação ao ${visit.unit.resident.user.email}`);
  // TODO: Implementar envio de notificação (push, email, etc)
}
```

---

### SPRINT 4: Testes (Dias 7-8)

#### [13] Testes Endpoint WhatsApp ✅
**Prioridade**: 🔴 CRÍTICA  
**Tempo**: 2h  
**Responsável**: QA

```bash
# 1. Verificar status
curl http://localhost:3333/api/v1/whatsapp/status

# Esperado:
# {
#   "status": "desconectado",
#   "numero": null,
#   "qr_pendente": false
# }

# 2. Iniciar conexão
curl -X POST http://localhost:3333/api/v1/whatsapp/iniciar \
  -H "Authorization: Bearer TOKEN_AQUI" \
  -H "Content-Type: application/json"

# Esperado:
# {
#   "ok": true,
#   "mensagem": "Iniciando WhatsApp...",
#   "status": "qr_pendente"
# }

# 3. Listar unidades
curl http://localhost:3333/api/v1/whatsapp/unidades

# Esperado: Lista de números de unidades

# 4. Enviar mensagem manual
curl -X POST http://localhost:3333/api/v1/whatsapp/send \
  -H "Authorization: Bearer TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{"telefone":"5511999999999","mensagem":"Teste"}'
```

---

#### [14] Fluxo Completo E2E (Manual) ✅
**Prioridade**: 🔴 CRÍTICA  
**Tempo**: 2h  
**Responsável**: QA

1. Iniciar API: `npm start`
2. Iniciar conexão WhatsApp (escanear QR)
3. Enviar mensagem do celular para o número do bot
4. Verificar que bot responde com menu
5. Digitar "1" para abrir visitação
6. Seguir fluxo (nome, unidade, motivo)
7. Verificar que:
   - Sessão criada no MongoDB
   - Visitante criado em PostgreSQL
   - Visita criada com status `aguardando_aprovacao`
   - Resposta final confirmando dados

---

#### [15] MongoDB Persistence ✅
**Prioridade**: 🟡 IMPORTANTE  
**Tempo**: 1h  
**Responsável**: QA

```bash
# Conectar ao MongoDB
mongosh -u admin -p admin123 localhost:27017/condosync-whatsapp

# Verificar collections
show collections

# Listar sessões
db.whatsappsessions.find()

# Verificar que dados persistem após restart
```

---

#### [16] Logs & Debugging ✅
**Prioridade**: 🟡 IMPORTANTE  
**Tempo**: 1h  
**Responsável**: Backend

Adicionar logging estruturado:

```typescript
// apps/api/src/modules/whatsapp/utils/logger.ts

export function logWhatsApp(level: string, msg: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [WhatsApp] [${level}] ${msg}`, data || "");
}

// Uso:
// logWhatsApp("info", "Mensagem recebida", { telefone, msg });
// logWhatsApp("error", "Erro ao criar visita", error);
```

---

### SPRINT 5: Deploy (Dias 9-10)

#### [17] README + Setup ✅
**Prioridade**: 🟡 IMPORTANTE  
**Tempo**: 1.5h  
**Responsável**: Backend

Criar: `apps/api/docs/WHATSAPP_SETUP.md`

```markdown
# WhatsApp Integration - MVP Setup

## Pré-requisitos
- Node.js 18+
- MongoDB (docker)
- API CondoSync rodando

## Instalação

### 1. MongoDB
\`\`\`bash
docker-compose up mongodb
\`\`\`

### 2. Dependências
\`\`\`bash
cd apps/api
npm install
\`\`\`

### 3. Variáveis de Ambiente
\`\`\`env
MONGODB_URI=mongodb://admin:admin123@localhost:27017/condosync-whatsapp
WHATSAPP_ENABLED=true
\`\`\`

### 4. Iniciar
\`\`\`bash
npm start
\`\`\`

### 5. Conectar WhatsApp
- Chamar: `POST /api/v1/whatsapp/iniciar`
- Escanear QR code
- Bot pronto!

## Endpoints

...
```

---

#### [18] Deploy Docker Compose ✅
**Prioridade**: 🔴 CRÍTICA  
**Tempo**: 1h  
**Responsável**: DevOps

Atualizar `docker-compose.yml`:

```yaml
# docker-compose.yml (adicionar MongoDB + networks)

services:
  # ... serviços existentes ...

  mongodb:
    image: mongo:7-alpine
    container_name: condosync-mongodb
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: admin123
      MONGO_INITDB_DATABASE: condosync-whatsapp
    volumes:
      - mongo-data:/data/db
    networks:
      - condosync-network
    restart: unless-stopped

volumes:
  mongo-data:

networks:
  condosync-network:
    driver: bridge
```

```bash
docker-compose up -d
docker-compose ps
```

---

#### [19] Testes Finais ✅
**Prioridade**: 🔴 CRÍTICA  
**Tempo**: 1.5h  
**Responsável**: QA

Checklist:
- [ ] API inicia sem erros
- [ ] MongoDB conecta
- [ ] WhatsApp conecta (QR)
- [ ] Mensagens recebidas
- [ ] Fluxo completo funciona
- [ ] Dados persistem
- [ ] Sem memory leaks (monitor 10 min)

---

#### [20] Go-Live MVP ✅
**Prioridade**: 🟢 DONE  
**Tempo**: 30min  
**Responsável**: Tech Lead

```bash
# Final checklist
✅ Código mergeado para main
✅ Documentação completa
✅ Deploy homologação sucesso
✅ Todos testes passando
✅ Time treinado

# Comunicar à equipe
"🎉 MVP WhatsApp Go-Live!"
```

---

## 📊 DEPENDÊNCIAS

```
[1] → [2], [3], [4]
[5] → [6], [7]
[8] → [9], [10], [11], [12]
[13] → [14], [15], [16]
[17], [18], [19] → [20]
```

---

## 🎯 MÉTRICAS DE SUCESSO

```
✅ MVP completo em 2 semanas
✅ Zero bugs críticos
✅ Cobertura >= 80% testes
✅ Response time < 1s
✅ Documentação 100%
✅ Time 100% onboarded
```

---

**Status**: 📋 BACKLOG PRONTO  
**Data**: 15/05/2026  
**Total Tasks**: 20  
**Estimativa**: 40 horas / 2 devs = 2 semanas  

👉 **Próximo passo**: Começar [Tarefa 1] - MongoDB setup
