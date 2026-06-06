import { UserRole, MovingStatus } from "@prisma/client";
import { prisma } from "../../config/prisma";
import {
  AppError,
  ForbiddenError,
} from "../../middleware/errorHandler";

type Actor = { userId: string; role: UserRole };

export interface CreateMovingDTO {
  condominiumId: string;
  unitId: string;
  type: "MOVE_IN" | "MOVE_OUT" | "LARGE_DELIVERY";
  scheduledDate: string;
  startTime: string;
  endTime: string;
  elevator?: string;
  responsibleName: string;
  responsiblePhone?: string;
  companyName?: string;
  notes?: string;
}

export interface UpdateMovingDTO {
  scheduledDate?: string;
  startTime?: string;
  endTime?: string;
  elevator?: string;
  responsibleName?: string;
  responsiblePhone?: string;
  companyName?: string;
  notes?: string;
}

export class MovingScheduleService {
  private async ensureCondominiumAccess(condominiumId: string, actor: Actor) {
    if (actor.role === UserRole.SUPER_ADMIN) return;
    const membership = await prisma.condominiumUser.findFirst({
      where: { userId: actor.userId, condominiumId, isActive: true },
    });
    if (!membership)
      throw new ForbiddenError("Acesso negado a este condomínio");
  }

  async list(condominiumId: string, actor: Actor, filters?: { status?: MovingStatus; month?: number; year?: number }) {
    await this.ensureCondominiumAccess(condominiumId, actor);

    const where: any = { condominiumId };
    if (filters?.status) where.status = filters.status;
    if (filters?.month && filters?.year) {
      const start = new Date(filters.year, filters.month - 1, 1);
      const end = new Date(filters.year, filters.month, 1);
      where.scheduledDate = { gte: start, lt: end };
    }

    return prisma.movingSchedule.findMany({
      where,
      include: { unit: { select: { identifier: true, block: true } } },
      orderBy: { scheduledDate: "asc" },
    });
  }

  async getById(id: string, actor: Actor) {
    const schedule = await prisma.movingSchedule.findUniqueOrThrow({ where: { id } });
    await this.ensureCondominiumAccess(schedule.condominiumId, actor);
    return schedule;
  }

  async create(data: CreateMovingDTO, actor: Actor) {
    await this.ensureCondominiumAccess(data.condominiumId, actor);

    // Verificar conflito de horário no mesmo elevador e data
    if (data.elevator) {
      const conflict = await prisma.movingSchedule.findFirst({
        where: {
          condominiumId: data.condominiumId,
          scheduledDate: new Date(data.scheduledDate),
          elevator: data.elevator,
          status: { in: ["PENDING", "APPROVED"] },
          OR: [
            { startTime: { lte: data.endTime }, endTime: { gte: data.startTime } },
          ],
        },
      });
      if (conflict) {
        throw new AppError("Já existe uma mudança agendada neste horário e elevador", 409);
      }
    }

    return prisma.movingSchedule.create({
      data: {
        condominiumId: data.condominiumId,
        unitId: data.unitId,
        type: data.type,
        scheduledDate: new Date(data.scheduledDate),
        startTime: data.startTime,
        endTime: data.endTime,
        elevator: data.elevator,
        responsibleName: data.responsibleName,
        responsiblePhone: data.responsiblePhone,
        companyName: data.companyName,
        notes: data.notes,
        createdBy: actor.userId,
      },
    });
  }

  async update(id: string, data: UpdateMovingDTO, actor: Actor) {
    const schedule = await prisma.movingSchedule.findUniqueOrThrow({ where: { id } });
    await this.ensureCondominiumAccess(schedule.condominiumId, actor);

    if (schedule.status === "COMPLETED" || schedule.status === "CANCELED") {
      throw new AppError("Não é possível editar agendamento finalizado ou cancelado", 400);
    }

    return prisma.movingSchedule.update({
      where: { id },
      data: {
        ...(data.scheduledDate && { scheduledDate: new Date(data.scheduledDate) }),
        ...(data.startTime && { startTime: data.startTime }),
        ...(data.endTime && { endTime: data.endTime }),
        ...(data.elevator !== undefined && { elevator: data.elevator }),
        ...(data.responsibleName && { responsibleName: data.responsibleName }),
        ...(data.responsiblePhone !== undefined && { responsiblePhone: data.responsiblePhone }),
        ...(data.companyName !== undefined && { companyName: data.companyName }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    });
  }

  async approve(id: string, actor: Actor) {
    if (!["SUPER_ADMIN", "CONDOMINIUM_ADMIN", "SYNDIC"].includes(actor.role)) {
      throw new ForbiddenError("Apenas administradores podem aprovar agendamentos");
    }
    const schedule = await prisma.movingSchedule.findUniqueOrThrow({ where: { id } });
    await this.ensureCondominiumAccess(schedule.condominiumId, actor);

    return prisma.movingSchedule.update({
      where: { id },
      data: { status: "APPROVED", approvedBy: actor.userId },
    });
  }

  async reject(id: string, reason: string, actor: Actor) {
    if (!["SUPER_ADMIN", "CONDOMINIUM_ADMIN", "SYNDIC"].includes(actor.role)) {
      throw new ForbiddenError("Apenas administradores podem rejeitar agendamentos");
    }
    const schedule = await prisma.movingSchedule.findUniqueOrThrow({ where: { id } });
    await this.ensureCondominiumAccess(schedule.condominiumId, actor);

    return prisma.movingSchedule.update({
      where: { id },
      data: { status: "REJECTED", rejectedReason: reason },
    });
  }

  async complete(id: string, actor: Actor) {
    if (!["SUPER_ADMIN", "CONDOMINIUM_ADMIN", "SYNDIC", "DOORMAN"].includes(actor.role)) {
      throw new ForbiddenError("Sem permissão para finalizar agendamento");
    }
    const schedule = await prisma.movingSchedule.findUniqueOrThrow({ where: { id } });
    await this.ensureCondominiumAccess(schedule.condominiumId, actor);

    return prisma.movingSchedule.update({
      where: { id },
      data: { status: "COMPLETED" },
    });
  }

  async cancel(id: string, actor: Actor) {
    const schedule = await prisma.movingSchedule.findUniqueOrThrow({ where: { id } });
    await this.ensureCondominiumAccess(schedule.condominiumId, actor);

    // Morador só cancela os próprios
    if (actor.role === "RESIDENT" && schedule.createdBy !== actor.userId) {
      throw new ForbiddenError("Você só pode cancelar seus próprios agendamentos");
    }

    return prisma.movingSchedule.update({
      where: { id },
      data: { status: "CANCELED" },
    });
  }
}

export const movingScheduleService = new MovingScheduleService();
