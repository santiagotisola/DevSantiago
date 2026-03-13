import { Router, Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { authenticate, authorize } from '../../middleware/auth';
import { validateRequest } from '../../utils/validateRequest';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

// Listar usuários do sistema (super admin)
router.get('/', authorize('SUPER_ADMIN'), async (req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, lastLoginAt: true },
    orderBy: { createdAt: 'desc' },
    take: Number(req.query.limit) || 50,
    skip: ((Number(req.query.page) || 1) - 1) * (Number(req.query.limit) || 50),
  });
  res.json({ success: true, data: { users } });
});

// Perfil de um usuário
router.get('/:id', async (req: Request, res: Response) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: req.params.id },
    select: {
      id: true, name: true, email: true, phone: true, avatarUrl: true,
      role: true, createdAt: true, lastLoginAt: true,
      condominiumUsers: {
        include: { condominium: { select: { id: true, name: true } }, unit: { select: { identifier: true, block: true } } },
      },
    },
  });
  res.json({ success: true, data: { user } });
});

// Atualizar perfil
router.put('/:id', async (req: Request, res: Response) => {
  if (req.user!.userId !== req.params.id && req.user!.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, error: { message: 'Acesso negado' } });
  }

  const schema = z.object({
    name: z.string().min(2).optional(),
    phone: z.string().optional(),
    avatarUrl: z.string().url().optional(),
  });
  const data = validateRequest(schema, req.body);
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data,
    select: { id: true, name: true, email: true, phone: true, avatarUrl: true, role: true },
  });
  res.json({ success: true, data: { user } });
});

// Ativar/desativar usuário
router.patch('/:id/toggle-active', authorize('SUPER_ADMIN', 'CONDOMINIUM_ADMIN'), async (req: Request, res: Response) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.params.id }, select: { isActive: true } });
  const updated = await prisma.user.update({ where: { id: req.params.id }, data: { isActive: !user.isActive } });
  res.json({ success: true, data: { isActive: updated.isActive } });
});

export default router;
