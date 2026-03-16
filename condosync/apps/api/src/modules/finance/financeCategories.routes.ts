import { Router, Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { authenticate, authorize } from '../../middleware/auth';
import { validateRequest } from '../../utils/validateRequest';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

const categorySchema = z.object({
  condominiumId: z.string().uuid(),
  name: z.string().min(2).max(100),
  type: z.enum(['INCOME', 'EXPENSE']),
  description: z.string().optional(),
});

// List categories for a condominium
router.get(
  '/:condominiumId',
  authorize('RESIDENT', 'DOORMAN', 'COUNCIL_MEMBER', 'CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'),
  async (req: Request, res: Response) => {
    const categories = await prisma.financialCategory.findMany({
      where: { condominiumId: req.params.condominiumId, isActive: true },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
    res.json({ success: true, data: categories });
  },
);

// Create
router.post(
  '/',
  authorize('CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'),
  async (req: Request, res: Response) => {
    const data = validateRequest(categorySchema, req.body);
    const category = await prisma.financialCategory.create({ data });
    res.status(201).json({ success: true, data: category });
  },
);

// Update
router.put(
  '/:id',
  authorize('CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'),
  async (req: Request, res: Response) => {
    const data = validateRequest(categorySchema.partial().omit({ condominiumId: true }), req.body);
    const category = await prisma.financialCategory.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ success: true, data: category });
  },
);

// Soft-delete
router.delete(
  '/:id',
  authorize('CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'),
  async (req: Request, res: Response) => {
    await prisma.financialCategory.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ success: true });
  },
);

export default router;
