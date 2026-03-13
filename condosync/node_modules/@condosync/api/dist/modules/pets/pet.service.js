"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.petService = exports.PetService = void 0;
const prisma_1 = require("../../config/prisma");
class PetService {
    async listByCondominium(condominiumId, page = 1, limit = 20) {
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
    async listByUnit(unitId) {
        return prisma_1.prisma.pet.findMany({
            where: { unitId, isActive: true },
            orderBy: { name: 'asc' }
        });
    }
    async getById(id) {
        return prisma_1.prisma.pet.findUniqueOrThrow({
            where: { id },
            include: { unit: true }
        });
    }
    async create(data) {
        return prisma_1.prisma.pet.create({
            data: {
                ...data,
                birthDate: data.birthDate ? new Date(data.birthDate) : null,
                lastVaccination: data.lastVaccination ? new Date(data.lastVaccination) : null,
            }
        });
    }
    async update(id, data) {
        return prisma_1.prisma.pet.update({
            where: { id },
            data: {
                ...data,
                birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
                lastVaccination: data.lastVaccination ? new Date(data.lastVaccination) : undefined,
            }
        });
    }
    async delete(id) {
        // Soft delete
        return prisma_1.prisma.pet.update({
            where: { id },
            data: { isActive: false }
        });
    }
}
exports.PetService = PetService;
exports.petService = new PetService();
//# sourceMappingURL=pet.service.js.map