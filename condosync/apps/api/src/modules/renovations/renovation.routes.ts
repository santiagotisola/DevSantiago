import { Router, Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { authenticate, authorize } from '../../middleware/auth';
import { validateRequest } from '../../utils/validateRequest';
import { z } from 'zod';
import { RenovationStatus } from '@prisma/client';

const router = Router();
router.use(authenticate);

const renovationSchema = z.object({
  unitId: z.string().uuid(),
  condominiumId: z.string().uuid(),
  description: z.string().min(10),
  type: z.enum(['pintura', 'hidráulica', 'elétrica', 'estrutural', 'outro']),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

const providerSchema = z.object({
  name: z.string().min(2),
  serviceType: z.string().min(2),
  document: z.string().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
});

// ── LIST by condominium (admin/syndic) ────────────────────────
router.get('/condominium/:condominiumId', authorize('CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), async (req: Request, res: Response) => {
  const renovations = await prisma.renovation.findMany({
    where: { condominiumId: req.params.condominiumId },
    include: {
      unit: { select: { identifier: true, block: true } },
      authorizedProviders: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: { renovations } });
});

// ── LIST by unit (morador) ────────────────────────────────────
router.get('/unit/:unitId', async (req: Request, res: Response) => {
  const renovations = await prisma.renovation.findMany({
    where: { unitId: req.params.unitId },
    include: { authorizedProviders: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: { renovations } });
});

// ── CREATE ────────────────────────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  const data = validateRequest(renovationSchema, req.body);
  const renovation = await prisma.renovation.create({
    data: {
      ...data,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      createdBy: req.user!.userId,
    },
    include: { authorizedProviders: true },
  });
  res.status(201).json({ success: true, data: { renovation } });
});

// ── APPROVE / REJECT ──────────────────────────────────────────
router.patch('/:id/approve', authorize('CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), async (req: Request, res: Response) => {
  const { approved, reason } = z.object({ approved: z.boolean(), reason: z.string().optional() }).parse(req.body);
  const renovation = await prisma.renovation.update({
    where: { id: req.params.id },
    data: {
      status: approved ? RenovationStatus.APPROVED : RenovationStatus.REJECTED,
      approvedBy: approved ? req.user!.userId : null,
      approvedAt: approved ? new Date() : null,
      rejectedReason: approved ? null : (reason ?? null),
    },
    include: { authorizedProviders: true },
  });
  res.json({ success: true, data: { renovation } });
});

// ── UPDATE STATUS by resident (start/complete) ────────────────
router.patch('/:id/status', async (req: Request, res: Response) => {
  const { status } = z.object({
    status: z.enum(['IN_PROGRESS', 'COMPLETED']),
  }).parse(req.body);
  const renovation = await prisma.renovation.update({
    where: { id: req.params.id },
    data: { status: status as RenovationStatus },
    include: { authorizedProviders: true },
  });
  res.json({ success: true, data: { renovation } });
});

// ── DELETE ────────────────────────────────────────────────────
router.delete('/:id', async (req: Request, res: Response) => {
  await prisma.renovation.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// ── ADD PROVIDER ──────────────────────────────────────────────
router.post('/:id/providers', async (req: Request, res: Response) => {
  const data = validateRequest(providerSchema, req.body);
  const provider = await prisma.renovationProvider.create({
    data: { renovationId: req.params.id, ...data },
  });
  res.status(201).json({ success: true, data: { provider } });
});

// ── REMOVE PROVIDER ───────────────────────────────────────────
router.delete('/:id/providers/:providerId', async (req: Request, res: Response) => {
  await prisma.renovationProvider.delete({ where: { id: req.params.providerId } });
  res.json({ success: true });
});

export default router;
