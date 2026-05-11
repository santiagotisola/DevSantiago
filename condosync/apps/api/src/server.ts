// OpenTelemetry inicializa ANTES de qualquer outro import — auto-
// instrumentação precisa interceptar require() de módulos como
// http, express, ioredis. Side-effect import.
import './config/tracing';
import * as Sentry from '@sentry/node';

// Sentry deve ser inicializado antes de qualquer outro import.
// Driver por SENTRY_DSN (não NODE_ENV) — staging/preview também
// devem reportar. beforeSend remove PII conhecida.
if (process.env.SENTRY_DSN) {
  const SENSITIVE_KEYS = new Set([
    'password',
    'passwordhash',
    'currentpassword',
    'newpassword',
    'token',
    'refreshtoken',
    'accesstoken',
    'authorization',
    'cookie',
    'cpf',
    'phone',
    'gatewaykey',
    'gatewayconfig',
    'asaas-access-token',
  ]);
  const scrubObject = (obj: unknown): unknown => {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(scrubObject);
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(k.toLowerCase())) {
        result[k] = '[REDACTED]';
      } else if (v && typeof v === 'object') {
        result[k] = scrubObject(v);
      } else {
        result[k] = v;
      }
    }
    return result;
  };

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.request) {
        if (event.request.headers) {
          event.request.headers = scrubObject(
            event.request.headers,
          ) as Record<string, string>;
        }
        if (event.request.data) {
          event.request.data = scrubObject(event.request.data);
        }
        // delete em vez de cast `as never`: tipo-seguro e equivalente
        // em proteção (Sentry não envia campo ausente).
        delete event.request.cookies;
      }
      if (event.extra) {
        event.extra = scrubObject(event.extra) as Record<string, unknown>;
      }
      return event;
    },
  });
}

import "express-async-errors";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { bullConnection } from "./config/redis";
import jwt from "jsonwebtoken";

import { env } from "./config/env";
import { logger } from "./config/logger";
import { rateLimiter } from "./middleware/rateLimiter";
import { errorHandler } from "./middleware/errorHandler";
import { notFoundHandler } from "./middleware/notFoundHandler";
import { prisma } from "./config/prisma";
import { httpMetricsMiddleware, registry as metricsRegistry } from "./config/metrics";
import { requestContextMiddleware } from "./middleware/requestContext";
import type { JwtPayload } from "./middleware/auth";

// Workers em background são opcionais. Quando RUN_WORKERS=true (ou
// padrão por compat com setup atual), o processo da API também
// hospeda os workers BullMQ. Em produção, o ideal é rodar um
// processo separado (apps/api/src/worker.ts) e setar
// RUN_WORKERS=false aqui para isolar event loop.
import { registerWorkers, type WorkerHandles } from "./workers/registerWorkers";

