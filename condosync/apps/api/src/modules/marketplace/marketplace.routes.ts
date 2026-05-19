import { Router, Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { authenticate, authorize } from '../../middleware/auth';
import { validateRequest } from '../../utils/validateRequest';
import { ForbiddenError, NotFoundError } from '../../middleware/errorHandler';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

const ADMIN_ROLES = ['SUPER_ADMIN', 'CONDOMINIUM_ADMIN', 'SYNDIC'] as const;

const partnerSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  category: z.enum(['alimentacao', 'saude', 'educacao', 'servicos', 'lazer', 'outro']),
  condominiumId: z.string().uuid().optional(),
});

const offerSchema = z.object({
  partnerId: z.string().uuid(),
  title: z.string().min(2).max(200),
  description: z.string().min(2),
  discount: z.string().optional(),
  validUntil: z.string().datetime().optional(),
  couponCode: z.string().optional(),
  condominiumId: z.string().uuid().optional(),
});

const CATEGORY_LABELS: Record<string, string> = {
  alimentacao: 'Alimentação',
  saude: 'Saúde & Bem-estar',
  educacao: 'Educação',
  servicos: 'Serviços',
  lazer: 'Lazer & Entretenimento',
  outro: 'Outros',
};

// Resolve condominiumId a partir do usuário (para filtrar por tenant)
async function resolveCondominiumId(req: Request): Promise<string | null> {
  const { user } = req;
  if (!user) return null;

  // SUPER_ADMIN pode passar condominiumId explícito via query/body
  if (user.role === 'SUPER_ADMIN') {
    const id = (req.query.condominiumId as string) ?? req.body.condominiumId ?? null;
    return id ?? null;
  }

  // Outros roles: busca o primeiro vínculo ativo do usuário
  const membership = await prisma.condominiumUser.findFirst({
    where: { userId: user.userId, isActive: true },
    orderBy: { joinedAt: 'asc' },
  });
  return membership?.condominiumId ?? null;
}

// Verifica se o usuário tem permissão de admin sobre determinado condomínio
async function hasAdminAccess(req: Request, condominiumId: string): Promise<boolean> {
  const { user } = req;
  if (!user) return false;
  if (user.role === 'SUPER_ADMIN') return true;

  const membership = await prisma.condominiumUser.findFirst({
    where: {
      userId: user.userId,
      condominiumId,
      role: { in: ['CONDOMINIUM_ADMIN', 'SYNDIC'] },
      isActive: true,
    },
  });
  return !!membership;
}

// ─── Partners ─────────────────────────────────────────────────

