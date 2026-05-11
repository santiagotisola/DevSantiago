import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import { authRateLimiter } from '../../middleware/rateLimiter';
import { validateRequest } from '../../utils/validateRequest';
import { twoFactorService } from './twofactor.service';

const router = Router();
router.use(authenticate);

// GET /2fa/status — exibe estado atual
router.get('/status', async (req: Request, res: Response) => {
  const status = await twoFactorService.status(req.user!.userId);
  res.json({ success: true, data: status });
});

// POST /2fa/setup — gera secret + QR
router.post('/setup', authRateLimiter, async (req: Request, res: Response) => {
  const data = await twoFactorService.setup(req.user!.userId);
  res.json({ success: true, data });
});

// POST /2fa/verify — confirma setup com o primeiro código
const verifySchema = z.object({ code: z.string().min(6).max(8) });
router.post('/verify', authRateLimiter, async (req: Request, res: Response) => {
  const { code } = validateRequest(verifySchema, req.body);
  const result = await twoFactorService.verifyAndEnable(req.user!.userId, code);
  res.json({ success: true, data: result });
});

// POST /2fa/regenerate-backup-codes — gera novos códigos (invalida anteriores)
router.post('/regenerate-backup-codes', authRateLimiter, async (req: Request, res: Response) => {
  const codes = await twoFactorService.regenerateBackupCodes(req.user!.userId);
  res.json({ success: true, data: { backupCodes: codes } });
});

// POST /2fa/disable — desabilita exigindo TOTP ou backup code
const disableSchema = z.object({ code: z.string().min(6).max(12) });
router.post('/disable', authRateLimiter, async (req: Request, res: Response) => {
  const { code } = validateRequest(disableSchema, req.body);
  await twoFactorService.disable(req.user!.userId, code);
  res.json({ success: true });
});

export default router;
