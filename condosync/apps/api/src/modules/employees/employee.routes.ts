import { Router, Request, Response } from "express";
import { prisma } from "../../config/prisma";
import { authenticate, authorize } from "../../middleware/auth";
import { validateRequest } from "../../utils/validateRequest";
import { ForbiddenError, ConflictError } from "../../middleware/errorHandler";
import { z } from "zod";
import bcrypt from "bcryptjs";

const router = Router();
router.use(
  authenticate,
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
);

/** Verifica que o ator pertence ao condominio */
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
  if (!membership) throw new ForbiddenError("Acesso negado a este condominio");
}

// Mapeia valores legados do frontend para o enum correto do banco
const SHIFT_ALIASES: Record<string, string> = {
  FULL_TIME: "FULL_DAY",
  ON_CALL: "MORNING",
};

const employeeSchema = z.object({
  condominiumId: z.string().uuid(),
  name: z.string().min(2),
  cpf: z.string().optional(),
  role: z.string().min(2),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  shift: z.enum(["MORNING", "AFTERNOON", "NIGHT", "FULL_DAY"]).optional().default("MORNING"),
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
      include: { user: { select: { id: true, email: true, role: true, isActive: true } } },
    });
    res.json({ success: true, data: { employees } });
  },
);

router.post("/", async (req: Request, res: Response) => {
  // Normaliza antes do Zod: mapeia aliases de turno, remove strings vazias
  const rawShift = req.body.shift ?? req.body.shiftType ?? "MORNING";
  const normalizedBody = {
    ...req.body,
    shift: SHIFT_ALIASES[rawShift] ?? rawShift,
    email: req.body.email || undefined,
    phone: req.body.phone || undefined,
    cpf: req.body.cpf || undefined,
  };

  const data = validateRequest(employeeSchema, normalizedBody);
  await ensureCondominiumMembership(req.user!.userId, req.user!.role, data.condominiumId);

  const employee = await prisma.employee.create({
    data: {
      condominiumId: data.condominiumId,
      name:          data.name,
      role:          data.role,
      cpf:           data.cpf ?? "",
      shift:         data.shift ?? "MORNING",
      phone:         data.phone,
      email:         data.email,
      salaryAmount:  data.salaryAmount,
      notes:         data.notes,
      admissionDate: data.admissionDate ? new Date(data.admissionDate) : new Date(),
    },
  });
  res.status(201).json({ success: true, data: { employee } });
});

router.put("/:id", async (req: Request, res: Response) => {
  const existing = await prisma.employee.findUniqueOrThrow({
    where: { id: req.params.id },
    select: { condominiumId: true },
  });
  await ensureCondominiumMembership(req.user!.userId, req.user!.role, existing.condominiumId);

  const rawShift = req.body.shift ?? req.body.shiftType;
  const normalizedBody = {
    ...req.body,
    shift: rawShift ? (SHIFT_ALIASES[rawShift] ?? rawShift) : undefined,
    email: req.body.email || undefined,
    phone: req.body.phone || undefined,
  };

  const data = validateRequest(employeeSchema.partial(), normalizedBody);
  const employee = await prisma.employee.update({
    where: { id: req.params.id },
    data: {
      name:          data.name,
      role:          data.role,
      phone:         data.phone,
      email:         data.email,
      shift:         data.shift,
      admissionDate: data.admissionDate ? new Date(data.admissionDate) : undefined,
    },
  });
  res.json({ success: true, data: { employee } });
});

router.delete("/:id", async (req: Request, res: Response) => {
  const existing = await prisma.employee.findUniqueOrThrow({
    where: { id: req.params.id },
    select: { condominiumId: true },
  });
  await ensureCondominiumMembership(req.user!.userId, req.user!.role, existing.condominiumId);
  await prisma.employee.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.json({ success: true });
});

// POST /employees/:id/grant-access
const grantAccessSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  systemRole: z.enum(["DOORMAN", "CONDOMINIUM_ADMIN", "SYNDIC", "COUNCIL_MEMBER", "SERVICE_PROVIDER"]),
});

router.post("/:id/grant-access", async (req: Request, res: Response) => {
  const employee = await prisma.employee.findUniqueOrThrow({
    where: { id: req.params.id },
    select: { id: true, condominiumId: true, name: true, userId: true },
  });
  await ensureCondominiumMembership(req.user!.userId, req.user!.role, employee.condominiumId);

  if (employee.userId) {
    throw new ConflictError("Este funcionario ja possui uma conta de acesso vinculada");
  }

  const data = validateRequest(grantAccessSchema, req.body);
  const existingUser = await prisma.user.findUnique({ where: { email: data.email } });

  let userId: string;

  if (existingUser) {
    userId = existingUser.id;
  } else {
    const rounds = parseInt(process.env.BCRYPT_ROUNDS ?? "10");
    const passwordHash = await bcrypt.hash(data.password, rounds);
    const newUser = await prisma.user.create({
      data: {
        email: data.email,
        name: employee.name,
        passwordHash,
        role: data.systemRole,
        isActive: true,
      },
    });
    userId = newUser.id;
  }

  const existingMembership = await prisma.condominiumUser.findUnique({
    where: { userId_condominiumId: { userId, condominiumId: employee.condominiumId } },
  });

  if (!existingMembership) {
    await prisma.condominiumUser.create({
      data: { userId, condominiumId: employee.condominiumId, role: data.systemRole, isActive: true },
    });
  } else {
    await prisma.condominiumUser.update({
      where: { userId_condominiumId: { userId, condominiumId: employee.condominiumId } },
      data: { role: data.systemRole, isActive: true },
    });
  }

  await prisma.employee.update({ where: { id: employee.id }, data: { userId } });

  res.status(201).json({ success: true, message: "Acesso ao sistema concedido com sucesso" });
});

// DELETE /employees/:id/revoke-access
router.delete("/:id/revoke-access", async (req: Request, res: Response) => {
  const employee = await prisma.employee.findUniqueOrThrow({
    where: { id: req.params.id },
    select: { id: true, condominiumId: true, userId: true },
  });
  await ensureCondominiumMembership(req.user!.userId, req.user!.role, employee.condominiumId);

  if (!employee.userId) {
    throw new ConflictError("Este funcionario nao possui conta de acesso vinculada");
  }

  await prisma.condominiumUser.updateMany({
    where: { userId: employee.userId, condominiumId: employee.condominiumId },
    data: { isActive: false },
  });

  await prisma.employee.update({ where: { id: employee.id }, data: { userId: null } });

  res.json({ success: true, message: "Acesso revogado com sucesso" });
});

export default router;