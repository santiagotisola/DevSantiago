import { Router, Request, Response } from "express";
import { z } from "zod";
import { authenticate, authorize } from "../../middleware/auth";
import { validateRequest } from "../../utils/validateRequest";
import { planService } from "./plan.service";

const router = Router();
router.use(authenticate);

const slugRegex = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

const createSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(40)
    .regex(
      slugRegex,
      "slug deve conter apenas letras minúsculas, números e hífens",
    ),
  name: z.string().min(2).max(80),
  description: z.string().max(500).optional().nullable(),
  price: z.number().nonnegative().optional(),
  maxUnits: z.number().int().positive().optional(),
  features: z.array(z.string()).max(50).optional().nullable(),
  isActive: z.boolean().optional(),
});

const updateSchema = createSchema.partial().extend({
  slug: z.undefined().optional(),
});

router.get("/", async (req: Request, res: Response) => {
  const plans = await planService.list({
    onlyActive: req.query.active === "true",
  });
  res.json({ success: true, data: { plans } });
});

router.get("/:id", async (req: Request, res: Response) => {
  const plan = await planService.findById(req.params.id);
  res.json({ success: true, data: { plan } });
});

router.post(
  "/",
  authorize("SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const data = validateRequest(createSchema, req.body);
    const plan = await planService.create(data, req.user!, {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] ?? null,
    });
    res.status(201).json({ success: true, data: { plan } });
  },
);

router.put(
  "/:id",
  authorize("SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const data = validateRequest(updateSchema, req.body);
    const plan = await planService.update(req.params.id, data, req.user!, {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] ?? null,
    });
    res.json({ success: true, data: { plan } });
  },
);

router.delete(
  "/:id",
  authorize("SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const result = await planService.delete(req.params.id, req.user!, {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] ?? null,
    });
    if (!result.deleted) {
      return res.status(409).json({
        success: false,
        message: `Plano em uso por ${result.inUse} condomínio(s). Reatribua antes de excluir.`,
        data: { condominiumsUsing: result.inUse },
      });
    }
    res.json({ success: true });
  },
);

export default router;
