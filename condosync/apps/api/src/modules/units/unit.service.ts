import { UserRole } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ForbiddenError } from "../../middleware/errorHandler";

type UnitActor = { userId: string; role: UserRole };

export interface CreateUnitDTO {
  condominiumId: string;
  identifier: string;
  block?: string;
  street?: string;
  floor?: string;
  type?: string;
  area?: number;
  bedrooms?: number;
  status?: "OCCUPIED" | "VACANT" | "UNDER_RENOVATION" | "BLOCKED";
  fraction?: number;
  notes?: string;
}

export type UpdateUnitDTO = Partial<Omit<CreateUnitDTO, "condominiumId">>;

export class UnitService {
  private async ensureCondominiumAccess(condominiumId: string, actor: UnitActor) {
    if (actor.role === UserRole.SUPER_ADMIN) return;
    const membership = await prisma.condominiumUser.findFirst({
      where: { userId: actor.userId, condominiumId, isActive: true },
    });
    if (!membership) throw new ForbiddenError("Acesso negado a este condomínio");
  }

  private async ensureUnitAccess(unitId: string, actor: UnitActor) {
    const unit = await prisma.unit.findUniqueOrThrow({
      where: { id: unitId },
      select: { condominiumId: true },
    });
    await this.ensureCondominiumAccess(unit.condominiumId, actor);
    return unit;
  }

  async list(condominiumId: string, actor: UnitActor, status?: string) {
    await this.ensureCondominiumAccess(condominiumId, actor);
    return prisma.unit.findMany({
      where: {
        condominiumId,
        ...(status && { status: status as any }),
      },
      include: {
        _count: { select: { residents: true, vehicles: true } },
        residents: {
          where: { isActive: true },
          include: { user: { select: { id: true, name: true } } },
          take: 1,
        },
      },
      orderBy: [{ block: "asc" }, { identifier: "asc" }],
    });
  }

  async findById(id: string, actor: UnitActor) {
    const unit = await prisma.unit.findUniqueOrThrow({
      where: { id },
      include: {
        residents: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                avatarUrl: true,
              },
            },
          },
        },
        vehicles: { where: { isActive: true } },
        dependents: { where: { isActive: true } },
      },
    });
    await this.ensureCondominiumAccess(unit.condominiumId, actor);
    return unit;
  }

  async create(data: CreateUnitDTO, actor: UnitActor) {
    await this.ensureCondominiumAccess(data.condominiumId, actor);
    return prisma.unit.create({ data });
  }

  async update(id: string, data: UpdateUnitDTO, actor: UnitActor) {
    await this.ensureUnitAccess(id, actor);
    return prisma.unit.update({ where: { id }, data });
  }
}

export const unitService = new UnitService();
