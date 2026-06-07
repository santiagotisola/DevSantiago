import { Router, Request, Response } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { auditService } from "./audit.service";
import { UserRole } from "@prisma/client";

const router = Router();
router.use(authenticate);
router.use(authorize(UserRole.SUPER_ADMIN, UserRole.CONDOMINIUM_ADMIN, UserRole.SYNDIC));

// GET /api/v1/audit/condominium/:condominiumId — listar logs com paginação e filtros
router.get("/condominium/:condominiumId", async (req: Request, res: Response) => {
  const { condominiumId } = req.params;
  const { entity, action, userId, startDate, endDate, page, limit } = req.query;

  const result = await auditService.list({
    condominiumId,
    entity: entity as string | undefined,
    action: action as string | undefined,
    userId: userId as string | undefined,
    startDate: startDate ? new Date(startDate as string) : undefined,
    endDate: endDate ? new Date(endDate as string) : undefined,
    page: page ? Number(page) : 1,
    limit: limit ? Number(limit) : 50,
  });

  res.json({ success: true, data: result });
});

// GET /api/v1/audit/entity/:entity/:entityId — histórico de uma entidade específica
router.get("/entity/:entity/:entityId", async (req: Request, res: Response) => {
  const { entity, entityId } = req.params;
  const logs = await auditService.getByEntity(entity, entityId);
  res.json({ success: true, data: { logs } });
});

export default router;
