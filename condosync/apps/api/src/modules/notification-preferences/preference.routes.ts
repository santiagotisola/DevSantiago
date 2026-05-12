import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { NotificationType } from '@prisma/client';
import { authenticate } from '../../middleware/auth';
import { validateRequest } from '../../utils/validateRequest';
import { preferenceService } from './preference.service';

const router = Router();
router.use(authenticate);

router.get('/', async (req: Request, res: Response) => {
  const prefs = await preferenceService.listAll(req.user!.userId);
  res.json({ success: true, data: { preferences: prefs } });
});

const patchSchema = z.object({
  inapp: z.boolean().optional(),
  email: z.boolean().optional(),
  push: z.boolean().optional(),
});

router.put('/:type', async (req: Request, res: Response) => {
  const type = req.params.type as NotificationType;
  if (!Object.values(NotificationType).includes(type)) {
    return res.status(400).json({ success: false, message: 'Tipo inválido' });
  }
  const data = validateRequest(patchSchema, req.body);
  const pref = await preferenceService.upsert(req.user!.userId, type, data);
  res.json({ success: true, data: { preference: pref } });
});

export default router;
