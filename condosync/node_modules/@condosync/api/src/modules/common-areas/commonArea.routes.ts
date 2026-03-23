import { Router, Request, Response } from "express";
import {
  authenticate,
  authorize,
  authorizeCondominium,
} from "../../middleware/auth";
import { validateRequest } from "../../utils/validateRequest";
import { z } from "zod";
import { commonAreaService } from "./commonArea.service";

const router = Router();
router.use(authenticate);

// ─── Schemas ──────────────────────────────────────────────────

const createAreaSchema = z.object({
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

const updateAreaSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  capacity: z.number().int().positive().optional(),
  rules: z.string().optional(),
  requiresApproval: z.boolean().optional(),
  maxDaysAdvance: z.number().int().min(1).max(90).optional(),
  openTime: z.string().optional(),
  closeTime: z.string().optional(),
  isAvailable: z.boolean().optional(),
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

// ─── Áreas ────────────────────────────────────────────────────

router.get(
  "/condominium/:condominiumId",
  authorizeCondominium,
  async (req: Request, res: Response) => {
    const areas = await commonAreaService.listAreas(
      req.params.condominiumId,
      req.user!,
    );
    res.json({ success: true, data: { areas } });
  },
);

router.post(
  "/",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  authorizeCondominium,
  async (req: Request, res: Response) => {
    const data = validateRequest(createAreaSchema, req.body);
    const area = await commonAreaService.createArea(data, req.user!);
    res.status(201).json({ success: true, data: { area } });
  },
);

router.patch(
  "/:id",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const data = validateRequest(updateAreaSchema, req.body);
    const area = await commonAreaService.updateArea(
      req.params.id,
      data,
      req.user!,
    );
    res.json({ success: true, data: { area } });
  },
);

router.delete(
  "/:id",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    await commonAreaService.deleteArea(req.params.id, req.user!);
    res.json({ success: true });
  },
);

router.get("/:areaId/reservations", async (req: Request, res: Response) => {
  const reservations = await commonAreaService.listAreaReservations(
    req.params.areaId,
    req.user!,
    req.query.startDate as string | undefined,
    req.query.endDate as string | undefined,
  );
  res.json({ success: true, data: { reservations } });
});

// ─── Reservas ─────────────────────────────────────────────────

router.post("/reservations", async (req: Request, res: Response) => {
  const data = validateRequest(reservationSchema, req.body);
  const reservation = await commonAreaService.createReservation(
    {
      ...data,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
    },
    req.user!.userId,
    req.user!,
  );
  res.status(201).json({ success: true, data: { reservation } });
});

router.patch(
  "/reservations/:id/approve",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const reservation = await commonAreaService.approveReservation(
      req.params.id,
      req.user!.userId,
      req.user!,
    );
    res.json({ success: true, data: { reservation } });
  },
);

router.patch(
  "/reservations/:id/cancel",
  async (req: Request, res: Response) => {
    const reservation = await commonAreaService.cancelReservation(
      req.params.id,
      req.user!.userId,
      req.user!,
      req.body.reason,
    );
    res.json({ success: true, data: { reservation } });
  },
);

router.get(
  "/reservations/unit/:unitId",
  async (req: Request, res: Response) => {
    const reservations = await commonAreaService.listReservationsByUnit(
      req.params.unitId,
      req.user!,
    );
    res.json({ success: true, data: { reservations } });
  },
);

router.get(
  "/reservations/condominium/:condominiumId",
  authorizeCondominium,
  async (req: Request, res: Response) => {
    const reservations = await commonAreaService.listReservationsByCondominium(
      req.params.condominiumId,
      req.user!,
    );
    res.json({ success: true, data: { reservations } });
  },
);

export default router;

const router = Router();
router.use(authenticate);

async function ensureUnitAccess(req: Request, unitId: string) {
  const unit = await prisma.unit.findUniqueOrThrow({
    where: { id: unitId },
    select: { id: true, condominiumId: true },
  });

  if (req.user!.role === UserRole.SUPER_ADMIN) {
    return unit;
  }

  const membership = await prisma.condominiumUser.findFirst({
    where: {
      userId: req.user!.userId,
      condominiumId: unit.condominiumId,
      isActive: true,
    },
    select: { role: true, unitId: true },
  });

  if (!membership) {
    throw new ForbiddenError("Acesso negado a esta unidade");
  }

  if (membership.role === UserRole.RESIDENT && membership.unitId !== unit.id) {
    throw new ForbiddenError("Morador so pode acessar a propria unidade");
  }

  return unit;
}

