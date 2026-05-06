import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { authenticate, authorize, authorizeCondominium } from "../../middleware/auth";
import { validateRequest } from "../../utils/validateRequest";
import { ForbiddenError } from "../../middleware/errorHandler";

const router = Router();
router.use(authenticate);
router.use(authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"));

const createSchema = z.object({
  condominiumId: z.string().uuid(),
  title: z.string().min(3),
  vendor: z.string().min(2),
  contractType: z.enum(["ELEVATOR", "INSURANCE", "CLEANING", "SECURITY", "MAINTENANCE", "OTHER"]),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  value: z.number().positive(),
  adjustmentIndex: z.enum(["INPC", "IGPM", "IPCA"]).optional(),
  fileUrl: z.string().url().optional(),
  notes: z.string().optional(),
  autoRenew: z.boolean().default(false),
  alertDaysBefore: z.number().int().min(7).max(180).default(60),
});

const updateSchema = createSchema.partial().omit({ condominiumId: true });

async function ensureMembership(userId: string, role: string, condominiumId: string) {
  if (role === "SUPER_ADMIN") return;
  const m = await prisma.condominiumUser.findFirst({
    where: { userId, condominiumId, isActive: true },
  });
  if (!m) throw new ForbiddenError("Acesso negado a este condomínio");
}

// GET /condominium-contracts/:condominiumId
router.get("/:condominiumId", authorizeCondominium, async (req: Request, res: Response) => {
  const { status } = req.query;
  const contracts = await prisma.condominiumContract.findMany({
    where: {
      condominiumId: req.params.condominiumId,
      ...(status ? { status: status as string } : {}),
    },
    orderBy: { endDate: "asc" },
  });
  res.json({ success: true, data: { contracts } });
});

// GET /condominium-contracts/:condominiumId/expiring?days=60
router.get("/:condominiumId/expiring", authorizeCondominium, async (req: Request, res: Response) => {
  const days = Number(req.query.days) || 60;
  const limit = new Date();
  limit.setDate(limit.getDate() + days);

  const contracts = await prisma.condominiumContract.findMany({
    where: {
      condominiumId: req.params.condominiumId,
      status: "ACTIVE",
      endDate: { lte: limit },
    },
    orderBy: { endDate: "asc" },
  });
  res.json({ success: true, data: { contracts } });
});

// POST /condominium-contracts
router.post("/", async (req: Request, res: Response) => {
  const data = validateRequest(createSchema, req.body);
  await ensureMembership(req.user!.userId, req.user!.role, data.condominiumId);

  const contract = await prisma.condominiumContract.create({
    data: {
      ...data,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
    },
  });
  res.status(201).json({ success: true, data: { contract } });
});

// PATCH /condominium-contracts/:id
router.patch("/:id", async (req: Request, res: Response) => {
  const contract = await prisma.condominiumContract.findUniqueOrThrow({
    where: { id: req.params.id },
  });
  await ensureMembership(req.user!.userId, req.user!.role, contract.condominiumId);

  const data = validateRequest(updateSchema, req.body);
  const updated = await prisma.condominiumContract.update({
    where: { id: req.params.id },
    data: {
      ...data,
      ...(data.startDate && { startDate: new Date(data.startDate) }),
      ...(data.endDate && { endDate: new Date(data.endDate) }),
    },
  });
  res.json({ success: true, data: { contract: updated } });
});

// DELETE /condominium-contracts/:id
router.delete("/:id", async (req: Request, res: Response) => {
  const contract = await prisma.condominiumContract.findUniqueOrThrow({
    where: { id: req.params.id },
  });
  await ensureMembership(req.user!.userId, req.user!.role, contract.condominiumId);
  await prisma.condominiumContract.update({
    where: { id: req.params.id },
    data: { status: "CANCELED" },
  });
  res.json({ success: true, message: "Contrato cancelado" });
});

export default router;
