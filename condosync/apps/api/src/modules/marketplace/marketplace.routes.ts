import { Router, Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { authenticate, authorize } from '../../middleware/auth';
import { validateRequest } from '../../utils/validateRequest';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

const partnerSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().optional(),
  logoUrl: z.string().url().optional(),
  website: z.string().url().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  category: z.enum(['alimentacao', 'saude', 'educacao', 'servicos', 'lazer', 'outro']),
});

const offerSchema = z.object({
  partnerId: z.string().uuid(),
  title: z.string().min(2).max(200),
  description: z.string().min(2),
  discount: z.string().optional(),
  validUntil: z.string().datetime().optional(),
  couponCode: z.string().optional(),
});

const CATEGORY_LABELS: Record<string, string> = {
  alimentacao: 'Alimentação',
  saude: 'Saúde & Bem-estar',
  educacao: 'Educação',
  servicos: 'Serviços',
  lazer: 'Lazer & Entretenimento',
  outro: 'Outros',
};

// ─── Partners ─────────────────────────────────────────────────

// List active partners with their offers
router.get('/partners', async (req: Request, res: Response) => {
  const partners = await prisma.marketplacePartner.findMany({
    where: { isActive: true },
    include: {
      offers: {
        where: {
          status: 'ACTIVE',
          OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
        },
      },
    },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });
  res.json({ success: true, data: partners });
});

// Admin: List all partners
router.get('/partners/admin', authorize('SUPER_ADMIN'), async (req: Request, res: Response) => {
  const partners = await prisma.marketplacePartner.findMany({
    include: { offers: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: partners });
});

// Create partner (SUPER_ADMIN only)
router.post('/partners', authorize('SUPER_ADMIN'), async (req: Request, res: Response) => {
  const data = validateRequest(partnerSchema, req.body);
  const partner = await prisma.marketplacePartner.create({ data });
  res.status(201).json({ success: true, data: partner });
});

// Update partner
router.put('/partners/:id', authorize('SUPER_ADMIN'), async (req: Request, res: Response) => {
  const data = validateRequest(partnerSchema.partial(), req.body);
  const partner = await prisma.marketplacePartner.update({
    where: { id: req.params.id },
    data,
  });
  res.json({ success: true, data: partner });
});

// Toggle partner active
router.patch('/partners/:id/toggle', authorize('SUPER_ADMIN'), async (req: Request, res: Response) => {
  const current = await prisma.marketplacePartner.findUnique({ where: { id: req.params.id } });
  if (!current) { res.status(404).json({ success: false, message: 'Parceiro não encontrado' }); return; }
  const partner = await prisma.marketplacePartner.update({
    where: { id: req.params.id },
    data: { isActive: !current.isActive },
  });
  res.json({ success: true, data: partner });
});

// ─── Offers ───────────────────────────────────────────────────

// List all active offers
router.get('/offers', async (req: Request, res: Response) => {
  const { category } = req.query;
  const where: any = {
    status: 'ACTIVE',
    partner: { isActive: true },
    OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
  };
  if (category) {
    where.partner = { category, isActive: true };
  }
  const offers = await prisma.marketplaceOffer.findMany({
    where,
    include: { partner: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: offers });
});

// Create offer
router.post('/offers', authorize('SUPER_ADMIN'), async (req: Request, res: Response) => {
  const data = validateRequest(offerSchema, req.body);
  const offer = await prisma.marketplaceOffer.create({
    data: {
      ...data,
      validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
    },
    include: { partner: true },
  });
  res.status(201).json({ success: true, data: offer });
});

// Update offer status
router.patch('/offers/:id', authorize('SUPER_ADMIN'), async (req: Request, res: Response) => {
  const schema = z.object({
    status: z.enum(['ACTIVE', 'INACTIVE', 'EXPIRED']).optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    discount: z.string().optional(),
    couponCode: z.string().optional(),
    validUntil: z.string().datetime().optional(),
  });
  const data = validateRequest(schema, req.body);
  const offer = await prisma.marketplaceOffer.update({
    where: { id: req.params.id },
    data: {
      ...data,
      validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
    },
  });
  res.json({ success: true, data: offer });
});

// Delete offer
router.delete('/offers/:id', authorize('SUPER_ADMIN'), async (req: Request, res: Response) => {
  await prisma.marketplaceOffer.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// ─── Categories meta ─────────────────────────────────────────
router.get('/categories', async (_req: Request, res: Response) => {
  res.json({ success: true, data: Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label })) });
});

export default router;
