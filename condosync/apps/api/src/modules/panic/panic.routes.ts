import { Router, Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { authenticate, authorize, authorizeCondominium } from '../../middleware/auth';
import { validateRequest } from '../../utils/validateRequest';
import { z } from 'zod';
import { io } from '../../server';
import { logger } from '../../config/logger';

const router = Router();
router.use(authenticate);

// Trigger panic alert
router.post(
  '/',
  authorize('DOORMAN', 'CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN', 'RESIDENT'),
  authorizeCondominium,
  async (req: Request, res: Response) => {
    const schema = z.object({
      condominiumId: z.string().uuid(),
      notes: z.string().optional(),
    });
    const { condominiumId, notes } = validateRequest(schema, req.body);
    const user = req.user!;

    const alert = await prisma.panicAlert.create({
      data: {
        condominiumId,
        triggeredBy: user.userId,
        notes,
      },
    });

    // Broadcast via WebSocket only to condominium staff
    io.to(`condominium:${condominiumId}:staff`).emit('panic:alert', {
      alertId: alert.id,
      triggeredBy: user.userId,
      triggeredByName: user.name ?? 'Usuário',
      condominiumId,
      triggeredAt: alert.createdAt,
    });

    logger.warn(`PÂNICO acionado por ${user.userId} no condomínio ${condominiumId}`);
    res.status(201).json({ success: true, data: alert });
  },
);

// Resolve panic alert
router.post(
  '/:id/resolve',
  authorize('DOORMAN', 'CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'),
  async (req: Request, res: Response) => {
    const schema = z.object({ notes: z.string().optional() });
    const { notes } = validateRequest(schema, req.body);
    const user = req.user!;

    const existing = await prisma.panicAlert.findUnique({
      where: { id: req.params.id },
      select: { id: true, condominiumId: true },
    });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Alerta não encontrado' });
      return;
    }

    if (user.role !== 'SUPER_ADMIN') {
      const membership = await prisma.condominiumUser.findFirst({
        where: { userId: user.userId, condominiumId: existing.condominiumId, isActive: true },
        select: { id: true },
      });
      if (!membership) {
        res.status(403).json({ success: false, message: 'Acesso negado a este condomínio' });
        return;
      }
    }

    const alert = await prisma.panicAlert.update({
      where: { id: existing.id },
      data: {
        resolvedBy: user.userId,
        resolvedAt: new Date(),
        notes: notes ?? undefined,
      },
    });

    res.json({ success: true, data: alert });
  },
);

// List alerts for a condominium
router.get(
  '/:condominiumId',
  authorize('DOORMAN', 'CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'),
  authorizeCondominium,
  async (req: Request, res: Response) => {
    const alerts = await prisma.panicAlert.findMany({
      where: { condominiumId: req.params.condominiumId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ success: true, data: alerts });
  },
);

export default router;
