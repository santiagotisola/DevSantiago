import { prisma } from '../../config/prisma';

export class LostAndFoundService {
  async list(condominiumId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    
    const [items, total] = await Promise.all([
      prisma.lostAndFound.findMany({
        where: { condominiumId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.lostAndFound.count({
        where: { condominiumId }
      })
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getById(id: string) {
    return prisma.lostAndFound.findUniqueOrThrow({
      where: { id },
      include: { createdBy: { select: { name: true } } }
    });
  }

  async create(data: any, createdById: string, condominiumId: string) {
    return prisma.lostAndFound.create({
      data: {
        ...data,
        condominiumId,
        createdById,
        foundDate: data.foundDate ? new Date(data.foundDate) : null,
        lostDate: data.lostDate ? new Date(data.lostDate) : null,
      }
    });
  }

  async update(id: string, data: any) {
    return prisma.lostAndFound.update({
      where: { id },
      data: {
        ...data,
        returnedAt: data.returnedAt ? new Date(data.returnedAt) : undefined,
      }
    });
  }

  async delete(id: string) {
    return prisma.lostAndFound.delete({
      where: { id }
    });
  }
}

export const lostAndFoundService = new LostAndFoundService();
