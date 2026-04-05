import { Router, Request, Response } from "express";
import { prisma } from "../../config/prisma";
import { authenticate, authorize } from "../../middleware/auth";
import { validateRequest } from "../../utils/validateRequest";
import { ForbiddenError, ConflictError } from "../../middleware/errorHandler";
import { z } from "zod";
import bcrypt from "bcrypt";

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
      include: { user: { select: { id: true, email: true, role: true, isActive: true } } },
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

// POST /employees/:id/grant-access — cria ou vincula conta de acesso ao sistema
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
    throw new ConflictError("Este funcionário já possui uma conta de acesso vinculada");
  }

  const data = validateRequest(grantAccessSchema, req.body);

  // Verificar se o e-mail já existe no sistema
  const existingUser = await prisma.user.findUnique({ where: { email: data.email } });

  let userId: string;

  if (existingUser) {
    // Vincular conta existente ao funcionário
    userId = existingUser.id;
  } else {
    // Criar nova conta de usuário
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

  // Verificar se já existe vínculo com o condomínio
  const existingMembership = await prisma.condominiumUser.findUnique({
    where: { userId_condominiumId: { userId, condominiumId: employee.condominiumId } },
  });

  if (!existingMembership) {
    await prisma.condominiumUser.create({
      data: { userId, condominiumId: employee.condominiumId, role: data.systemRole, isActive: true },
    });
  } else {
    // Atualizar role se já existe vínculo
    await prisma.condominiumUser.update({
      where: { userId_condominiumId: { userId, condominiumId: employee.condominiumId } },
      data: { role: data.systemRole, isActive: true },
    });
  }

  // Vincular o userId ao Employee
  await prisma.employee.update({
    where: { id: employee.id },
    data: { userId },
  });

  res.status(201).json({ success: true, message: "Acesso ao sistema concedido com sucesso" });
});

// DELETE /employees/:id/revoke-access — remove o vínculo de acesso sem apagar o usuário
router.delete("/:id/revoke-access", async (req: Request, res: Response) => {
  const employee = await prisma.employee.findUniqueOrThrow({
    where: { id: req.params.id },
    select: { id: true, condominiumId: true, userId: true },
  });
  await ensureCondominiumMembership(req.user!.userId, req.user!.role, employee.condominiumId);

  if (!employee.userId) {
    throw new ConflictError("Este funcionário não possui conta de acesso vinculada");
  }

  await prisma.condominiumUser.updateMany({
    where: { userId: employee.userId, condominiumId: employee.condominiumId },
    data: { isActive: false },
  });

  await prisma.employee.update({
    where: { id: employee.id },
    data: { userId: null },
  });

  res.json({ success: true, message: "Acesso revogado com sucesso" });
});

export default router;
