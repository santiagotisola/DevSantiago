import { Router, Request, Response } from "express";
import * as Sentry from "@sentry/node";
import { prisma } from "../../config/prisma";
import {
  authenticate,
  authorize,
  authorizeCondominium,
} from "../../middleware/auth";
import { validateRequest } from "../../utils/validateRequest";
import { z } from "zod";
import { io } from "../../server";
import { logger } from "../../config/logger";
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from "../../middleware/errorHandler";
import { NotificationService } from "../../notifications/notification.service";
import {
  scheduleEscalation,
  cancelEscalation,
  emitPanicUpdate,
  panicStatus,
} from "./panic.service";

const router = Router();
router.use(authenticate);

// Roles que monitoram/operam alertas (assumir atendimento, resolver, listar).
const STAFF_ROLES = [
  "DOORMAN",
  "CONDOMINIUM_ADMIN",
  "SYNDIC",
  "SUPER_ADMIN",
] as const;

// Trigger panic alert
router.post(
  "/",
  authorize(
    "DOORMAN",
    "CONDOMINIUM_ADMIN",
    "SYNDIC",
    "SUPER_ADMIN",
    "RESIDENT",
  ),
  authorizeCondominium,
  async (req: Request, res: Response) => {
    const schema = z
      .object({
        condominiumId: z.string().uuid(),
        notes: z.string().max(500).optional(),
        // Geolocalização best-effort. Par completo obrigatório:
        // ou ambos ausentes, ou ambos presentes.
        latitude: z.number().min(-90).max(90).optional(),
        longitude: z.number().min(-180).max(180).optional(),
      })
      .refine((d) => (d.latitude === undefined) === (d.longitude === undefined), {
        message: "latitude e longitude devem ser enviados juntos (ou nenhum)",
        path: ["latitude"],
      });
    const { condominiumId, notes, latitude, longitude } = validateRequest(
      schema,
      req.body,
    );
    const user = req.user!;

    // Cooldown anti-spam: um único alerta ativo por usuário/condomínio.
    const activeForUser = await prisma.panicAlert.findFirst({
      where: { condominiumId, triggeredBy: user.userId, resolvedAt: null },
      select: { id: true },
    });
    if (activeForUser) {
      throw new ConflictError(
        "Você já tem um alerta de pânico ativo. Aguarde o atendimento ou ele ser resolvido.",
      );
    }

    // Snapshot da unidade do disparador (no momento do disparo).
    const triggerMembership = await prisma.condominiumUser.findFirst({
      where: { userId: user.userId, condominiumId, isActive: true },
      select: { unitId: true },
    });

    const alert = await prisma.panicAlert.create({
      data: {
        condominiumId,
        triggeredBy: user.userId,
        notes,
        unitId: triggerMembership?.unitId ?? null,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
      },
    });

    // Broadcast via WebSocket only to condominium staff
    io.to(`condominium:${condominiumId}:staff`).emit("panic:alert", {
      alertId: alert.id,
      triggeredBy: user.userId,
      triggeredByName: user.name ?? "Usuário",
      condominiumId,
      triggeredAt: alert.createdAt,
    });

    // Agenda escalação. NOTA: falha no agendamento NÃO derruba o disparo —
    // o disparo do pânico é mais crítico que a escalação.
    try {
      await scheduleEscalation(alert.id);
    } catch (err) {
      logger.error(
        "Falha ao agendar escalonamento do pânico (alerta criado normalmente)",
        { err: err instanceof Error ? err.message : err, alertId: alert.id },
      );
      Sentry.captureException(err, {
        tags: { component: "panic", op: "scheduleEscalation" },
        extra: { alertId: alert.id, condominiumId },
      });
      // TODO: reconciliador futuro varre panic_alerts ativos sem job de
      // escalação agendado e re-agenda (RPO de escalação).
    }

    // Notify all residents/staff of the same unit + condominium staff
    const notifyTargets = await prisma.condominiumUser.findMany({
      where: {
        condominiumId,
        isActive: true,
        userId: { not: user.userId }, // Don't notify the person who triggered
        OR: [
          // Staff (porteiros, admin, síndico) — always notified
          { role: { in: ["DOORMAN", "CONDOMINIUM_ADMIN", "SYNDIC"] } },
          // Residents of the same unit
          ...(triggerMembership?.unitId
            ? [{ unitId: triggerMembership.unitId, role: "RESIDENT" as const }]
            : []),
        ],
      },
      select: { userId: true },
    });

    // Send push + in-app notification to all targets
    const triggeredByName = user.name ?? "Morador";
    await Promise.all(
      notifyTargets.map((m) =>
        NotificationService.enqueue({
          userId: m.userId,
          type: "PANIC",
          title: "🚨 ALERTA DE PÂNICO",
          message: `${triggeredByName} acionou o botão de pânico!`,
          data: { alertId: alert.id, condominiumId },
          channels: ["inapp", "push"],
        }).catch(() => {}),
      ),
    );

    logger.warn(
      `PÂNICO acionado por ${user.userId} no condomínio ${condominiumId} — ${notifyTargets.length} notificações enviadas`,
    );
    res.status(201).json({ success: true, data: alert });
  },
);

