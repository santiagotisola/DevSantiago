import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { authenticate, authorize } from "../../middleware/auth";
import { validateRequest } from "../../utils/validateRequest";
import { ForbiddenError } from "../../middleware/errorHandler";

const router = Router();
router.use(authenticate);
router.use(authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"));

const stepSchema = z.object({
  daysAfterDue: z.number().int().min(1),
  channels: z.array(z.enum(["email", "inapp"])).min(1),
  messageTemplate: z.string().min(10),
  action: z.enum(["notify", "block_amenities"]).default("notify"),
});

const createSchema = z.object({
  condominiumId: z.string().uuid(),
  name: z.string().min(3),
  steps: z.array(stepSchema).min(1),
});

async function ensureMembership(userId: string, role: string, condominiumId: string) {
  if (role === "SUPER_ADMIN") return;
  const m = await prisma.condominiumUser.findFirst({
    where: { userId, condominiumId, isActive: true },
  });
  if (!m) throw new ForbiddenError("Acesso negado a este condomínio");
}

// GET /collection-rules/:condominiumId
router.get("/:condominiumId", async (req: Request, res: Response) => {
  await ensureMembership(req.user!.userId, req.user!.role, req.params.condominiumId);
  const rules = await prisma.collectionRule.findMany({
    where: { condominiumId: req.params.condominiumId },
    include: { steps: { orderBy: { daysAfterDue: "asc" } } },
  });
  res.json({ success: true, data: { rules } });
});

// POST /collection-rules
router.post("/", async (req: Request, res: Response) => {
  const data = validateRequest(createSchema, req.body);
  await ensureMembership(req.user!.userId, req.user!.role, data.condominiumId);

  const rule = await prisma.collectionRule.create({
    data: {
      condominiumId: data.condominiumId,
      name: data.name,
      steps: { create: data.steps },
    },
    include: { steps: true },
  });
  res.status(201).json({ success: true, data: { rule } });
});

// PATCH /collection-rules/:id — ativa/desativa
router.patch("/:id", async (req: Request, res: Response) => {
  const rule = await prisma.collectionRule.findUniqueOrThrow({ where: { id: req.params.id } });
  await ensureMembership(req.user!.userId, req.user!.role, rule.condominiumId);

  const data = z.object({ isActive: z.boolean().optional(), name: z.string().optional() }).parse(req.body);
  const updated = await prisma.collectionRule.update({ where: { id: req.params.id }, data });
  res.json({ success: true, data: { rule: updated } });
});

// DELETE /collection-rules/:id
router.delete("/:id", async (req: Request, res: Response) => {
  const rule = await prisma.collectionRule.findUniqueOrThrow({ where: { id: req.params.id } });
  await ensureMembership(req.user!.userId, req.user!.role, rule.condominiumId);
  await prisma.collectionRule.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: "Régua removida" });
});

export default router;
