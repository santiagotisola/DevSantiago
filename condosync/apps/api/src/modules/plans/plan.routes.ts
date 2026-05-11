import { Router, Request, Response } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { authenticate, authorize } from "../../middleware/auth";
import { validateRequest } from "../../utils/validateRequest";
import { BadRequestError, NotFoundError } from "../../middleware/errorHandler";

const router = Router();
router.use(authenticate);

const slugRegex = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

const createSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(40)
    .regex(slugRegex, "slug deve conter apenas letras minúsculas, números e hífens"),
  name: z.string().min(2).max(80),
  description: z.string().max(500).optional().nullable(),
  price: z.number().nonnegative().optional(),
  maxUnits: z.number().int().positive().optional(),
  features: z.array(z.string()).max(50).optional().nullable(),
  isActive: z.boolean().optional(),
});

const updateSchema = createSchema.partial().extend({
  // slug não é editável após criação para não quebrar Condominium.plan existente
  slug: z.undefined().optional(),
});

// GET /plans — qualquer autenticado pode listar (UI de settings também usa)
router.get("/", async (req: Request, res: Response) => {
  const onlyActive = req.query.active === "true";
  const plans = await prisma.plan.findMany({
    where: onlyActive ? { isActive: true } : {},
    orderBy: [{ isActive: "desc" }, { price: "asc" }],
  });
  res.json({ success: true, data: { plans } });
});

router.get("/:id", async (req: Request, res: Response) => {
  const plan = await prisma.plan.findUnique({ where: { id: req.params.id } });
  if (!plan) throw new NotFoundError("Plan", req.params.id);
  res.json({ success: true, data: { plan } });
});

router.post(
  "/",
  authorize("SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const data = validateRequest(createSchema, req.body);
    try {
      const plan = await prisma.plan.create({
        data: {
          slug: data.slug,
          name: data.name,
          description: data.description ?? null,
          price: data.price !== undefined ? new Prisma.Decimal(data.price) : undefined,
          maxUnits: data.maxUnits,
          features: data.features ?? Prisma.JsonNull,
          isActive: data.isActive ?? true,
        },
      });
      res.status(201).json({ success: true, data: { plan } });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        throw new BadRequestError("Já existe um plano com este slug");
      }
      throw err;
    }
  },
);

router.put(
  "/:id",
  authorize("SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const data = validateRequest(updateSchema, req.body);
    const plan = await prisma.plan.findUnique({ where: { id: req.params.id } });
    if (!plan) throw new NotFoundError("Plan", req.params.id);

    const updated = await prisma.plan.update({
      where: { id: req.params.id },
      data: {
        name: data.name,
        description: data.description === undefined ? undefined : data.description,
        price: data.price !== undefined ? new Prisma.Decimal(data.price) : undefined,
        maxUnits: data.maxUnits,
        features:
          data.features === undefined
            ? undefined
            : data.features === null
              ? Prisma.JsonNull
              : data.features,
        isActive: data.isActive,
      },
    });
    res.json({ success: true, data: { plan: updated } });
  },
);

router.delete(
  "/:id",
  authorize("SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const plan = await prisma.plan.findUnique({ where: { id: req.params.id } });
    if (!plan) throw new NotFoundError("Plan", req.params.id);

    const inUse = await prisma.condominium.count({ where: { plan: plan.slug } });
    if (inUse > 0) {
      return res.status(409).json({
        success: false,
        message: `Plano em uso por ${inUse} condomínio(s). Reatribua antes de excluir.`,
        data: { condominiumsUsing: inUse },
      });
    }

    await prisma.plan.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  },
);

export default router;
