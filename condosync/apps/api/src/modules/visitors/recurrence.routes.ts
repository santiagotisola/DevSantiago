import { Router, Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { authenticate, authorize } from '../../middleware/auth';
import { validateRequest } from '../../utils/validateRequest';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

const recurrenceSchema = z.object({
  condominiumId: z.string().uuid(),
  unitId: z.string().uuid(),
  visitorName: z.string().min(2),
  document: z.string().optional(),
  documentType: z.enum(['CPF', 'RG', 'CNH', 'PASSPORT']).optional(),
  company: z.string().optional(),
  reason: z.string().optional(),
  weekDays: z.array(z.enum(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'])).min(1),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime().optional(),
});

// List recurrences for a condominium
router.get(
  '/:condominiumId',
  authorize('RESIDENT', 'DOORMAN', 'CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'),
  async (req: Request, res: Response) => {
    const { condominiumId } = req.params;
    const user = req.user!;

    const where: any = { condominiumId, isActive: true };
    // Residents only see their own unit's recurrences
    if (user.role === 'RESIDENT') {
      where.unitId = user.unitId;
    }

    const recurrences = await prisma.visitorRecurrence.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: recurrences });
  },
);

// Create
router.post(
  '/',
  authorize('RESIDENT', 'DOORMAN', 'CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'),
  async (req: Request, res: Response) => {
    const data = validateRequest(recurrenceSchema, req.body);
    const user = req.user!;

    // Residents can only create for their own unit
    if (user.role === 'RESIDENT' && data.unitId !== user.unitId) {
      res.status(403).json({ success: false, message: 'Proibido: unidade inválida.' });
      return;
    }

    const recurrence = await prisma.visitorRecurrence.create({
      data: {
        ...data,
        validFrom: new Date(data.validFrom),
        validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
        createdBy: user.userId,
      },
    });
    res.status(201).json({ success: true, data: recurrence });
  },
);

// Deactivate
router.delete(
  '/:id',
  authorize('RESIDENT', 'DOORMAN', 'CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'),
  async (req: Request, res: Response) => {
    const user = req.user!;
    const existing = await prisma.visitorRecurrence.findUnique({ where: { id: req.params.id } });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Recorrência não encontrada.' });
      return;
    }

    if (user.role === 'RESIDENT' && existing.unitId !== user.unitId) {
      res.status(403).json({ success: false, message: 'Proibido.' });
      return;
    }

    await prisma.visitorRecurrence.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ success: true });
  },
);

export default router;
