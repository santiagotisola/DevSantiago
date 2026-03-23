import { Router, Request, Response } from "express";
import { prisma } from "../../config/prisma";
import { authenticate, authorize } from "../../middleware/auth";
import { validateRequest } from "../../utils/validateRequest";
import { ForbiddenError } from "../../middleware/errorHandler";
import { z } from "zod";

const router = Router();
router.use(
  authenticate,
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
);

/** Verifica que o ator pertence ao condomÃ­nio */
async function ensureCondominiumMembership(
  userId: string,
  role: string,
  condominiumId: string,
) {
  if (role === "SUPER_ADMIN") return;
  const membership = await prisma.condominiumUser.findFirst({
    where: { userId, condominiumId, isActive: true },
    select: { id: true },
  });
  if (!membership) throw new ForbiddenError("Acesso negado a este condomÃ­nio");
}

const employeeSchema = z.object({
  condominiumId: z.string().uuid(),
  name: z.string().min(2),
  cpf: z.string().length(11).optional(),
  role: z.string().min(2),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  shift: z
    .enum(["MORNING", "AFTERNOON", "NIGHT", "FULL_DAY"])
    .optional()
    .default("MORNING"),
  shiftType: z.enum(["MORNING", "AFTERNOON", "NIGHT", "FULL_DAY"]).optional(),
  admissionDate: z.string().datetime().optional(),
  salaryAmount: z.number().positive().optional(),
  notes: z.string().optional(),
});

router.get(
  "/condominium/:condominiumId",
  async (req: Request, res: Response) => {
    await ensureCondominiumMembership(
      req.user!.userId,
      req.user!.role,
      req.params.condominiumId,
    );
    const employees = await prisma.employee.findMany({
      where: { condominiumId: req.params.condominiumId, isActive: true },
      orderBy: { name: "asc" },
    });
    res.json({ success: true, data: { employees } });
  },
);

// E3 â€” verifica membership para condominiumId do body
router.post("/", async (req: Request, res: Response) => {
  const data = validateRequest(employeeSchema, req.body);
  await ensureCondominiumMembership(
    req.user!.userId,
    req.user!.role,
    data.condominiumId,
  );
  const shift = data.shift ?? data.shiftType ?? "MORNING";
  const { shiftType: _st, ...rest } = data;
  const employee = await prisma.employee.create({
    data: {
      ...rest,
      shift,
      cpf: rest.cpf ?? "",
      admissionDate: data.admissionDate
        ? new Date(data.admissionDate)
        : new Date(),
    },
  });
  res.status(201).json({ success: true, data: { employee } });
});

// E1 â€” IDOR fix: busca funcionÃ¡rio, verifica condomÃ­nio antes de editar
router.put("/:id", async (req: Request, res: Response) => {
  const existing = await prisma.employee.findUniqueOrThrow({
    where: { id: req.params.id },
    select: { condominiumId: true },
  });
  await ensureCondominiumMembership(
    req.user!.userId,
    req.user!.role,
    existing.condominiumId,
  );
  const data = validateRequest(employeeSchema.partial(), req.body);
  const employee = await prisma.employee.update({
    where: { id: req.params.id },
    data: {
      ...data,
      admissionDate: data.admissionDate
        ? new Date(data.admissionDate)
        : undefined,
    },
  });
  res.json({ success: true, data: { employee } });
});

// E2 â€” IDOR fix: busca funcionÃ¡rio, verifica condomÃ­nio antes de desativar
router.delete("/:id", async (req: Request, res: Response) => {
  const existing = await prisma.employee.findUniqueOrThrow({
    where: { id: req.params.id },
    select: { condominiumId: true },
  });
  await ensureCondominiumMembership(
    req.user!.userId,
    req.user!.role,
    existing.condominiumId,
  );
  await prisma.employee.update({
    where: { id: req.params.id },
    data: { isActive: false },
  });
  res.json({ success: true });
});

export default router;
