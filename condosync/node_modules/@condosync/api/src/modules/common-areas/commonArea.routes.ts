import { Router, Request, Response } from "express";
import {
  authenticate,
  authorize,
  authorizeCondominium,
} from "../../middleware/auth";
import { validateRequest } from "../../utils/validateRequest";
import { z } from "zod";
import { commonAreaService } from "./commonArea.service";

const router = Router();
router.use(authenticate);

// â”€â”€â”€ Schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const createAreaSchema = z.object({
  condominiumId: z.string().uuid(),
  name: z.string().min(2),
  description: z.string().optional(),
  capacity: z.number().int().positive().optional(),
  rules: z.string().optional(),
  requiresApproval: z.boolean().optional(),
  maxDaysAdvance: z.number().int().min(1).max(90).optional(),
  openTime: z.string().optional(),
  closeTime: z.string().optional(),
});

const updateAreaSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  capacity: z.number().int().positive().optional(),
  rules: z.string().optional(),
  requiresApproval: z.boolean().optional(),
  maxDaysAdvance: z.number().int().min(1).max(90).optional(),
  openTime: z.string().optional(),
  closeTime: z.string().optional(),
  isAvailable: z.boolean().optional(),
});

const reservationSchema = z.object({
  commonAreaId: z.string().uuid(),
  unitId: z.string().uuid(),
  title: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  guestCount: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

// â”€â”€â”€ Ãreas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

router.get(
  "/condominium/:condominiumId",
  authorizeCondominium,
  async (req: Request, res: Response) => {
    const areas = await commonAreaService.listAreas(
      req.params.condominiumId,
      req.user!,
    );
    res.json({ success: true, data: { areas } });
  },
);

router.post(
  "/",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  authorizeCondominium,
  async (req: Request, res: Response) => {
    const data = validateRequest(createAreaSchema, req.body);
    const area = await commonAreaService.createArea(data, req.user!);
    res.status(201).json({ success: true, data: { area } });
  },
);

router.patch(
  "/:id",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const data = validateRequest(updateAreaSchema, req.body);
    const area = await commonAreaService.updateArea(
      req.params.id,
      data,
      req.user!,
    );
    res.json({ success: true, data: { area } });
  },
);

router.delete(
  "/:id",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    await commonAreaService.deleteArea(req.params.id, req.user!);
    res.json({ success: true });
  },
);

router.get("/:areaId/reservations", async (req: Request, res: Response) => {
  const reservations = await commonAreaService.listAreaReservations(
    req.params.areaId,
    req.user!,
    req.query.startDate as string | undefined,
    req.query.endDate as string | undefined,
  );
  res.json({ success: true, data: { reservations } });
});

// â”€â”€â”€ Reservas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

router.post("/reservations", async (req: Request, res: Response) => {
  const data = validateRequest(reservationSchema, req.body);
  const reservation = await commonAreaService.createReservation(
    {
      ...data,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
    },
    req.user!.userId,
    req.user!,
  );
  res.status(201).json({ success: true, data: { reservation } });
});

router.patch(
  "/reservations/:id/approve",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const reservation = await commonAreaService.approveReservation(
      req.params.id,
      req.user!.userId,
      req.user!,
    );
    res.json({ success: true, data: { reservation } });
  },
);

router.patch(
  "/reservations/:id/cancel",
  async (req: Request, res: Response) => {
    const reservation = await commonAreaService.cancelReservation(
      req.params.id,
      req.user!.userId,
      req.user!,
      req.body.reason,
    );
    res.json({ success: true, data: { reservation } });
  },
);

router.get(
  "/reservations/unit/:unitId",
  async (req: Request, res: Response) => {
    const reservations = await commonAreaService.listReservationsByUnit(
      req.params.unitId,
      req.user!,
    );
    res.json({ success: true, data: { reservations } });
  },
);

router.get(
  "/reservations/condominium/:condominiumId",
  authorizeCondominium,
  async (req: Request, res: Response) => {
    const reservations = await commonAreaService.listReservationsByCondominium(
      req.params.condominiumId,
      req.user!,
    );
    res.json({ success: true, data: { reservations } });
  },
);

export default router;