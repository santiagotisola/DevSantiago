import { Router, Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { authenticate, authorize } from '../../middleware/auth';
import { validateRequest } from '../../utils/validateRequest';
import { z } from 'zod';
import { io } from '../../server';

const router = Router();
router.use(authenticate);

// ─── Comunicados ─────────────────────────────────────────────
router.get('/announcements/:condominiumId', async (req: Request, res: Response) => {
  const announcements = await prisma.announcement.findMany({
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

const announcementSchema = z.object({
  condominiumId: z.string().uuid(),
  title: z.string().min(3),
  content: z.string().min(10),
  isPinned: z.boolean().optional(),
  isOfficial: z.boolean().optional(),
  attachments: z.array(z.string().url()).optional(),
  expiresAt: z.string().datetime().optional(),
});

router.post('/announcements', authorize('CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), async (req: Request, res: Response) => {
  const data = validateRequest(announcementSchema, req.body);
  const announcement = await prisma.announcement.create({
    data: { ...data, authorId: req.user!.userId, expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined },
  });

  // Emitir evento em tempo real
  io.to(`condominium:${data.condominiumId}`).emit('announcement:new', announcement);

  res.status(201).json({ success: true, data: { announcement } });
});

// ─── Notificações ─────────────────────────────────────────────
router.get('/notifications', async (req: Request, res: Response) => {
  const [notifications, unreadCount] = await prisma.$transaction([
    prisma.notification.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.notification.count({ where: { userId: req.user!.userId, isRead: false } }),
  ]);
  res.json({ success: true, data: { notifications, unreadCount } });
});

router.patch('/notifications/:id/read', async (req: Request, res: Response) => {
  await prisma.notification.update({
    where: { id: req.params.id, userId: req.user!.userId },
    data: { isRead: true, readAt: new Date() },
  });
  res.json({ success: true });
});

router.patch('/notifications/read-all', async (req: Request, res: Response) => {
  await prisma.notification.updateMany({
    where: { userId: req.user!.userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  res.json({ success: true });
});

// ─── Ocorrências ─────────────────────────────────────────────
const occurrenceSchema = z.object({
  condominiumId: z.string().uuid(),
  title: z.string().min(3),
  description: z.string().min(10),
  category: z.string(),
  location: z.string().optional(),
  photoUrls: z.array(z.string()).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
});

router.get('/occurrences/:condominiumId', async (req: Request, res: Response) => {
  const occurrences = await prisma.occurrence.findMany({
    where: { condominiumId: req.params.condominiumId, ...(req.query.status && { status: req.query.status as any }) },
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
  });
  res.json({ success: true, data: { occurrences } });
});

router.post('/occurrences', async (req: Request, res: Response) => {
  const data = validateRequest(occurrenceSchema, req.body);
  const occurrence = await prisma.occurrence.create({
    data: { ...data, reportedBy: req.user!.userId, status: 'OPEN' },
  });
  res.status(201).json({ success: true, data: { occurrence } });
});

// ─── Chat ─────────────────────────────────────────────────────
router.get('/chat/conversations', async (req: Request, res: Response) => {
  const conversations = await prisma.chatConversation.findMany({
    where: { participants: { has: req.user!.userId } },
    include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
    orderBy: { updatedAt: 'desc' },
  });
  res.json({ success: true, data: { conversations } });
});

router.get('/chat/conversations/:id/messages', async (req: Request, res: Response) => {
  const messages = await prisma.chatMessage.findMany({
    where: { conversationId: req.params.id },
    include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: { createdAt: 'asc' },
  });
  res.json({ success: true, data: { messages } });
});

router.post('/chat/messages', async (req: Request, res: Response) => {
  const { conversationId, content, attachments } = req.body;
  const message = await prisma.chatMessage.create({
    data: { conversationId, senderId: req.user!.userId, content, attachments: attachments || [] },
    include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
  });

  // Emitir mensagem em tempo real
  io.to(`conversation:${conversationId}`).emit('chat:message', message);

  res.status(201).json({ success: true, data: { message } });
});

// ─── Enquetes ─────────────────────────────────────────────────
router.get('/polls/:condominiumId', async (req: Request, res: Response) => {
  const polls = await prisma.poll.findMany({
    where: { condominiumId: req.params.condominiumId, isActive: true, endsAt: { gt: new Date() } },
    include: { _count: { select: { votes: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: { polls } });
});

router.post('/polls/:id/vote', async (req: Request, res: Response) => {
  const { optionIds } = req.body;
  const vote = await prisma.pollVote.upsert({
    where: { pollId_userId: { pollId: req.params.id, userId: req.user!.userId } },
    update: { optionIds },
    create: { pollId: req.params.id, userId: req.user!.userId, optionIds },
  });
  res.json({ success: true, data: { vote } });
});

export default router;
