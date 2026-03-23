import { prisma } from "../../config/prisma";
import { AppError, ForbiddenError } from "../../middleware/errorHandler";
import {
  ServiceOrderPriority,
  ServiceOrderStatus,
  UserRole,
} from "@prisma/client";

export interface CreateServiceOrderDTO {
  condominiumId: string;
  unitId?: string;
  title: string;
  description?: string;
  category: string;
  location?: string;
  priority?: ServiceOrderPriority;
  photoUrls?: string[];
  estimatedCost?: number;
  scheduledAt?: Date;
}

type MaintenanceActor = {
  userId: string;
  role: UserRole;
};

export class MaintenanceService {
  private async ensureCondominiumAccess(
    userId: string,
    role: UserRole,
    condominiumId: string,
  ) {
    if (role === UserRole.SUPER_ADMIN) {
      return;
    }

    const membership = await prisma.condominiumUser.findFirst({
      where: { userId, condominiumId, isActive: true },
      select: { id: true },
    });

    if (!membership) {
      throw new ForbiddenError("Acesso negado a este condomínio");
    }
  }

  private async ensureOrderAccess(id: string, actor: MaintenanceActor) {
    const order = await prisma.serviceOrder.findUniqueOrThrow({
      where: { id },
      select: { condominiumId: true },
    });

    await this.ensureCondominiumAccess(
      actor.userId,
      actor.role,
      order.condominiumId,
    );
  }

  private async ensureScheduleAccess(id: string, actor: MaintenanceActor) {
    const schedule = await prisma.maintenanceSchedule.findUniqueOrThrow({
      where: { id },
      select: { condominiumId: true },
    });

    await this.ensureCondominiumAccess(
      actor.userId,
      actor.role,
      schedule.condominiumId,
    );
  }

