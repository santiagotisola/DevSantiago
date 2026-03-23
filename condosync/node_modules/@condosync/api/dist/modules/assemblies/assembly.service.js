"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assemblyService = exports.AssemblyService = void 0;
const prisma_1 = require("../../config/prisma");
const client_1 = require("@prisma/client");
const errorHandler_1 = require("../../middleware/errorHandler");
const notification_service_1 = require("../../notifications/notification.service");
// Valid status transitions: SCHEDULED → IN_PROGRESS → FINISHED
const VALID_TRANSITIONS = {
    [client_1.AssemblyStatus.SCHEDULED]: [client_1.AssemblyStatus.IN_PROGRESS],
    [client_1.AssemblyStatus.IN_PROGRESS]: [client_1.AssemblyStatus.FINISHED],
    [client_1.AssemblyStatus.FINISHED]: [],
    [client_1.AssemblyStatus.CANCELED]: [],
};
class AssemblyService {
    async ensureAssemblyAccess(assemblyId, actor) {
        const assembly = await prisma_1.prisma.assembly.findUniqueOrThrow({
            where: { id: assemblyId },
            select: { id: true, condominiumId: true },
        });
        if (actor.role !== client_1.UserRole.SUPER_ADMIN) {
            const membership = await prisma_1.prisma.condominiumUser.findFirst({
                where: { userId: actor.userId, condominiumId: assembly.condominiumId, isActive: true },
                select: { id: true },
            });
            if (!membership)
                throw new errorHandler_1.ForbiddenError('Acesso negado a esta assembleia');
        }
        return assembly;
    }
    async list(condominiumId, page = 1, limit = 20) {
        const [assemblies, total] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.assembly.findMany({
                where: { condominiumId },
                orderBy: { scheduledAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma_1.prisma.assembly.count({ where: { condominiumId } }),
        ]);
        return { assemblies, total, page, limit, totalPages: Math.ceil(total / limit) };
    }
    async getById(id, actor) {
        await this.ensureAssemblyAccess(id, actor);
        return prisma_1.prisma.assembly.findUniqueOrThrow({
            where: { id },
            include: {
                votingItems: {
                    include: {
                        _count: { select: { votes: true } },
                    },
                },
                _count: { select: { attendees: true } },
            },
        });
    }
    async create(data, actor) {
        // Verify actor is a member of the condominium
        if (actor.role !== client_1.UserRole.SUPER_ADMIN) {
            const membership = await prisma_1.prisma.condominiumUser.findFirst({
                where: { userId: actor.userId, condominiumId: data.condominiumId, isActive: true },
                select: { id: true },
            });
            if (!membership)
                throw new errorHandler_1.ForbiddenError('Acesso negado a este condomínio');
        }
        const { votingItems, ...assemblyData } = data;
        const assembly = await prisma_1.prisma.assembly.create({
            data: {
                ...assemblyData,
                votingItems: {
                    create: votingItems?.map((item) => ({
                        title: item.title,
                        description: item.description,
                        options: item.options,
                    })),
                },
            },
            include: { votingItems: true },
        });
        // Notificar moradores sobre a nova assembleia
        const unitUsers = await prisma_1.prisma.condominiumUser.findMany({
            where: { condominiumId: data.condominiumId },
            select: { userId: true },
        });
        await Promise.all(unitUsers.map((u) => notification_service_1.NotificationService.enqueue({
            userId: u.userId,
            type: 'ASSEMBLY',
            title: 'Nova Assembleia Agendada',
            message: `Uma nova assembleia "${data.title}" foi agendada para ${data.scheduledAt.toLocaleString('pt-BR')}.`,
            data: { assemblyId: assembly.id },
            channels: ['inapp', 'email'],
        })));
        return assembly;
    }
    async updateStatus(id, status, actor) {
        await this.ensureAssemblyAccess(id, actor);
        const current = await prisma_1.prisma.assembly.findUniqueOrThrow({
            where: { id },
            select: { status: true },
        });
        const allowed = VALID_TRANSITIONS[current.status];
        if (!allowed.includes(status)) {
            throw new errorHandler_1.AppError(`Transição inválida: ${current.status} → ${status}. Transições permitidas: ${allowed.join(', ') || 'nenhuma'}`, 400);
        }
        const assembly = await prisma_1.prisma.assembly.update({
            where: { id },
            data: {
                status,
                ...(status === client_1.AssemblyStatus.IN_PROGRESS && { startedAt: new Date() }),
                ...(status === client_1.AssemblyStatus.FINISHED && { finishedAt: new Date() }),
            },
        });
        // Se começou, avisar que está rolando agora
        if (status === client_1.AssemblyStatus.IN_PROGRESS) {
            const unitUsers = await prisma_1.prisma.condominiumUser.findMany({
                where: { condominiumId: assembly.condominiumId },
                select: { userId: true },
            });
            await Promise.all(unitUsers.map((u) => notification_service_1.NotificationService.enqueue({
                userId: u.userId,
                type: 'ASSEMBLY',
                title: 'Assembleia Iniciada',
                message: `A assembleia "${assembly.title}" começou agora. Participe pelo link no sistema.`,
                data: { assemblyId: assembly.id },
                channels: ['inapp'],
            })));
        }
        return assembly;
    }
    async vote(votingItemId, userId, optionId, actor) {
        // Verificar se a assembleia está em progresso
        const votingItem = await prisma_1.prisma.assemblyVotingItem.findUniqueOrThrow({
            where: { id: votingItemId },
            include: { assembly: true },
        });
        if (votingItem.assembly.status !== client_1.AssemblyStatus.IN_PROGRESS) {
            throw new errorHandler_1.AppError('Votação só é permitida enquanto a assembleia está em progresso');
        }
        // Verificar membership do votante [A4]
        await this.ensureAssemblyAccess(votingItem.assemblyId, actor);
        return prisma_1.prisma.assemblyVote.upsert({
            where: {
                votingItemId_userId: { votingItemId, userId },
            },
            update: { optionId, votedAt: new Date() },
            create: { votingItemId, userId, optionId },
        });
    }
    async registerAttendance(assemblyId, userId, actor) {
        await this.ensureAssemblyAccess(assemblyId, actor);
        return prisma_1.prisma.assemblyAttendee.upsert({
            where: {
                assemblyId_userId: { assemblyId, userId },
            },
            update: {},
            create: { assemblyId, userId },
        });
    }
    async getVotingResults(assemblyId, actor) {
        await this.ensureAssemblyAccess(assemblyId, actor);
        const items = await prisma_1.prisma.assemblyVotingItem.findMany({
            where: { assemblyId },
            include: {
                votes: true,
            },
        });
        return items.map((item) => {
            const options = item.options;
            const results = options.map((opt) => ({
                ...opt,
                votes: item.votes.filter((v) => v.optionId === opt.id).length,
            }));
            return {
                id: item.id,
                title: item.title,
                results,
                totalVotes: item.votes.length,
            };
        });
    }
}
exports.AssemblyService = AssemblyService;
exports.assemblyService = new AssemblyService();
//# sourceMappingURL=assembly.service.js.map