import { Router, Request, Response } from "express";
import {
  authenticate,
  authorize,
  authorizeCondominium,
} from "../../middleware/auth";
import { dashboardService } from "./dashboard.service";

const router = Router();
router.use(authenticate);

// O1 — adiciona role guard e authorizeCondominium
router.get(
  "/:condominiumId",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "COUNCIL_MEMBER", "SUPER_ADMIN"),
  authorizeCondominium,
  async (req: Request, res: Response) => {
    const { condominiumId } = req.params;
    const data = await dashboardService.getDashboardData(condominiumId);

    res.json({
      success: true,
      data,
    });
  },
);

export default router;
