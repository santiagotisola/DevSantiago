import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate } from '../../middleware/auth';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { auditService } from '../audit/audit.service';
import { NotFoundError } from '../../middleware/errorHandler';

const router = Router();
router.use(authenticate);

/**
 * Lista refresh tokens (sessões) do usuário.
 */
router.get('/', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const sessions = await prisma.refreshToken.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    select: {
      id: true,
      ipAddress: true,
      userAgent: true,
      createdAt: true,
      lastUsedAt: true,
      expiresAt: true,
    },
    orderBy: { lastUsedAt: 'desc' },
  });
  res.json({ success: true, data: { sessions } });
});

// DELETE /sessions/:id — revoga uma sessão específica
router.delete('/:id', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const session = await prisma.refreshToken.findFirst({
    where: { id: req.params.id, userId },
  });
  if (!session) throw new NotFoundError('Sessão', req.params.id);

  await prisma.refreshToken.delete({ where: { id: session.id } });
  await auditService.write({
    userId,
    action: 'REVOKE_SESSION',
    module: 'auth',
    description: `Sessão revogada manualmente (${session.userAgent ?? 'agent desconhecido'} - ${session.ipAddress ?? '?'})`,
    metadata: { sessionId: session.id },
    ipAddress: req.ip ?? null,
  });
  res.json({ success: true });
});

// POST /sessions/revoke-others — revoga tudo EXCETO a sessão informada
router.post('/revoke-others', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const currentToken = req.body?.currentRefreshToken as string | undefined;

  let keepId: string | undefined;
  if (currentToken) {
    try {
      jwt.verify(currentToken, env.JWT_REFRESH_SECRET);
      const stored = await prisma.refreshToken.findUnique({
        where: { token: currentToken },
        select: { id: true, userId: true },
      });
      if (stored?.userId === userId) keepId = stored.id;
    } catch {
      // currentRefreshToken inválido; revoga tudo mesmo assim
    }
  }

  const result = await prisma.refreshToken.deleteMany({
    where: {
      userId,
      ...(keepId ? { id: { not: keepId } } : {}),
    },
  });

  await auditService.write({
    userId,
    action: 'REVOKE_OTHER_SESSIONS',
    module: 'auth',
    description: `${result.count} sessão(ões) encerrada(s)`,
    ipAddress: req.ip ?? null,
  });
  res.json({ success: true, data: { revoked: result.count } });
});

export default router;
