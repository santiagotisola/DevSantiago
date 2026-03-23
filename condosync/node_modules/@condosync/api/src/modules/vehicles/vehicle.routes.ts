import { Router, Request, Response } from "express";
import { prisma } from "../../config/prisma";
import { authenticate, authorize } from "../../middleware/auth";
import { validateRequest } from "../../utils/validateRequest";
import { z } from "zod";
import { ForbiddenError } from "../../middleware/errorHandler";

const router = Router();
router.use(authenticate);

const vehicleSchema = z.object({
  unitId: z.string().uuid(),
  plate: z
    .string()
    .min(7)
    .max(8)
    .transform((s) => s.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()),
  brand: z.string().min(2),
  model: z.string().min(2),
  color: z.string().min(2),
  year: z
    .number()
    .int()
    .min(1980)
    .max(new Date().getFullYear() + 1)
    .optional(),
  type: z.enum(["CAR", "MOTORCYCLE", "TRUCK", "BICYCLE", "OTHER"]).optional(),
});

// N1 — verifica que o ator pertence ao condomínio da unidade
router.get("/unit/:unitId", async (req: Request, res: Response) => {
  const unit = await prisma.unit.findUniqueOrThrow({
    where: { id: req.params.unitId },
    select: { condominiumId: true },
  });
  if (req.user!.role !== "SUPER_ADMIN") {
    const membership = await prisma.condominiumUser.findFirst({
      where: {
        userId: req.user!.userId,
        condominiumId: unit.condominiumId,
        isActive: true,
      },
      select: { id: true },
    });
    if (!membership) {
      throw new ForbiddenError("Acesso negado a esta unidade");
    }
  }
  const vehicles = await prisma.vehicle.findMany({
    where: { unitId: req.params.unitId, isActive: true },
  });
  res.json({ success: true, data: { vehicles } });
});

router.post("/", async (req: Request, res: Response) => {
  const data = validateRequest(vehicleSchema, req.body);

  // Residents can only add vehicles to their own unit
  const user = req.user!;
  if (user.role === "RESIDENT") {
    const membership = await prisma.condominiumUser.findFirst({
      where: { userId: user.userId, unitId: data.unitId },
      select: { id: true },
    });
    if (!membership) {
      throw new ForbiddenError(
        "Proibido: você só pode cadastrar veículos na sua unidade.",
      );
    }
  }

  const vehicle = await prisma.vehicle.create({ data });
  res.status(201).json({ success: true, data: { vehicle } });
});

router.put("/:id", async (req: Request, res: Response) => {
  const data = validateRequest(vehicleSchema.partial(), req.body);

  // Ensure vehicle belongs to the user's unit if RESIDENT
  const user = req.user!;
  if (user.role === "RESIDENT") {
    const existing = await prisma.vehicle.findUnique({
      where: { id: req.params.id },
      select: { unitId: true },
    });
    if (!existing) {
      throw new ForbiddenError(
        "Proibido: você não tem permissão para editar este veículo.",
      );
    }
    const membership = await prisma.condominiumUser.findFirst({
      where: { userId: user.userId, unitId: existing.unitId },
      select: { id: true },
    });
    if (!membership) {
      throw new ForbiddenError(
        "Proibido: você não tem permissão para editar este veículo.",
      );
    }
  }

  const vehicle = await prisma.vehicle.update({
    where: { id: req.params.id },
    data,
  });
  res.json({ success: true, data: { vehicle } });
});

router.delete("/:id", async (req: Request, res: Response) => {
  // Ensure vehicle belongs to the user's unit if RESIDENT
  const user = req.user!;
  if (user.role === "RESIDENT") {
    const existing = await prisma.vehicle.findUnique({
      where: { id: req.params.id },
      select: { unitId: true },
    });
    if (!existing) {
      throw new ForbiddenError(
        "Proibido: você não tem permissão para remover este veículo.",
      );
    }
    const membership = await prisma.condominiumUser.findFirst({
      where: { userId: user.userId, unitId: existing.unitId },
      select: { id: true },
    });
    if (!membership) {
      throw new ForbiddenError(
        "Proibido: você não tem permissão para remover este veículo.",
      );
    }
  }

  await prisma.vehicle.update({
    where: { id: req.params.id },
    data: { isActive: false },
  });
  res.json({ success: true });
});

// Registro de acesso de veículos
router.get(
  "/access-logs/:condominiumId",
  authorize("DOORMAN", "CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    // Busca IDs de todas as unidades do condomínio para filtrar logs sem vehicleId
    const unitIds = (
      await prisma.unit.findMany({
        where: { condominiumId: req.params.condominiumId },
        select: { id: true },
      })
    ).map((u) => u.id);

    const logs = await prisma.vehicleAccessLog.findMany({
      where: {
        // N2 — terceira cláusula removida: vazava logs de outros condomínios
        OR: [
          { vehicle: { unit: { condominiumId: req.params.condominiumId } } },
          { vehicleId: null, unitId: { in: unitIds } },
        ],
      },
      include: {
        vehicle: {
          include: { unit: { select: { identifier: true, block: true } } },
        },
      },
      orderBy: { entryAt: "desc" },
      take: 50,
    });
    res.json({ success: true, data: { logs } });
  },
);

router.post(
  "/access-logs",
  authorize("DOORMAN", "CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const schema = z.object({
      plate: z.string().min(1),
      vehicleId: z.string().uuid().optional(),
      unitId: z.string().uuid().optional(),
      isResident: z.boolean().optional(),
      notes: z.string().optional(),
    });
    const data = validateRequest(schema, req.body);

    // Tenta vincular automaticamente ao veículo cadastrado pela placa
    let vehicleId = data.vehicleId;
    let unitId = data.unitId;
    if (!vehicleId) {
      const existing = await prisma.vehicle.findFirst({
        where: {
          plate: data.plate.replace(/[^a-zA-Z0-9]/g, "").toUpperCase(),
          isActive: true,
        },
      });
      if (existing) {
        vehicleId = existing.id;
        unitId = unitId ?? existing.unitId;
      }
    }

    const log = await prisma.vehicleAccessLog.create({
      data: { ...data, vehicleId, unitId, registeredBy: req.user!.userId },
    });
    res.status(201).json({ success: true, data: { log } });
  },
);

// N3 — IDOR fix: verifica tenant do log antes de registrar saída
router.patch(
  "/access-logs/:id/exit",
  authorize("DOORMAN", "CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const existing = await prisma.vehicleAccessLog.findUniqueOrThrow({
      where: { id: req.params.id },
      select: {
        id: true,
        vehicle: { select: { unit: { select: { condominiumId: true } } } },
        unitId: true,
      },
    });

    const condominiumId =
      existing.vehicle?.unit?.condominiumId ??
      (existing.unitId
        ? (
            await prisma.unit.findUnique({
              where: { id: existing.unitId },
              select: { condominiumId: true },
            })
          )?.condominiumId
        : null);

    if (condominiumId && req.user!.role !== "SUPER_ADMIN") {
      const membership = await prisma.condominiumUser.findFirst({
        where: { userId: req.user!.userId, condominiumId, isActive: true },
        select: { id: true },
      });
      if (!membership) {
        throw new ForbiddenError("Acesso negado a este log");
      }
    }

    const log = await prisma.vehicleAccessLog.update({
      where: { id: req.params.id },
      data: { exitAt: new Date() },
    });
    res.json({ success: true, data: { log } });
  },
);

export default router;
