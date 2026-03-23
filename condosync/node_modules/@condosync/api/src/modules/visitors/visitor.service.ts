import { prisma } from "../../config/prisma";
import { ForbiddenError } from "../../middleware/errorHandler";
import { UserRole, VisitorStatus } from "@prisma/client";
import { NotificationService } from "../../notifications/notification.service";

export interface CreateVisitorDTO {
  unitId: string;
  name: string;
  document?: string;
  documentType?: string;
  phone?: string;
  company?: string;
  reason?: string;
  scheduledAt?: Date;
  notes?: string;
}

type VisitorActor = {
  userId: string;
  role: UserRole;
};

export class VisitorService {
  private async ensureUnitAccess(
    userId: string,
    role: UserRole,
    unitId: string,
  ) {
    const unit = await prisma.unit.findUniqueOrThrow({
      where: { id: unitId },
      select: { id: true, condominiumId: true },
    });

    if (role === UserRole.SUPER_ADMIN) {
      return unit;
    }

    const membership = await prisma.condominiumUser.findFirst({
      where: {
        userId,
        condominiumId: unit.condominiumId,
        isActive: true,
      },
      select: { unitId: true },
    });

    if (!membership) {
      throw new ForbiddenError("Acesso negado a esta unidade");
    }

    if (role === UserRole.RESIDENT && membership.unitId !== unit.id) {
      throw new ForbiddenError(
        "Morador só pode acessar visitantes da própria unidade",
      );
    }

    return unit;
  }

  async list(
    condominiumId: string,
    filters: {
      unitId?: string;
      status?: VisitorStatus;
      date?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const { page = 1, limit = 20, ...where } = filters;

    const [visitors, total] = await prisma.$transaction([
      prisma.visitor.findMany({
        where: {
          unit: { condominiumId },
          ...(where.unitId && { unitId: where.unitId }),
          ...(where.status && { status: where.status }),
          ...(where.date && {
            createdAt: {
              gte: new Date(`${where.date}T00:00:00`),
              lte: new Date(`${where.date}T23:59:59`),
            },
          }),
        },
        include: { unit: { select: { identifier: true, block: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.visitor.count({
        where: {
          unit: { condominiumId },
          ...(where.unitId && { unitId: where.unitId }),
        },
      }),
    ]);

    return {
      visitors,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(data: CreateVisitorDTO, actor: VisitorActor) {
    await this.ensureUnitAccess(actor.userId, actor.role, data.unitId);

    const isResidentPreAuthorization = actor.role === UserRole.RESIDENT;

    const visitor = await prisma.visitor.create({
      data: {
        ...data,
        preAuthorizedBy: isResidentPreAuthorization ? actor.userId : undefined,
        status: isResidentPreAuthorization
          ? VisitorStatus.AUTHORIZED
          : VisitorStatus.PENDING,
      },
    });

    if (isResidentPreAuthorization) {
      await NotificationService.enqueue({
        userId: actor.userId,
        type: "VISITOR",
        title: "Visitante pré-autorizado",
        message: `${data.name} foi pré-autorizado para sua unidade`,
        data: { visitorId: visitor.id },
        channels: ["inapp", "email"],
      });
    }

    return visitor;
  }

  async registerEntry(
    visitorId: string,
    registeredBy: string,
    actor: VisitorActor,
    photoUrl?: string,
  ) {
    const visitor = await prisma.visitor.findUniqueOrThrow({
      where: { id: visitorId },
    });

    await this.ensureUnitAccess(actor.userId, actor.role, visitor.unitId);

    if (visitor.status === VisitorStatus.INSIDE) {
      throw new ForbiddenError("Visitante já está dentro do condomínio");
    }

    const updated = await prisma.visitor.update({
      where: { id: visitorId },
      data: {
        status: VisitorStatus.INSIDE,
        entryAt: new Date(),
        registeredBy,
        ...(photoUrl && { photoUrl }),
      },
    });

    const unitUsers = await prisma.condominiumUser.findMany({
      where: { unitId: visitor.unitId },
      select: { userId: true },
    });

    await Promise.all(
      unitUsers.map((u) =>
        NotificationService.enqueue({
          userId: u.userId,
          type: "VISITOR",
          title: "Visitante chegou",
          message: `${visitor.name} entrou no condomínio`,
          data: { visitorId: visitor.id },
          channels: ["inapp", "email"],
        }),
      ),
    );

    return updated;
  }

  async registerExit(visitorId: string, registeredBy: string, actor: VisitorActor) {
    const visitor = await prisma.visitor.findUniqueOrThrow({
      where: { id: visitorId },
    });

    await this.ensureUnitAccess(actor.userId, actor.role, visitor.unitId);

    return prisma.visitor.update({
      where: { id: visitorId },
      data: { status: VisitorStatus.LEFT, exitAt: new Date(), registeredBy },
    });
  }

  async authorize(visitorId: string, actor: VisitorActor, authorized: boolean) {
    const visitor = await prisma.visitor.findUniqueOrThrow({
      where: { id: visitorId },
      select: { unitId: true, status: true },
    });

    await this.ensureUnitAccess(actor.userId, actor.role, visitor.unitId);

    if (
      visitor.status === VisitorStatus.INSIDE ||
      visitor.status === VisitorStatus.LEFT
    ) {
      throw new ForbiddenError(
        "Não é possível alterar um visitante que já entrou ou saiu",
      );
    }

    return prisma.visitor.update({
      where: { id: visitorId },
      data: {
        status: authorized ? VisitorStatus.AUTHORIZED : VisitorStatus.DENIED,
        preAuthorizedBy: actor.role === UserRole.RESIDENT ? actor.userId : undefined,
      },
    });
  }

  async findById(id: string, actor: VisitorActor) {
    const visitor = await prisma.visitor.findUniqueOrThrow({
      where: { id },
      include: {
        unit: {
          select: { identifier: true, block: true, condominiumId: true },
        },
      },
    });
    await this.ensureUnitAccess(actor.userId, actor.role, visitor.unitId);
    return visitor;
  }

  async update(
    id: string,
    actor: VisitorActor,
    data: Partial<
      Pick<
        CreateVisitorDTO,
        | "name"
        | "document"
        | "documentType"
        | "phone"
        | "company"
        | "reason"
        | "notes"
        | "scheduledAt"
      >
    >,
  ) {
    const visitor = await prisma.visitor.findUniqueOrThrow({ where: { id } });
    await this.ensureUnitAccess(actor.userId, actor.role, visitor.unitId);
    if (
      visitor.status === VisitorStatus.INSIDE ||
      visitor.status === VisitorStatus.LEFT
    ) {
      throw new ForbiddenError(
        "Não é possível editar um visitante que já entrou ou saiu",
      );
    }
    return prisma.visitor.update({ where: { id }, data });
  }

  async historyByUnit(
    unitId: string,
    actor: VisitorActor,
    page = 1,
    limit = 20,
  ) {
    await this.ensureUnitAccess(actor.userId, actor.role, unitId);

    const [visitors, total] = await prisma.$transaction([
      prisma.visitor.findMany({
        where: { unitId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.visitor.count({ where: { unitId } }),
    ]);
    return { visitors, total, page, limit };
  }
}

export const visitorService = new VisitorService();
