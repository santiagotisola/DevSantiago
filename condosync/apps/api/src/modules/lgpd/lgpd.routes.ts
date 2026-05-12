import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../../middleware/auth';
import { validateRequest } from '../../utils/validateRequest';
import { lgpdService } from './lgpd.service';

const router = Router();

// ── Públicas: leitura de termos atuais (sem login) ─────────────
router.get('/public/:kind', async (req: Request, res: Response) => {
  const kind = req.params.kind as 'terms_of_use' | 'privacy_policy';
  if (!['terms_of_use', 'privacy_policy'].includes(kind)) {
    res.status(400).json({ success: false, message: 'kind inválido' });
    return;
  }
  const v = await lgpdService.getCurrent(kind);
  res.json({ success: true, data: { terms: v } });
});

// ── Autenticadas ───────────────────────────────────────────────
router.use(authenticate);

router.get('/status', async (req: Request, res: Response) => {
  const status = await lgpdService.acceptanceStatus(req.user!.userId);
  res.json({ success: true, data: status });
});

const acceptSchema = z.object({ termsVersionId: z.string().uuid() });
router.post('/accept', async (req: Request, res: Response) => {
  const { termsVersionId } = validateRequest(acceptSchema, req.body);
  await lgpdService.accept(
    req.user!.userId,
    termsVersionId,
    req.ip,
    req.get('user-agent') ?? undefined,
  );
  res.json({ success: true });
});

// GET /lgpd/export — JSON de tudo do usuário
router.get('/export', async (req: Request, res: Response) => {
  const data = await lgpdService.exportData(req.user!.userId);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="condosync-export-${req.user!.userId.slice(0, 8)}-${Date.now()}.json"`,
  );
  res.send(JSON.stringify(data, null, 2));
});

// POST /lgpd/anonymize/:userId — SUPER_ADMIN apaga PII (mantém vínculos)
const anonSchema = z.object({ confirm: z.literal(true) });
router.post(
  '/anonymize/:userId',
  authorize('SUPER_ADMIN'),
  async (req: Request, res: Response) => {
    validateRequest(anonSchema, req.body);
    await lgpdService.anonymize(req.params.userId, req.user!.userId);
    res.json({ success: true });
  },
);

// GET /lgpd/versions — histórico (público de cliente legal)
router.get('/versions', async (req: Request, res: Response) => {
  const versions = await lgpdService.listVersions(req.query.kind as string | undefined);
  res.json({ success: true, data: { versions } });
});

// POST /lgpd/versions — publica nova versão (SUPER_ADMIN)
const publishSchema = z.object({
  kind: z.enum(['terms_of_use', 'privacy_policy']),
  version: z.string().min(1).max(40),
  contentMd: z.string().min(20),
  effectiveAt: z.string().datetime().optional(),
});
router.post(
  '/versions',
  authorize('SUPER_ADMIN'),
  async (req: Request, res: Response) => {
    const data = validateRequest(publishSchema, req.body);
    const v = await lgpdService.publishVersion({
      kind: data.kind,
      version: data.version,
      contentMd: data.contentMd,
      effectiveAt: data.effectiveAt ? new Date(data.effectiveAt) : undefined,
      createdBy: req.user!.userId,
    });
    res.status(201).json({ success: true, data: { version: v } });
  },
);

export default router;
