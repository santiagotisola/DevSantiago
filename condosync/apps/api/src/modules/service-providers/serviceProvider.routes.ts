import { Router, Request, Response } from "express";
import { prisma } from "../../config/prisma";
import { authenticate, authorize } from "../../middleware/auth";
import { validateRequest } from "../../utils/validateRequest";
import { ForbiddenError } from "../../middleware/errorHandler";
import { z } from "zod";

const router = Router();
router.use(authenticate);

/** Verifica que o ator pertence ao condomÃ­nio indicado */
async function ensureCondominiumMembership(
  userId: string,
  role: string,
  condominiumId: string,
) {
  if (role === "SUPER_ADMIN") return;
  const membership = await prisma.condominiumUser.findFirst({
    where: { userId, condominiumId, isActive: true },
    select: { id: true },
  });
  if (!membership) throw new ForbiddenError("Acesso negado a este condomÃ­nio");
}

const schema = z.object({
  condominiumId: z.string().uuid(),
  name: z.string().min(2),
  cnpj: z.string().optional(),
  cpf: z.string().optional(),
  serviceType: z.string().min(2),
  phone: z.string().min(1, "Telefone é obrigatório"),
  email: z.string().email().optional(),
  notes: z.string().optional(),
});

router.get(
  "/condominium/:condominiumId",
  async (req: Request, res: Response) => {
    const providers = await prisma.serviceProvider.findMany({
      where: {
        condominiumId: req.params.condominiumId,
        ...(req.query.approved && {
          isApproved: req.query.approved === "true",
        }),
      },
      orderBy: { name: "asc" },
    });
    res.json({ success: true, data: { providers } });
  },
);

// L4 â€” verifica membership para condominiumId do body
router.post(
  "/",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const data = validateRequest(schema, req.body);
    await ensureCondominiumMembership(
      req.user!.userId,
      req.user!.role,
      data.condominiumId,
    );
    const provider = await prisma.serviceProvider.create({ data });
    res.status(201).json({ success: true, data: { provider } });
  },
);

// L1 â€” IDOR fix: verifica tenant antes de editar
router.put(
  "/:id",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const existing = await prisma.serviceProvider.findUniqueOrThrow({
      where: { id: req.params.id },
      select: { condominiumId: true },
    });
    await ensureCondominiumMembership(
      req.user!.userId,
      req.user!.role,
      existing.condominiumId,
    );
    const data = validateRequest(schema.partial(), req.body);
    const provider = await prisma.serviceProvider.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ success: true, data: { provider } });
  },
);

// L2 â€” IDOR fix: verifica tenant antes de aprovar
router.patch(
  "/:id/approve",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const existing = await prisma.serviceProvider.findUniqueOrThrow({
      where: { id: req.params.id },
      select: { condominiumId: true },
    });
    await ensureCondominiumMembership(
      req.user!.userId,
      req.user!.role,
      existing.condominiumId,
    );
    const provider = await prisma.serviceProvider.update({
      where: { id: req.params.id },
      data: { isApproved: true },
    });
    res.json({ success: true, data: { provider } });
  },
);

// L3 â€” IDOR fix: verifica tenant antes de deletar
router.delete(
  "/:id",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const existing = await prisma.serviceProvider.findUniqueOrThrow({
      where: { id: req.params.id },
      select: { condominiumId: true },
    });
    await ensureCondominiumMembership(
      req.user!.userId,
      req.user!.role,
      existing.condominiumId,
    );
    await prisma.serviceProvider.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  },
);

export default router;
