import { Router, Request, Response } from "express";
import { StockMovementType, UserRole } from "@prisma/client";
import { prisma } from "../../config/prisma";
import {
  authenticate,
  authorize,
  authorizeCondominium,
} from "../../middleware/auth";
import { BadRequestError, ForbiddenError } from "../../middleware/errorHandler";
import { Prisma } from "@prisma/client";
import { validateRequest } from "../../utils/validateRequest";
import { z } from "zod";

const router = Router();
router.use(authenticate);
router.use(authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"));

const CATEGORIES = [
  "limpeza",
  "manutenção",
  "segurança",
  "escritório",
  "outro",
] as const;

const itemSchema = z.object({
  condominiumId: z.string().uuid(),
  name: z.string().min(2),
  description: z.string().optional(),
  category: z.enum(CATEGORIES),
  unit: z.string().min(1),
  quantity: z.number().min(0).default(0),
  minQuantity: z.number().min(0).default(0),
  location: z.string().optional(),
});

const movementSchema = z.object({
  type: z.enum(["IN", "OUT", "ADJUSTMENT"]),
  quantity: z.number().nonnegative(),
  reason: z.string().optional(),
}).superRefine((data, ctx) => {
  if ((data.type === "IN" || data.type === "OUT") && data.quantity <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["quantity"],
      message: "Quantidade deve ser maior que zero",
    });
  }
});

async function ensureItemAccess(req: Request, itemId: string) {
  const item = await prisma.stockItem.findUniqueOrThrow({
    where: { id: itemId },
    select: { id: true, condominiumId: true, quantity: true, minQuantity: true },
  });

  if (req.user!.role === UserRole.SUPER_ADMIN) {
    return item;
  }

  const membership = await prisma.condominiumUser.findFirst({
    where: {
      userId: req.user!.userId,
      condominiumId: item.condominiumId,
      isActive: true,
    },
    select: { id: true },
  });

  if (!membership) {
    throw new ForbiddenError("Acesso negado a este item de estoque");
  }

  return item;
}

router.get(
  "/:condominiumId",
  authorizeCondominium,
  async (req: Request, res: Response) => {
    const { category, lowStock } = req.query as Record<string, string>;

    const allItems = await prisma.stockItem.findMany({
      where: {
        condominiumId: req.params.condominiumId,
        ...(category ? { category } : {}),
      },
      include: {
        movements: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
      orderBy: { name: "asc" },
    });

    const items =
      lowStock === "true"
        ? allItems.filter((i) => i.quantity <= i.minQuantity)
        : allItems;

    res.json({ success: true, data: { items } });
  },
);

router.post(
  "/",
  authorizeCondominium,
  async (req: Request, res: Response) => {
    const data = validateRequest(itemSchema, req.body);
    const item = await prisma.stockItem.create({ data });
    res.status(201).json({ success: true, data: { item } });
  },
);

router.patch("/:id", async (req: Request, res: Response) => {
  await ensureItemAccess(req, req.params.id);

  const data = validateRequest(
    itemSchema.partial().omit({ condominiumId: true, quantity: true }),
    req.body,
  );
  const item = await prisma.stockItem.update({
    where: { id: req.params.id },
    data,
  });
  res.json({ success: true, data: { item } });
});

router.delete("/:id", async (req: Request, res: Response) => {
  await ensureItemAccess(req, req.params.id);
  await prisma.stockItem.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

router.post("/:id/movements", async (req: Request, res: Response) => {
  const { type, quantity, reason } = validateRequest(movementSchema, req.body);
  await ensureItemAccess(req, req.params.id);

  // Atomicidade: usar increment/decrement no DB para evitar lost-update
  // entre OUTs concorrentes. Antes era read→compute→write em
  // transação, o que NÃO previne race com Read Committed (ambas
  // transações leem 5, ambas escrevem 4).
  // A constraint CHECK (quantity >= 0) no DB transforma estoque
  // negativo em P2010/P2002 e abortamos a transação.
  try {
    const [movement, item] = await prisma.$transaction(async (tx) => {
      let updated;
      if (type === "IN") {
        updated = await tx.stockItem.update({
          where: { id: req.params.id },
          data: { quantity: { increment: quantity } },
        });
      } else if (type === "OUT") {
        updated = await tx.stockItem.update({
          where: { id: req.params.id },
          data: { quantity: { decrement: quantity } },
        });
      } else {
        // ADJUSTMENT — set absoluto continua sem race risk pois é
        // sobrescrita explícita; se duas chegarem juntas, a última
        // vence (semântica esperada de ajuste).
        updated = await tx.stockItem.update({
          where: { id: req.params.id },
          data: { quantity },
        });
      }

      const mov = await tx.stockMovement.create({
        data: {
          itemId: req.params.id,
          type: type as StockMovementType,
          quantity,
          reason,
          performedBy: req.user!.userId,
        },
      });

      return [mov, updated] as const;
    });

    res.status(201).json({ success: true, data: { movement, item } });
  } catch (err) {
    // Postgres viola CHECK constraint quando quantity ficaria < 0.
    // Prisma traduz como P2010 ou P2034. Tratamos como erro de
    // negócio (400), não 500.
    const code = (err as { code?: string }).code;
    const isCheckViolation =
      err instanceof Prisma.PrismaClientKnownRequestError &&
      (code === "P2010" || code === "P2034");
    const isNumericRange =
      err instanceof Prisma.PrismaClientKnownRequestError && code === "P2003";
    const msg = String((err as Error).message ?? "");
    if (
      isCheckViolation ||
      isNumericRange ||
      msg.includes("stock_quantity_nonneg") ||
      msg.includes("violates check constraint")
    ) {
      throw new BadRequestError("Quantidade insuficiente em estoque");
    }
    throw err;
  }
});

router.get("/:id/movements", async (req: Request, res: Response) => {
  await ensureItemAccess(req, req.params.id);

  const movements = await prisma.stockMovement.findMany({
    where: { itemId: req.params.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  res.json({ success: true, data: { movements } });
});

export default router;
