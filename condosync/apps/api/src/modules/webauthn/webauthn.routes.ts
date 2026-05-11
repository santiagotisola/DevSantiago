import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import { authRateLimiter } from '../../middleware/rateLimiter';
import { validateRequest } from '../../utils/validateRequest';
import { webauthnService } from './webauthn.service';

const router = Router();

// ── Rotas PÚBLICAS (login com passkey) ─────────────────────────
const authBeginSchema = z.object({
  identifier: z.string().min(1).max(100).optional(),
});

router.post(
  '/auth/begin',
  authRateLimiter,
  async (req: Request, res: Response) => {
    const data = validateRequest(authBeginSchema, req.body);
    const options = await webauthnService.generateAuthenticationOptions(
      data.identifier,
    );
    res.json({ success: true, data: { options } });
  },
);

router.post(
  '/auth/verify',
  authRateLimiter,
  async (req: Request, res: Response) => {
    const result = await webauthnService.verifyAuthentication(req.body);
    res.json({ success: true, data: result });
  },
);

// ── A partir daqui, rotas autenticadas ──────────────────────────
router.use(authenticate);

// POST /webauthn/register/begin — gera opções para registrar passkey
router.post('/register/begin', async (req: Request, res: Response) => {
  const options = await webauthnService.generateRegistrationOptions(
    req.user!.userId,
  );
  res.json({ success: true, data: { options } });
});

// POST /webauthn/register/verify — verifica e persiste credencial
const verifyRegSchema = z.object({
  response: z.any(),
  deviceName: z.string().min(1).max(60).optional(),
});
router.post('/register/verify', async (req: Request, res: Response) => {
  const { response, deviceName } = validateRequest(verifyRegSchema, req.body);
  const result = await webauthnService.verifyRegistration(
    req.user!.userId,
    response,
    deviceName,
  );
  res.status(201).json({ success: true, data: result });
});

// GET /webauthn/credentials — lista credenciais do usuário
router.get('/credentials', async (req: Request, res: Response) => {
  const credentials = await webauthnService.listByUser(req.user!.userId);
  res.json({ success: true, data: { credentials } });
});

// DELETE /webauthn/credentials/:id — remove credencial
router.delete('/credentials/:id', async (req: Request, res: Response) => {
  await webauthnService.deleteCredential(req.user!.userId, req.params.id);
  res.json({ success: true });
});

export default router;
