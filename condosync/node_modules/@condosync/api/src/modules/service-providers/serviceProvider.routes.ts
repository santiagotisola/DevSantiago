import { Router, Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { authenticate, authorize } from '../../middleware/auth';
import { validateRequest } from '../../utils/validateRequest';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

const schema = z.object({
  condominiumId: z.string().uuid(),
  name: z.string().min(2),
  cnpj: z.string().optional(),
  cpf: z.string().optional(),
  serviceType: z.string().min(2),
  phone: z.string(),
  email: z.string().email().optional(),
  notes: z.string().optional(),
});

router.get('/condominium/:condominiumId', async (req: Request, res: Response) => {
  const providers = await prisma.serviceProvider.findMany({
    where: { condominiumId: req.params.condominiumId, ...(req.query.approved && { isApproved: req.query.approved === 'true' }) },
    orderBy: { name: 'asc' },
  });
  res.json({ success: true, data: { providers } });
});

router.post('/', authorize('CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), async (req: Request, res: Response) => {
  const data = validateRequest(schema, req.body);
  const provider = await prisma.serviceProvider.create({ data });
  res.status(201).json({ success: true, data: { provider } });
});

router.put('/:id', authorize('CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), async (req: Request, res: Response) => {
  const data = validateRequest(schema.partial(), req.body);
  const provider = await prisma.serviceProvider.update({ where: { id: req.params.id }, data });
  res.json({ success: true, data: { provider } });
});

router.patch('/:id/approve', authorize('CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), async (req: Request, res: Response) => {
  const provider = await prisma.serviceProvider.update({ where: { id: req.params.id }, data: { isApproved: true } });
  res.json({ success: true, data: { provider } });
});

router.delete('/:id', authorize('CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), async (req: Request, res: Response) => {
  await prisma.serviceProvider.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

export default router;
