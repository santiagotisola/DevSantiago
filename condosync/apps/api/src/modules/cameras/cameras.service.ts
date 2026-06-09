import { UserRole } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError, ForbiddenError } from "../../middleware/errorHandler";

type Actor = { userId: string; role: UserRole };

export interface CreateCameraDTO {
  condominiumId: string;
  name: string;
  location: string;
  brand?: string;
  model?: string;
  streamUrl: string;
  embedUrl?: string;
  snapshotUrl?: string;
  isActive?: boolean;
  isRecording?: boolean;
  resolution?: string;
  notes?: string;
}

export interface UpdateCameraDTO {
  name?: string;
  location?: string;
  brand?: string;
  model?: string;
  streamUrl?: string;
  embedUrl?: string;
  snapshotUrl?: string;
  isActive?: boolean;
  isRecording?: boolean;
  resolution?: string;
  notes?: string;
}

export class CamerasService {
  private async ensureCondominiumAccess(condominiumId: string, actor: Actor) {
    if (actor.role === UserRole.SUPER_ADMIN) return;
    const membership = await prisma.condominiumUser.findFirst({
      where: { userId: actor.userId, condominiumId, isActive: true },
    });
    if (!membership)
      throw new ForbiddenError("Acesso negado a este condomínio");
  }

  async list(
    condominiumId: string,
    actor: Actor,
    filters?: { location?: string; isActive?: string },
  ) {
    await this.ensureCondominiumAccess(condominiumId, actor);

    const where: any = { condominiumId };
    if (filters?.location) {
      where.location = { contains: filters.location, mode: "insensitive" };
    }
    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive === "true";
    }

    return prisma.camera.findMany({
      where,
      orderBy: { name: "asc" },
    });
  }

  async getById(id: string, actor: Actor) {
    const camera = await prisma.camera.findUnique({ where: { id } });
    if (!camera) throw new AppError("Câmera não encontrada", 404);
    await this.ensureCondominiumAccess(camera.condominiumId, actor);
    return camera;
  }

  async create(data: CreateCameraDTO, actor: Actor) {
    await this.ensureCondominiumAccess(data.condominiumId, actor);
    return prisma.camera.create({ data });
  }

  async update(id: string, data: UpdateCameraDTO, actor: Actor) {
    const camera = await prisma.camera.findUnique({ where: { id } });
    if (!camera) throw new AppError("Câmera não encontrada", 404);
    await this.ensureCondominiumAccess(camera.condominiumId, actor);

    return prisma.camera.update({ where: { id }, data });
  }

  async delete(id: string, actor: Actor) {
    const camera = await prisma.camera.findUnique({ where: { id } });
    if (!camera) throw new AppError("Câmera não encontrada", 404);
    await this.ensureCondominiumAccess(camera.condominiumId, actor);

    await prisma.camera.delete({ where: { id } });
    return { message: "Câmera removida com sucesso" };
  }

  async toggleActive(id: string, actor: Actor) {
    const camera = await prisma.camera.findUnique({ where: { id } });
    if (!camera) throw new AppError("Câmera não encontrada", 404);
    await this.ensureCondominiumAccess(camera.condominiumId, actor);

    return prisma.camera.update({
      where: { id },
      data: { isActive: !camera.isActive },
    });
  }
}

export const camerasService = new CamerasService();
