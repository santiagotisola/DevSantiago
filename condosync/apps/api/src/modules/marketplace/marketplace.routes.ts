import { Router, Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { authenticate, authorize } from '../../middleware/auth';
import { validateRequest } from '../../utils/validateRequest';
import { AppError, ForbiddenError, NotFoundError } from '../../middleware/errorHandler';
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

const categorySchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  label: z.string().optional(),
  color: z.string().optional(),
  displayOrder: z.number().optional(),
  isActive: z.boolean().optional(),
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
    if (id) return id;
    // Fallback: busca primeiro condomínio associado
    const membership = await prisma.condominiumUser.findFirst({
      where: { userId: user.userId, isActive: true },
      orderBy: { joinedAt: 'asc' },
    });
    return membership?.condominiumId ?? null;
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
      console.error('[Marketplace] Failed to resolve condominiumId for user:', req.user?.userId);
      throw new Error('Não foi possível determinar o condomínio. Verifique se você está vinculado a um condomínio válido.');
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
  if (!current.condominiumId) throw new Error('Parceiro sem condomínio');

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
  if (!current.condominiumId) throw new Error('Parceiro sem condomínio');

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

// Admin: List all offers for admin panel (without status filters)
router.get('/offers/admin', authorize(...ADMIN_ROLES), async (req: Request, res: Response) => {
  const condominiumId = await resolveCondominiumId(req);
  const where: any = { partner: { isActive: true } };
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
  if (!partner.condominiumId) throw new Error('Parceiro sem condomínio');

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

// ─── MODELO 4: Produtos do Catálogo ──────────────────────────────────

const productSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().optional(),
  price: z.coerce.number().positive(),
  discount: z.coerce.number().min(0).max(100).optional().default(0),
  shippingCost: z.coerce.number().min(0).optional().default(0),
  imageUrl: z.string().url().optional(),
  category: z.string().optional(),
  stock: z.coerce.number().int().optional().default(-1),
  partnerId: z.string().uuid(),
  condominiumId: z.string().uuid().optional(),
});

// Listar produtos (morador)
router.get('/products', async (req: Request, res: Response) => {
  const { partnerId, category } = req.query;
  const condominiumId = await resolveCondominiumId(req);

  const where: any = { isActive: true };
  if (condominiumId) where.condominiumId = condominiumId;
  if (partnerId) where.partnerId = partnerId;
  if (category) where.category = category;

  const products = await prisma.marketplaceProduct.findMany({
    where,
    include: {
      images: { orderBy: { displayOrder: 'asc' } },
      reviews: { take: 5 },
      partner: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  res.json({ success: true, data: products });
});

// Detalhe do produto
router.get('/products/:id', async (req: Request, res: Response) => {
  const product = await prisma.marketplaceProduct.findUnique({
    where: { id: req.params.id },
    include: {
      images: { orderBy: { displayOrder: 'asc' } },
      reviews: { include: { resident: { select: { name: true, avatarUrl: true } } } },
      partner: true,
    },
  });

  if (!product) throw new NotFoundError('Produto não encontrado');
  res.json({ success: true, data: product });
});

// Criar produto (parceiro admin)
router.post('/products', authorize(...ADMIN_ROLES), async (req: Request, res: Response) => {
  const body = validateRequest(productSchema, req.body);
  const condominiumId = body.condominiumId || (await resolveCondominiumId(req));

  if (!condominiumId) {
    res.status(400).json({ success: false, message: 'condominiumId obrigatório' });
    return;
  }

  const partner = await prisma.marketplacePartner.findUnique({
    where: { id: body.partnerId },
  });
  if (!partner) throw new NotFoundError('Parceiro não encontrado');

  const ok = await hasAdminAccess(req, condominiumId);
  if (!ok) throw new ForbiddenError('Sem permissão');

  const finalPrice = body.price * (1 - (body.discount ?? 0) / 100);
  const product = await prisma.marketplaceProduct.create({
    data: {
      ...body,
      finalPrice,
      condominiumId: condominiumId!,
    },
    include: { images: true },
  });

  res.status(201).json({ success: true, data: product });
});

// Editar produto
router.put('/products/:id', authorize(...ADMIN_ROLES), async (req: Request, res: Response) => {
  const current = await prisma.marketplaceProduct.findUnique({
    where: { id: req.params.id },
  });
  if (!current) throw new NotFoundError('Produto não encontrado');
  if (!current.condominiumId) throw new Error('Produto sem condomínio');

  const ok = await hasAdminAccess(req, current.condominiumId);
  if (!ok) throw new ForbiddenError('Sem permissão');

  const body = validateRequest(productSchema.partial(), req.body);
  const finalPrice = body.price
    ? body.price * (1 - ((body.discount ?? current.discount.toNumber()) ?? 0) / 100)
    : current.finalPrice;

  const product = await prisma.marketplaceProduct.update({
    where: { id: req.params.id },
    data: { ...body, finalPrice },
  });

  res.json({ success: true, data: product });
});

// Deletar produto
router.delete('/products/:id', authorize(...ADMIN_ROLES), async (req: Request, res: Response) => {
  const current = await prisma.marketplaceProduct.findUnique({
    where: { id: req.params.id },
  });
  if (!current) throw new NotFoundError('Produto não encontrado');
  if (!current.condominiumId) throw new Error('Produto sem condomínio');

  const ok = await hasAdminAccess(req, current.condominiumId);
  if (!ok) throw new ForbiddenError('Sem permissão');

  await prisma.marketplaceProduct.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// ─── Requisições de Produtos ────────────────────────────────

const requestSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1).default(1),
  notes: z.string().optional(),
});

// Criar requisição (morador)
router.post('/requests', authorize(), async (req: Request, res: Response) => {
  const body = validateRequest(requestSchema, req.body);
  const { user } = req;
  if (!user) throw new ForbiddenError('Usuário não autenticado');

  const product = await prisma.marketplaceProduct.findUnique({
    where: { id: body.productId },
    include: { partner: true },
  });
  if (!product) throw new NotFoundError('Produto não encontrado');
  if (!product.condominiumId) throw new Error('Produto sem condomínio');

  const request = await prisma.marketplaceProductRequest.create({
    data: {
      productId: body.productId,
      partnerId: product.partnerId,
      residentId: user.userId,
      condominiumId: product.condominiumId,
      quantity: body.quantity,
      notes: body.notes,
    },
    include: { product: true, partner: true },
  });

  res.status(201).json({ success: true, data: request });
});

// Listar minhas requisições (morador)
router.get('/requests', authorize(), async (req: Request, res: Response) => {
  const { user } = req;
  if (!user) throw new ForbiddenError('Usuário não autenticado');

  const requests = await prisma.marketplaceProductRequest.findMany({
    where: { residentId: user.userId },
    include: {
      product: true,
      partner: true,
      messages: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, data: requests });
});

// Admin: List all product requests for condominium
router.get('/requests/admin', authorize(...ADMIN_ROLES), async (req: Request, res: Response) => {
  const condominiumId = await resolveCondominiumId(req);
  const where: any = {};
  if (condominiumId) where.condominiumId = condominiumId;

  const requests = await prisma.marketplaceProductRequest.findMany({
    where,
    include: {
      product: true,
      partner: true,
      resident: true,
      messages: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, data: requests });
});

// Listar requisições do parceiro (admin)
router.get('/requests/partner', authorize(...ADMIN_ROLES), async (req: Request, res: Response) => {
  const { user } = req;
  if (!user) throw new ForbiddenError('Usuário não autenticado');

  // Buscar parceiros do admin
  const partners = await prisma.marketplacePartner.findMany({
    where: {
      createdByCondominiumId: await resolveCondominiumId(req),
    },
    select: { id: true },
  });

  const partnerIds = partners.map((p) => p.id);

  const requests = await prisma.marketplaceProductRequest.findMany({
    where: { partnerId: { in: partnerIds } },
    include: {
      product: true,
      resident: { select: { name: true, email: true, phone: true } },
      messages: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, data: requests });
});

// Atualizar status da requisição (parceiro)
router.patch('/requests/:id', authorize(...ADMIN_ROLES), async (req: Request, res: Response) => {
  const { status, quotedPrice } = req.body;
  const request = await prisma.marketplaceProductRequest.findUnique({
    where: { id: req.params.id },
    include: { partner: true },
  });
  if (!request) throw new NotFoundError('Requisição não encontrada');

  const ok = await hasAdminAccess(req, request.condominiumId);
  if (!ok) throw new ForbiddenError('Sem permissão');

  const updated = await prisma.marketplaceProductRequest.update({
    where: { id: req.params.id },
    data: {
      status,
      quotedPrice: status === 'QUOTED' ? quotedPrice : undefined,
      quotedAt: status === 'QUOTED' ? new Date() : undefined,
      respondedAt: status !== 'PENDING' ? new Date() : undefined,
      acceptedAt: status === 'ACCEPTED' ? new Date() : undefined,
    },
  });

  res.json({ success: true, data: updated });
});

// ─── Chat (Mensagens) ───────────────────────────────────────

const chatSchema = z.object({
  requestId: z.string().uuid(),
  message: z.string().min(1),
});

// Enviar mensagem
router.post('/chat', authorize(), async (req: Request, res: Response) => {
  const body = validateRequest(chatSchema, req.body);
  const { user } = req;
  if (!user) throw new ForbiddenError('Usuário não autenticado');

  const request = await prisma.marketplaceProductRequest.findUnique({
    where: { id: body.requestId },
  });
  if (!request) throw new NotFoundError('Requisição não encontrada');

  const message = await prisma.marketplaceChatMessage.create({
    data: {
      requestId: body.requestId,
      senderId: user.userId,
      message: body.message,
      isFromPartner: user.role === 'SUPER_ADMIN' || user.role === 'CONDOMINIUM_ADMIN',
    },
  });

  res.status(201).json({ success: true, data: message });
});

// Listar mensagens
router.get('/chat/:requestId', authorize(), async (req: Request, res: Response) => {
  const messages = await prisma.marketplaceChatMessage.findMany({
    where: { requestId: req.params.requestId },
    include: { sender: { select: { name: true, avatarUrl: true } } },
    orderBy: { createdAt: 'asc' },
  });

  res.json({ success: true, data: messages });
});

// ─── Favoritos ──────────────────────────────────────────────

// Adicionar aos favoritos
router.post('/favorites/:productId', authorize(), async (req: Request, res: Response) => {
  const { user } = req;
  if (!user) throw new ForbiddenError('Usuário não autenticado');

  const favorite = await prisma.residentFavorite.create({
    data: {
      residentId: user.userId,
      productId: req.params.productId,
    },
  });

  res.status(201).json({ success: true, data: favorite });
});

// Remover dos favoritos
router.delete('/favorites/:productId', authorize(), async (req: Request, res: Response) => {
  const { user } = req;
  if (!user) throw new ForbiddenError('Usuário não autenticado');

  await prisma.residentFavorite.deleteMany({
    where: {
      residentId: user.userId,
      productId: req.params.productId,
    },
  });

  res.json({ success: true });
});

// Listar meus favoritos
router.get('/favorites', authorize(), async (req: Request, res: Response) => {
  const { user } = req;
  if (!user) throw new ForbiddenError('Usuário não autenticado');

  const favorites = await prisma.residentFavorite.findMany({
    where: { residentId: user.userId },
    include: { product: { include: { partner: true } } },
  });

  res.json({ success: true, data: favorites });
});

// ─── Avaliações ─────────────────────────────────────────────

const reviewSchema = z.object({
  productId: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().optional(),
});

// Criar avaliação
router.post('/reviews', authorize(), async (req: Request, res: Response) => {
  const body = validateRequest(reviewSchema, req.body);
  const { user } = req;
  if (!user) throw new ForbiddenError('Usuário não autenticado');

  const product = await prisma.marketplaceProduct.findUnique({
    where: { id: body.productId },
    include: { partner: true },
  });
  if (!product) throw new NotFoundError('Produto não encontrado');

  const review = await prisma.marketplaceProductReview.create({
    data: {
      productId: body.productId,
      partnerId: product.partnerId,
      residentId: user.userId,
      rating: body.rating,
      comment: body.comment,
    },
  });

  // Atualizar rating do produto
  const avgRating = await prisma.marketplaceProductReview.aggregate({
    where: { productId: body.productId },
    _avg: { rating: true },
    _count: true,
  });

  await prisma.marketplaceProduct.update({
    where: { id: body.productId },
    data: {
      rating: avgRating._avg.rating || 0,
      reviewCount: avgRating._count,
    },
  });

  res.status(201).json({ success: true, data: review });
});

// Listar avaliações do produto
router.get('/reviews/:productId', async (req: Request, res: Response) => {
  const reviews = await prisma.marketplaceProductReview.findMany({
    where: { productId: req.params.productId },
    include: { resident: { select: { name: true, avatarUrl: true } } },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, data: reviews });
});

// ─── Custom Categories CRUD ──────────────────────────────────
// Get all custom categories
router.get('/categories', async (req: Request, res: Response) => {
  const params = new URLSearchParams(req.query as Record<string, string>);
  const providedCondominiumId = params.get('condominiumId');
  
  let condominiumId = providedCondominiumId;
  if (!condominiumId) {
    const resolved = await resolveCondominiumId(req);
    condominiumId = resolved;
  }

  if (!condominiumId) {
    return res.json({ success: true, data: Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label })) });
  }

  const categories = await prisma.marketplaceCategory.findMany({
    where: { condominiumId },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, data: categories });
});

// Admin: List all custom categories for admin panel
router.get('/categories/admin', authorize(...ADMIN_ROLES), async (req: Request, res: Response) => {
  const condominiumId = await resolveCondominiumId(req);
  const where: any = {};
  if (condominiumId) where.condominiumId = condominiumId;

  const categories = await prisma.marketplaceCategory.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, data: categories });
});

// Create custom category
router.post('/categories', authorize(...ADMIN_ROLES), async (req: Request, res: Response) => {
  const body = validateRequest(categorySchema, req.body);

  let condominiumId = body.condominiumId;
  if (!condominiumId) {
    const resolved = await resolveCondominiumId(req);
    if (!resolved) {
      throw new AppError('Não foi possível determinar o condomínio. Selecione um condomínio.', 400);
    }
    condominiumId = resolved;
  }

  const ok = await hasAdminAccess(req, condominiumId);
  if (!ok) throw new ForbiddenError('Sem permissão para este condomínio');

  const slug = body.slug || body.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');

  const category = await prisma.marketplaceCategory.create({
    data: { 
      name: body.name,
      slug,
      description: body.description || null,
      icon: body.icon || null,
      label: body.label || body.name,
      color: body.color || null,
      displayOrder: body.displayOrder || 0,
      isActive: body.isActive !== undefined ? body.isActive : true,
      condominiumId,
    },
  });

  res.status(201).json({ success: true, data: category });
});

// Update custom category
router.put('/categories/:id', authorize(...ADMIN_ROLES), async (req: Request, res: Response) => {
  const current = await prisma.marketplaceCategory.findUnique({ where: { id: req.params.id } });
  if (!current) throw new NotFoundError('Categoria não encontrada');

  const ok = await hasAdminAccess(req, current.condominiumId);
  if (!ok) throw new ForbiddenError('Sem permissão para editar esta categoria');

  const body = validateRequest(categorySchema.partial(), req.body);
  const updated = await prisma.marketplaceCategory.update({
    where: { id: req.params.id },
    data: body,
  });

  res.json({ success: true, data: updated });
});

// Delete custom category
router.delete('/categories/:id', authorize(...ADMIN_ROLES), async (req: Request, res: Response) => {
  const current = await prisma.marketplaceCategory.findUnique({ where: { id: req.params.id } });
  if (!current) throw new NotFoundError('Categoria não encontrada');

  const ok = await hasAdminAccess(req, current.condominiumId);
  if (!ok) throw new ForbiddenError('Sem permissão para deletar esta categoria');

  await prisma.marketplaceCategory.delete({ where: { id: req.params.id } });

  res.json({ success: true, message: 'Categoria deletada' });
});

export default router;
