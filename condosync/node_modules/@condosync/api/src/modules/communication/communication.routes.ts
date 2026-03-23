import { Router, Request, Response } from "express";
import { prisma } from "../../config/prisma";
import {
  authenticate,
  authorize,
  authorizeCondominium,
} from "../../middleware/auth";
import { validateRequest } from "../../utils/validateRequest";
import { z } from "zod";
import { ForbiddenError } from "../../middleware/errorHandler";
import { io } from "../../server";

const router = Router();
router.use(authenticate);

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
/** Verifica que o ator pertence ao condomÃ­nio indicado */
async function ensureCondominiumMembership(
  userId: string,
  role: string,
  condominiumId: string,
) {
  if (role === "SUPER_ADMIN") return;
  const membership = await prisma.condominiumUser.findFirst({
    where: { userId, condominiumId, isActive: true },
    select: { id: true },
  });
  if (!membership) throw new ForbiddenError("Acesso negado a este condomÃ­nio");
}

// â”€â”€â”€ Comunicados â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// C1 â€” adicionado authorizeCondominium
router.get(
  "/announcements/:condominiumId",
  authorizeCondominium,
  async (req: Request, res: Response) => {
    const announcements = await prisma.announcement.findMany({
      where: {
        condominiumId: req.params.condominiumId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
      take: Number(req.query.limit) || 20,
      skip:
        ((Number(req.query.page) || 1) - 1) * (Number(req.query.limit) || 20),
    });
    res.json({ success: true, data: { announcements } });
  },
);

const announcementSchema = z.object({
  condominiumId: z.string().uuid(),
  title: z.string().min(3),
  content: z.string().min(10),
  isPinned: z.boolean().optional(),
  isOfficial: z.boolean().optional(),
  attachments: z.array(z.string().url()).optional(),
  expiresAt: z.string().datetime().optional(),
});

// C2 â€” verifica membership ao criar comunicado
router.post(
  "/announcements",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const data = validateRequest(announcementSchema, req.body);
    await ensureCondominiumMembership(
      req.user!.userId,
      req.user!.role,
      data.condominiumId,
    );

    const announcement = await prisma.announcement.create({
      data: {
        ...data,
        authorId: req.user!.userId,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      },
    });

    io.to(`condominium:${data.condominiumId}`).emit(
      "announcement:new",
      announcement,
    );
    res.status(201).json({ success: true, data: { announcement } });
  },
);

// C3 â€” IDOR fix: verifica tenant antes de deletar
router.delete(
  "/announcements/:id",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const announcement = await prisma.announcement.findUniqueOrThrow({
      where: { id: req.params.id },
      select: { condominiumId: true },
    });
    await ensureCondominiumMembership(
      req.user!.userId,
      req.user!.role,
      announcement.condominiumId,
    );
    await prisma.announcement.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  },
);

// â”€â”€â”€ NotificaÃ§Ãµes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get("/notifications", async (req: Request, res: Response) => {
  const [notifications, unreadCount] = await prisma.$transaction([
    prisma.notification.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.notification.count({
      where: { userId: req.user!.userId, isRead: false },
    }),
  ]);
  res.json({ success: true, data: { notifications, unreadCount } });
});

router.patch("/notifications/:id/read", async (req: Request, res: Response) => {
  await prisma.notification.update({
    where: { id: req.params.id, userId: req.user!.userId },
    data: { isRead: true, readAt: new Date() },
  });
  res.json({ success: true });
});

