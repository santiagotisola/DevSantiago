"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maintenanceService = exports.MaintenanceService = void 0;
const prisma_1 = require("../../config/prisma");
const errorHandler_1 = require("../../middleware/errorHandler");
const client_1 = require("@prisma/client");
class MaintenanceService {
    async ensureCondominiumAccess(userId, role, condominiumId) {
        if (role === client_1.UserRole.SUPER_ADMIN) {
            return;
        }
        const membership = await prisma_1.prisma.condominiumUser.findFirst({
            where: { userId, condominiumId, isActive: true },
            select: { id: true },
        });
        if (!membership) {
            throw new errorHandler_1.ForbiddenError("Acesso negado a este condomínio");
        }
    }
    async ensureOrderAccess(id, actor) {
        const order = await prisma_1.prisma.serviceOrder.findUniqueOrThrow({
            where: { id },
            select: { condominiumId: true },
        });
        await this.ensureCondominiumAccess(actor.userId, actor.role, order.condominiumId);
    }
    async ensureScheduleAccess(id, actor) {
        const schedule = await prisma_1.prisma.maintenanceSchedule.findUniqueOrThrow({
            where: { id },
            select: { condominiumId: true },
        });
        await this.ensureCondominiumAccess(actor.userId, actor.role, schedule.condominiumId);
    }
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
                orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma_1.prisma.serviceOrder.count({ where: { condominiumId } }),
        ]);
        return { orders, total, page, limit, totalPages: Math.ceil(total / limit) };
    }
    async create(data, requestedBy, actor) {
        await this.ensureCondominiumAccess(actor.userId, actor.role, data.condominiumId);
        return prisma_1.prisma.serviceOrder.create({
            data: { ...data, requestedBy, status: client_1.ServiceOrderStatus.OPEN },
        });
    }
    async updateStatus(id, status, actor, extra) {
        await this.ensureOrderAccess(id, actor);
        const updates = { status };
        if (status === client_1.ServiceOrderStatus.IN_PROGRESS)
            updates.startedAt = new Date();
        if (status === client_1.ServiceOrderStatus.COMPLETED)
            updates.completedAt = new Date();
        if (extra)
            Object.assign(updates, extra);
        return prisma_1.prisma.serviceOrder.update({ where: { id }, data: updates });
    }
    async updateOrder(id, actor, data) {
        await this.ensureOrderAccess(id, actor);
        return prisma_1.prisma.serviceOrder.update({
            where: { id },
            data,
        });
    }
    async assign(id, actor, serviceProviderId, assignedTo) {
        await this.ensureOrderAccess(id, actor);
        return prisma_1.prisma.serviceOrder.update({
            where: { id },
            data: {
                serviceProviderId,
                assignedTo,
                status: client_1.ServiceOrderStatus.IN_PROGRESS,
                startedAt: new Date(),
            },
        });
    }
    async listSchedules(condominiumId) {
        return prisma_1.prisma.maintenanceSchedule.findMany({
            where: { condominiumId, isActive: true },
            orderBy: { nextDueDate: "asc" },
        });
    }
    calcNextDue(from, frequency) {
        const d = new Date(from);
        switch (frequency) {
            case "diário":
                d.setDate(d.getDate() + 1);
                break;
            case "semanal":
                d.setDate(d.getDate() + 7);
                break;
            case "quinzenal":
                d.setDate(d.getDate() + 15);
                break;
            case "mensal":
                d.setMonth(d.getMonth() + 1);
                break;
            case "trimestral":
                d.setMonth(d.getMonth() + 3);
                break;
            case "semestral":
                d.setMonth(d.getMonth() + 6);
                break;
            case "anual":
                d.setFullYear(d.getFullYear() + 1);
                break;
        }
        return d;
    }
    async createSchedule(actor, data) {
        await this.ensureCondominiumAccess(actor.userId, actor.role, data.condominiumId);
        return prisma_1.prisma.maintenanceSchedule.create({ data });
    }
    async updateSchedule(id, actor, data) {
        await this.ensureScheduleAccess(id, actor);
        return prisma_1.prisma.maintenanceSchedule.update({ where: { id }, data });
    }
    async markScheduleDone(id, actor) {
        const schedule = await prisma_1.prisma.maintenanceSchedule.findUniqueOrThrow({
            where: { id },
        });
        await this.ensureCondominiumAccess(actor.userId, actor.role, schedule.condominiumId);
        const now = new Date();
        const nextDueDate = this.calcNextDue(now, schedule.frequency);
        return prisma_1.prisma.maintenanceSchedule.update({
            where: { id },
            data: { lastDoneDate: now, nextDueDate },
        });
    }
    async deleteSchedule(id, actor) {
        await this.ensureScheduleAccess(id, actor);
        return prisma_1.prisma.maintenanceSchedule.update({
            where: { id },
            data: { isActive: false },
        });
    }
    async listDueSchedules(daysAhead = 7) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() + daysAhead);
        return prisma_1.prisma.maintenanceSchedule.findMany({
            where: { isActive: true, nextDueDate: { lte: cutoff } },
            include: { condominium: { select: { id: true, name: true } } },
            orderBy: { nextDueDate: "asc" },
        });
    }
    async findById(id, actor) {
        await this.ensureOrderAccess(id, actor);
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