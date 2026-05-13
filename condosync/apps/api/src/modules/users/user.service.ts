import bcrypt from "bcrypt";
import { UserRole } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { env } from "../../config/env";
import { ForbiddenError } from "../../middleware/errorHandler";
import { auditService } from "../audit/audit.service";

type UserActor = { userId: string; role: string };

export interface UpdateProfileDTO {
  name?: string;
  phone?: string;
  avatarUrl?: string;
}

export interface AuditCtx {
  ipAddress?: string;
  userAgent?: string | null;
}

export class UserService {
  async list(options: { page?: number; limit?: number } = {}) {
    const limit = options.limit ?? 50;
    const page = options.page ?? 1;
    return prisma.user.findMany({
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
      take: limit,
      skip: (page - 1) * limit,
    });
  }

  private async assertSharedCondominium(
    actorUserId: string,
    targetUserId: string,
    errorMsg = "Acesso negado",
  ) {
    const shared = await prisma.condominiumUser.findFirst({
      where: {
        userId: actorUserId,
        isActive: true,
        condominium: {
          condominiumUsers: { some: { userId: targetUserId, isActive: true } },
        },
      },
      select: { id: true },
    });
    if (!shared) throw new ForbiddenError(errorMsg);
  }

  // M1 — SUPER_ADMIN vê tudo; outros só veem perfil do mesmo condomínio
  async findById(id: string, actor: UserActor) {
    if (actor.role !== UserRole.SUPER_ADMIN && actor.userId !== id) {
      await this.assertSharedCondominium(actor.userId, id);
    }
    return prisma.user.findUniqueOrThrow({
      where: { id },
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
  }

  async updateProfile(id: string, data: UpdateProfileDTO, actor: UserActor) {
    if (actor.userId !== id && actor.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError("Acesso negado");
    }
    return prisma.user.update({
      where: { id },
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
  }

  // M3 — reset-password
  async resetPassword(
    targetUserId: string,
    newPassword: string,
    actor: UserActor,
    auditCtx: AuditCtx = {},
  ) {
    const target = await prisma.user.findUniqueOrThrow({
      where: { id: targetUserId },
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
      await this.assertSharedCondominium(
        actor.userId,
        targetUserId,
        "Usuário não pertence ao seu condomínio",
      );
    }

    const rounds = Number(env.BCRYPT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(newPassword, rounds);

    // Reset administrativo invalida sessões da vítima.
    await prisma.$transaction([
      prisma.user.update({
        where: { id: targetUserId },
        data: { passwordHash },
      }),
      prisma.refreshToken.deleteMany({ where: { userId: targetUserId } }),
    ]);

    await auditService.write({
      userId: actor.userId,
      action: "RESET_PASSWORD",
      module: "users",
      entityType: "User",
      entityId: targetUserId,
      description: `Senha redefinida administrativamente por ${actor.role}`,
      ipAddress: auditCtx.ipAddress,
      userAgent: auditCtx.userAgent ?? null,
    });
  }

  // M2 — toggle-active
  async toggleActive(
    targetUserId: string,
    actor: UserActor,
    auditCtx: AuditCtx = {},
  ) {
    const target = await prisma.user.findUniqueOrThrow({
      where: { id: targetUserId },
      select: { isActive: true, role: true },
    });

    if (actor.role === UserRole.CONDOMINIUM_ADMIN) {
      if (
        target.role === UserRole.SUPER_ADMIN ||
        target.role === UserRole.CONDOMINIUM_ADMIN
      ) {
        throw new ForbiddenError(
          "Você não tem permissão para ativar/desativar este usuário",
        );
      }
      await this.assertSharedCondominium(
        actor.userId,
        targetUserId,
        "Usuário não pertence ao seu condomínio",
      );
    }

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: { isActive: !target.isActive },
    });

    await auditService.write({
      userId: actor.userId,
      action: updated.isActive ? "ACTIVATE_USER" : "DEACTIVATE_USER",
      module: "users",
      entityType: "User",
      entityId: targetUserId,
      description: `Usuário ${updated.isActive ? "ativado" : "desativado"} por ${actor.role}`,
      metadata: { targetRole: target.role },
      ipAddress: auditCtx.ipAddress,
      userAgent: auditCtx.userAgent ?? null,
    });

    return { isActive: updated.isActive };
  }
}

export const userService = new UserService();