// Rotas
import authRoutes from "./modules/auth/auth.routes";
import userRoutes from "./modules/users/user.routes";
import condominiumRoutes from "./modules/condominiums/condominium.routes";
import planRoutes from "./modules/plans/plan.routes";
import invitationRoutes from "./modules/invitations/invitation.routes";
import unitRoutes from "./modules/units/unit.routes";
import residentRoutes from "./modules/residents/resident.routes";
import visitorRoutes from "./modules/visitors/visitor.routes";
import parcelRoutes from "./modules/parcels/parcel.routes";
import vehicleRoutes from "./modules/vehicles/vehicle.routes";
import communicationRoutes from "./modules/communication/communication.routes";
import financeRoutes from "./modules/finance/finance.routes";
import maintenanceRoutes from "./modules/maintenance/maintenance.routes";
import commonAreaRoutes from "./modules/common-areas/commonArea.routes";
import reportRoutes from "./modules/reports/report.routes";
import dashboardRoutes from "./modules/dashboard/dashboard.routes";
import employeeRoutes from "./modules/employees/employee.routes";
import serviceProviderRoutes from "./modules/service-providers/serviceProvider.routes";
import webhookRoutes from "./modules/webhooks/asaas.routes";
import assemblyRoutes from "./modules/assemblies/assembly.routes";
import petRoutes from "./modules/pets/pet.routes";
import lostAndFoundRoutes from "./modules/lost-and-found/lost-and-found.routes";
import documentRoutes from "./modules/documents/document.routes";
import renovationRoutes from "./modules/renovations/renovation.routes";
import stockRoutes from "./modules/stock/stock.routes";
import ticketRoutes from "./modules/tickets/tickets.routes";
import galleryRoutes from "./modules/gallery/gallery.routes";
import aiRoutes from "./modules/ai/ai.routes";
import marketplaceRoutes from "./modules/marketplace/marketplace.routes";
import panicRoutes from "./modules/panic/panic.routes";
import visitorRecurrenceRoutes from "./modules/visitors/recurrence.routes";
import financeCategoryRoutes from "./modules/finance/financeCategories.routes";
import permissionsRoutes from "./modules/permissions/permissions.routes";
// Novos módulos Sprint 2
import visitorQRCodeRoutes from "./modules/visitor-qrcode/visitor-qrcode.routes";
import condominiumContractsRoutes from "./modules/condominium-contracts/condominium-contracts.routes";
import finesRoutes from "./modules/fines/fines.routes";
import collectionRulesRoutes from "./modules/collection-rules/collection-rules.routes";
import digitalSignageRoutes from "./modules/digital-signage/digital-signage.routes";
const app = express();
// Atrás de proxies (Railway/Nginx/VPS) — necessário para que req.ip,
// rate-limit por IP e logs reflitam o cliente real e não o proxy.
app.set("trust proxy", 1);
const httpServer = createServer(app);

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Socket.IO ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
export const io = new SocketIOServer(httpServer, {
  cors: {
    origin: env.CORS_ORIGINS.split(","),
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Redis adapter — sem isso, broadcasts (`io.to('condominium:X').emit`)
// só atingem sockets conectados na MESMA réplica que originou o
// emit. Em produção multi-réplica (Railway autoscale, k8s),
// notificações real-time (panic, parcels arrived, fines) ficam
// sticky/aleatórias.
//
// pubClient e subClient são conexões dedicadas (recomendado pela
// doc oficial — pub/sub em ioredis exige conexões separadas e
// nunca compartilhar com a app). Usamos bullConnection() factory
// que já tem retry/reconnect tratado.
const pubClient = bullConnection();
const subClient = pubClient.duplicate();
io.adapter(createAdapter(pubClient, subClient));
logger.info("Socket.IO Redis adapter inicializado");

io.use(async (socket, next) => {
  try {
    const authToken =
      typeof socket.handshake.auth?.token === "string"
        ? socket.handshake.auth.token
        : "";
    const headerValue =
      typeof socket.handshake.headers.authorization === "string"
        ? socket.handshake.headers.authorization
        : "";
    const tokenFromHeader = headerValue.startsWith("Bearer ")
      ? headerValue.slice(7)
      : "";
    const token = authToken || tokenFromHeader;

    if (!token) {
      return next(new Error("Unauthorized"));
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return next(new Error("Unauthorized"));
    }

    socket.data.userId = decoded.userId;
    next();
  } catch {
    next(new Error("Unauthorized"));
  }
});

io.on("connection", (socket) => {
  logger.info(`Socket conectado: ${socket.id}`);

  socket.on("join:user", (userId: string) => {
    if (!userId || userId !== socket.data.userId) {
      logger.warn(
        `Socket ${socket.id} tentou entrar em room de outro usuÃƒÆ’Ã‚Â¡rio`,
      );
      return;
    }
    socket.join(`user:${userId}`);
  });

  socket.on("join:condominium", async (condominiumId: string) => {
    const membership = await prisma.condominiumUser.findFirst({
      where: {
        userId: socket.data.userId,
        condominiumId,
        isActive: true,
      },
      select: { id: true, role: true },
    });
    if (!membership) {
      logger.warn(
        `Socket ${socket.id} sem vÃƒÆ’Ã‚Â­nculo tentou entrar no condomÃƒÆ’Ã‚Â­nio ${condominiumId}`,
      );
      return;
    }
    socket.join(`condominium:${condominiumId}`);
    if (
      ["DOORMAN", "CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"].includes(
        membership.role,
      )
    ) {
      socket.join(`condominium:${condominiumId}:staff`);
    }
  });

  socket.on("join:unit", async (unitId: string) => {
    const membership = await prisma.condominiumUser.findFirst({
      where: {
        userId: socket.data.userId,
        unitId,
        isActive: true,
      },
      select: { id: true, role: true },
    });
    if (!membership) {
      logger.warn(
        `Socket ${socket.id} sem vÃƒÆ’Ã‚Â­nculo tentou entrar na unidade ${unitId}`,
      );
      return;
    }
    socket.join(`unit:${unitId}`);
  });

  // Sala de conversa: o handler antes não existia. communication
  // emitia para `conversation:<id>` mas só `join:user/condominium/unit`
  // tinham handler — qualquer mensagem que chegasse à sala dependia
  // de um join não verificado pelo cliente. Agora o servidor valida
  // que o usuário é participante antes de permitir o join.
  socket.on(
    "join:conversation",
    async (conversationId: string, ack?: (ok: boolean) => void) => {
      try {
        if (typeof conversationId !== "string" || !conversationId) {
          ack?.(false);
          return;
        }
        const conv = await prisma.chatConversation.findUnique({
          where: { id: conversationId },
          select: { id: true, participants: true },
        });
        const userId = socket.data.userId as string;
        if (!conv || !conv.participants.includes(userId)) {
          logger.warn(
            { socketId: socket.id, conversationId, userId },
            "Socket sem participação tentou entrar em conversation",
          );
          ack?.(false);
          return;
        }
        socket.join(`conversation:${conversationId}`);
        ack?.(true);
      } catch (err) {
        logger.error({ err }, "Erro em join:conversation");
        ack?.(false);
      }
    },
  );

  socket.on("disconnect", () => {
    logger.info(`Socket desconectado: ${socket.id}`);
  });
});

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Middleware Global ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
app.use(helmet());
app.use(compression());
app.use(
  cors({
    origin: env.CORS_ORIGINS.split(","),
    credentials: true,
  }),
);
// Body limit default conservador (1MB). Antes era 10MB global, o
// que permitia DoS-amplification em /auth/login etc. Endpoints
// que aceitam payloads maiores (assembleias com opções extensas,
// imports) devem aplicar express.json({ limit: '10mb' })
// explicitamente como middleware da rota.
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(
  morgan("combined", {
    stream: { write: (message) => logger.info(message.trim()) },
  }),
);
// requestContextMiddleware ANTES de tudo: gera/herda X-Request-Id,
// abre AsyncLocalStorage que propaga para handlers + logger +
// Sentry. Subsequente middleware/handlers se beneficiam
// automaticamente.
app.use(requestContextMiddleware);
app.use(httpMetricsMiddleware);
app.use(rateLimiter);

// /metrics — endpoint de scrape Prometheus.
//
// Política fail-closed em produção:
//  - NODE_ENV=production + METRICS_TOKEN ausente → 503 (endpoint
//    ofline; não vaza inventário de routes/queues por descuido).
//  - METRICS_TOKEN definido → exige header X-Metrics-Token com
//    comparação constant-time.
//  - Em dev/test sem token → liberado (DX).
//
// Comparação por timingSafeEqual evita timing attack — mesmo um
// token de 16 chars dá poucas dezenas de microssegundos de
// diferença, mas vale o pattern correto.
import crypto from "node:crypto";

app.get("/metrics", async (req, res) => {
  const expectedToken = process.env.METRICS_TOKEN;
  const isProd = env.NODE_ENV === "production";

  if (isProd && !expectedToken) {
    logger.error(
      "/metrics chamado em produção sem METRICS_TOKEN configurado — fail-closed",
    );
    return res.status(503).json({ error: "metrics endpoint offline" });
  }

  if (expectedToken) {
    const got = String(req.headers["x-metrics-token"] ?? "");
    if (got.length !== expectedToken.length) {
      return res.status(401).end();
    }
    const ok = crypto.timingSafeEqual(
      Buffer.from(got),
      Buffer.from(expectedToken),
    );
    if (!ok) return res.status(401).end();
  }

  res.set("Content-Type", metricsRegistry.contentType);
  res.send(await metricsRegistry.metrics());
});

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Health Check ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
    environment: env.NODE_ENV,
  });
});

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Rotas da API ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
const API = "/api/v1";

