"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lostAndFoundService = exports.LostAndFoundService = void 0;
const prisma_1 = require("../../config/prisma");
const client_1 = require("@prisma/client");
const errorHandler_1 = require("../../middleware/errorHandler");
class LostAndFoundService {
    async ensureAccess(id, actor) {
        const item = await prisma_1.prisma.lostAndFound.findUniqueOrThrow({
            where: { id },
            select: { id: true, condominiumId: true },
        });
        if (actor.role !== client_1.UserRole.SUPER_ADMIN) {
            const membership = await prisma_1.prisma.condominiumUser.findFirst({
                where: { userId: actor.userId, condominiumId: item.condominiumId, isActive: true },
                select: { id: true },
            });
            if (!membership)
                throw new errorHandler_1.ForbiddenError('Acesso negado a este item');
        }
        return item;
    }
    async list(condominiumId, actor, page = 1, limit = 20) {
        if (actor.role !== client_1.UserRole.SUPER_ADMIN) {
            const membership = await prisma_1.prisma.condominiumUser.findFirst({
                where: { userId: actor.userId, condominiumId, isActive: true },
                select: { id: true },
            });
            if (!membership)
                throw new errorHandler_1.ForbiddenError('Acesso negado a este condomínio');
        }
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
    // F1 — IDOR fix: verifica membership
    async getById(id, actor) {
        await this.ensureAccess(id, actor);
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
    // F2 — IDOR fix: verifica membership
    async update(id, data, actor) {
        await this.ensureAccess(id, actor);
        return prisma_1.prisma.lostAndFound.update({
            where: { id },
            data: {
                ...data,
                returnedAt: data.returnedAt ? new Date(data.returnedAt) : undefined,
            }
        });
    }
    // F3 — IDOR fix: verifica membership
    async delete(id, actor) {
        await this.ensureAccess(id, actor);
        return prisma_1.prisma.lostAndFound.delete({
            where: { id }
        });
    }
}
exports.LostAndFoundService = LostAndFoundService;
exports.lostAndFoundService = new LostAndFoundService();
//# sourceMappingURL=lost-and-found.service.js.map