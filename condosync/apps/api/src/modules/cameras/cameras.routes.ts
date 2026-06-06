import { Router, Request, Response } from "express";
import { authenticate, authorize, authorizeCondominium } from "../../middleware/auth";
import { validateRequest } from "../../utils/validateRequest";
import { z } from "zod";
import { camerasService } from "./cameras.service";

const router = Router();
router.use(authenticate);

// ─── Schemas ──────────────────────────────────────────────────

const createSchema = z.object({
  condominiumId: z.string().uuid(),
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  location: z.string().min(2, "Localização deve ter pelo menos 2 caracteres"),
  brand: z.string().optional(),
  model: z.string().optional(),
  streamUrl: z.string().url("URL do stream inválida"),
  embedUrl: z.string().url("URL de embed inválida").optional().or(z.literal("")),
  snapshotUrl: z.string().url("URL de snapshot inválida").optional().or(z.literal("")),
  isActive: z.boolean().optional(),
  isRecording: z.boolean().optional(),
  resolution: z.string().optional(),
  notes: z.string().optional(),
});

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  location: z.string().min(2).optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  streamUrl: z.string().url("URL do stream inválida").optional(),
  embedUrl: z.string().url("URL de embed inválida").optional().or(z.literal("")),
  snapshotUrl: z.string().url("URL de snapshot inválida").optional().or(z.literal("")),
  isActive: z.boolean().optional(),
  isRecording: z.boolean().optional(),
  resolution: z.string().optional(),
  notes: z.string().optional(),
});

// ─── Rotas ────────────────────────────────────────────────────

router.get(
  "/condominium/:condominiumId",
  authorizeCondominium,
  async (req: Request, res: Response) => {
    const { location, isActive } = req.query;
    const cameras = await camerasService.list(
      req.params.condominiumId,
      req.user!,
      { location: location as string, isActive: isActive as string },
    );
    res.json({ success: true, data: { cameras } });
  },
);

router.get("/:id", async (req: Request, res: Response) => {
  const camera = await camerasService.getById(req.params.id, req.user!);
  res.json({ success: true, data: { camera } });
});

router.post(
  "/",
  authorize("SUPER_ADMIN", "CONDOMINIUM_ADMIN", "SYNDIC", "DOORMAN"),
  authorizeCondominium,
  async (req: Request, res: Response) => {
    const data = validateRequest(createSchema, req.body);
    const camera = await camerasService.create(data, req.user!);
    res.status(201).json({ success: true, data: { camera } });
  },
);

router.put(
  "/:id",
  authorize("SUPER_ADMIN", "CONDOMINIUM_ADMIN", "SYNDIC", "DOORMAN"),
  async (req: Request, res: Response) => {
    const data = validateRequest(updateSchema, req.body);
    const camera = await camerasService.update(req.params.id, data, req.user!);
    res.json({ success: true, data: { camera } });
  },
);

router.delete(
  "/:id",
  authorize("SUPER_ADMIN", "CONDOMINIUM_ADMIN", "SYNDIC"),
  async (req: Request, res: Response) => {
    const result = await camerasService.delete(req.params.id, req.user!);
    res.json({ success: true, data: result });
  },
);

router.patch(
  "/:id/toggle",
  authorize("SUPER_ADMIN", "CONDOMINIUM_ADMIN", "SYNDIC", "DOORMAN"),
  async (req: Request, res: Response) => {
    const camera = await camerasService.toggleActive(req.params.id, req.user!);
    res.json({ success: true, data: { camera } });
  },
);

export default router;
