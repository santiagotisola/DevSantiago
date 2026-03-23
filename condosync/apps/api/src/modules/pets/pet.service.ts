import { prisma } from "../../config/prisma";
import { UserRole } from "@prisma/client";
import { ForbiddenError } from "../../middleware/errorHandler";

type PetActor = { userId: string; role: UserRole };

interface CreatePetDTO {
  name: string;
  type: string;
  breed?: string;
  size?: string;
  gender?: string;
  birthDate?: string | null;
  color?: string;
  weight?: number;
  lastVaccination?: string | null;
  notes?: string;
  unitId: string;
}

interface UpdatePetDTO {
  name?: string;
  type?: string;
  breed?: string;
  size?: string;
  gender?: string;
  birthDate?: string | null;
  color?: string;
  weight?: number;
  lastVaccination?: string | null;
  notes?: string;
  unitId?: string;
  isActive?: boolean;
}

export class PetService {
  private async ensurePetAccess(petId: string, actor: PetActor) {
    const pet = await prisma.pet.findUniqueOrThrow({
      where: { id: petId },
      select: { id: true, unit: { select: { condominiumId: true } } },
    });
    if (actor.role !== UserRole.SUPER_ADMIN) {
      const membership = await prisma.condominiumUser.findFirst({
        where: {
          userId: actor.userId,
          condominiumId: pet.unit.condominiumId,
          isActive: true,
        },
        select: { id: true },
      });
      if (!membership) throw new ForbiddenError("Acesso negado a este pet");
    }
    return pet;
  }

  private async ensureUnitAccess(unitId: string, actor: PetActor) {
    const unit = await prisma.unit.findUniqueOrThrow({
      where: { id: unitId },
      select: { condominiumId: true },
    });
    if (actor.role !== UserRole.SUPER_ADMIN) {
      const membership = await prisma.condominiumUser.findFirst({
        where: {
          userId: actor.userId,
          condominiumId: unit.condominiumId,
          isActive: true,
        },
        select: { id: true },
      });
      if (!membership) throw new ForbiddenError("Acesso negado a esta unidade");
    }
    return unit;
  }

  async listByCondominium(
    condominiumId: string,
    actor: PetActor,
    page = 1,
    limit = 20,
  ) {
    if (actor.role !== UserRole.SUPER_ADMIN) {
      const membership = await prisma.condominiumUser.findFirst({
        where: { userId: actor.userId, condominiumId, isActive: true },
        select: { id: true },
      });
      if (!membership)
        throw new ForbiddenError("Acesso negado a este condomínio");
    }
    const skip = (page - 1) * limit;

    const [pets, total] = await Promise.all([
      prisma.pet.findMany({
        where: { unit: { condominiumId }, isActive: true },
        include: { unit: { select: { identifier: true, block: true } } },
        skip,
        take: limit,
        orderBy: { name: "asc" },
      }),
      prisma.pet.count({
        where: { unit: { condominiumId }, isActive: true },
      }),
    ]);

    return {
      pets,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async listByUnit(unitId: string, actor: PetActor) {
    await this.ensureUnitAccess(unitId, actor);
    return prisma.pet.findMany({
      where: { unitId, isActive: true },
      orderBy: { name: "asc" },
    });
  }

  // I2 — IDOR fix
  async getById(id: string, actor: PetActor) {
    await this.ensurePetAccess(id, actor);
    return prisma.pet.findUniqueOrThrow({
      where: { id },
      include: { unit: true },
    });
  }

  // I1 — verifica que unitId pertence ao condomínio do ator
  async create(data: CreatePetDTO, actor: PetActor) {
    await this.ensureUnitAccess(data.unitId, actor);
    return prisma.pet.create({
      data: {
        ...data,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        lastVaccination: data.lastVaccination
          ? new Date(data.lastVaccination)
          : null,
      },
    });
  }

  // I2 — IDOR fix
  async update(id: string, data: UpdatePetDTO, actor: PetActor) {
    await this.ensurePetAccess(id, actor);
    return prisma.pet.update({
      where: { id },
      data: {
        ...data,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
        lastVaccination: data.lastVaccination
          ? new Date(data.lastVaccination)
          : undefined,
      },
    });
  }

  // I2 — IDOR fix
  async delete(id: string, actor: PetActor) {
    await this.ensurePetAccess(id, actor);
    return prisma.pet.update({
      where: { id },
      data: { isActive: false },
    });
  }
}

export const petService = new PetService();
