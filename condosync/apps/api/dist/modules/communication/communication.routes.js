"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../../config/prisma");
const auth_1 = require("../../middleware/auth");
const validateRequest_1 = require("../../utils/validateRequest");
const zod_1 = require("zod");
const errorHandler_1 = require("../../middleware/errorHandler");
const server_1 = require("../../server");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
/** Verifica que o ator pertence ao condomÃ­nio indicado */
async function ensureCondominiumMembership(userId, role, condominiumId) {
    if (role === 'SUPER_ADMIN')
        return;
    const membership = await prisma_1.prisma.condominiumUser.findFirst({
        where: { userId, condominiumId, isActive: true },
        select: { id: true },
    });
    if (!membership)
        throw new errorHandler_1.ForbiddenError('Acesso negado a este condomÃ­nio');
}
// â”€â”€â”€ Comunicados â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// C1 â€” adicionado authorizeCondominium
router.get('/announcements/:condominiumId', auth_1.authorizeCondominium, async (req, res) => {
    const announcements = await prisma_1.prisma.announcement.findMany({
        where: {
            condominiumId: req.params.condominiumId,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
        take: Number(req.query.limit) || 20,
        skip: ((Number(req.query.page) || 1) - 1) * (Number(req.query.limit) || 20),
    });
    res.json({ success: true, data: { announcements } });
});
const announcementSchema = zod_1.z.object({
    condominiumId: zod_1.z.string().uuid(),
    title: zod_1.z.string().min(3),
    content: zod_1.z.string().min(10),
    isPinned: zod_1.z.boolean().optional(),
    isOfficial: zod_1.z.boolean().optional(),
    attachments: zod_1.z.array(zod_1.z.string().url()).optional(),
    expiresAt: zod_1.z.string().datetime().optional(),
});
// C2 â€” verifica membership ao criar comunicado
router.post('/announcements', (0, auth_1.authorize)('CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), async (req, res) => {
    const data = (0, validateRequest_1.validateRequest)(announcementSchema, req.body);
    await ensureCondominiumMembership(req.user.userId, req.user.role, data.condominiumId);
    const announcement = await prisma_1.prisma.announcement.create({
        data: { ...data, authorId: req.user.userId, expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined },
    });
    server_1.io.to(`condominium:${data.condominiumId}`).emit('announcement:new', announcement);
    res.status(201).json({ success: true, data: { announcement } });
});
// C3 â€” IDOR fix: verifica tenant antes de deletar
router.delete('/announcements/:id', (0, auth_1.authorize)('CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), async (req, res) => {
    const announcement = await prisma_1.prisma.announcement.findUniqueOrThrow({
        where: { id: req.params.id },
        select: { condominiumId: true },
    });
    await ensureCondominiumMembership(req.user.userId, req.user.role, announcement.condominiumId);
    await prisma_1.prisma.announcement.delete({ where: { id: req.params.id } });
    res.json({ success: true });
});
// â”€â”€â”€ NotificaÃ§Ãµes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/notifications', async (req, res) => {
    const [notifications, unreadCount] = await prisma_1.prisma.$transaction([
        prisma_1.prisma.notification.findMany({
            where: { userId: req.user.userId },
            orderBy: { createdAt: 'desc' },
            take: 50,
        }),
        prisma_1.prisma.notification.count({ where: { userId: req.user.userId, isRead: false } }),
    ]);
    res.json({ success: true, data: { notifications, unreadCount } });
});
router.patch('/notifications/:id/read', async (req, res) => {
    await prisma_1.prisma.notification.update({
        where: { id: req.params.id, userId: req.user.userId },
        data: { isRead: true, readAt: new Date() },
    });
    res.json({ success: true });
});
router.patch('/notifications/read-all', async (req, res) => {
    await prisma_1.prisma.notification.updateMany({
        where: { userId: req.user.userId, isRead: false },
        data: { isRead: true, readAt: new Date() },
    });
    res.json({ success: true });
});
// â”€â”€â”€ OcorrÃªncias â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const occurrenceSchema = zod_1.z.object({
    condominiumId: zod_1.z.string().uuid(),
    title: zod_1.z.string().min(3),
    description: zod_1.z.string().min(10),
    category: zod_1.z.string(),
    location: zod_1.z.string().optional(),
    photoUrls: zod_1.z.array(zod_1.z.string()).optional(),
    priority: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
});
router.get('/occurrences/:condominiumId', async (req, res) => {
    await ensureCondominiumMembership(req.user.userId, req.user.role, req.params.condominiumId);
    const occurrences = await prisma_1.prisma.occurrence.findMany({
        where: { condominiumId: req.params.condominiumId, ...(req.query.status && { status: req.query.status }) },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
    res.json({ success: true, data: { occurrences } });
});
// C4 â€” verifica membership ao criar ocorrÃªncia
router.post('/occurrences', async (req, res) => {
    const data = (0, validateRequest_1.validateRequest)(occurrenceSchema, req.body);
    await ensureCondominiumMembership(req.user.userId, req.user.role, data.condominiumId);
    const occurrence = await prisma_1.prisma.occurrence.create({
        data: { ...data, reportedBy: req.user.userId, status: 'OPEN' },
    });
    res.status(201).json({ success: true, data: { occurrence } });
});
// â”€â”€â”€ Chat â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/chat/conversations', async (req, res) => {
    const conversations = await prisma_1.prisma.chatConversation.findMany({
        where: { participants: { has: req.user.userId } },
        include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
        orderBy: { updatedAt: 'desc' },
    });
    res.json({ success: true, data: { conversations } });
});
router.get('/chat/conversations/:id/messages', async (req, res) => {
    const messages = await prisma_1.prisma.chatMessage.findMany({
        where: { conversationId: req.params.id },
        include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { createdAt: 'asc' },
    });
    res.json({ success: true, data: { messages } });
});
const chatMessageSchema = zod_1.z.object({
    conversationId: zod_1.z.string().uuid(),
    content: zod_1.z.string().min(1).max(4000),
    attachments: zod_1.z.array(zod_1.z.string()).optional(),
});
// C5 â€” valida com Zod e verifica participaÃ§Ã£o na conversa
router.post('/chat/messages', async (req, res) => {
    const { conversationId, content, attachments } = (0, validateRequest_1.validateRequest)(chatMessageSchema, req.body);
    const conversation = await prisma_1.prisma.chatConversation.findUniqueOrThrow({
        where: { id: conversationId },
        select: { participants: true },
    });
    if (!conversation.participants.includes(req.user.userId)) {
        throw new errorHandler_1.ForbiddenError('VocÃª nÃ£o Ã© participante desta conversa');
    }
    const message = await prisma_1.prisma.chatMessage.create({
        data: { conversationId, senderId: req.user.userId, content, attachments: attachments || [] },
        include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
    });
    server_1.io.to(`conversation:${conversationId}`).emit('chat:message', message);
    res.status(201).json({ success: true, data: { message } });
});
// â”€â”€â”€ Enquetes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/polls/:condominiumId', async (req, res) => {
    const polls = await prisma_1.prisma.poll.findMany({
        where: { condominiumId: req.params.condominiumId, isActive: true, endsAt: { gt: new Date() } },
        include: { _count: { select: { votes: true } } },
        orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: { polls } });
});
const pollVoteSchema = zod_1.z.object({
    optionIds: zod_1.z.array(zod_1.z.string()).min(1),
});
// C6 â€” valida optionIds com Zod e verifica que as opÃ§Ãµes pertencem Ã  enquete
router.post('/polls/:id/vote', async (req, res) => {
    const { optionIds } = (0, validateRequest_1.validateRequest)(pollVoteSchema, req.body);
    const poll = await prisma_1.prisma.poll.findUniqueOrThrow({
        where: { id: req.params.id },
        select: { options: true, isActive: true, endsAt: true },
    });
    if (!poll.isActive || (poll.endsAt && poll.endsAt < new Date())) {
        throw new errorHandler_1.ForbiddenError('Esta enquete nÃ£o estÃ¡ ativa');
    }
    const optionSchema = zod_1.z.array(zod_1.z.object({ id: zod_1.z.string() }));
    const validOptions = optionSchema.parse(poll.options).map((o) => o.id);
    const invalid = optionIds.filter((id) => !validOptions.includes(id));
    if (invalid.length > 0) {
        throw new errorHandler_1.ForbiddenError('Uma ou mais opÃ§Ãµes nÃ£o pertencem a esta enquete');
    }
    const vote = await prisma_1.prisma.pollVote.upsert({
        where: { pollId_userId: { pollId: req.params.id, userId: req.user.userId } },
        update: { optionIds },
        create: { pollId: req.params.id, userId: req.user.userId, optionIds },
    });
    res.json({ success: true, data: { vote } });
});
exports.default = router;
//# sourceMappingURL=communication.routes.js.map