router.patch("/notifications/read-all", async (req: Request, res: Response) => {
  await prisma.notification.updateMany({
    where: { userId: req.user!.userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  res.json({ success: true });
});

// â”€â”€â”€ OcorrÃªncias â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const occurrenceSchema = z.object({
  condominiumId: z.string().uuid(),
  title: z.string().min(3),
  description: z.string().min(10),
  category: z.string(),
  location: z.string().optional(),
  photoUrls: z.array(z.string()).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
});

router.get(
  "/occurrences/:condominiumId",
  async (req: Request, res: Response) => {
    await ensureCondominiumMembership(
      req.user!.userId,
      req.user!.role,
      req.params.condominiumId,
    );
    const occurrences = await prisma.occurrence.findMany({
      where: {
        condominiumId: req.params.condominiumId,
        ...(req.query.status && { status: req.query.status as any }),
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });
    res.json({ success: true, data: { occurrences } });
  },
);

// C4 â€” verifica membership ao criar ocorrÃªncia
router.post("/occurrences", async (req: Request, res: Response) => {
  const data = validateRequest(occurrenceSchema, req.body);
  await ensureCondominiumMembership(
    req.user!.userId,
    req.user!.role,
    data.condominiumId,
  );
  const occurrence = await prisma.occurrence.create({
    data: { ...data, reportedBy: req.user!.userId, status: "OPEN" },
  });
  res.status(201).json({ success: true, data: { occurrence } });
});

// â”€â”€â”€ Chat â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get("/chat/conversations", async (req: Request, res: Response) => {
  const conversations = await prisma.chatConversation.findMany({
    where: { participants: { has: req.user!.userId } },
    include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { updatedAt: "desc" },
  });
  res.json({ success: true, data: { conversations } });
});

router.get(
  "/chat/conversations/:id/messages",
  async (req: Request, res: Response) => {
    const messages = await prisma.chatMessage.findMany({
      where: { conversationId: req.params.id },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    res.json({ success: true, data: { messages } });
  },
);

const chatMessageSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1).max(4000),
  attachments: z.array(z.string()).optional(),
});

// C5 â€” valida com Zod e verifica participaÃ§Ã£o na conversa
router.post("/chat/messages", async (req: Request, res: Response) => {
  const { conversationId, content, attachments } = validateRequest(
    chatMessageSchema,
    req.body,
  );

  const conversation = await prisma.chatConversation.findUniqueOrThrow({
    where: { id: conversationId },
    select: { participants: true },
  });
  if (!conversation.participants.includes(req.user!.userId)) {
    throw new ForbiddenError("VocÃª nÃ£o Ã© participante desta conversa");
  }

  const message = await prisma.chatMessage.create({
    data: {
      conversationId,
      senderId: req.user!.userId,
      content,
      attachments: attachments || [],
    },
    include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
  });

  io.to(`conversation:${conversationId}`).emit("chat:message", message);
  res.status(201).json({ success: true, data: { message } });
});

// â”€â”€â”€ Enquetes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get("/polls/:condominiumId", async (req: Request, res: Response) => {
  const polls = await prisma.poll.findMany({
    where: {
      condominiumId: req.params.condominiumId,
      isActive: true,
      endsAt: { gt: new Date() },
    },
    include: { _count: { select: { votes: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ success: true, data: { polls } });
});

const pollVoteSchema = z.object({
  optionIds: z.array(z.string()).min(1),
});

// C6 â€” valida optionIds com Zod e verifica que as opÃ§Ãµes pertencem Ã  enquete
router.post("/polls/:id/vote", async (req: Request, res: Response) => {
  const { optionIds } = validateRequest(pollVoteSchema, req.body);

  const poll = await prisma.poll.findUniqueOrThrow({
    where: { id: req.params.id },
    select: { options: true, isActive: true, endsAt: true },
  });

  if (!poll.isActive || (poll.endsAt && poll.endsAt < new Date())) {
    throw new ForbiddenError("Esta enquete nÃ£o estÃ¡ ativa");
  }

  const optionSchema = z.array(z.object({ id: z.string() }));
  const validOptions = optionSchema.parse(poll.options).map((o) => o.id);
  const invalid = optionIds.filter((id) => !validOptions.includes(id));
  if (invalid.length > 0) {
    throw new ForbiddenError(
      "Uma ou mais opÃ§Ãµes nÃ£o pertencem a esta enquete",
    );
  }

  const vote = await prisma.pollVote.upsert({
    where: {
      pollId_userId: { pollId: req.params.id, userId: req.user!.userId },
    },
    update: { optionIds },
    create: { pollId: req.params.id, userId: req.user!.userId, optionIds },
  });
  res.json({ success: true, data: { vote } });
});

export default router;
