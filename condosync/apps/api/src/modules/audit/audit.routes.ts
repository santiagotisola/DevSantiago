import { Router, Request, Response } from 'express';
import { authenticate, authorize, MANAGEMENT_ROLES } from '../../middleware/auth';
import { auditService } from './audit.service';
import { UserRole } from '@prisma/client';
import { ForbiddenError } from '../../middleware/errorHandler';
import { prisma } from '../../config/prisma';

const router = Router();
router.use(authenticate);

async function ensureCanAuditCondominium(
  userId: string,
  role: UserRole,
  condominiumId: string,
) {
  if (role === UserRole.SUPER_ADMIN) return;
  const m = await prisma.condominiumUser.findFirst({
    where: { userId, condominiumId, isActive: true },
    select: { role: true },
  });
  if (
    !m ||
    (m.role !== UserRole.CONDOMINIUM_ADMIN && m.role !== UserRole.SYNDIC)
  ) {
    throw new ForbiddenError('Permissão insuficiente para ver auditoria');
  }
}

// GET /audit?condominiumId=&module=&action=&from=&to=&q=&page=&pageSize=
router.get('/', authorize(...MANAGEMENT_ROLES), async (req: Request, res: Response) => {
  const condominiumId = req.query.condominiumId as string | undefined;
  if (!condominiumId && req.user!.role !== UserRole.SUPER_ADMIN) {
    res.status(400).json({ success: false, message: 'condominiumId é obrigatório' });
    return;
  }
  if (condominiumId) {
    await ensureCanAuditCondominium(req.user!.userId, req.user!.role as UserRole, condominiumId);
  }

  const result = await auditService.list({
    condominiumId,
    userId: req.query.userId as string | undefined,
    module: req.query.module as string | undefined,
    action: req.query.action as string | undefined,
    entityType: req.query.entityType as string | undefined,
    from: req.query.from ? new Date(req.query.from as string) : undefined,
    to: req.query.to ? new Date(req.query.to as string) : undefined,
    q: req.query.q as string | undefined,
    page: req.query.page ? Number(req.query.page) : undefined,
    pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
  });
  res.json({ success: true, data: result });
});

// GET /audit/facets?condominiumId= — para popular dropdowns de filtro
router.get('/facets', authorize(...MANAGEMENT_ROLES), async (req: Request, res: Response) => {
  const condominiumId = req.query.condominiumId as string | undefined;
  if (condominiumId) {
    await ensureCanAuditCondominium(req.user!.userId, req.user!.role as UserRole, condominiumId);
  }
  const facets = await auditService.facets(condominiumId);
  res.json({ success: true, data: facets });
});

export default router;
