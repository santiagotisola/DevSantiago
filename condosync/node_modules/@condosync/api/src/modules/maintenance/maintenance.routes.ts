import { Router, Request, Response } from "express";
import { maintenanceService } from "./maintenance.service";
import {
  authenticate,
  authorize,
  authorizeCondominium,
} from "../../middleware/auth";
import { validateRequest } from "../../utils/validateRequest";
import { z } from "zod";

const router = Router();
router.use(authenticate);

const createSchema = z.object({
  condominiumId: z.string().uuid(),
  unitId: z.string().uuid().optional(),
  title: z.string().min(3),
  description: z.string().min(10),
  category: z.string().min(2),
  location: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  photoUrls: z.array(z.string().url()).optional(),
  estimatedCost: z.number().positive().optional(),
  scheduledAt: z.string().datetime().optional(),
});

const updateStatusSchema = z.object({
  status: z.enum([
    "OPEN",
    "IN_PROGRESS",
    "WAITING_PARTS",
    "COMPLETED",
    "CANCELED",
  ]),
  resolution: z.string().optional(),
  finalCost: z.number().positive().optional(),
  rating: z.number().min(1).max(5).optional(),
  feedback: z.string().optional(),
});

const updateOrderSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().min(10).optional(),
  category: z.string().min(2).optional(),
  location: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  estimatedCost: z.number().positive().optional(),
  scheduledAt: z.string().datetime().optional(),
});

const assignSchema = z.object({
  serviceProviderId: z.string().uuid().optional(),
  assignedTo: z.string().optional(),
});

router.get(
  "/condominium/:condominiumId",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  authorizeCondominium,
  async (req: Request, res: Response) => {
    const data = await maintenanceService.listOrders(req.params.condominiumId, {
      status: req.query.status as any,
      priority: req.query.priority as any,
      category: req.query.category as string,
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
    });
    res.json({ success: true, data });
  },
);

router.post(
  "/",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const data = validateRequest(createSchema, req.body);
    const order = await maintenanceService.create(
      {
        ...data,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
      },
      req.user!.userId,
      req.user!,
    );
    res.status(201).json({ success: true, data: { order } });
  },
);

router.get(
  "/:id",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const order = await maintenanceService.findById(req.params.id, req.user!);
    res.json({ success: true, data: { order } });
  },
);

router.patch(
  "/:id",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const data = validateRequest(updateOrderSchema, req.body);
    const order = await maintenanceService.updateOrder(
      req.params.id,
      req.user!,
      {
        ...data,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
      },
    );
    res.json({ success: true, data: { order } });
  },
);

router.patch(
  "/:id/status",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const data = validateRequest(updateStatusSchema, req.body);
    const order = await maintenanceService.updateStatus(
      req.params.id,
      data.status as any,
      req.user!,
      data,
    );
    res.json({ success: true, data: { order } });
  },
);

router.patch(
  "/:id/assign",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const data = validateRequest(assignSchema, req.body);
    const order = await maintenanceService.assign(
      req.params.id,
      req.user!,
      data.serviceProviderId,
      data.assignedTo,
    );
    res.json({ success: true, data: { order } });
  },
);

router.get(
  "/schedules/:condominiumId",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  authorizeCondominium,
  async (req: Request, res: Response) => {
    const schedules = await maintenanceService.listSchedules(
      req.params.condominiumId,
    );
    res.json({ success: true, data: { schedules } });
  },
);

const scheduleCreateSchema = z.object({
  condominiumId: z.string().uuid(),
  title: z.string().min(3),
  description: z.string().optional(),
  category: z.string().min(2),
  location: z.string().min(2),
  frequency: z.enum([
    "diário",
    "semanal",
    "quinzenal",
    "mensal",
    "trimestral",
    "semestral",
    "anual",
  ]),
  nextDueDate: z.string().datetime(),
  estimatedCost: z.number().positive().optional(),
});

const scheduleUpdateSchema = scheduleCreateSchema
  .omit({ condominiumId: true })
  .partial();

router.post(
  "/schedules",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  authorizeCondominium,
  async (req: Request, res: Response) => {
    const data = validateRequest(scheduleCreateSchema, req.body);
    const schedule = await maintenanceService.createSchedule(req.user!, {
      ...data,
      nextDueDate: new Date(data.nextDueDate),
    });
    res.status(201).json({ success: true, data: { schedule } });
  },
);

router.patch(
  "/schedules/:id/done",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const schedule = await maintenanceService.markScheduleDone(
      req.params.id,
      req.user!,
    );
    res.json({ success: true, data: { schedule } });
  },
);

router.patch(
  "/schedules/:id",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const data = validateRequest(scheduleUpdateSchema, req.body);
    const schedule = await maintenanceService.updateSchedule(
      req.params.id,
      req.user!,
      {
        ...data,
        nextDueDate: data.nextDueDate ? new Date(data.nextDueDate) : undefined,
      },
    );
    res.json({ success: true, data: { schedule } });
  },
);

router.delete(
  "/schedules/:id",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    await maintenanceService.deleteSchedule(req.params.id, req.user!);
    res.json({ success: true });
  },
);

export default router;
