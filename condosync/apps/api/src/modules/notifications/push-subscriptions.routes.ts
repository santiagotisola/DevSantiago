import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { authenticate } from '../../middleware/auth';
import { validateRequest } from '../../utils/validateRequest';
import { env } from '../../config/env';

const router = Router();
router.use(authenticate);

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  userAgent: z.string().optional(),
});

// Retorna a VAPID public key para o frontend
router.get('/vapid-public-key', (_req: Request, res: Response) => {
  res.json({ success: true, data: { publicKey: env.VAPID_PUBLIC_KEY ?? null } });
});

// Salva subscription do dispositivo
router.post('/subscribe', async (req: Request, res: Response) => {
  const { endpoint, keys, userAgent } = validateRequest(subscribeSchema, req.body);
  const userId = req.user!.userId;

  const sub = await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { userId, endpoint, p256dh: keys.p256dh, auth: keys.auth, userAgent },
    update: { userId, p256dh: keys.p256dh, auth: keys.auth, userAgent },
  });

  res.status(201).json({ success: true, data: { subscriptionId: sub.id } });
});

// Remove subscription (logout / revogação)
router.delete('/unsubscribe', async (req: Request, res: Response) => {
  const schema = z.object({ endpoint: z.string().url() });
  const { endpoint } = validateRequest(schema, req.body);

  await prisma.pushSubscription.deleteMany({
    where: { endpoint, userId: req.user!.userId },
  });

  res.json({ success: true });
});

export default router;
