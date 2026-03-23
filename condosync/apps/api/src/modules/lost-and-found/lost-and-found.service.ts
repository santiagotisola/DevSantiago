import { prisma } from "../../config/prisma";
import { LostAndFoundStatus, UserRole } from "@prisma/client";
import { ForbiddenError } from "../../middleware/errorHandler";

type LostActor = { userId: string; role: UserRole };

interface CreateLostAndFoundDTO {
  title: string;
  description?: string;
  category: string;
  place?: string;
  status?: LostAndFoundStatus;
  foundDate?: string | null;
  lostDate?: string | null;
}

interface UpdateLostAndFoundDTO {
  title?: string;
  description?: string;
  category?: string;
  place?: string;
  status?: LostAndFoundStatus;
  returnedTo?: string | null;
  returnedAt?: string | null;
}

export class LostAndFoundService {
  private async ensureAccess(id: string, actor: LostActor) {
    const item = await prisma.lostAndFound.findUniqueOrThrow({
      where: { id },
      select: { id: true, condominiumId: true },
    });
    if (actor.role !== UserRole.SUPER_ADMIN) {
      const membership = await prisma.condominiumUser.findFirst({
        where: {
          userId: actor.userId,
          condominiumId: item.condominiumId,
          isActive: true,
        },
        select: { id: true },
      });
      if (!membership) throw new ForbiddenError("Acesso negado a este item");
    }
    return item;
  }

  async list(condominiumId: string, actor: LostActor, page = 1, limit = 20) {
    if (actor.role !== UserRole.SUPER_ADMIN) {
      const membership = await prisma.condominiumUser.findFirst({
        where: { userId: actor.userId, condominiumId, isActive: true },
        select: { id: true },
      });
      if (!membership)
        throw new ForbiddenError("Acesso negado a este condomínio");
    }
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.lostAndFound.findMany({
        where: { condominiumId },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.lostAndFound.count({
        where: { condominiumId },
      }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // F1 — IDOR fix: verifica membership
  async getById(id: string, actor: LostActor) {
    await this.ensureAccess(id, actor);
    return prisma.lostAndFound.findUniqueOrThrow({
      where: { id },
      include: { createdBy: { select: { name: true } } },
    });
  }

  async create(
    data: CreateLostAndFoundDTO,
    createdById: string,
    condominiumId: string,
  ) {
    return prisma.lostAndFound.create({
      data: {
        ...data,
        condominiumId,
        createdById,
        foundDate: data.foundDate ? new Date(data.foundDate) : null,
        lostDate: data.lostDate ? new Date(data.lostDate) : null,
      },
    });
  }

  // F2 — IDOR fix: verifica membership
  async update(id: string, data: UpdateLostAndFoundDTO, actor: LostActor) {
    await this.ensureAccess(id, actor);
    return prisma.lostAndFound.update({
      where: { id },
      data: {
        ...data,
        returnedAt: data.returnedAt ? new Date(data.returnedAt) : undefined,
      },
    });
  }

  // F3 — IDOR fix: verifica membership
  async delete(id: string, actor: LostActor) {
    await this.ensureAccess(id, actor);
    return prisma.lostAndFound.delete({
      where: { id },
    });
  }
}

export const lostAndFoundService = new LostAndFoundService();
