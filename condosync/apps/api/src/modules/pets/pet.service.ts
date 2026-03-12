import { prisma } from '../../config/prisma';

export class PetService {
  async listByCondominium(condominiumId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    
    const [pets, total] = await Promise.all([
      prisma.pet.findMany({
        where: { unit: { condominiumId }, isActive: true },
        include: { unit: { select: { identifier: true, block: true } } },
        skip,
        take: limit,
        orderBy: { name: 'asc' }
      }),
      prisma.pet.count({
        where: { unit: { condominiumId }, isActive: true }
      })
    ]);

    return {
      pets,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async listByUnit(unitId: string) {
    return prisma.pet.findMany({
      where: { unitId, isActive: true },
      orderBy: { name: 'asc' }
    });
  }

  async getById(id: string) {
    return prisma.pet.findUniqueOrThrow({
      where: { id },
      include: { unit: true }
    });
  }

  async create(data: any) {
    return prisma.pet.create({
      data: {
        ...data,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        lastVaccination: data.lastVaccination ? new Date(data.lastVaccination) : null,
      }
    });
  }

  async update(id: string, data: any) {
    return prisma.pet.update({
      where: { id },
      data: {
        ...data,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
        lastVaccination: data.lastVaccination ? new Date(data.lastVaccination) : undefined,
      }
    });
  }

  async delete(id: string) {
    // Soft delete
    return prisma.pet.update({
      where: { id },
      data: { isActive: false }
    });
  }
}

export const petService = new PetService();
