import { Router, Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { authenticate, authorize } from '../../middleware/auth';
import { validateRequest } from '../../utils/validateRequest';
import { UserRole } from '@prisma/client';
import { z } from 'zod';
import { residentService } from '../residents/resident.service';

const router = Router();
router.use(authenticate);

const createSchema = z.object({
  name: z.string().min(3),
  cnpj: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  timezone: z.string().optional(),
  plan: z.enum(['basic', 'professional', 'enterprise']).optional(),
  maxUnits: z.number().int().positive().optional(),
});

router.get('/', async (req: Request, res: Response) => {
  const condominiums = await prisma.condominium.findMany({
    where: req.user!.role === 'SUPER_ADMIN'
      ? {}
      : { condominiumUsers: { some: { userId: req.user!.userId, isActive: true } } },
    include: { _count: { select: { units: true, condominiumUsers: true } } },
    orderBy: { name: 'asc' },
  });
  res.json({ success: true, data: { condominiums } });
});

router.post('/', authorize('SUPER_ADMIN'), async (req: Request, res: Response) => {
  const data = validateRequest(createSchema, req.body);
  const condominium = await prisma.condominium.create({
    data: {
      address: '',
      city: '',
      state: '',
      zipCode: '',
      ...data,
    },
  });
  res.status(201).json({ success: true, data: { condominium } });
});

router.get('/:id', async (req: Request, res: Response) => {
  const condominium = await prisma.condominium.findUniqueOrThrow({
    where: { id: req.params.id },
    include: {
      _count: { select: { units: true, employees: true, serviceProviders: true, commonAreas: true } },
    },
  });
  res.json({ success: true, data: { condominium } });
});

router.put('/:id', authorize('CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), async (req: Request, res: Response) => {
  const data = validateRequest(createSchema.partial(), req.body);
  const condominium = await prisma.condominium.update({ where: { id: req.params.id }, data });
  res.json({ success: true, data: { condominium } });
});

// Adicionar membro ao condomínio
router.post('/:id/members', authorize('CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), async (req: Request, res: Response) => {
  const schema = z.object({
    userId: z.string().uuid(),
    role: z.nativeEnum(UserRole),
    unitId: z.string().uuid().optional(),
  });
  const { userId, role, unitId } = validateRequest(schema, req.body);

  residentService.assertResidentRoleRequiresUnit(role, unitId);
  if (role === UserRole.RESIDENT) {
    await residentService.assertResidentUnitBelongsToCondominium(req.params.id, unitId!);
  }

  const member = await prisma.condominiumUser.upsert({
    where: { userId_condominiumId: { userId, condominiumId: req.params.id } },
    update: { role, unitId, isActive: true },
    create: { userId, condominiumId: req.params.id, role, unitId },
  });
  res.status(201).json({ success: true, data: { member } });
});

// Listar membros
router.get('/:id/members', async (req: Request, res: Response) => {
  const members = await prisma.condominiumUser.findMany({
    where: { condominiumId: req.params.id, isActive: true },
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true, phone: true } },
      unit: { select: { identifier: true, block: true } },
    },
    orderBy: { joinedAt: 'asc' },
  });
  res.json({ success: true, data: { members } });
});

// Remover membro do condomínio
router.delete('/:id/members/:userId', authorize('CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), async (req: Request, res: Response) => {
  await prisma.condominiumUser.deleteMany({
    where: { condominiumId: req.params.id, userId: req.params.userId },
  });
  res.json({ success: true });
});

export default router;
