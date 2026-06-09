import { Router, Request, Response } from "express";
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

const router = Router();
router.use(authenticate);

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
    const schema = z.object({
      condominiumId: z.string().uuid(),
      notes: z.string().max(500).optional(),
    });
    const { condominiumId, notes } = validateRequest(schema, req.body);
    const user = req.user!;

    const alert = await prisma.panicAlert.create({
      data: {
        condominiumId,
        triggeredBy: user.userId,
        notes,
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

    // Notify all residents/staff of the same unit + condominium staff
    const triggerMembership = await prisma.condominiumUser.findFirst({
      where: { userId: user.userId, condominiumId, isActive: true },
      select: { unitId: true },
    });

    // Get all users in the same condominium who should be notified
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

// Resolve panic alert
router.post(
  "/:id/resolve",
  authorize("DOORMAN", "CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
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

    // H1 — impede sobrescrever resolução já realizada
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

    res.json({ success: true, data: alert });
  },
);

// List alerts for a condominium
router.get(
  "/:condominiumId",
  authorize("DOORMAN", "CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  authorizeCondominium,
  async (req: Request, res: Response) => {
    const alerts = await prisma.panicAlert.findMany({
      where: { condominiumId: req.params.condominiumId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Enrich with user names
    const userIds = [
      ...new Set([
        ...alerts.map((a) => a.triggeredBy),
        ...alerts.filter((a) => a.resolvedBy).map((a) => a.resolvedBy as string),
      ]),
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
      ...a,
      triggeredByName: userMap[a.triggeredBy] ?? "Usuário desconhecido",
      resolvedByName: a.resolvedBy ? (userMap[a.resolvedBy] ?? "Usuário desconhecido") : null,
      triggeredByRole: membershipMap[a.triggeredBy]?.role ?? null,
      triggeredByUnit: membershipMap[a.triggeredBy]?.unit ?? null,
    }));

    res.json({ success: true, data: enriched });
  },
);

export default router;
