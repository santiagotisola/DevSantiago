import { Router, Request, Response } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { validateRequest } from "../../utils/validateRequest";
import { z } from "zod";
import { employeeService, normalizeShift } from "./employee.service";

const router = Router();
router.use(
  authenticate,
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
);

const employeeSchema = z.object({
  condominiumId: z.string().uuid(),
  name: z.string().min(2),
  cpf: z.string().optional(),
  role: z.string().min(2),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  shift: z
    .enum(["MORNING", "AFTERNOON", "NIGHT", "FULL_DAY"])
    .optional()
    .default("MORNING"),
  admissionDate: z.string().datetime().optional(),
  salaryAmount: z.number().positive().optional(),
  notes: z.string().optional(),
});

router.get(
  "/condominium/:condominiumId",
  async (req: Request, res: Response) => {
    const employees = await employeeService.listByCondominium(
      req.params.condominiumId,
      req.user!,
    );
    res.json({ success: true, data: { employees } });
  },
);

router.post("/", async (req: Request, res: Response) => {
  const rawShift = req.body.shift ?? req.body.shiftType ?? "MORNING";
  const normalizedBody = {
    ...req.body,
    shift: normalizeShift(rawShift),
    email: req.body.email || undefined,
    phone: req.body.phone || undefined,
    cpf: req.body.cpf || undefined,
  };

  const data = validateRequest(employeeSchema, normalizedBody);
  const employee = await employeeService.create(data, req.user!);
  res.status(201).json({ success: true, data: { employee } });
});

router.put("/:id", async (req: Request, res: Response) => {
  const rawShift = req.body.shift ?? req.body.shiftType;
  const normalizedBody = {
    ...req.body,
    shift: normalizeShift(rawShift),
    email: req.body.email || undefined,
    phone: req.body.phone || undefined,
  };
  const data = validateRequest(employeeSchema.partial(), normalizedBody);
  const employee = await employeeService.update(req.params.id, data, req.user!);
  res.json({ success: true, data: { employee } });
});

router.delete("/:id", async (req: Request, res: Response) => {
  await employeeService.softDelete(req.params.id, req.user!);
  res.json({ success: true });
});

const grantAccessSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  systemRole: z.enum([
    "DOORMAN",
    "CONDOMINIUM_ADMIN",
    "SYNDIC",
    "COUNCIL_MEMBER",
    "SERVICE_PROVIDER",
  ]),
});

router.post("/:id/grant-access", async (req: Request, res: Response) => {
  const data = validateRequest(grantAccessSchema, req.body);
  await employeeService.grantAccess(req.params.id, data, req.user!);
  res
    .status(201)
    .json({ success: true, message: "Acesso ao sistema concedido com sucesso" });
});

router.delete("/:id/revoke-access", async (req: Request, res: Response) => {
  await employeeService.revokeAccess(req.params.id, req.user!);
  res.json({ success: true, message: "Acesso revogado com sucesso" });
});

export default router;