// Acknowledge ("assumir atendimento") — staff
router.post(
  "/:id/acknowledge",
  authorize(...STAFF_ROLES),
  async (req: Request, res: Response) => {
    const user = req.user!;

    const existing = await prisma.panicAlert.findUnique({
      where: { id: req.params.id },
      select: { id: true, condominiumId: true },
    });
    if (!existing) {
      throw new NotFoundError("Alerta não encontrado");
    }

    // Membership (super admin bypassa) — condominiumId vem do alerta.
    if (user.role !== "SUPER_ADMIN") {
      const membership = await prisma.condominiumUser.findFirst({
        where: {
          userId: user.userId,
          condominiumId: existing.condominiumId,
          isActive: true,
        },
        select: { id: true },
      });
      if (!membership) {
        throw new ForbiddenError("Acesso negado a este condomínio");
      }
    }

    // Update ATÔMICO — evita corrida entre dois operadores assumindo o
    // mesmo alerta. Só reconhece se ainda ativo (não ack, não resolvido).
    const result = await prisma.panicAlert.updateMany({
      where: {
        id: existing.id,
        condominiumId: existing.condominiumId,
        acknowledgedAt: null,
        resolvedAt: null,
      },
      data: { acknowledgedBy: user.userId, acknowledgedAt: new Date() },
    });

    if (result.count !== 1) {
      // Releitura para decidir o motivo exato.
      const fresh = await prisma.panicAlert.findUnique({
        where: { id: existing.id },
      });
      if (!fresh) throw new NotFoundError("Alerta não encontrado");
      if (fresh.resolvedAt) {
        throw new ConflictError("Este alerta já foi resolvido");
      }
      if (fresh.acknowledgedAt) {
        if (fresh.acknowledgedBy === user.userId) {
          // Idempotente — mesmo usuário já tinha assumido.
          return res.json({ success: true, data: fresh });
        }
        throw new ConflictError(
          "Este alerta já está sendo atendido por outro operador",
        );
      }
      throw new ConflictError("Não foi possível assumir o atendimento");
    }

    await cancelEscalation(existing.id); // otimização; guard atômico do worker é a proteção real
    const alert = await prisma.panicAlert.findUnique({
      where: { id: existing.id },
    });
    if (alert) emitPanicUpdate(alert);
    res.json({ success: true, data: alert });
  },
);

// Resolve panic alert
router.post(
  "/:id/resolve",
  authorize(...STAFF_ROLES),
  async (req: Request, res: Response) => {
    const schema = z.object({ notes: z.string().max(500).optional() });
    const { notes } = validateRequest(schema, req.body);
    const user = req.user!;

    const existing = await prisma.panicAlert.findUnique({
      where: { id: req.params.id },
      select: { id: true, condominiumId: true, resolvedAt: true },
    });
    if (!existing) {
      throw new NotFoundError("Alerta não encontrado");
    }

    // H1 — impede sobrescrever resolução já realizada (mantém contrato 409).
    if (existing.resolvedAt) {
      throw new ConflictError("Este alerta já foi resolvido");
    }

    if (user.role !== "SUPER_ADMIN") {
      const membership = await prisma.condominiumUser.findFirst({
        where: {
          userId: user.userId,
          condominiumId: existing.condominiumId,
          isActive: true,
        },
        select: { id: true },
      });
      if (!membership) {
        throw new ForbiddenError("Acesso negado a este condomínio");
      }
    }

    const alert = await prisma.panicAlert.update({
      where: { id: existing.id },
      data: {
        resolvedBy: user.userId,
        resolvedAt: new Date(),
        notes: notes ?? undefined,
      },
    });

    await cancelEscalation(existing.id);
    emitPanicUpdate(alert);
    res.json({ success: true, data: alert });
  },
);

// List alerts for a condominium (staff only — coords só aparecem aqui)
router.get(
  "/:condominiumId",
  authorize(...STAFF_ROLES),
  authorizeCondominium,
  async (req: Request, res: Response) => {
    const alerts = await prisma.panicAlert.findMany({
      where: { condominiumId: req.params.condominiumId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Enrich with user names (lookup em lote — sem N+1).
    const userIds = [
      ...new Set(
        [
          ...alerts.map((a) => a.triggeredBy),
          ...alerts.filter((a) => a.resolvedBy).map((a) => a.resolvedBy as string),
          ...alerts
            .filter((a) => a.acknowledgedBy)
            .map((a) => a.acknowledgedBy as string),
        ],
      ),
    ];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    });
    const userMap = Object.fromEntries(users.map((u) => [u.id, u.name]));

    // Enrich with unit info (from condominiumUser membership)
    const triggeredByIds = [...new Set(alerts.map((a) => a.triggeredBy))];
    const memberships = await prisma.condominiumUser.findMany({
      where: {
        userId: { in: triggeredByIds },
        condominiumId: req.params.condominiumId,
        isActive: true,
      },
      select: {
        userId: true,
        role: true,
        unit: { select: { identifier: true, block: true } },
      },
    });
    const membershipMap = Object.fromEntries(
      memberships.map((m) => [m.userId, { role: m.role, unit: m.unit }]),
    );

    const enriched = alerts.map((a) => ({
      ...a, // inclui acknowledgedAt, acknowledgedBy, escalatedAt, unitId, latitude, longitude
      status: panicStatus(a),
      triggeredByName: userMap[a.triggeredBy] ?? "Usuário desconhecido",
      resolvedByName: a.resolvedBy
        ? (userMap[a.resolvedBy] ?? "Usuário desconhecido")
        : null,
      acknowledgedByName: a.acknowledgedBy
        ? (userMap[a.acknowledgedBy] ?? "Usuário desconhecido")
        : null,
      triggeredByRole: membershipMap[a.triggeredBy]?.role ?? null,
      triggeredByUnit: membershipMap[a.triggeredBy]?.unit ?? null,
    }));

    res.json({ success: true, data: enriched });
  },
);

export default router;
