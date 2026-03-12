import { Router, Request, Response } from "express";
import { prisma } from "../../config/prisma";
import { authenticate, authorize } from "../../middleware/auth";
import { validateRequest } from "../../utils/validateRequest";
import { z } from "zod";

const router = Router();
router.use(authenticate);

const vehicleSchema = z.object({
  unitId: z.string().uuid(),
  plate: z.string().min(7).max(8).toUpperCase(),
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

router.get("/unit/:unitId", async (req: Request, res: Response) => {
  const vehicles = await prisma.vehicle.findMany({
    where: { unitId: req.params.unitId, isActive: true },
  });
  res.json({ success: true, data: { vehicles } });
});

router.post("/", async (req: Request, res: Response) => {
  const data = validateRequest(vehicleSchema, req.body);
  const vehicle = await prisma.vehicle.create({ data });
  res.status(201).json({ success: true, data: { vehicle } });
});

router.put("/:id", async (req: Request, res: Response) => {
  const data = validateRequest(vehicleSchema.partial(), req.body);
  const vehicle = await prisma.vehicle.update({
    where: { id: req.params.id },
    data,
  });
  res.json({ success: true, data: { vehicle } });
});

router.delete("/:id", async (req: Request, res: Response) => {
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
        OR: [
          { vehicle: { unit: { condominiumId: req.params.condominiumId } } },
          { vehicleId: null, unitId: { in: unitIds } },
          // logs sem vehicleId nem unitId registrados pelo porteiro deste condomínio
          { vehicleId: null, unitId: null, registeredBy: { not: null } },
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

router.patch(
  "/access-logs/:id/exit",
  authorize("DOORMAN", "CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const log = await prisma.vehicleAccessLog.update({
      where: { id: req.params.id },
      data: { exitAt: new Date() },
    });
    res.json({ success: true, data: { log } });
  },
);

export default router;
