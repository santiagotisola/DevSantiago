import { Router, Request, Response } from "express";
import { authenticate, authorize, authorizeCondominium } from "../../middleware/auth";
import { validateRequest } from "../../utils/validateRequest";
import { z } from "zod";
import { keyControlService } from "./key-control.service";

const router = Router();
router.use(authenticate);

// ─── Schemas ──────────────────────────────────────────────────

const createSchema = z.object({
  condominiumId: z.string().uuid(),
  keyIdentifier: z.string().min(2),
  description: z.string().optional(),
  location: z.string().optional(),
});

const updateSchema = z.object({
  keyIdentifier: z.string().min(2).optional(),
  description: z.string().optional(),
  location: z.string().optional(),
});

const borrowSchema = z.object({
  borrowedBy: z.string().min(2),
  borrowedByUnit: z.string().optional(),
  notes: z.string().optional(),
});

// ─── Rotas ────────────────────────────────────────────────────

router.get(
  "/condominium/:condominiumId",
  authorizeCondominium,
  async (req: Request, res: Response) => {
    const { status } = req.query;
    const keys = await keyControlService.list(
      req.params.condominiumId,
      req.user!,
      status as any,
    );
    res.json({ success: true, data: { keys } });
  },
);

router.get("/:id", async (req: Request, res: Response) => {
  const key = await keyControlService.getById(req.params.id, req.user!);
  res.json({ success: true, data: { key } });
});

router.get("/:id/logs", async (req: Request, res: Response) => {
  const logs = await keyControlService.getLogs(req.params.id, req.user!);
  res.json({ success: true, data: { logs } });
});

router.post(
  "/",
  authorize("SUPER_ADMIN", "CONDOMINIUM_ADMIN", "SYNDIC", "DOORMAN"),
  authorizeCondominium,
  async (req: Request, res: Response) => {
    const data = validateRequest(createSchema, req.body);
    const key = await keyControlService.create(data, req.user!);
    res.status(201).json({ success: true, data: { key } });
  },
);

router.put(
  "/:id",
  authorize("SUPER_ADMIN", "CONDOMINIUM_ADMIN", "SYNDIC", "DOORMAN"),
  async (req: Request, res: Response) => {
    const data = validateRequest(updateSchema, req.body);
    const key = await keyControlService.update(req.params.id, data, req.user!);
    res.json({ success: true, data: { key } });
  },
);

router.patch(
  "/:id/borrow",
  authorize("SUPER_ADMIN", "CONDOMINIUM_ADMIN", "SYNDIC", "DOORMAN"),
  async (req: Request, res: Response) => {
    const data = validateRequest(borrowSchema, req.body);
    const key = await keyControlService.borrow(req.params.id, data, req.user!);
    res.json({ success: true, data: { key } });
  },
);

router.patch(
  "/:id/return",
  authorize("SUPER_ADMIN", "CONDOMINIUM_ADMIN", "SYNDIC", "DOORMAN"),
  async (req: Request, res: Response) => {
    const { notes } = req.body;
    const key = await keyControlService.return(req.params.id, notes, req.user!);
    res.json({ success: true, data: { key } });
  },
);

router.patch(
  "/:id/lost",
  authorize("SUPER_ADMIN", "CONDOMINIUM_ADMIN", "SYNDIC", "DOORMAN"),
  async (req: Request, res: Response) => {
    const { notes } = req.body;
    const key = await keyControlService.markLost(req.params.id, notes, req.user!);
    res.json({ success: true, data: { key } });
  },
);

router.delete(
  "/:id",
  authorize("SUPER_ADMIN", "CONDOMINIUM_ADMIN", "SYNDIC"),
  async (req: Request, res: Response) => {
    await keyControlService.delete(req.params.id, req.user!);
    res.json({ success: true, message: "Chave removida com sucesso" });
  },
);

export default router;
