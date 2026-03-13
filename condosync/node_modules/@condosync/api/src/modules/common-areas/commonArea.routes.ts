import { Router, Request, Response } from "express";
import { prisma } from "../../config/prisma";
import { authenticate, authorize } from "../../middleware/auth";
import { validateRequest } from "../../utils/validateRequest";
import { z } from "zod";

const router = Router();
router.use(authenticate);

// ─── Áreas Comuns ─────────────────────────────────────────────
router.get(
  "/condominium/:condominiumId",
  async (req: Request, res: Response) => {
    const areas = await prisma.commonArea.findMany({
      where: { condominiumId: req.params.condominiumId, isActive: true },
      include: {
        _count: { select: { reservations: true } },
      },
    });
    res.json({ success: true, data: { areas } });
  },
);

router.post(
  "/",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const schema = z.object({
      condominiumId: z.string().uuid(),
      name: z.string().min(2),
      description: z.string().optional(),
      capacity: z.number().int().positive().optional(),
      rules: z.string().optional(),
      requiresApproval: z.boolean().optional(),
      maxDaysAdvance: z.number().int().min(1).max(90).optional(),
      openTime: z.string().optional(),
      closeTime: z.string().optional(),
    });
    const data = validateRequest(schema, req.body);
    const area = await prisma.commonArea.create({ data });
    res.status(201).json({ success: true, data: { area } });
  },
);

// ─── Reservas ─────────────────────────────────────────────────
router.get("/:areaId/reservations", async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;
  const reservations = await prisma.reservation.findMany({
    where: {
      commonAreaId: req.params.areaId,
      status: { in: ["PENDING", "CONFIRMED"] },
      ...(startDate &&
        endDate && {
          startDate: { gte: new Date(startDate as string) },
          endDate: { lte: new Date(endDate as string) },
        }),
    },
    orderBy: { startDate: "asc" },
  });
  res.json({ success: true, data: { reservations } });
});

const reservationSchema = z.object({
  commonAreaId: z.string().uuid(),
  unitId: z.string().uuid(),
  title: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  guestCount: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

router.post("/reservations", async (req: Request, res: Response) => {
  const data = validateRequest(reservationSchema, req.body);

  // Verificar disponibilidade
  const conflict = await prisma.reservation.findFirst({
    where: {
      commonAreaId: data.commonAreaId,
      status: { in: ["PENDING", "CONFIRMED"] },
      OR: [
        {
          startDate: { lte: new Date(data.endDate) },
          endDate: { gte: new Date(data.startDate) },
        },
      ],
    },
  });

  if (conflict) {
    return res.status(409).json({
      success: false,
      error: { code: "CONFLICT", message: "Área já reservada neste período" },
    });
  }

  const area = await prisma.commonArea.findUniqueOrThrow({
    where: { id: data.commonAreaId },
  });
  const reservation = await prisma.reservation.create({
    data: {
      ...data,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      requestedBy: req.user!.userId,
      status: area.requiresApproval ? "PENDING" : "CONFIRMED",
    },
  });

  res.status(201).json({ success: true, data: { reservation } });
});

router.patch(
  "/reservations/:id/approve",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const reservation = await prisma.reservation.update({
      where: { id: req.params.id },
      data: { status: "CONFIRMED", approvedBy: req.user!.userId },
    });
    res.json({ success: true, data: { reservation } });
  },
);

router.patch(
  "/reservations/:id/cancel",
  async (req: Request, res: Response) => {
    const reservation = await prisma.reservation.update({
      where: { id: req.params.id },
      data: {
        status: "CANCELED",
        canceledBy: req.user!.userId,
        cancelReason: req.body.reason,
      },
    });
    res.json({ success: true, data: { reservation } });
  },
);

router.get(
  "/reservations/unit/:unitId",
  async (req: Request, res: Response) => {
    const reservations = await prisma.reservation.findMany({
      where: { unitId: req.params.unitId },
      include: { commonArea: { select: { name: true } } },
      orderBy: { startDate: "desc" },
    });
    res.json({ success: true, data: { reservations } });
  },
);

router.get(
  "/reservations/condominium/:condominiumId",
  async (req: Request, res: Response) => {
    const reservations = await prisma.reservation.findMany({
      where: {
        commonArea: { condominiumId: req.params.condominiumId },
      },
      include: {
        commonArea: { select: { name: true } },
      },
      orderBy: { startDate: "desc" },
      take: 50,
    });
    res.json({ success: true, data: { reservations } });
  },
);

export default router;
