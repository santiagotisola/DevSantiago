import bcrypt from "bcrypt";
import { Prisma, UserRole } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ForbiddenError } from "../../middleware/errorHandler";
import { auditService } from "../audit/audit.service";
import { residentService } from "../residents/resident.service";

type CondoActor = { userId: string; role: UserRole | string };

export interface AuditCtx {
  ipAddress?: string;
  userAgent?: string | null;
}

export interface CreateCondominiumDTO {
  name: string;
  cnpj?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phone?: string;
  email?: string;
  timezone?: string;
  plan?: string;
  maxUnits?: number;
}

export type UpdateCondominiumDTO = Partial<CreateCondominiumDTO> & {
  isActive?: boolean;
  logoUrl?: string;
};

export type DeleteResult =
  | { deleted: true }
  | { deleted: false; blockers: Record<string, number> };

export interface AddMemberDTO {
  userId: string;
  role: UserRole;
  unitId?: string;
}

export interface SetupAdminDTO {
  name: string;
  email: string;
  password: string;
}

export class CondominiumService {
  async ensureMembership(condominiumId: string, actor: CondoActor) {
    if (actor.role === UserRole.SUPER_ADMIN) return;
    const membership = await prisma.condominiumUser.findFirst({
      where: { userId: actor.userId, condominiumId, isActive: true },
      select: { id: true },
    });
    if (!membership)
      throw new ForbiddenError("Acesso negado a este condomínio");
  }

  async list(actor: CondoActor) {
    return prisma.condominium.findMany({
      where:
        actor.role === UserRole.SUPER_ADMIN
          ? {}
          : {
              condominiumUsers: {
                some: { userId: actor.userId, isActive: true },
              },
            },
      include: {
        _count: { select: { units: true, condominiumUsers: true } },
      },
      orderBy: { name: "asc" },
    });
  }

  async create(data: CreateCondominiumDTO) {
    return prisma.condominium.create({
      data: {
        address: "",
        city: "",
        state: "",
        zipCode: "",
        ...data,
      },
    });
  }

