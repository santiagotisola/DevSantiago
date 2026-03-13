"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.visitorService = exports.VisitorService = void 0;
const prisma_1 = require("../../config/prisma");
const errorHandler_1 = require("../../middleware/errorHandler");
const client_1 = require("@prisma/client");
const notification_service_1 = require("../../notifications/notification.service");
class VisitorService {
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
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma_1.prisma.visitor.count({
                where: { unit: { condominiumId }, ...(where.unitId && { unitId: where.unitId }) },
            }),
        ]);
        return { visitors, total, page, limit, totalPages: Math.ceil(total / limit) };
    }
    async create(data, authorizedBy) {
        const unit = await prisma_1.prisma.unit.findUniqueOrThrow({ where: { id: data.unitId } });
        const visitor = await prisma_1.prisma.visitor.create({
            data: {
                ...data,
                preAuthorizedBy: authorizedBy,
                status: authorizedBy ? client_1.VisitorStatus.AUTHORIZED : client_1.VisitorStatus.PENDING,
            },
        });
        // Notificar morador
        if (authorizedBy) {
            await notification_service_1.NotificationService.enqueue({
                userId: authorizedBy,
                type: 'VISITOR',
                title: 'Visitante pré-autorizado',
                message: `${data.name} foi pré-autorizado para sua unidade`,
                data: { visitorId: visitor.id },
                channels: ['inapp', 'email'],
            });
        }
        return visitor;
    }
    async registerEntry(visitorId, registeredBy, photoUrl) {
        const visitor = await prisma_1.prisma.visitor.findUniqueOrThrow({ where: { id: visitorId } });
        if (visitor.status === client_1.VisitorStatus.INSIDE) {
            throw new errorHandler_1.ForbiddenError('Visitante já está dentro do condomínio');
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
        // Notificar morador da unidade
        const unitUsers = await prisma_1.prisma.condominiumUser.findMany({
            where: { unitId: visitor.unitId },
            select: { userId: true },
        });
        await Promise.all(unitUsers.map((u) => notification_service_1.NotificationService.enqueue({
            userId: u.userId,
            type: 'VISITOR',
            title: 'Visitante chegou',
            message: `${visitor.name} entrou no condomínio`,
            data: { visitorId: visitor.id },
            channels: ['inapp', 'email'],
        })));
        return updated;
    }
    async registerExit(visitorId, registeredBy) {
        const visitor = await prisma_1.prisma.visitor.findUniqueOrThrow({ where: { id: visitorId } });
        return prisma_1.prisma.visitor.update({
            where: { id: visitorId },
            data: { status: client_1.VisitorStatus.LEFT, exitAt: new Date(), registeredBy },
        });
    }
    async authorize(visitorId, userId, authorized) {
        return prisma_1.prisma.visitor.update({
            where: { id: visitorId },
            data: {
                status: authorized ? client_1.VisitorStatus.AUTHORIZED : client_1.VisitorStatus.DENIED,
                preAuthorizedBy: userId,
            },
        });
    }
    async findById(id) {
        return prisma_1.prisma.visitor.findUniqueOrThrow({
            where: { id },
            include: { unit: { select: { identifier: true, block: true, condominiumId: true } } },
        });
    }
    async historyByUnit(unitId, page = 1, limit = 20) {
        const [visitors, total] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.visitor.findMany({
                where: { unitId },
                orderBy: { createdAt: 'desc' },
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