"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.visitorService = exports.VisitorService = void 0;
const prisma_1 = require("../../config/prisma");
const errorHandler_1 = require("../../middleware/errorHandler");
const client_1 = require("@prisma/client");
const notification_service_1 = require("../../notifications/notification.service");
class VisitorService {
    async ensureUnitAccess(userId, role, unitId) {
        const unit = await prisma_1.prisma.unit.findUniqueOrThrow({
            where: { id: unitId },
            select: { id: true, condominiumId: true },
        });
        if (role === client_1.UserRole.SUPER_ADMIN) {
            return unit;
        }
        const membership = await prisma_1.prisma.condominiumUser.findFirst({
            where: {
                userId,
                condominiumId: unit.condominiumId,
                isActive: true,
            },
            select: { unitId: true },
        });
        if (!membership) {
            throw new errorHandler_1.ForbiddenError("Acesso negado a esta unidade");
        }
        if (role === client_1.UserRole.RESIDENT && membership.unitId !== unit.id) {
            throw new errorHandler_1.ForbiddenError("Morador só pode acessar visitantes da própria unidade");
        }
        return unit;
    }
    async list(condominiumId, filters) {
        const { page = 1, limit = 20, ...where } = filters;
        const [visitors, total] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.visitor.findMany({
                where: {
                    unit: { condominiumId },
                    ...(where.unitId && { unitId: where.unitId }),
                    ...(where.status && { status: where.status }),
                    ...(where.date && {
                        createdAt: {
                            gte: new Date(`${where.date}T00:00:00`),
                            lte: new Date(`${where.date}T23:59:59`),
                        },
                    }),
                },
                include: { unit: { select: { identifier: true, block: true } } },
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma_1.prisma.visitor.count({
                where: {
                    unit: { condominiumId },
                    ...(where.unitId && { unitId: where.unitId }),
                },
            }),
        ]);
        return {
            visitors,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async create(data, actor) {
        await this.ensureUnitAccess(actor.userId, actor.role, data.unitId);
        const isResidentPreAuthorization = actor.role === client_1.UserRole.RESIDENT;
        const visitor = await prisma_1.prisma.visitor.create({
            data: {
                ...data,
                preAuthorizedBy: isResidentPreAuthorization ? actor.userId : undefined,
                status: isResidentPreAuthorization
                    ? client_1.VisitorStatus.AUTHORIZED
                    : client_1.VisitorStatus.PENDING,
            },
        });
        if (isResidentPreAuthorization) {
            await notification_service_1.NotificationService.enqueue({
                userId: actor.userId,
                type: "VISITOR",
                title: "Visitante pré-autorizado",
                message: `${data.name} foi pré-autorizado para sua unidade`,
                data: { visitorId: visitor.id },
                channels: ["inapp", "email"],
            });
        }
        return visitor;
    }
    async registerEntry(visitorId, registeredBy, photoUrl) {
        const visitor = await prisma_1.prisma.visitor.findUniqueOrThrow({
            where: { id: visitorId },
        });
        if (visitor.status === client_1.VisitorStatus.INSIDE) {
            throw new errorHandler_1.ForbiddenError("Visitante já está dentro do condomínio");
        }
        const updated = await prisma_1.prisma.visitor.update({
            where: { id: visitorId },
            data: {
                status: client_1.VisitorStatus.INSIDE,
                entryAt: new Date(),
                registeredBy,
                ...(photoUrl && { photoUrl }),
            },
        });
        const unitUsers = await prisma_1.prisma.condominiumUser.findMany({
            where: { unitId: visitor.unitId },
            select: { userId: true },
        });
        await Promise.all(unitUsers.map((u) => notification_service_1.NotificationService.enqueue({
            userId: u.userId,
            type: "VISITOR",
            title: "Visitante chegou",
            message: `${visitor.name} entrou no condomínio`,
            data: { visitorId: visitor.id },
            channels: ["inapp", "email"],
        })));
        return updated;
    }
    async registerExit(visitorId, registeredBy) {
        const visitor = await prisma_1.prisma.visitor.findUniqueOrThrow({
            where: { id: visitorId },
        });
        return prisma_1.prisma.visitor.update({
            where: { id: visitorId },
            data: { status: client_1.VisitorStatus.LEFT, exitAt: new Date(), registeredBy },
        });
    }
    async authorize(visitorId, actor, authorized) {
        const visitor = await prisma_1.prisma.visitor.findUniqueOrThrow({
            where: { id: visitorId },
            select: { unitId: true, status: true },
        });
        await this.ensureUnitAccess(actor.userId, actor.role, visitor.unitId);
        if (visitor.status === client_1.VisitorStatus.INSIDE ||
            visitor.status === client_1.VisitorStatus.LEFT) {
            throw new errorHandler_1.ForbiddenError("Não é possível alterar um visitante que já entrou ou saiu");
        }
        return prisma_1.prisma.visitor.update({
            where: { id: visitorId },
            data: {
                status: authorized ? client_1.VisitorStatus.AUTHORIZED : client_1.VisitorStatus.DENIED,
                preAuthorizedBy: actor.role === client_1.UserRole.RESIDENT ? actor.userId : undefined,
            },
        });
    }
    async findById(id) {
        return prisma_1.prisma.visitor.findUniqueOrThrow({
            where: { id },
            include: {
                unit: {
                    select: { identifier: true, block: true, condominiumId: true },
                },
            },
        });
    }
    async update(id, data) {
        const visitor = await prisma_1.prisma.visitor.findUniqueOrThrow({ where: { id } });
        if (visitor.status === client_1.VisitorStatus.INSIDE ||
            visitor.status === client_1.VisitorStatus.LEFT) {
            throw new errorHandler_1.ForbiddenError("Não é possível editar um visitante que já entrou ou saiu");
        }
        return prisma_1.prisma.visitor.update({ where: { id }, data });
    }
    async historyByUnit(unitId, actor, page = 1, limit = 20) {
        await this.ensureUnitAccess(actor.userId, actor.role, unitId);
        const [visitors, total] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.visitor.findMany({
                where: { unitId },
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma_1.prisma.visitor.count({ where: { unitId } }),
        ]);
        return { visitors, total, page, limit };
    }
}
exports.VisitorService = VisitorService;
exports.visitorService = new VisitorService();
//# sourceMappingURL=visitor.service.js.map