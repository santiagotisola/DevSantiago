import { Router } from "express";
import { assemblyController } from "./assembly.controller";
import { authenticate, authorize } from "../../middleware/auth";

const router = Router();

// Todas as rotas de assembleia requerem autenticação
router.use(authenticate);

// Listar assembleias de um condomínio
router.get("/condominium/:condominiumId", assemblyController.list);

// Pegar detalhes da assembleia (incluindo pauta e opções)
router.get("/:id", assemblyController.getById);

// Pegar resultados da votação
router.get("/:id/results", assemblyController.getResults);

// Criar assembleia — somente gestores [A1]
router.post(
  "/condominium/:condominiumId",
  authorize("SYNDIC", "CONDOMINIUM_ADMIN", "SUPER_ADMIN"),
  assemblyController.create,
);

// Atualizar status da assembleia — somente gestores [A2]
router.patch(
  "/:id/status",
  authorize("SYNDIC", "CONDOMINIUM_ADMIN", "SUPER_ADMIN"),
  assemblyController.updateStatus,
);

// Registrar presença do usuário logado na assembleia
router.post("/:id/attendance", assemblyController.registerAttendance);

// Votar em um item da pauta
router.post("/items/:itemId/vote", assemblyController.vote);

export default router;