app.use(`${API}/auth`, authRoutes);
app.use(`${API}/users`, userRoutes);
app.use(`${API}/condominiums`, condominiumRoutes);
app.use(`${API}/plans`, planRoutes);
app.use(`${API}/invitations`, invitationRoutes);
app.use(`${API}/units`, unitRoutes);
app.use(`${API}/residents`, residentRoutes);
app.use(`${API}/visitors`, visitorRoutes);
app.use(`${API}/parcels`, parcelRoutes);
app.use(`${API}/vehicles`, vehicleRoutes);
app.use(`${API}/communication`, communicationRoutes);
app.use(`${API}/finance`, financeRoutes);
app.use(`${API}/maintenance`, maintenanceRoutes);
app.use(`${API}/common-areas`, commonAreaRoutes);
app.use(`${API}/reports`, reportRoutes);
app.use(`${API}/dashboard`, dashboardRoutes);
app.use(`${API}/employees`, employeeRoutes);
app.use(`${API}/service-providers`, serviceProviderRoutes);
app.use(`${API}/webhooks`, webhookRoutes);
app.use(`${API}/assemblies`, assemblyRoutes);
app.use(`${API}/pets`, petRoutes);
app.use(`${API}/lost-and-found`, lostAndFoundRoutes);
app.use(`${API}/documents`, documentRoutes);
app.use(`${API}/renovations`, renovationRoutes);
app.use(`${API}/stock`, stockRoutes);
app.use(`${API}/tickets`, ticketRoutes);
app.use(`${API}/gallery`, galleryRoutes);
app.use(`${API}/ai`, aiRoutes);
app.use(`${API}/marketplace`, marketplaceRoutes);
app.use(`${API}/panic`, panicRoutes);
app.use(`${API}/visitor-recurrences`, visitorRecurrenceRoutes);
app.use(`${API}/finance-categories`, financeCategoryRoutes);
app.use(`${API}/permissions`, permissionsRoutes);
// Novos módulos Sprint 2
app.use(`${API}/visitor-qrcode`, visitorQRCodeRoutes);
app.use(`${API}/condominium-contracts`, condominiumContractsRoutes);
app.use(`${API}/fines`, finesRoutes);
app.use(`${API}/collection-rules`, collectionRulesRoutes);
app.use(`${API}/digital-signage`, digitalSignageRoutes);

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Error Handlers ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
app.use(notFoundHandler);
app.use(errorHandler);

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Start Server ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
const PORT = env.PORT || 3333;

