import { Router, Request, Response } from "express";
import { prisma } from "../../config/prisma";
import {
  authenticate,
  authorize,
  authorizeCondominium,
} from "../../middleware/auth";
import { ForbiddenError } from "../../middleware/errorHandler";
import { validateRequest } from "../../utils/validateRequest";
import { z } from "zod";

const router = Router();
router.use(authenticate);

const unitSchema = z.object({
  condominiumId: z.string().uuid(),
  identifier: z.string().min(1),
  block: z.string().optional(),
  street: z.string().optional(),
  floor: z.string().optional(),
  type: z.string().optional(),
  area: z.number().positive().optional(),
  bedrooms: z.number().int().positive().optional(),
  status: z
    .enum(["OCCUPIED", "VACANT", "UNDER_RENOVATION", "BLOCKED"])
    .optional(),
  fraction: z.number().positive().optional(),
  notes: z.string().optional(),
});

router.get(
  "/condominium/:condominiumId",
  authorizeCondominium,
  async (req: Request, res: Response) => {
    const units = await prisma.unit.findMany({
      where: {
        condominiumId: req.params.condominiumId,
        ...(req.query.status && { status: req.query.status as any }),
      },
      include: {
        _count: { select: { residents: true, vehicles: true } },
        residents: {
          where: { isActive: true },
          include: { user: { select: { id: true, name: true } } },
          take: 1,
        },
      },
      orderBy: [{ block: "asc" }, { identifier: "asc" }],
    });
    res.json({ success: true, data: { units } });
  },
);

router.post(
  "/",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const data = validateRequest(unitSchema, req.body);
    const unit = await prisma.unit.create({ data });
    res.status(201).json({ success: true, data: { unit } });
  },
);

router.get("/:id", async (req: Request, res: Response) => {
  const unit = await prisma.unit.findUniqueOrThrow({
    where: { id: req.params.id },
    include: {
      residents: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              avatarUrl: true,
            },
          },
        },
      },
      vehicles: { where: { isActive: true } },
      dependents: { where: { isActive: true } },
    },
  });
  if (req.user!.role !== "SUPER_ADMIN") {
    const membership = await prisma.condominiumUser.findFirst({
      where: {
        userId: req.user!.userId,
        condominiumId: unit.condominiumId,
        isActive: true,
      },
    });
    if (!membership) throw new ForbiddenError("Acesso negado a esta unidade");
  }
  res.json({ success: true, data: { unit } });
});

router.put(
  "/:id",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const { condominiumId: _ignored, ...rest } = validateRequest(
      unitSchema.partial(),
      req.body,
    );
    const existing = await prisma.unit.findUniqueOrThrow({
      where: { id: req.params.id },
      select: { condominiumId: true },
    });
    if (req.user!.role !== "SUPER_ADMIN") {
      const membership = await prisma.condominiumUser.findFirst({
        where: {
          userId: req.user!.userId,
          condominiumId: existing.condominiumId,
          isActive: true,
        },
      });
      if (!membership) throw new ForbiddenError("Acesso negado a esta unidade");
    }
    const unit = await prisma.unit.update({
      where: { id: req.params.id },
      data: rest,
    });
    res.json({ success: true, data: { unit } });
  },
);

export default router;
