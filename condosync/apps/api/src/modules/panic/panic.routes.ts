import { Router, Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { authenticate, authorize } from '../../middleware/auth';
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

    // Broadcast via WebSocket to all admins/doormen in the condominium
    io.to(`condominium:${condominiumId}`).emit('panic:alert', {
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

    const alert = await prisma.panicAlert.update({
      where: { id: req.params.id },
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