// Hoisted (referenciado dentro do listen e do shutdown).
let workerHandles: WorkerHandles | null = null;

httpServer.listen(PORT, async () => {
  logger.info(`ÃƒÂ°Ã…Â¸Ã…Â¡Ã¢â€šÂ¬ CondoSync API rodando na porta ${PORT}`);
  logger.info(`ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã¢â‚¬Â¹ Ambiente: ${env.NODE_ENV}`);
  logger.info(`ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã‚Â URL: http://localhost:${PORT}`);
  // Default: roda workers no processo da API. Para isolar event
  // loop, setar RUN_WORKERS=false e rodar `node dist/worker.js`
  // como serviço sibling.
  const shouldRunWorkers = (process.env.RUN_WORKERS ?? "true") !== "false";
  if (shouldRunWorkers) {
    workerHandles = await registerWorkers();
  } else {
    logger.info("RUN_WORKERS=false — workers não registrados no processo da API");
  }
});

// ─── Graceful shutdown ────────────────────────────────────────
// Sem isso, SIGTERM (Railway/k8s rolling deploy, docker stop) corta
// requests in-flight, perde jobs BullMQ, e vaza conexões PG/Redis
// até o servidor expirá-las. Em fluxos financeiros o resultado é
// estado inconsistente.
let shuttingDown = false;
const shutdown = async (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`Iniciando graceful shutdown (signal=${signal})`);

  const forceTimeout = setTimeout(() => {
    logger.error("Graceful shutdown excedeu 25s — forçando exit");
    process.exit(1);
  }, 25_000);
  forceTimeout.unref();

  try {
    await new Promise<void>((resolve, reject) => {
      httpServer.close((err) => (err ? reject(err) : resolve()));
    });
    logger.info("HTTP server fechado");

    // disconnectSockets força clientes a reconectar imediatamente em
    // outra réplica em vez de aguardar timeout. Sem isso, httpServer
    // .close pode segurar 25s se houver Socket.IO transport long-poll.
    io.disconnectSockets(true);
    await new Promise<void>((resolve) => {
      io.close(() => resolve());
    });
    logger.info("Socket.IO fechado");

    if (workerHandles) {
      await workerHandles.close();
      logger.info("Workers BullMQ fechados");
    }

    await prisma.$disconnect();
    logger.info("Prisma desconectado");

    clearTimeout(forceTimeout);
    process.exit(0);
  } catch (err) {
    logger.error("Erro durante shutdown", err);
    clearTimeout(forceTimeout);
    process.exit(1);
  }
};

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

export default app;