  async listOrders(
    condominiumId: string,
    filters: {
      status?: ServiceOrderStatus;
      priority?: ServiceOrderPriority;
      category?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const { page = 1, limit = 20, ...where } = filters;

    const [orders, total] = await prisma.$transaction([
      prisma.serviceOrder.findMany({
        where: {
          condominiumId,
          ...(where.status && { status: where.status }),
          ...(where.priority && { priority: where.priority }),
          ...(where.category && { category: where.category }),
        },
        include: {
          unit: { select: { identifier: true, block: true } },
          serviceProvider: { select: { name: true, serviceType: true } },
        },
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.serviceOrder.count({ where: { condominiumId } }),
    ]);

    return { orders, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async create(
    data: CreateServiceOrderDTO,
    requestedBy: string,
    actor: MaintenanceActor,
  ) {
    await this.ensureCondominiumAccess(
      actor.userId,
      actor.role,
      data.condominiumId,
    );

    if (data.unitId) {
      const unit = await prisma.unit.findFirst({
        where: { id: data.unitId, condominiumId: data.condominiumId },
      });
      if (!unit) {
        throw new ForbiddenError("Unidade não pertence a este condomínio");
      }
    }

    return prisma.serviceOrder.create({
      data: {
        condominiumId: data.condominiumId,
        title: data.title,
        description: data.description ?? "",
        category: data.category,
        requestedBy,
        status: ServiceOrderStatus.OPEN,
        ...(data.unitId ? { unitId: data.unitId } : {}),
        ...(data.location ? { location: data.location } : {}),
        ...(data.priority ? { priority: data.priority } : {}),
        ...(data.photoUrls ? { photoUrls: data.photoUrls } : {}),
        ...(data.estimatedCost ? { estimatedCost: data.estimatedCost } : {}),
        ...(data.scheduledAt ? { scheduledAt: data.scheduledAt } : {}),
      },
    });
  }

  async updateStatus(
    id: string,
    status: ServiceOrderStatus,
    actor: MaintenanceActor,
    extra?: {
      resolution?: string;
      finalCost?: number;
      rating?: number;
      feedback?: string;
    },
  ) {
    await this.ensureOrderAccess(id, actor);

    const updates: Record<string, unknown> = { status };
    if (status === ServiceOrderStatus.IN_PROGRESS)
      updates.startedAt = new Date();
    if (status === ServiceOrderStatus.COMPLETED)
      updates.completedAt = new Date();
    if (extra) Object.assign(updates, extra);
    return prisma.serviceOrder.update({ where: { id }, data: updates });
  }

  async updateOrder(
    id: string,
    actor: MaintenanceActor,
    data: {
      title?: string;
      description?: string;
      category?: string;
      location?: string;
      priority?: ServiceOrderPriority;
      estimatedCost?: number;
      scheduledAt?: Date;
    },
  ) {
    await this.ensureOrderAccess(id, actor);

    return prisma.serviceOrder.update({
      where: { id },
      data,
    });
  }

  async assign(
    id: string,
    actor: MaintenanceActor,
    serviceProviderId?: string,
    assignedTo?: string,
  ) {
    await this.ensureOrderAccess(id, actor);

    const order = await prisma.serviceOrder.findUniqueOrThrow({
      where: { id },
      select: { status: true },
    });
    if (
      order.status === ServiceOrderStatus.COMPLETED ||
      order.status === ServiceOrderStatus.CANCELED
    ) {
      throw new AppError(
        `Não é possível atribuir uma ordem com status ${order.status}`,
        422,
      );
    }

    return prisma.serviceOrder.update({
      where: { id },
      data: {
        serviceProviderId,
        assignedTo,
        status: ServiceOrderStatus.IN_PROGRESS,
        startedAt: new Date(),
      },
    });
  }

  async listSchedules(condominiumId: string) {
    return prisma.maintenanceSchedule.findMany({
      where: { condominiumId, isActive: true },
      orderBy: { nextDueDate: "asc" },
    });
  }

  private calcNextDue(from: Date, frequency: string): Date {
    const d = new Date(from);
    switch (frequency) {
      case "diário":
        d.setDate(d.getDate() + 1);
        break;
      case "semanal":
        d.setDate(d.getDate() + 7);
        break;
      case "quinzenal":
        d.setDate(d.getDate() + 15);
        break;
      case "mensal":
        d.setMonth(d.getMonth() + 1);
        break;
      case "trimestral":
        d.setMonth(d.getMonth() + 3);
        break;
      case "semestral":
        d.setMonth(d.getMonth() + 6);
        break;
      case "anual":
        d.setFullYear(d.getFullYear() + 1);
        break;
      default:
        throw new AppError(
          `Frequência de manutenção inválida: ${frequency}`,
          422,
        );
    }
    return d;
  }

  async createSchedule(
    actor: MaintenanceActor,
    data: {
      condominiumId: string;
      title: string;
      description?: string;
      category: string;
      location: string;
      frequency: string;
      nextDueDate: Date;
      estimatedCost?: number;
    },
  ) {
    await this.ensureCondominiumAccess(
      actor.userId,
      actor.role,
      data.condominiumId,
    );

    return prisma.maintenanceSchedule.create({ data });
  }

  async updateSchedule(
    id: string,
    actor: MaintenanceActor,
    data: {
      title?: string;
      description?: string;
      category?: string;
      location?: string;
      frequency?: string;
      nextDueDate?: Date;
      estimatedCost?: number;
    },
  ) {
    await this.ensureScheduleAccess(id, actor);

    return prisma.maintenanceSchedule.update({ where: { id }, data });
  }

  async markScheduleDone(id: string, actor: MaintenanceActor) {
    const schedule = await prisma.maintenanceSchedule.findUniqueOrThrow({
      where: { id },
    });
    await this.ensureCondominiumAccess(
      actor.userId,
      actor.role,
      schedule.condominiumId,
    );
    const now = new Date();
    const nextDueDate = this.calcNextDue(now, schedule.frequency);
    return prisma.maintenanceSchedule.update({
      where: { id },
      data: { lastDoneDate: now, nextDueDate },
    });
  }

  async deleteSchedule(id: string, actor: MaintenanceActor) {
    await this.ensureScheduleAccess(id, actor);

    return prisma.maintenanceSchedule.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async listDueSchedules(daysAhead = 7) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + daysAhead);
    return prisma.maintenanceSchedule.findMany({
      where: { isActive: true, nextDueDate: { lte: cutoff } },
      include: { condominium: { select: { id: true, name: true } } },
      orderBy: { nextDueDate: "asc" },
    });
  }

  async findById(id: string, actor: MaintenanceActor) {
    await this.ensureOrderAccess(id, actor);

    return prisma.serviceOrder.findUniqueOrThrow({
      where: { id },
      include: {
        unit: true,
        serviceProvider: true,
        checklistItems: true,
      },
    });
  }
}

export const maintenanceService = new MaintenanceService();
