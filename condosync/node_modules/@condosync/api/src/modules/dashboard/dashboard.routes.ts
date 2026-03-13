import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/auth';
import { dashboardService } from './dashboard.service';

const router = Router();
router.use(authenticate);

router.get('/:condominiumId', async (req: Request, res: Response) => {
  const { condominiumId } = req.params;
  const data = await dashboardService.getDashboardData(condominiumId);

  res.json({
    success: true,
    data,
  });
});

export default router;
