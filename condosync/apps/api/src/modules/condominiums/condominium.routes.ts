import { Router, Request, Response } from "express";
import { prisma } from "../../config/prisma";
import { authenticate, authorize } from "../../middleware/auth";
import { validateRequest } from "../../utils/validateRequest";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { ForbiddenError } from "../../middleware/errorHandler";
import { residentService } from "../residents/resident.service";
import bcrypt from "bcryptjs";

const router = Router();
router.use(authenticate);

/** Verifica que o ator pertence ao condomÃ­nio indicado */
async function ensureCondominiumMembership(
  userId: string,
  role: UserRole,
  condominiumId: string,
) {
  if (role === UserRole.SUPER_ADMIN) return;
  const membership = await prisma.condominiumUser.findFirst({
    where: { userId, condominiumId, isActive: true },
    select: { id: true },
  });
  if (!membership) throw new ForbiddenError("Acesso negado a este condomÃ­nio");
}

const createSchema = z.object({
  name: z.string().min(3),
  cnpj: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length === 0 || v.length === 14, "CNPJ deve conter 14 dígitos")
    .optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  timezone: z.string().optional(),
  plan: z.enum(["basic", "professional", "enterprise"]).optional(),
  maxUnits: z.number().int().positive().optional(),
});

router.get("/", async (req: Request, res: Response) => {
  const condominiums = await prisma.condominium.findMany({
    where:
      req.user!.role === "SUPER_ADMIN"
        ? {}
        : {
            condominiumUsers: {
              some: { userId: req.user!.userId, isActive: true },
            },
          },
    include: { _count: { select: { units: true, condominiumUsers: true } } },
    orderBy: { name: "asc" },
  });
  res.json({ success: true, data: { condominiums } });
});

router.post(
  "/",
  authorize("SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const data = validateRequest(createSchema, req.body);
    const condominium = await prisma.condominium.create({
      data: {
        address: "",
        city: "",
        state: "",
        zipCode: "",
        ...data,
      },
    });
    res.status(201).json({ success: true, data: { condominium } });
  },
);

// D1 â€” GET /:id verifica membership para nÃ£o-super-admins
router.get("/:id", async (req: Request, res: Response) => {
  await ensureCondominiumMembership(
    req.user!.userId,
    req.user!.role as UserRole,
    req.params.id,
  );
  const condominium = await prisma.condominium.findUniqueOrThrow({
    where: { id: req.params.id },
    include: {
      _count: {
        select: {
          units: true,
          employees: true,
          serviceProviders: true,
          commonAreas: true,
        },
      },
    },
  });
  res.json({ success: true, data: { condominium } });
});

// D2 â€” PUT /:id verifica membership antes de editar
router.put(
  "/:id",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    await ensureCondominiumMembership(
      req.user!.userId,
      req.user!.role as UserRole,
      req.params.id,
    );
    const data = validateRequest(createSchema.partial(), req.body);
    const condominium = await prisma.condominium.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ success: true, data: { condominium } });
  },
);

// ── Setup Admin ─────────────────────────────────────────────────
// Cria um usuário CONDOMINIUM_ADMIN e vincula ao condomínio (SUPER_ADMIN only)
router.post(
  "/:id/setup-admin",
  authorize("SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const schema = z.object({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
    });
    const { name, email, password } = validateRequest(schema, req.body);

    // Verifica que o condomínio existe
    await prisma.condominium.findUniqueOrThrow({ where: { id: req.params.id } });

    const rounds = Number(process.env.BCRYPT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(password, rounds);

    const { user, membership } = await prisma.$transaction(async (tx) => {
      // Cria o usuário (ou reutiliza se email já existe no sistema)
      let user = await tx.user.findUnique({ where: { email } });
      if (user) {
        // Se já existe, só atualiza a senha
        user = await tx.user.update({
          where: { id: user.id },
          data: { passwordHash, role: UserRole.CONDOMINIUM_ADMIN, isActive: true },
        });
      } else {
        user = await tx.user.create({
          data: { name, email, passwordHash, role: UserRole.CONDOMINIUM_ADMIN },
        });
      }
      // Vincula como CONDOMINIUM_ADMIN do condomínio
      const membership = await tx.condominiumUser.upsert({
        where: { userId_condominiumId: { userId: user.id, condominiumId: req.params.id } },
        update: { role: UserRole.CONDOMINIUM_ADMIN, isActive: true },
        create: { userId: user.id, condominiumId: req.params.id, role: UserRole.CONDOMINIUM_ADMIN },
      });
      return { user, membership };
    });

    res.status(201).json({
      success: true,
      data: {
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        membership,
      },
    });
  },
);

// Adicionar membro ao condomínio
router.post(
  "/:id/members",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    await ensureCondominiumMembership(
      req.user!.userId,
      req.user!.role as UserRole,
      req.params.id,
    );
    const schema = z.object({
      userId: z.string().uuid(),
      role: z.nativeEnum(UserRole),
      unitId: z.string().uuid().optional(),
    });
    const { userId, role, unitId } = validateRequest(schema, req.body);

    residentService.assertResidentRoleRequiresUnit(role, unitId);
    if (role === UserRole.RESIDENT) {
      await residentService.assertResidentUnitBelongsToCondominium(
        req.params.id,
        unitId!,
      );
    }

    const member = await prisma.condominiumUser.upsert({
      where: { userId_condominiumId: { userId, condominiumId: req.params.id } },
      update: { role, unitId, isActive: true },
      create: { userId, condominiumId: req.params.id, role, unitId },
    });
    res.status(201).json({ success: true, data: { member } });
  },
);

// D3 â€” GET /:id/members requer autorizaÃ§Ã£o e membership
router.get(
  "/:id/members",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "COUNCIL_MEMBER", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    await ensureCondominiumMembership(
      req.user!.userId,
      req.user!.role as UserRole,
      req.params.id,
    );
    const members = await prisma.condominiumUser.findMany({
      where: { condominiumId: req.params.id, isActive: true },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            phone: true,
          },
        },
        unit: { select: { identifier: true, block: true } },
      },
      orderBy: { joinedAt: "asc" },
    });
    res.json({ success: true, data: { members } });
  },
);

// D4 â€” DELETE /:id/members verifica membership do ator
router.delete(
  "/:id/members/:userId",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    await ensureCondominiumMembership(
      req.user!.userId,
      req.user!.role as UserRole,
      req.params.id,
    );
    await prisma.condominiumUser.deleteMany({
      where: { condominiumId: req.params.id, userId: req.params.userId },
    });
    res.json({ success: true });
  },
);

export default router;
