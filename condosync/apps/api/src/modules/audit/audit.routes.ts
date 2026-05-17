import { Router, Request, Response } from "express";
import { prisma } from "../../config/prisma";
import { authenticate } from "../../middleware/auth";
import { ForbiddenError } from "../../middleware/errorHandler";

const router = Router();
router.use(authenticate);

// GET /api/v1/condominiums/:condominiumId/audit
router.get("/", async (req: Request, res: Response) => {
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

  // Mock: retornar lista vazia (seria de um modelo AuditLog no futuro)
  const logs: any[] = [];

  res.json({ success: true, data: { logs } });
});

export default router;
