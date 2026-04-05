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

export default router;
