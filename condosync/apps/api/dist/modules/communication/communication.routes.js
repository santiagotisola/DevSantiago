"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../../config/prisma");
const auth_1 = require("../../middleware/auth");
const validateRequest_1 = require("../../utils/validateRequest");
const zod_1 = require("zod");
const server_1 = require("../../server");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// ─── Comunicados ─────────────────────────────────────────────
router.get('/announcements/:condominiumId', async (req, res) => {
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
router.post('/announcements', (0, auth_1.authorize)('CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), async (req, res) => {
    const data = (0, validateRequest_1.validateRequest)(announcementSchema, req.body);
    const announcement = await prisma_1.prisma.announcement.create({
        data: { ...data, authorId: req.user.userId, expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined },
    });
    // Emitir evento em tempo real
    server_1.io.to(`condominium:${data.condominiumId}`).emit('announcement:new', announcement);
    res.status(201).json({ success: true, data: { announcement } });
});
router.delete('/announcements/:id', (0, auth_1.authorize)('CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), async (req, res) => {
    await prisma_1.prisma.announcement.delete({ where: { id: req.params.id } });
    res.json({ success: true });
});
// ─── Notificações ─────────────────────────────────────────────
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
// ─── Ocorrências ─────────────────────────────────────────────
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
    const occurrences = await prisma_1.prisma.occurrence.findMany({
        where: { condominiumId: req.params.condominiumId, ...(req.query.status && { status: req.query.status }) },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
    res.json({ success: true, data: { occurrences } });
});
router.post('/occurrences', async (req, res) => {
    const data = (0, validateRequest_1.validateRequest)(occurrenceSchema, req.body);
    const occurrence = await prisma_1.prisma.occurrence.create({
        data: { ...data, reportedBy: req.user.userId, status: 'OPEN' },
    });
    res.status(201).json({ success: true, data: { occurrence } });
});
// ─── Chat ─────────────────────────────────────────────────────
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
router.post('/chat/messages', async (req, res) => {
    const { conversationId, content, attachments } = req.body;
    const message = await prisma_1.prisma.chatMessage.create({
        data: { conversationId, senderId: req.user.userId, content, attachments: attachments || [] },
        include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
    });
    // Emitir mensagem em tempo real
    server_1.io.to(`conversation:${conversationId}`).emit('chat:message', message);
    res.status(201).json({ success: true, data: { message } });
});
// ─── Enquetes ─────────────────────────────────────────────────
router.get('/polls/:condominiumId', async (req, res) => {
    const polls = await prisma_1.prisma.poll.findMany({
        where: { condominiumId: req.params.condominiumId, isActive: true, endsAt: { gt: new Date() } },
        include: { _count: { select: { votes: true } } },
        orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: { polls } });
});
router.post('/polls/:id/vote', async (req, res) => {
    const { optionIds } = req.body;
    const vote = await prisma_1.prisma.pollVote.upsert({
        where: { pollId_userId: { pollId: req.params.id, userId: req.user.userId } },
        update: { optionIds },
        create: { pollId: req.params.id, userId: req.user.userId, optionIds },
    });
    res.json({ success: true, data: { vote } });
});
exports.default = router;
//# sourceMappingURL=communication.routes.js.map