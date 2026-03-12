"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lostAndFoundService = exports.LostAndFoundService = void 0;
const prisma_1 = require("../../config/prisma");
class LostAndFoundService {
    async list(condominiumId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [items, total] = await Promise.all([
            prisma_1.prisma.lostAndFound.findMany({
                where: { condominiumId },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' }
            }),
            prisma_1.prisma.lostAndFound.count({
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
    async getById(id) {
        return prisma_1.prisma.lostAndFound.findUniqueOrThrow({
            where: { id },
            include: { createdBy: { select: { name: true } } }
        });
    }
    async create(data, createdById, condominiumId) {
        return prisma_1.prisma.lostAndFound.create({
            data: {
                ...data,
                condominiumId,
                createdById,
                foundDate: data.foundDate ? new Date(data.foundDate) : null,
                lostDate: data.lostDate ? new Date(data.lostDate) : null,
            }
        });
    }
    async update(id, data) {
        return prisma_1.prisma.lostAndFound.update({
            where: { id },
            data: {
                ...data,
                returnedAt: data.returnedAt ? new Date(data.returnedAt) : undefined,
            }
        });
    }
    async delete(id) {
        return prisma_1.prisma.lostAndFound.delete({
            where: { id }
        });
    }
}
exports.LostAndFoundService = LostAndFoundService;
exports.lostAndFoundService = new LostAndFoundService();
//# sourceMappingURL=lost-and-found.service.js.map