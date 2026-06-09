import { UserRole, KeyStatus } from "@prisma/client";
import { prisma } from "../../config/prisma";
import {
  AppError,
  ForbiddenError,
} from "../../middleware/errorHandler";

type Actor = { userId: string; role: UserRole };

export interface CreateKeyDTO {
  condominiumId: string;
  keyIdentifier: string;
  description?: string;
  location?: string;
}

export interface BorrowKeyDTO {
  borrowedBy: string;
  borrowedByUnit?: string;
  notes?: string;
}

export class KeyControlService {
  private async ensureCondominiumAccess(condominiumId: string, actor: Actor) {
    if (actor.role === UserRole.SUPER_ADMIN) return;
    const membership = await prisma.condominiumUser.findFirst({
      where: { userId: actor.userId, condominiumId, isActive: true },
    });
    if (!membership)
      throw new ForbiddenError("Acesso negado a este condomínio");
  }

  private async ensureStaff(actor: Actor) {
    if (!["SUPER_ADMIN", "CONDOMINIUM_ADMIN", "SYNDIC", "DOORMAN"].includes(actor.role)) {
      throw new ForbiddenError("Apenas porteiros e administradores podem gerenciar chaves");
    }
  }

  async list(condominiumId: string, actor: Actor, status?: KeyStatus) {
    await this.ensureCondominiumAccess(condominiumId, actor);

    const where: any = { condominiumId };
    if (status) where.status = status;

    return prisma.keyControl.findMany({
      where,
      include: {
        logs: { take: 1, orderBy: { createdAt: "desc" } },
      },
      orderBy: { keyIdentifier: "asc" },
    });
  }

  async getById(id: string, actor: Actor) {
    const key = await prisma.keyControl.findUniqueOrThrow({
      where: { id },
      include: { logs: { orderBy: { createdAt: "desc" }, take: 20 } },
    });
    await this.ensureCondominiumAccess(key.condominiumId, actor);
    return key;
  }

  async create(data: CreateKeyDTO, actor: Actor) {
    await this.ensureStaff(actor);
    await this.ensureCondominiumAccess(data.condominiumId, actor);

    return prisma.keyControl.create({
      data: {
        condominiumId: data.condominiumId,
        keyIdentifier: data.keyIdentifier,
        description: data.description,
        location: data.location,
      },
    });
  }

  async update(id: string, data: Partial<Omit<CreateKeyDTO, "condominiumId">>, actor: Actor) {
    await this.ensureStaff(actor);
    const key = await prisma.keyControl.findUniqueOrThrow({ where: { id } });
    await this.ensureCondominiumAccess(key.condominiumId, actor);

    return prisma.keyControl.update({
      where: { id },
      data: {
        ...(data.keyIdentifier && { keyIdentifier: data.keyIdentifier }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.location !== undefined && { location: data.location }),
      },
    });
  }

  async borrow(id: string, data: BorrowKeyDTO, actor: Actor) {
    await this.ensureStaff(actor);
    const key = await prisma.keyControl.findUniqueOrThrow({ where: { id } });
    await this.ensureCondominiumAccess(key.condominiumId, actor);

    if (key.status !== "AVAILABLE") {
      throw new AppError("Esta chave não está disponível para empréstimo", 400);
    }

    const [updatedKey] = await prisma.$transaction([
      prisma.keyControl.update({
        where: { id },
        data: { status: "BORROWED" },
      }),
      prisma.keyControlLog.create({
        data: {
          keyId: id,
          action: "BORROW",
          borrowedBy: data.borrowedBy,
          borrowedByUnit: data.borrowedByUnit,
          receivedBy: actor.userId,
          notes: data.notes,
        },
      }),
    ]);

    return updatedKey;
  }

  async return(id: string, notes: string | undefined, actor: Actor) {
    await this.ensureStaff(actor);
    const key = await prisma.keyControl.findUniqueOrThrow({ where: { id } });
    await this.ensureCondominiumAccess(key.condominiumId, actor);

    if (key.status !== "BORROWED") {
      throw new AppError("Esta chave não está emprestada", 400);
    }

    const [updatedKey] = await prisma.$transaction([
      prisma.keyControl.update({
        where: { id },
        data: { status: "AVAILABLE" },
      }),
      prisma.keyControlLog.create({
        data: {
          keyId: id,
          action: "RETURN",
          receivedBy: actor.userId,
          notes,
        },
      }),
    ]);

    return updatedKey;
  }

  async markLost(id: string, notes: string | undefined, actor: Actor) {
    await this.ensureStaff(actor);
    const key = await prisma.keyControl.findUniqueOrThrow({ where: { id } });
    await this.ensureCondominiumAccess(key.condominiumId, actor);

    const [updatedKey] = await prisma.$transaction([
      prisma.keyControl.update({
        where: { id },
        data: { status: "LOST" },
      }),
      prisma.keyControlLog.create({
        data: {
          keyId: id,
          action: "LOST",
          receivedBy: actor.userId,
          notes,
        },
      }),
    ]);

    return updatedKey;
  }

  async delete(id: string, actor: Actor) {
    await this.ensureStaff(actor);
    const key = await prisma.keyControl.findUniqueOrThrow({ where: { id } });
    await this.ensureCondominiumAccess(key.condominiumId, actor);

    await prisma.keyControl.delete({ where: { id } });
  }

  async getLogs(id: string, actor: Actor) {
    const key = await prisma.keyControl.findUniqueOrThrow({ where: { id } });
    await this.ensureCondominiumAccess(key.condominiumId, actor);

    return prisma.keyControlLog.findMany({
      where: { keyId: id },
      orderBy: { createdAt: "desc" },
    });
  }
}

export const keyControlService = new KeyControlService();