// List active partners (filtrado pelo condomínio do usuário)
router.get('/partners', async (req: Request, res: Response) => {
  const condominiumId = await resolveCondominiumId(req);
  const where: any = { isActive: true };
  if (condominiumId) where.condominiumId = condominiumId;

  const partners = await prisma.marketplacePartner.findMany({
    where,
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

// Admin: List all partners do próprio condomínio (SUPER_ADMIN vê todos ou filtra)
router.get('/partners/admin', authorize(...ADMIN_ROLES), async (req: Request, res: Response) => {
  const condominiumId = await resolveCondominiumId(req);
  const where: any = {};
  if (condominiumId) where.condominiumId = condominiumId;

  const partners = await prisma.marketplacePartner.findMany({
    where,
    include: { offers: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: partners });
});

// Create partner
router.post('/partners', authorize(...ADMIN_ROLES), async (req: Request, res: Response) => {
  const body = validateRequest(partnerSchema, req.body);

  // Resolve condominiumId
  let condominiumId = body.condominiumId;
  if (!condominiumId) {
    const resolved = await resolveCondominiumId(req);
    if (!resolved) {
      res.status(400).json({ success: false, message: 'condominiumId é obrigatório' });
      return;
    }
    condominiumId = resolved;
  }

  const ok = await hasAdminAccess(req, condominiumId);
  if (!ok) throw new ForbiddenError('Sem permissão para este condomínio');

  const { condominiumId: _cid, ...rest } = body;
  const partner = await prisma.marketplacePartner.create({
    data: { ...rest, condominiumId, logoUrl: rest.logoUrl || undefined, website: rest.website || undefined, email: rest.email || undefined },
  });
  res.status(201).json({ success: true, data: partner });
});

// Update partner
router.put('/partners/:id', authorize(...ADMIN_ROLES), async (req: Request, res: Response) => {
  const current = await prisma.marketplacePartner.findUnique({ where: { id: req.params.id } });
  if (!current) throw new NotFoundError('Parceiro não encontrado');

  const ok = await hasAdminAccess(req, current.condominiumId);
  if (!ok) throw new ForbiddenError('Sem permissão para este condomínio');

  const body = validateRequest(partnerSchema.partial(), req.body);
  const { condominiumId: _cid, ...data } = body;
  const partner = await prisma.marketplacePartner.update({
    where: { id: req.params.id },
    data: { ...data, logoUrl: data.logoUrl || undefined, website: data.website || undefined, email: data.email || undefined },
  });
  res.json({ success: true, data: partner });
});

// Toggle partner active
router.patch('/partners/:id/toggle', authorize(...ADMIN_ROLES), async (req: Request, res: Response) => {
  const current = await prisma.marketplacePartner.findUnique({ where: { id: req.params.id } });
  if (!current) throw new NotFoundError('Parceiro não encontrado');

  const ok = await hasAdminAccess(req, current.condominiumId);
  if (!ok) throw new ForbiddenError('Sem permissão para este condomínio');

  const partner = await prisma.marketplacePartner.update({
    where: { id: req.params.id },
    data: { isActive: !current.isActive },
  });
  res.json({ success: true, data: partner });
});

// ─── Offers ───────────────────────────────────────────────────

// List active offers (filtrado pelo condomínio do usuário)
router.get('/offers', async (req: Request, res: Response) => {
  const { category } = req.query;
  const condominiumId = await resolveCondominiumId(req);

  const partnerWhere: any = { isActive: true };
  if (condominiumId) partnerWhere.condominiumId = condominiumId;
  if (category) partnerWhere.category = category;

  const where: any = {
    status: 'ACTIVE',
    partner: partnerWhere,
    OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
  };
  if (condominiumId) where.condominiumId = condominiumId;

  const offers = await prisma.marketplaceOffer.findMany({
    where,
    include: { partner: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: offers });
});

// Create offer
router.post('/offers', authorize(...ADMIN_ROLES), async (req: Request, res: Response) => {
  const body = validateRequest(offerSchema, req.body);

  // Verificar que o parceiro pertence ao condomínio correto
  const partner = await prisma.marketplacePartner.findUnique({ where: { id: body.partnerId } });
  if (!partner) throw new NotFoundError('Parceiro não encontrado');

  const ok = await hasAdminAccess(req, partner.condominiumId);
  if (!ok) throw new ForbiddenError('Sem permissão para este condomínio');

  const { condominiumId: _cid, ...rest } = body;
  const offer = await prisma.marketplaceOffer.create({
    data: {
      ...rest,
      condominiumId: partner.condominiumId,
      validUntil: rest.validUntil ? new Date(rest.validUntil) : undefined,
    },
    include: { partner: true },
  });
  res.status(201).json({ success: true, data: offer });
});

// Update offer
router.patch('/offers/:id', authorize(...ADMIN_ROLES), async (req: Request, res: Response) => {
  const current = await prisma.marketplaceOffer.findUnique({ where: { id: req.params.id } });
  if (!current) throw new NotFoundError('Oferta não encontrada');

  const ok = await hasAdminAccess(req, current.condominiumId);
  if (!ok) throw new ForbiddenError('Sem permissão para este condomínio');

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
router.delete('/offers/:id', authorize(...ADMIN_ROLES), async (req: Request, res: Response) => {
  const current = await prisma.marketplaceOffer.findUnique({ where: { id: req.params.id } });
  if (!current) throw new NotFoundError('Oferta não encontrada');

  const ok = await hasAdminAccess(req, current.condominiumId);
  if (!ok) throw new ForbiddenError('Sem permissão para este condomínio');

  await prisma.marketplaceOffer.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// ─── Categories meta ─────────────────────────────────────────
router.get('/categories', async (_req: Request, res: Response) => {
  res.json({ success: true, data: Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label })) });
});

export default router;