async function ensureReservationAccess(
  req: Request,
  reservationId: string,
  options?: { managementOnly?: boolean; residentOwnOnly?: boolean },
) {
  const reservation = await prisma.reservation.findUniqueOrThrow({
    where: { id: reservationId },
    select: {
      id: true,
      requestedBy: true,
      unitId: true,
      commonArea: { select: { condominiumId: true } },
    },
  });

  if (req.user!.role === UserRole.SUPER_ADMIN) {
    return reservation;
  }

  const membership = await prisma.condominiumUser.findFirst({
    where: {
      userId: req.user!.userId,
      condominiumId: reservation.commonArea.condominiumId,
      isActive: true,
    },
    select: { role: true, unitId: true },
  });

  if (!membership) {
    throw new ForbiddenError("Acesso negado a esta reserva");
  }

  const isManagement =
    membership.role === UserRole.CONDOMINIUM_ADMIN ||
    membership.role === UserRole.SYNDIC;

  if (options?.managementOnly && !isManagement) {
    throw new ForbiddenError("Apenas a administracao pode executar esta acao");
  }

  if (
    options?.residentOwnOnly &&
    membership.role === UserRole.RESIDENT &&
    (membership.unitId !== reservation.unitId ||
      reservation.requestedBy !== req.user!.userId)
  ) {
    throw new ForbiddenError("Morador so pode acessar a propria reserva");
  }

  return reservation;
}

router.get(
  "/condominium/:condominiumId",
  authorizeCondominium,
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
  authorizeCondominium,
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

router.patch(
  "/:id",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const schema = z.object({
      name: z.string().min(2).optional(),
      description: z.string().optional(),
      capacity: z.number().int().positive().optional(),
      rules: z.string().optional(),
      requiresApproval: z.boolean().optional(),
      maxDaysAdvance: z.number().int().min(1).max(90).optional(),
      openTime: z.string().optional(),
      closeTime: z.string().optional(),
      isAvailable: z.boolean().optional(),
    });
    const data = validateRequest(schema, req.body);
    // M10: verifica pertencimento da área ao condomínio do ator
    const area = await prisma.commonArea.findUniqueOrThrow({
      where: { id: req.params.id },
      select: { condominiumId: true },
    });
    if (req.user!.role !== UserRole.SUPER_ADMIN) {
      const membership = await prisma.condominiumUser.findFirst({
        where: {
          userId: req.user!.userId,
          condominiumId: area.condominiumId,
          isActive: true,
        },
      });
      if (!membership) throw new ForbiddenError("Acesso negado a esta área");
    }
    const updated = await prisma.commonArea.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ success: true, data: { area: updated } });
  },
);

router.delete(
  "/:id",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const area = await prisma.commonArea.findUniqueOrThrow({
      where: { id: req.params.id },
      select: { condominiumId: true },
    });
    if (req.user!.role !== UserRole.SUPER_ADMIN) {
      const membership = await prisma.condominiumUser.findFirst({
        where: {
          userId: req.user!.userId,
          condominiumId: area.condominiumId,
          isActive: true,
        },
      });
      if (!membership) throw new ForbiddenError("Acesso negado a esta área");
    }
    await prisma.commonArea.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ success: true });
  },
);

router.get("/:areaId/reservations", async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;
  const area = await prisma.commonArea.findUniqueOrThrow({
    where: { id: req.params.areaId },
    select: { condominiumId: true },
  });

  req.params.condominiumId = area.condominiumId;
  await authorizeCondominium(req, res, async () => {});

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
  const unit = await ensureUnitAccess(req, data.unitId);
  const area = await prisma.commonArea.findUniqueOrThrow({
    where: { id: data.commonAreaId },
  });

  if (area.condominiumId !== unit.condominiumId) {
    throw new ForbiddenError(
      "A unidade informada nao pertence ao mesmo condominio da area",
    );
  }

  // M11: valida horário de funcionamento da área
  const startDt = new Date(data.startDate);
  const endDt = new Date(data.endDate);

  if (area.maxDaysAdvance) {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + area.maxDaysAdvance);
    if (startDt > maxDate) {
      return res.status(422).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: `Reserva não pode ser feita com mais de ${area.maxDaysAdvance} dias de antecedência`,
        },
      });
    }
  }

  if (area.openTime && area.closeTime) {
    const [openH, openM] = (area.openTime as string).split(":").map(Number);
    const [closeH, closeM] = (area.closeTime as string).split(":").map(Number);
    const startMinutes = startDt.getHours() * 60 + startDt.getMinutes();
    const endMinutes = endDt.getHours() * 60 + endDt.getMinutes();
    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;
    if (startMinutes < openMinutes || endMinutes > closeMinutes) {
      return res.status(422).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: `Reserva fora do horário de funcionamento (${area.openTime} – ${area.closeTime})`,
        },
      });
    }
  }

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
      error: { code: "CONFLICT", message: "Area ja reservada neste periodo" },
    });
  }

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
    // B6: impede aprovar reserva já cancelada
    const target = await prisma.reservation.findUniqueOrThrow({
      where: { id: req.params.id },
      select: { status: true },
    });
    if (target.status === "CANCELED") {
      return res.status(422).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Não é possível aprovar uma reserva cancelada",
        },
      });
    }
    await ensureReservationAccess(req, req.params.id, { managementOnly: true });
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
    await ensureReservationAccess(req, req.params.id, {
      residentOwnOnly: true,
    });
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
    await ensureUnitAccess(req, req.params.unitId);
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
  authorizeCondominium,
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
