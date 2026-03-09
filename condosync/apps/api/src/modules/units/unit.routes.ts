import { Router, Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { authenticate, authorize } from '../../middleware/auth';
import { validateRequest } from '../../utils/validateRequest';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

const unitSchema = z.object({
  condominiumId: z.string().uuid(),
  identifier: z.string().min(1),
  block: z.string().optional(),
  area: z.number().positive().optional(),
  bedrooms: z.number().int().positive().optional(),
  status: z.enum(['OCCUPIED', 'VACANT', 'UNDER_RENOVATION']).optional(),
  fraction: z.number().positive().optional(),
  notes: z.string().optional(),
});

router.get('/condominium/:condominiumId', async (req: Request, res: Response) => {
  const units = await prisma.unit.findMany({
    where: { condominiumId: req.params.condominiumId, ...(req.query.status && { status: req.query.status as any }) },
    include: {
      _count: { select: { residents: true, vehicles: true } },
    },
    orderBy: [{ block: 'asc' }, { identifier: 'asc' }],
  });
  res.json({ success: true, data: { units } });
});

router.post('/', authorize('CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), async (req: Request, res: Response) => {
  const data = validateRequest(unitSchema, req.body);
  const unit = await prisma.unit.create({ data });
  res.status(201).json({ success: true, data: { unit } });
});

router.get('/:id', async (req: Request, res: Response) => {
  const unit = await prisma.unit.findUniqueOrThrow({
    where: { id: req.params.id },
    include: {
      residents: { include: { user: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } } } },
      vehicles: { where: { isActive: true } },
      dependents: { where: { isActive: true } },
    },
  });
  res.json({ success: true, data: { unit } });
});

router.put('/:id', authorize('CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), async (req: Request, res: Response) => {
  const data = validateRequest(unitSchema.partial(), req.body);
  const unit = await prisma.unit.update({ where: { id: req.params.id }, data });
  res.json({ success: true, data: { unit } });
});

export default router;
