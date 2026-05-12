import { Router, Request, Response } from 'express';
import {
  authenticate,
  authorize,
  authorizeCondominium,
} from '../../middleware/auth';
import { dashboardSyndicService } from './dashboard.syndic.service';

const router = Router();
router.use(authenticate);

/**
 * Dashboard agregado para síndico/admin — KPIs e séries temporais.
 * Path: GET /dashboard/:condominiumId/syndic
 */
router.get(
  '/:condominiumId/syndic',
  authorize('CONDOMINIUM_ADMIN', 'SYNDIC', 'COUNCIL_MEMBER', 'SUPER_ADMIN'),
  authorizeCondominium,
  async (req: Request, res: Response) => {
    const data = await dashboardSyndicService.snapshot(req.params.condominiumId);
    res.json({ success: true, data });
  },
);

export default router;
