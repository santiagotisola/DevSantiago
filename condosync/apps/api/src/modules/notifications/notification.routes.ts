import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/auth';
import { notificationInboxService } from './notification-inbox.service';
import { NotificationType } from '@prisma/client';

const router = Router();
router.use(authenticate);

// GET / — listar minhas notificações (paginado, filtro por type, isRead)
router.get('/', async (req: Request, res: Response) => {
  const { page, limit, isRead, type } = req.query;

  const result = await notificationInboxService.list(req.user!.userId, {
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    isRead: isRead !== undefined ? isRead === 'true' : undefined,
    type: type as NotificationType | undefined,
  });

  res.json({ success: true, data: result });
});

// GET /unread-count — retornar { count: number }
router.get('/unread-count', async (req: Request, res: Response) => {
  const count = await notificationInboxService.getUnreadCount(req.user!.userId);
  res.json({ success: true, data: { count } });
});

// PATCH /:id/read — marcar como lida
router.patch('/:id/read', async (req: Request, res: Response) => {
  const notification = await notificationInboxService.markAsRead(req.params.id, req.user!.userId);
  res.json({ success: true, data: { notification } });
});

// PATCH /read-all — marcar todas como lidas
router.patch('/read-all', async (_req: Request, res: Response) => {
  await notificationInboxService.markAllAsRead(_req.user!.userId);
  res.json({ success: true });
});

// DELETE /:id — deletar notificação
router.delete('/:id', async (req: Request, res: Response) => {
  await notificationInboxService.delete(req.params.id, req.user!.userId);
  res.json({ success: true });
});

export default router;