  // D1 — verifica membership para não-super-admins
  async findById(id: string, actor: CondoActor) {
    await this.ensureMembership(id, actor);
    return prisma.condominium.findUniqueOrThrow({
      where: { id },
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
  }

  // D2 — verifica membership antes de editar; isActive é exclusivo do SUPER_ADMIN
  async update(id: string, data: UpdateCondominiumDTO, actor: CondoActor) {
    await this.ensureMembership(id, actor);
    if (data.isActive !== undefined && actor.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError(
        "Apenas super-admin pode ativar ou inativar um condomínio",
      );
    }
    return prisma.condominium.update({ where: { id }, data });
  }

  // Exclusão definitiva (SUPER_ADMIN); bloqueia se houver vínculos.
  // Retorna inUse blockers em vez de lançar — caller traduz para HTTP 409
  // preservando o shape histórico da resposta.
  async delete(
    id: string,
    actor: CondoActor,
    auditCtx: AuditCtx = {},
  ): Promise<DeleteResult> {
    const counts = await prisma.condominium.findUniqueOrThrow({
      where: { id },
      select: {
        _count: {
          select: {
            units: true,
            condominiumUsers: true,
            contracts: true,
            financialAccounts: true,
            employees: true,
            commonAreas: true,
            serviceProviders: true,
            announcements: true,
            occurrences: true,
            polls: true,
            assemblies: true,
            lostAndFoundItems: true,
            documents: true,
            panicAlerts: true,
            visitorRecurrences: true,
            chatConversations: true,
            maintenanceSchedules: true,
          },
        },
      },
    });

    const blockers: Record<string, number> = Object.fromEntries(
      Object.entries(counts._count).filter(([, v]) => (v as number) > 0),
    ) as Record<string, number>;

    if (Object.keys(blockers).length) {
      return { deleted: false, blockers };
    }

    try {
      await prisma.condominium.delete({ where: { id } });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2003"
      ) {
        return { deleted: false, blockers: { foreignKey: 1 } };
      }
      throw err;
    }

    await auditService.write({
      userId: actor.userId,
      action: "DELETE",
      module: "condominiums",
      entityType: "Condominium",
      entityId: id,
      description: `Condomínio excluído por SUPER_ADMIN`,
      ipAddress: auditCtx.ipAddress,
      userAgent: auditCtx.userAgent ?? null,
    });

    return { deleted: true };
  }

  // Aceita slug do plano. Por padrão herda maxUnits do plano; aceita
  // override explícito em maxUnits.
  async assignPlan(
    id: string,
    planSlug: string,
    maxUnits: number | undefined,
    actor: CondoActor,
    auditCtx: AuditCtx = {},
  ) {
    const plan = await prisma.plan.findUnique({ where: { slug: planSlug } });
    if (!plan || !plan.isActive) {
      throw new ForbiddenError("Plano inexistente ou inativo");
    }

    const condominium = await prisma.condominium.update({
      where: { id },
      data: {
        plan: plan.slug,
        maxUnits: maxUnits ?? plan.maxUnits,
      },
    });

    await auditService.write({
      userId: actor.userId,
      condominiumId: condominium.id,
      action: "ASSIGN_PLAN",
      module: "condominiums",
      entityType: "Condominium",
      entityId: condominium.id,
      description: `Plano atribuído: ${plan.slug}`,
      metadata: { planSlug: plan.slug, maxUnits: condominium.maxUnits },
      ipAddress: auditCtx.ipAddress,
      userAgent: auditCtx.userAgent ?? null,
    });

    return condominium;
  }

  // Cria um usuário CONDOMINIUM_ADMIN e vincula ao condomínio (SUPER_ADMIN only)
  async setupAdmin(condominiumId: string, data: SetupAdminDTO) {
    await prisma.condominium.findUniqueOrThrow({
      where: { id: condominiumId },
    });

    const rounds = Number(process.env.BCRYPT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(data.password, rounds);

    return prisma.$transaction(async (tx) => {
      let user = await tx.user.findUnique({ where: { email: data.email } });
      if (user) {
        // Se já existe, atualiza a senha + promove a CONDOMINIUM_ADMIN
        user = await tx.user.update({
          where: { id: user.id },
          data: {
            passwordHash,
            role: UserRole.CONDOMINIUM_ADMIN,
            isActive: true,
          },
        });
      } else {
        user = await tx.user.create({
          data: {
            name: data.name,
            email: data.email,
            passwordHash,
            role: UserRole.CONDOMINIUM_ADMIN,
          },
        });
      }

      const membership = await tx.condominiumUser.upsert({
        where: {
          userId_condominiumId: {
            userId: user.id,
            condominiumId,
          },
        },
        update: { role: UserRole.CONDOMINIUM_ADMIN, isActive: true },
        create: {
          userId: user.id,
          condominiumId,
          role: UserRole.CONDOMINIUM_ADMIN,
        },
      });

      return { user, membership };
    });
  }

  async addMember(
    condominiumId: string,
    data: AddMemberDTO,
    actor: CondoActor,
  ) {
    await this.ensureMembership(condominiumId, actor);

    residentService.assertResidentRoleRequiresUnit(data.role, data.unitId);
    if (data.role === UserRole.RESIDENT) {
      await residentService.assertResidentUnitBelongsToCondominium(
        condominiumId,
        data.unitId!,
      );
    }

    return prisma.condominiumUser.upsert({
      where: {
        userId_condominiumId: { userId: data.userId, condominiumId },
      },
      update: { role: data.role, unitId: data.unitId, isActive: true },
      create: {
        userId: data.userId,
        condominiumId,
        role: data.role,
        unitId: data.unitId,
      },
    });
  }

  // D3 — requer membership do ator
  async listMembers(condominiumId: string, actor: CondoActor) {
    await this.ensureMembership(condominiumId, actor);
    return prisma.condominiumUser.findMany({
      where: { condominiumId, isActive: true },
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
  }

  // D4 — verifica membership do ator
  async removeMember(
    condominiumId: string,
    targetUserId: string,
    actor: CondoActor,
  ) {
    await this.ensureMembership(condominiumId, actor);
    await prisma.condominiumUser.deleteMany({
      where: { condominiumId, userId: targetUserId },
    });
  }
}

export const condominiumService = new CondominiumService();
