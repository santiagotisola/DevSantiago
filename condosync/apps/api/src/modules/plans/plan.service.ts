import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import {
  BadRequestError,
  NotFoundError,
} from "../../middleware/errorHandler";
import { auditService } from "../audit/audit.service";

type PlanActor = { userId: string };

export interface AuditCtx {
  ipAddress?: string;
  userAgent?: string | null;
}

export interface CreatePlanDTO {
  slug: string;
  name: string;
  description?: string | null;
  price?: number;
  maxUnits?: number;
  features?: string[] | null;
  isActive?: boolean;
}

// slug não é editável após criação para não quebrar Condominium.plan existente
export type UpdatePlanDTO = Omit<Partial<CreatePlanDTO>, "slug">;

export type DeleteResult =
  | { deleted: true }
  | { deleted: false; inUse: number };

export class PlanService {
  async list(options: { onlyActive?: boolean } = {}) {
    return prisma.plan.findMany({
      where: options.onlyActive ? { isActive: true } : {},
      orderBy: [{ isActive: "desc" }, { price: "asc" }],
    });
  }

  async findById(id: string) {
    const plan = await prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundError("Plan", id);
    return plan;
  }

  async create(data: CreatePlanDTO, actor: PlanActor, auditCtx: AuditCtx = {}) {
    try {
      const plan = await prisma.plan.create({
        data: {
          slug: data.slug,
          name: data.name,
          description: data.description ?? null,
          price:
            data.price !== undefined ? new Prisma.Decimal(data.price) : undefined,
          maxUnits: data.maxUnits,
          features: data.features ?? Prisma.JsonNull,
          isActive: data.isActive ?? true,
        },
      });
      await auditService.write({
        userId: actor.userId,
        action: "CREATE",
        module: "plans",
        entityType: "Plan",
        entityId: plan.id,
        description: `Plano criado: ${plan.slug}`,
        metadata: { slug: plan.slug, price: plan.price?.toString() },
        ipAddress: auditCtx.ipAddress,
        userAgent: auditCtx.userAgent ?? null,
      });
      return plan;
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        throw new BadRequestError("Já existe um plano com este slug");
      }
      throw err;
    }
  }

  async update(
    id: string,
    data: UpdatePlanDTO,
    actor: PlanActor,
    auditCtx: AuditCtx = {},
  ) {
    const plan = await prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundError("Plan", id);

    const updated = await prisma.plan.update({
      where: { id },
      data: {
        name: data.name,
        description:
          data.description === undefined ? undefined : data.description,
        price:
          data.price !== undefined ? new Prisma.Decimal(data.price) : undefined,
        maxUnits: data.maxUnits,
        features:
          data.features === undefined
            ? undefined
            : data.features === null
              ? Prisma.JsonNull
              : data.features,
        isActive: data.isActive,
      },
    });

    await auditService.write({
      userId: actor.userId,
      action: "UPDATE",
      module: "plans",
      entityType: "Plan",
      entityId: updated.id,
      description: `Plano atualizado: ${updated.slug}`,
      metadata: { changes: data as Record<string, unknown> },
      ipAddress: auditCtx.ipAddress,
      userAgent: auditCtx.userAgent ?? null,
    });

    return updated;
  }

  // Retorna inUse > 0 sem deletar — caller decide o status code (409).
  // Preserva o shape HTTP atual da rota (não usamos ConflictError padrao
  // porque o frontend lê data.condominiumsUsing).
  async delete(
    id: string,
    actor: PlanActor,
    auditCtx: AuditCtx = {},
  ): Promise<DeleteResult> {
    const plan = await prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundError("Plan", id);

    const inUse = await prisma.condominium.count({
      where: { plan: plan.slug },
    });
    if (inUse > 0) {
      return { deleted: false, inUse };
    }

    await prisma.plan.delete({ where: { id } });
    await auditService.write({
      userId: actor.userId,
      action: "DELETE",
      module: "plans",
      entityType: "Plan",
      entityId: plan.id,
      description: `Plano excluído: ${plan.slug}`,
      ipAddress: auditCtx.ipAddress,
      userAgent: auditCtx.userAgent ?? null,
    });
    return { deleted: true };
  }
}

export const planService = new PlanService();
