import { Router, Request, Response } from "express";
import {
  authenticate,
  authorize,
  authorizeCondominium,
} from "../../middleware/auth";
import { validateRequest } from "../../utils/validateRequest";
import { z } from "zod";
import { stockService } from "./stock.service";

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

const movementSchema = z
  .object({
    type: z.enum(["IN", "OUT", "ADJUSTMENT"]),
    quantity: z.number().nonnegative(),
    reason: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if ((data.type === "IN" || data.type === "OUT") && data.quantity <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["quantity"],
        message: "Quantidade deve ser maior que zero",
      });
    }
  });

router.get(
  "/:condominiumId",
  authorizeCondominium,
  async (req: Request, res: Response) => {
    const { category, lowStock } = req.query as Record<string, string>;
    const items = await stockService.listByCondominium(req.params.condominiumId, {
      category,
      lowStock: lowStock === "true",
    });
    res.json({ success: true, data: { items } });
  },
);

router.post("/", authorizeCondominium, async (req: Request, res: Response) => {
  const data = validateRequest(itemSchema, req.body);
  const item = await stockService.createItem(data);
  res.status(201).json({ success: true, data: { item } });
});

router.patch("/:id", async (req: Request, res: Response) => {
  const data = validateRequest(
    itemSchema.partial().omit({ condominiumId: true, quantity: true }),
    req.body,
  );
  const item = await stockService.updateItem(req.params.id, data, req.user!);
  res.json({ success: true, data: { item } });
});

router.delete("/:id", async (req: Request, res: Response) => {
  await stockService.deleteItem(req.params.id, req.user!);
  res.json({ success: true });
});

router.post("/:id/movements", async (req: Request, res: Response) => {
  const data = validateRequest(movementSchema, req.body);
  const result = await stockService.registerMovement(
    req.params.id,
    data,
    req.user!,
  );
  res.status(201).json({ success: true, data: result });
});

router.get("/:id/movements", async (req: Request, res: Response) => {
  const movements = await stockService.listMovements(req.params.id, req.user!);
  res.json({ success: true, data: { movements } });
});

export default router;
