import { Router, Request, Response } from "express";
import { prisma } from "../../config/prisma";
import { authenticate, authorize } from "../../middleware/auth";
import { validateRequest } from "../../utils/validateRequest";
import { ForbiddenError } from "../../middleware/errorHandler";
import { z } from "zod";

const router = Router();
router.use(authenticate, authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"));

async function ensureMembership(actorId: string, role: string, condominiumId: string) {
  if (role === "SUPER_ADMIN") return;
  const m = await prisma.condominiumUser.findFirst({
    where: { userId: actorId, condominiumId, isActive: true },
    select: { id: true },
  });
  if (!m) throw new ForbiddenError("Acesso negado a este condomínio");
}

// GET /permissions/condominium/:id/members
// Lista todos os membros do condomínio com perfil, e-mail, unidade
router.get("/condominium/:id/members", async (req: Request, res: Response) => {
  await ensureMembership(req.user!.userId, req.user!.role, req.params.id);

  const members = await prisma.condominiumUser.findMany({
    where: { condominiumId: req.params.id },
    include: {
      user: { select: { id: true, name: true, email: true, role: true, isActive: true, avatarUrl: true, lastLoginAt: true } },
      unit: { select: { id: true, identifier: true, block: true } },
    },
    orderBy: [{ isActive: "desc" }, { role: "asc" }],
  });

  res.json({ success: true, data: { members } });
});

// PATCH /permissions/condominium/:condominiumId/members/:userId — altera o perfil de um membro
const changRoleSchema = z.object({
  role: z.enum(["CONDOMINIUM_ADMIN", "SYNDIC", "DOORMAN", "RESIDENT", "SERVICE_PROVIDER", "COUNCIL_MEMBER"]),
});

router.patch("/condominium/:condominiumId/members/:userId", async (req: Request, res: Response) => {
  await ensureMembership(req.user!.userId, req.user!.role, req.params.condominiumId);

  const { role } = validateRequest(changRoleSchema, req.body);

  // Proteção: não pode alterar um SUPER_ADMIN nem promover a SUPER_ADMIN
  const target = await prisma.user.findUniqueOrThrow({
    where: { id: req.params.userId },
    select: { role: true },
  });
  if (target.role === "SUPER_ADMIN") {
    throw new ForbiddenError("Não é possível alterar o perfil de um Super Admin");
  }

  // Atualiza perfil no CondominiumUser (perfil do condomínio)
  const updated = await prisma.condominiumUser.update({
    where: { userId_condominiumId: { userId: req.params.userId, condominiumId: req.params.condominiumId } },
    data: { role },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  // Sincronizar o role global do User se não for SUPER_ADMIN
  if (req.user!.role === "SUPER_ADMIN" || req.user!.role === "CONDOMINIUM_ADMIN") {
    await prisma.user.update({ where: { id: req.params.userId }, data: { role } });
  }

  res.json({ success: true, data: { member: updated } });
});

// PATCH /permissions/condominium/:condominiumId/members/:userId/toggle — ativa/desativa membro
router.patch("/condominium/:condominiumId/members/:userId/toggle", async (req: Request, res: Response) => {
  await ensureMembership(req.user!.userId, req.user!.role, req.params.condominiumId);

  const target = await prisma.condominiumUser.findUniqueOrThrow({
    where: { userId_condominiumId: { userId: req.params.userId, condominiumId: req.params.condominiumId } },
    select: { isActive: true, user: { select: { role: true } } },
  });

  if (target.user.role === "SUPER_ADMIN") {
    throw new ForbiddenError("Não é possível desativar um Super Admin");
  }

  const updated = await prisma.condominiumUser.update({
    where: { userId_condominiumId: { userId: req.params.userId, condominiumId: req.params.condominiumId } },
    data: { isActive: !target.isActive },
  });

  res.json({ success: true, data: { isActive: updated.isActive } });
});

// PATCH /permissions/condominium/:condominiumId/members/:userId/update — edita dados completos do membro
const updateMemberSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: z.enum(["CONDOMINIUM_ADMIN", "SYNDIC", "DOORMAN", "RESIDENT", "SERVICE_PROVIDER", "COUNCIL_MEMBER"]).optional(),
  unitId: z.string().nullable().optional(),
});

router.patch("/condominium/:condominiumId/members/:userId/update", async (req: Request, res: Response) => {
  await ensureMembership(req.user!.userId, req.user!.role, req.params.condominiumId);

  const data = validateRequest(updateMemberSchema, req.body);

  const target = await prisma.user.findUniqueOrThrow({
    where: { id: req.params.userId },
    select: { role: true },
  });

  if (target.role === "SUPER_ADMIN") {
    throw new ForbiddenError("Não é possível alterar um Super Admin");
  }

  // Atualiza nome e e-mail do usuário (só atualiza e-mail se mudou)
  const currentUser = await prisma.user.findUniqueOrThrow({
    where: { id: req.params.userId },
    select: { email: true },
  });

  const emailChanged = data.email !== undefined && data.email !== currentUser.email;

  if (data.name !== undefined || emailChanged) {
    if (emailChanged) {
      const existing = await prisma.user.findUnique({ where: { email: data.email! } });
      if (existing) {
        res.status(409).json({ success: false, message: 'Este e-mail já está em uso por outro usuário' });
        return;
      }
    }
    await prisma.user.update({
      where: { id: req.params.userId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(emailChanged && { email: data.email }),
      },
    });
  }

  // Atualiza role e unidade no CondominiumUser
  const cuData: Record<string, unknown> = {};
  if (data.role !== undefined) cuData.role = data.role;
  if (data.unitId !== undefined) cuData.unitId = data.unitId ?? null;

  if (Object.keys(cuData).length > 0) {
    await prisma.condominiumUser.update({
      where: { userId_condominiumId: { userId: req.params.userId, condominiumId: req.params.condominiumId } },
      data: cuData,
    });
  }

  // Sincroniza role global
  if (data.role && (req.user!.role === "SUPER_ADMIN" || req.user!.role === "CONDOMINIUM_ADMIN")) {
    await prisma.user.update({ where: { id: req.params.userId }, data: { role: data.role } });
  }

  res.json({ success: true });
});

export default router;
