"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.petService = exports.PetService = void 0;
const prisma_1 = require("../../config/prisma");
const client_1 = require("@prisma/client");
const errorHandler_1 = require("../../middleware/errorHandler");
class PetService {
    async ensurePetAccess(petId, actor) {
        const pet = await prisma_1.prisma.pet.findUniqueOrThrow({
            where: { id: petId },
            select: { id: true, unit: { select: { condominiumId: true } } },
        });
        if (actor.role !== client_1.UserRole.SUPER_ADMIN) {
            const membership = await prisma_1.prisma.condominiumUser.findFirst({
                where: { userId: actor.userId, condominiumId: pet.unit.condominiumId, isActive: true },
                select: { id: true },
            });
            if (!membership)
                throw new errorHandler_1.ForbiddenError('Acesso negado a este pet');
        }
        return pet;
    }
    async ensureUnitAccess(unitId, actor) {
        const unit = await prisma_1.prisma.unit.findUniqueOrThrow({
            where: { id: unitId },
            select: { condominiumId: true },
        });
        if (actor.role !== client_1.UserRole.SUPER_ADMIN) {
            const membership = await prisma_1.prisma.condominiumUser.findFirst({
                where: { userId: actor.userId, condominiumId: unit.condominiumId, isActive: true },
                select: { id: true },
            });
            if (!membership)
                throw new errorHandler_1.ForbiddenError('Acesso negado a esta unidade');
        }
        return unit;
    }
    async listByCondominium(condominiumId, actor, page = 1, limit = 20) {
        if (actor.role !== client_1.UserRole.SUPER_ADMIN) {
            const membership = await prisma_1.prisma.condominiumUser.findFirst({
                where: { userId: actor.userId, condominiumId, isActive: true },
                select: { id: true },
            });
            if (!membership)
                throw new errorHandler_1.ForbiddenError('Acesso negado a este condomínio');
        }
        const skip = (page - 1) * limit;
        const [pets, total] = await Promise.all([
            prisma_1.prisma.pet.findMany({
                where: { unit: { condominiumId }, isActive: true },
                include: { unit: { select: { identifier: true, block: true } } },
                skip,
                take: limit,
                orderBy: { name: 'asc' }
            }),
            prisma_1.prisma.pet.count({
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
    async listByUnit(unitId, actor) {
        await this.ensureUnitAccess(unitId, actor);
        return prisma_1.prisma.pet.findMany({
            where: { unitId, isActive: true },
            orderBy: { name: 'asc' }
        });
    }
    // I2 — IDOR fix
    async getById(id, actor) {
        await this.ensurePetAccess(id, actor);
        return prisma_1.prisma.pet.findUniqueOrThrow({
            where: { id },
            include: { unit: true }
        });
    }
    // I1 — verifica que unitId pertence ao condomínio do ator
    async create(data, actor) {
        await this.ensureUnitAccess(data.unitId, actor);
        return prisma_1.prisma.pet.create({
            data: {
                ...data,
                birthDate: data.birthDate ? new Date(data.birthDate) : null,
                lastVaccination: data.lastVaccination ? new Date(data.lastVaccination) : null,
            }
        });
    }
    // I2 — IDOR fix
    async update(id, data, actor) {
        await this.ensurePetAccess(id, actor);
        return prisma_1.prisma.pet.update({
            where: { id },
            data: {
                ...data,
                birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
                lastVaccination: data.lastVaccination ? new Date(data.lastVaccination) : undefined,
            }
        });
    }
    // I2 — IDOR fix
    async delete(id, actor) {
        await this.ensurePetAccess(id, actor);
        return prisma_1.prisma.pet.update({
            where: { id },
            data: { isActive: false }
        });
    }
}
exports.PetService = PetService;
exports.petService = new PetService();
//# sourceMappingURL=pet.service.js.map