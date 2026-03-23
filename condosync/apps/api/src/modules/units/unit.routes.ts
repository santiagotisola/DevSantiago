import { Router, Request, Response } from "express";
import {
  authenticate,
  authorize,
  authorizeCondominium,
} from "../../middleware/auth";
import { validateRequest } from "../../utils/validateRequest";
import { z } from "zod";
import { unitService } from "./unit.service";

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
    const units = await unitService.list(
      req.params.condominiumId,
      req.user!,
      req.query.status as string | undefined,
    );
    res.json({ success: true, data: { units } });
  },
);

router.post(
  "/",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const data = validateRequest(unitSchema, req.body);
    const unit = await unitService.create(data, req.user!);
    res.status(201).json({ success: true, data: { unit } });
  },
);

router.get("/:id", async (req: Request, res: Response) => {
  const unit = await unitService.findById(req.params.id, req.user!);
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
    const unit = await unitService.update(req.params.id, rest, req.user!);
    res.json({ success: true, data: { unit } });
  },
);

export default router;