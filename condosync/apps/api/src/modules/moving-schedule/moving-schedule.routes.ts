import { Router, Request, Response } from "express";
import { authenticate, authorize, authorizeCondominium } from "../../middleware/auth";
import { validateRequest } from "../../utils/validateRequest";
import { z } from "zod";
import { movingScheduleService } from "./moving-schedule.service";

const router = Router();
router.use(authenticate);

// ─── Schemas ──────────────────────────────────────────────────

const createSchema = z.object({
  condominiumId: z.string().uuid(),
  unitId: z.string().uuid(),
  type: z.enum(["MOVE_IN", "MOVE_OUT", "LARGE_DELIVERY"]),
  scheduledDate: z.string().datetime(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  elevator: z.string().optional(),
  responsibleName: z.string().min(2),
  responsiblePhone: z.string().optional(),
  companyName: z.string().optional(),
  notes: z.string().optional(),
});

const updateSchema = z.object({
  scheduledDate: z.string().datetime().optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  elevator: z.string().optional(),
  responsibleName: z.string().min(2).optional(),
  responsiblePhone: z.string().optional(),
  companyName: z.string().optional(),
  notes: z.string().optional(),
});

// ─── Rotas ────────────────────────────────────────────────────

router.get(
  "/condominium/:condominiumId",
  authorizeCondominium,
  async (req: Request, res: Response) => {
    const { status, month, year } = req.query;
    const schedules = await movingScheduleService.list(
      req.params.condominiumId,
      req.user!,
      {
        status: status as any,
        month: month ? Number(month) : undefined,
        year: year ? Number(year) : undefined,
      },
    );
    res.json({ success: true, data: { schedules } });
  },
);

router.get("/:id", async (req: Request, res: Response) => {
  const schedule = await movingScheduleService.getById(req.params.id, req.user!);
  res.json({ success: true, data: { schedule } });
});

router.post(
  "/",
  authorizeCondominium,
  async (req: Request, res: Response) => {
    const data = validateRequest(createSchema, req.body);
    const schedule = await movingScheduleService.create(data, req.user!);
    res.status(201).json({ success: true, data: { schedule } });
  },
);

router.put("/:id", async (req: Request, res: Response) => {
  const data = validateRequest(updateSchema, req.body);
  const schedule = await movingScheduleService.update(req.params.id, data, req.user!);
  res.json({ success: true, data: { schedule } });
});

router.patch(
  "/:id/approve",
  authorize("SUPER_ADMIN", "CONDOMINIUM_ADMIN", "SYNDIC"),
  async (req: Request, res: Response) => {
    const schedule = await movingScheduleService.approve(req.params.id, req.user!);
    res.json({ success: true, data: { schedule } });
  },
);

router.patch(
  "/:id/reject",
  authorize("SUPER_ADMIN", "CONDOMINIUM_ADMIN", "SYNDIC"),
  async (req: Request, res: Response) => {
    const { reason } = req.body;
    const schedule = await movingScheduleService.reject(req.params.id, reason || "", req.user!);
    res.json({ success: true, data: { schedule } });
  },
);

router.patch(
  "/:id/complete",
  authorize("SUPER_ADMIN", "CONDOMINIUM_ADMIN", "SYNDIC", "DOORMAN"),
  async (req: Request, res: Response) => {
    const schedule = await movingScheduleService.complete(req.params.id, req.user!);
    res.json({ success: true, data: { schedule } });
  },
);

router.patch("/:id/cancel", async (req: Request, res: Response) => {
  const schedule = await movingScheduleService.cancel(req.params.id, req.user!);
  res.json({ success: true, data: { schedule } });
});

export default router;
