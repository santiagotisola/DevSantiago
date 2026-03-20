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

async function getActiveMembership(userId: string, condominiumId: string) {
  return prisma.condominiumUser.findFirst({
    where: { userId, condominiumId, isActive: true },
    select: { role: true, unitId: true },
  });
}

router.get(
  '/:condominiumId',
  authorize('RESIDENT', 'DOORMAN', 'CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'),
  async (req: Request, res: Response) => {
    const { condominiumId } = req.params;
    const user = req.user!;

    const membership = user.role === 'SUPER_ADMIN'
      ? null
      : await getActiveMembership(user.userId, condominiumId);

    if (user.role !== 'SUPER_ADMIN' && !membership) {
      res.status(403).json({ success: false, message: 'Acesso negado a este condominio.' });
      return;
    }

    const where: any = { condominiumId, isActive: true };

    if (membership?.role === 'RESIDENT') {
      if (!membership.unitId) {
        res.status(403).json({ success: false, message: 'Morador sem unidade ativa.' });
        return;
      }
      where.unitId = membership.unitId;
    }

    const recurrences = await prisma.visitorRecurrence.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: recurrences });
  },
);

router.post(
  '/',
  authorize('RESIDENT', 'DOORMAN', 'CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'),
  async (req: Request, res: Response) => {
    const data = validateRequest(recurrenceSchema, req.body);
    const user = req.user!;

    const membership = user.role === 'SUPER_ADMIN'
      ? null
      : await getActiveMembership(user.userId, data.condominiumId);

    if (user.role !== 'SUPER_ADMIN' && !membership) {
      res.status(403).json({ success: false, message: 'Acesso negado a este condominio.' });
      return;
    }

    if (membership?.role === 'RESIDENT') {
      if (!membership.unitId || data.unitId !== membership.unitId) {
        res.status(403).json({ success: false, message: 'Proibido: unidade invalida.' });
        return;
      }
    }

    const unit = await prisma.unit.findFirst({
      where: { id: data.unitId, condominiumId: data.condominiumId },
      select: { id: true },
    });
    if (!unit) {
      res.status(422).json({
        success: false,
        message: 'Unidade invalida para o condominio informado.',
      });
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

router.delete(
  '/:id',
  authorize('RESIDENT', 'DOORMAN', 'CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'),
  async (req: Request, res: Response) => {
    const user = req.user!;
    const existing = await prisma.visitorRecurrence.findUnique({ where: { id: req.params.id } });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Recorrencia nao encontrada.' });
      return;
    }

    if (user.role !== 'SUPER_ADMIN') {
      const membership = await getActiveMembership(user.userId, existing.condominiumId);
      if (!membership) {
        res.status(403).json({ success: false, message: 'Acesso negado a este condominio.' });
        return;
      }
      if (membership.role === 'RESIDENT' && existing.unitId !== membership.unitId) {
        res.status(403).json({ success: false, message: 'Proibido.' });
        return;
      }
    }

    await prisma.visitorRecurrence.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    res.json({ success: true });
  },
);

export default router;
