import { Router, Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { authenticate, authorize } from '../../middleware/auth';
import { validateRequest } from '../../utils/validateRequest';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const router = Router();
router.use(authenticate);

// Dependentes de uma unidade
router.get('/unit/:unitId/dependents', async (req: Request, res: Response) => {
  const dependents = await prisma.dependent.findMany({
    where: { unitId: req.params.unitId, isActive: true },
  });
  res.json({ success: true, data: { dependents } });
});

const dependentSchema = z.object({
  unitId: z.string().uuid(),
  name: z.string().min(2),
  relationship: z.string().min(2),
  birthDate: z.string().datetime().optional(),
  cpf: z.string().optional(),
  photoUrl: z.string().url().optional(),
});

router.post('/dependents', async (req: Request, res: Response) => {
  const data = validateRequest(dependentSchema, req.body);
  const dependent = await prisma.dependent.create({
    data: { ...data, birthDate: data.birthDate ? new Date(data.birthDate) : undefined },
  });
  res.status(201).json({ success: true, data: { dependent } });
});

router.delete('/dependents/:id', async (req: Request, res: Response) => {
  await prisma.dependent.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.json({ success: true });
});

// Residentes de um condomínio
router.get('/condominium/:condominiumId', async (req: Request, res: Response) => {
  const residents = await prisma.condominiumUser.findMany({
    where: { condominiumId: req.params.condominiumId, role: 'RESIDENT', isActive: true },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true, cpf: true } },
      unit: { select: { id: true, identifier: true, block: true } },
    },
    orderBy: { joinedAt: 'asc' },
  });
  res.json({ success: true, data: { residents } });
});

const createResidentSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  cpf: z.string().optional(),
  unitId: z.string().uuid().optional(),
  condominiumId: z.string().uuid(),
});

router.post('/', authorize('CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), async (req: Request, res: Response) => {
  const data = validateRequest(createResidentSchema, req.body);

  // Cria ou reutiliza usuário pelo e-mail
  let user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user) {
    const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        ...(data.phone ? { phone: data.phone } : {}),
        ...(data.cpf ? { cpf: data.cpf } : {}),
        passwordHash,
        role: 'RESIDENT',
      },
    });
  } else {
    // Atualiza nome, telefone e CPF com os dados do formulário
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: data.name,
        ...(data.phone ? { phone: data.phone } : {}),
        ...(data.cpf ? { cpf: data.cpf } : {}),
      },
    });
  }

  // Verifica se já é morador deste condomínio
  const existing = await prisma.condominiumUser.findFirst({
    where: { userId: user.id, condominiumId: data.condominiumId },
  });
  if (existing) {
    res.status(409).json({ success: false, message: 'Morador já vinculado a este condomínio' });
    return;
  }

  const resident = await prisma.condominiumUser.create({
    data: {
      userId: user.id,
      condominiumId: data.condominiumId,
      unitId: data.unitId || null,
      role: 'RESIDENT',
    },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, cpf: true } },
      unit: { select: { id: true, identifier: true, block: true } },
    },
  });

  res.status(201).json({ success: true, data: { resident } });
});

const updateResidentSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  cpf: z.string().optional(),
  unitId: z.string().uuid().nullable().optional(),
});

// Atualiza dados do morador (user + unidade)
router.patch('/:id', authorize('CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), async (req: Request, res: Response) => {
  const data = validateRequest(updateResidentSchema, req.body);

  const condominiumUser = await prisma.condominiumUser.findUniqueOrThrow({
    where: { id: req.params.id },
    include: { user: true },
  });

  // Atualiza dados do usuário
  if (data.name || data.phone !== undefined || data.cpf !== undefined) {
    await prisma.user.update({
      where: { id: condominiumUser.userId },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.phone !== undefined ? { phone: data.phone || null } : {}),
        ...(data.cpf !== undefined ? { cpf: data.cpf || null } : {}),
      },
    });
  }

  // Atualiza unidade
  const updated = await prisma.condominiumUser.update({
    where: { id: req.params.id },
    data: { unitId: data.unitId !== undefined ? data.unitId : undefined },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, cpf: true } },
      unit: { select: { id: true, identifier: true, block: true } },
    },
  });

  res.json({ success: true, data: { resident: updated } });
});

// Remove morador do condomínio (desativa vínculo)
router.delete('/:id', authorize('CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), async (req: Request, res: Response) => {
  await prisma.condominiumUser.update({
    where: { id: req.params.id },
    data: { isActive: false },
  });
  res.json({ success: true });
});

export default router;
