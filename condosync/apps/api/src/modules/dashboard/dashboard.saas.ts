import { Router, Request, Response } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { dashboardSaasService } from './dashboard.saas.service';

const router = Router();
router.use(authenticate);

/**
 * Dashboard SaaS para SUPER_ADMIN — saúde do negócio.
 * GET /dashboard/saas
 */
router.get('/saas', authorize('SUPER_ADMIN'), async (_req: Request, res: Response) => {
  const data = await dashboardSaasService.snapshot();
  res.json({ success: true, data });
});

export default router;
