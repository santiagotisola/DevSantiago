import { Router, Request, Response } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { validateRequest } from "../../utils/validateRequest";
import { z } from "zod";
import { vehicleService } from "./vehicle.service";

const router = Router();
router.use(authenticate);

const vehicleSchema = z.object({
  unitId: z.string().uuid(),
  plate: z
    .string()
    .min(7)
    .max(8)
    .transform((s) => s.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()),
  brand: z.string().min(2),
  model: z.string().min(2),
  color: z.string().min(2),
  year: z
    .number()
    .int()
    .min(1980)
    .max(new Date().getFullYear() + 1)
    .optional(),
  type: z.enum(["CAR", "MOTORCYCLE", "TRUCK", "BICYCLE", "OTHER"]).optional(),
});

router.get("/unit/:unitId", async (req: Request, res: Response) => {
  const vehicles = await vehicleService.listByUnit(
    req.params.unitId,
    req.user!,
  );
  res.json({ success: true, data: { vehicles } });
});

router.post("/", async (req: Request, res: Response) => {
  const data = validateRequest(vehicleSchema, req.body);
  const vehicle = await vehicleService.create(data, req.user!);
  res.status(201).json({ success: true, data: { vehicle } });
});

router.put("/:id", async (req: Request, res: Response) => {
  const data = validateRequest(vehicleSchema.partial(), req.body);
  const vehicle = await vehicleService.update(req.params.id, data, req.user!);
  res.json({ success: true, data: { vehicle } });
});

router.delete("/:id", async (req: Request, res: Response) => {
  await vehicleService.softDelete(req.params.id, req.user!);
  res.json({ success: true });
});

router.get(
  "/access-logs/:condominiumId",
  authorize("DOORMAN", "CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const logs = await vehicleService.listAccessLogs(req.params.condominiumId);
    res.json({ success: true, data: { logs } });
  },
);

router.post(
  "/access-logs",
  authorize("DOORMAN", "CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const schema = z.object({
      plate: z.string().min(1),
      vehicleId: z.string().uuid().optional(),
      unitId: z.string().uuid().optional(),
      isResident: z.boolean().optional(),
      notes: z.string().optional(),
    });
    const data = validateRequest(schema, req.body);
    const log = await vehicleService.createAccessLog(data, req.user!.userId);
    res.status(201).json({ success: true, data: { log } });
  },
);

router.patch(
  "/access-logs/:id/exit",
  authorize("DOORMAN", "CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const log = await vehicleService.setAccessLogExit(
      req.params.id,
      req.user!,
    );
    res.json({ success: true, data: { log } });
  },
);

export default router;
