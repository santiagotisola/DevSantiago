import { Router, Request, Response } from "express";
import { prisma } from "../../config/prisma";
import { authenticate, authorize } from "../../middleware/auth";
import { validateRequest } from "../../utils/validateRequest";
import { ForbiddenError } from "../../middleware/errorHandler";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import bcrypt from "bcryptjs";

const router = Router();
router.use(authenticate);

// Listar usuÃ¡rios do sistema (super admin)
router.get(
  "/",
  authorize("SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: Number(req.query.limit) || 50,
      skip:
        ((Number(req.query.page) || 1) - 1) * (Number(req.query.limit) || 50),
    });
    res.json({ success: true, data: { users } });
  },
);

// M1 â€” GET /:id: SUPER_ADMIN vÃª tudo; outros sÃ³ podem ver perfil do mesmo condomÃ­nio
router.get("/:id", async (req: Request, res: Response) => {
  const actor = req.user!;

  if (actor.role !== UserRole.SUPER_ADMIN && actor.userId !== req.params.id) {
    // Verifica que ator e alvo compartilham um condomÃ­nio ativo
    const sharedCondominium = await prisma.condominiumUser.findFirst({
      where: {
        userId: actor.userId,
        isActive: true,
        condominium: {
          condominiumUsers: { some: { userId: req.params.id, isActive: true } },
        },
      },
      select: { id: true },
    });
    if (!sharedCondominium) throw new ForbiddenError("Acesso negado");
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: req.params.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatarUrl: true,
      role: true,
      createdAt: true,
      lastLoginAt: true,
      condominiumUsers: {
        include: {
          condominium: { select: { id: true, name: true } },
          unit: { select: { identifier: true, block: true } },
        },
      },
    },
  });
  res.json({ success: true, data: { user } });
});

// Atualizar perfil
router.put("/:id", async (req: Request, res: Response) => {
  if (req.user!.userId !== req.params.id && req.user!.role !== "SUPER_ADMIN") {
    return res
      .status(403)
      .json({ success: false, error: { message: "Acesso negado" } });
  }

  const schema = z.object({
    name: z.string().min(2).optional(),
    phone: z.string().optional(),
    avatarUrl: z.string().url().optional(),
  });
  const data = validateRequest(schema, req.body);
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatarUrl: true,
      role: true,
    },
  });
  res.json({ success: true, data: { user } });
});

// M3 — reset-password: SUPER_ADMIN pode redefinir senha de qualquer usuário;
//       CONDOMINIUM_ADMIN pode redefinir senha de membros do seu condomínio
router.patch(
  "/:id/reset-password",
  authorize("SUPER_ADMIN", "CONDOMINIUM_ADMIN"),
  async (req: Request, res: Response) => {
    const actor = req.user!;
    const schema = z.object({ newPassword: z.string().min(6) });
    const { newPassword } = validateRequest(schema, req.body);

    const target = await prisma.user.findUniqueOrThrow({
      where: { id: req.params.id },
      select: { role: true },
    });

    if (actor.role === UserRole.CONDOMINIUM_ADMIN) {
      if (
        target.role === UserRole.SUPER_ADMIN ||
        target.role === UserRole.CONDOMINIUM_ADMIN
      ) {
        throw new ForbiddenError(
          "Você não tem permissão para redefinir a senha deste usuário",
        );
      }
      const shared = await prisma.condominiumUser.findFirst({
        where: {
          userId: actor.userId,
          isActive: true,
          condominium: {
            condominiumUsers: { some: { userId: req.params.id, isActive: true } },
          },
        },
        select: { id: true },
      });
      if (!shared)
        throw new ForbiddenError("Usuário não pertence ao seu condomínio");
    }

    const rounds = Number(process.env.BCRYPT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(newPassword, rounds);
    await prisma.user.update({ where: { id: req.params.id }, data: { passwordHash } });
    res.json({ success: true, message: "Senha redefinida com sucesso" });
  },
);

// M2 — toggle-active: CONDOMINIUM_ADMIN só pode desativar membros do seu condomínio;
//       não pode desativar SUPER_ADMIN nem outros admins
//       nÃ£o pode desativar SUPER_ADMIN nem outros admins
router.patch(
  "/:id/toggle-active",
  authorize("SUPER_ADMIN", "CONDOMINIUM_ADMIN"),
  async (req: Request, res: Response) => {
    const actor = req.user!;
    const target = await prisma.user.findUniqueOrThrow({
      where: { id: req.params.id },
      select: { isActive: true, role: true },
    });

    if (actor.role === UserRole.CONDOMINIUM_ADMIN) {
      // Impede desativar SUPER_ADMIN ou outro CONDOMINIUM_ADMIN
      if (
        target.role === UserRole.SUPER_ADMIN ||
        target.role === UserRole.CONDOMINIUM_ADMIN
      ) {
        throw new ForbiddenError(
          "VocÃª nÃ£o tem permissÃ£o para ativar/desativar este usuÃ¡rio",
        );
      }
      // Verifica que o alvo pertence ao mesmo condomÃ­nio
      const sharedCondominium = await prisma.condominiumUser.findFirst({
        where: {
          userId: actor.userId,
          isActive: true,
          condominium: {
            condominiumUsers: {
              some: { userId: req.params.id, isActive: true },
            },
          },
        },
        select: { id: true },
      });
      if (!sharedCondominium)
        throw new ForbiddenError("UsuÃ¡rio nÃ£o pertence ao seu condomÃ­nio");
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: !target.isActive },
    });
    res.json({ success: true, data: { isActive: updated.isActive } });
  },
);

export default router;
