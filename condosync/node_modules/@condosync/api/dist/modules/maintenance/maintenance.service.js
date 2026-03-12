"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maintenanceService = exports.MaintenanceService = void 0;
const prisma_1 = require("../../config/prisma");
const client_1 = require("@prisma/client");
class MaintenanceService {
    async listOrders(condominiumId, filters) {
        const { page = 1, limit = 20, ...where } = filters;
        const [orders, total] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.serviceOrder.findMany({
                where: {
                    condominiumId,
                    ...(where.status && { status: where.status }),
                    ...(where.priority && { priority: where.priority }),
                    ...(where.category && { category: where.category }),
                },
                include: {
                    unit: { select: { identifier: true, block: true } },
                    serviceProvider: { select: { name: true, serviceType: true } },
                },
                orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma_1.prisma.serviceOrder.count({ where: { condominiumId } }),
        ]);
        return { orders, total, page, limit, totalPages: Math.ceil(total / limit) };
    }
    async create(data, requestedBy) {
        return prisma_1.prisma.serviceOrder.create({
            data: { ...data, requestedBy, status: client_1.ServiceOrderStatus.OPEN },
        });
    }
    async updateStatus(id, status, extra) {
        const updates = { status };
        if (status === client_1.ServiceOrderStatus.IN_PROGRESS)
            updates.startedAt = new Date();
        if (status === client_1.ServiceOrderStatus.COMPLETED)
            updates.completedAt = new Date();
        if (extra)
            Object.assign(updates, extra);
        return prisma_1.prisma.serviceOrder.update({ where: { id }, data: updates });
    }
    async updateOrder(id, data) {
        return prisma_1.prisma.serviceOrder.update({
            where: { id },
            data,
        });
    }
    async assign(id, serviceProviderId, assignedTo) {
        return prisma_1.prisma.serviceOrder.update({
            where: { id },
            data: { serviceProviderId, assignedTo, status: client_1.ServiceOrderStatus.IN_PROGRESS, startedAt: new Date() },
        });
    }
    async listSchedules(condominiumId) {
        const today = new Date();
        return prisma_1.prisma.maintenanceSchedule.findMany({
            where: { condominiumId, isActive: true },
            orderBy: { nextDueDate: 'asc' },
        });
    }
    async findById(id) {
        return prisma_1.prisma.serviceOrder.findUniqueOrThrow({
            where: { id },
            include: {
                unit: true,
                serviceProvider: true,
                checklistItems: true,
            },
        });
    }
}
exports.MaintenanceService = MaintenanceService;
exports.maintenanceService = new MaintenanceService();
//# sourceMappingURL=maintenance.service.js.map