import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { authenticate, authorize } from '../../middleware/auth';
import { validateRequest } from '../../utils/validateRequest';
import { invitationService } from './invitation.service';
import { ForbiddenError } from '../../middleware/errorHandler';
import { prisma } from '../../config/prisma';
import { auditService } from '../audit/audit.service';

const router = Router();

// ── Rotas PÚBLICAS (precisam vir antes do authenticate) ─────────
// GET /invitations/public/:token — preview do convite na tela de aceite
router.get('/public/:token', async (req: Request, res: Response) => {
  const view = await invitationService.previewByToken(req.params.token);
  res.json({ success: true, data: { invitation: view } });
});

// POST /invitations/public/:token/accept — aceita e define senha
const acceptSchema = z.object({
  password: z.string().min(8).max(128),
  name: z.string().min(2).max(120).optional(),
  cpf: z
    .string()
    .transform((v) => v.replace(/\D/g, ''))
    .refine((v) => v.length === 0 || v.length === 11, 'CPF deve ter 11 dígitos')
    .optional(),
  phone: z.string().max(20).optional(),
});

router.post('/public/:token/accept', async (req: Request, res: Response) => {
  const data = validateRequest(acceptSchema, req.body);
  const result = await invitationService.accept({
    token: req.params.token,
    password: data.password,
    name: data.name,
    cpf: data.cpf,
    phone: data.phone,
  });
  res.json({ success: true, data: result });
});

// ── A partir daqui, rotas autenticadas ──────────────────────────
router.use(authenticate);

const ALLOWED_INVITER_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.CONDOMINIUM_ADMIN,
  UserRole.SYNDIC,
];

async function ensureCanManageCondominium(
  userId: string,
  role: UserRole,
  condominiumId: string,
) {
  if (role === UserRole.SUPER_ADMIN) return;
  const membership = await prisma.condominiumUser.findFirst({
    where: { userId, condominiumId, isActive: true },
    select: { role: true },
  });
  if (!membership) throw new ForbiddenError('Acesso negado a este condomínio');
  if (
    membership.role !== UserRole.CONDOMINIUM_ADMIN &&
    membership.role !== UserRole.SYNDIC
  ) {
    throw new ForbiddenError('Permissão insuficiente para gerenciar convites');
  }
}

const createSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase().trim()),
  name: z.string().min(2).max(120).optional(),
  cpf: z
    .string()
    .transform((v) => v.replace(/\D/g, ''))
    .refine((v) => v.length === 0 || v.length === 11, 'CPF deve ter 11 dígitos')
    .optional(),
  phone: z.string().max(20).optional(),
  role: z.nativeEnum(UserRole),
  condominiumId: z.string().uuid(),
  unitId: z.string().uuid().optional(),
  ttlHours: z.number().int().positive().max(720).optional(),
});

// POST /invitations — cria convite
router.post(
  '/',
  authorize(...ALLOWED_INVITER_ROLES),
  async (req: Request, res: Response) => {
    const data = validateRequest(createSchema, req.body);
    await ensureCanManageCondominium(
      req.user!.userId,
      req.user!.role as UserRole,
      data.condominiumId,
    );

    // SUPER_ADMIN é o único que pode convidar outro SUPER_ADMIN
    if (
      data.role === UserRole.SUPER_ADMIN &&
      req.user!.role !== UserRole.SUPER_ADMIN
    ) {
      throw new ForbiddenError('Apenas SUPER_ADMIN pode convidar outro SUPER_ADMIN');
    }

    const result = await invitationService.create({
      email: data.email,
      name: data.name,
      cpf: data.cpf,
      phone: data.phone,
      role: data.role,
      condominiumId: data.condominiumId,
      unitId: data.unitId,
      invitedById: req.user!.userId,
      ttlHours: data.ttlHours,
    });
    await auditService.write({
      userId: req.user!.userId,
      condominiumId: data.condominiumId,
      action: "CREATE",
      module: "invitations",
      entityType: "Invitation",
      entityId: (result as any)?.invitation?.id ?? (result as any)?.id,
      description: `Convite criado para ${data.email} (${data.role})`,
      metadata: { email: data.email, role: data.role, unitId: data.unitId },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] ?? null,
    });
    res.status(201).json({ success: true, data: result });
  },
);

// GET /invitations?condominiumId=... — lista convites do condomínio
router.get(
  '/',
  authorize(...ALLOWED_INVITER_ROLES),
  async (req: Request, res: Response) => {
    const condominiumId = req.query.condominiumId as string | undefined;
    if (!condominiumId) {
      res.status(400).json({ success: false, message: 'condominiumId é obrigatório' });
      return;
    }
    await ensureCanManageCondominium(
      req.user!.userId,
      req.user!.role as UserRole,
      condominiumId,
    );
    const invitations = await invitationService.listByCondominium(condominiumId);
    res.json({ success: true, data: { invitations } });
  },
);

// POST /invitations/:id/resend — gera novo token e reenvia
router.post(
  '/:id/resend',
  authorize(...ALLOWED_INVITER_ROLES),
  async (req: Request, res: Response) => {
    const id = req.params.id;
    const inv = await prisma.invitation.findUnique({
      where: { id },
      select: { condominiumId: true },
    });
    if (!inv) {
      res.status(404).json({ success: false, message: 'Convite não encontrado' });
      return;
    }
    await ensureCanManageCondominium(
      req.user!.userId,
      req.user!.role as UserRole,
      inv.condominiumId,
    );
    const result = await invitationService.resend(id, inv.condominiumId);
    res.json({ success: true, data: result });
  },
);

// DELETE /invitations/:id — revoga
router.delete(
  '/:id',
  authorize(...ALLOWED_INVITER_ROLES),
  async (req: Request, res: Response) => {
    const id = req.params.id;
    const inv = await prisma.invitation.findUnique({
      where: { id },
      select: { condominiumId: true },
    });
    if (!inv) {
      res.status(404).json({ success: false, message: 'Convite não encontrado' });
      return;
    }
    await ensureCanManageCondominium(
      req.user!.userId,
      req.user!.role as UserRole,
      inv.condominiumId,
    );
    await invitationService.revoke(id, inv.condominiumId);
    await auditService.write({
      userId: req.user!.userId,
      condominiumId: inv.condominiumId,
      action: "REVOKE",
      module: "invitations",
      entityType: "Invitation",
      entityId: id,
      description: "Convite revogado",
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] ?? null,
    });
    res.json({ success: true });
  },
);

export default router;
