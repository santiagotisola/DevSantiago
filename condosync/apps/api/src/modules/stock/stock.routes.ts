import { Router, Request, Response } from "express";
import { StockMovementType, UserRole } from "@prisma/client";
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
  const current = await ensureItemAccess(req, req.params.id);

  let newQuantity: number;
  if (type === "IN") {
    newQuantity = current.quantity + quantity;
  } else if (type === "OUT") {
    if (current.quantity < quantity) {
      res.status(400).json({
        success: false,
        error: { message: "Quantidade insuficiente em estoque" },
      });
      return;
    }
    newQuantity = current.quantity - quantity;
  } else {
    newQuantity = quantity;
  }

  const [movement, item] = await prisma.$transaction([
    prisma.stockMovement.create({
      data: {
        itemId: req.params.id,
        type: type as StockMovementType,
        quantity,
        reason,
        performedBy: req.user!.userId,
      },
    }),
    prisma.stockItem.update({
      where: { id: req.params.id },
      data: { quantity: newQuantity },
    }),
  ]);

  res.status(201).json({ success: true, data: { movement, item } });
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
