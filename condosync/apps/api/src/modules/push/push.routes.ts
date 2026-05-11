import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import { validateRequest } from '../../utils/validateRequest';
import { pushService, pushEnabled, getVapidPublicKey } from './push.service';

const router = Router();

// GET /push/vapid-key — chave pública para o cliente registrar subscription.
// Endpoint público (a chave é, por definição, pública).
router.get('/vapid-key', (_req: Request, res: Response) => {
  const key = getVapidPublicKey();
  if (!key) {
    return res.status(503).json({ success: false, message: 'Push notifications desativadas' });
  }
  res.json({ success: true, data: { publicKey: key, enabled: pushEnabled() } });
});

router.use(authenticate);

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

// POST /push/subscribe — registra/atualiza subscription do dispositivo
router.post('/subscribe', async (req: Request, res: Response) => {
  const data = validateRequest(subscribeSchema, req.body);
  const ua = req.get('user-agent') ?? undefined;
  const subscription = await pushService.subscribe(req.user!.userId, data, ua);
  res.status(201).json({ success: true, data: { subscriptionId: subscription.id } });
});

// DELETE /push/subscribe — remove subscription pelo endpoint
const unsubscribeSchema = z.object({ endpoint: z.string().url() });
router.delete('/subscribe', async (req: Request, res: Response) => {
  const data = validateRequest(unsubscribeSchema, req.body);
  await pushService.unsubscribe(req.user!.userId, data.endpoint);
  res.json({ success: true });
});

// GET /push/subscriptions — lista subscriptions do usuário (para gerenciar)
router.get('/subscriptions', async (req: Request, res: Response) => {
  const subs = await pushService.listByUser(req.user!.userId);
  res.json({ success: true, data: { subscriptions: subs } });
});

// POST /push/test — envia push de teste para o usuário (debug)
router.post('/test', async (req: Request, res: Response) => {
  const result = await pushService.sendToUser(req.user!.userId, {
    title: 'CondoSync — Push de teste',
    body: 'Suas notificações estão funcionando! 🎉',
    icon: '/pwa-192x192.png',
    url: '/',
    tag: 'push-test',
  });
  res.json({ success: true, data: result });
});

export default router;
