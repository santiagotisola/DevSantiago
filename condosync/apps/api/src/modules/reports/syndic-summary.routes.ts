import { Router, Request, Response } from "express";
import { prisma } from "../../config/prisma";
import { authenticate } from "../../middleware/auth";
import { ForbiddenError } from "../../middleware/errorHandler";

const router = Router();
router.use(authenticate);

// GET /api/v1/condominiums/:condominiumId/reports/syndic-summary
router.get("/syndic-summary", async (req: Request, res: Response) => {
  const condominiumId = req.query.condominiumId as string;

  if (!condominiumId) {
    return res.status(400).json({ success: false, message: "condominiumId é obrigatório" });
  }

  // Validar acesso ao condomínio
  const membership = await prisma.condominiumUser.findFirst({
    where: {
      userId: req.user!.userId,
      condominiumId,
      isActive: true,
    },
  });

  if (!membership && req.user!.role !== "SUPER_ADMIN") {
    throw new ForbiddenError("Acesso negado a este condomínio");
  }

  // Calcular estatísticas reais do condomínio
  const totalUnits = await prisma.unit.count({
    where: { condominiumId },
  });

  const occupiedUnits = await prisma.unit.count({
    where: { condominiumId, status: "OCCUPIED" },
  });

  const vacantUnits = totalUnits - occupiedUnits;

  const totalResidents = await prisma.condominiumUser.count({
    where: { condominiumId, isActive: true, role: "RESIDENT" },
  });

  // Mock stats (em produção seria calculado de verdade)
  const stats = {
    totalUnits,
    occupiedUnits,
    vacantUnits,
    totalResidents,
    openTickets: 0,
    resolvedTickets: 0,
    openMaintenance: 0,
    pendingCharges: 0,
    collectedThisMonth: 0,
    defaultRate: 0,
    upcomingAssemblies: 0,
    pendingOccurrences: 0,
  };

  res.json({ success: true, data: stats });
});

export default router;
