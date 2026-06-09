import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import * as WhatsAppController from "./whatsapp.controller";

const router = Router();

// Público (QR code precisa ser acessível sem auth para exibir no painel)
router.get("/qr", WhatsAppController.getQR);
router.get("/status", WhatsAppController.getStatus);

// Autenticados
router.use(authenticate);
router.post("/iniciar", authorize("SUPER_ADMIN", "CONDOMINIUM_ADMIN", "SYNDIC"), WhatsAppController.iniciar);
router.post("/disconnect", authorize("SUPER_ADMIN", "CONDOMINIUM_ADMIN", "SYNDIC"), WhatsAppController.desconectar);
router.get("/sessoes", authorize("SUPER_ADMIN", "CONDOMINIUM_ADMIN", "SYNDIC", "DOORMAN"), WhatsAppController.listarSessoes);
router.get("/sessao/:phone", authorize("SUPER_ADMIN", "CONDOMINIUM_ADMIN", "SYNDIC", "DOORMAN"), WhatsAppController.getSessao);
router.post("/send", authorize("SUPER_ADMIN", "CONDOMINIUM_ADMIN", "SYNDIC", "DOORMAN"), WhatsAppController.enviar);
router.post("/broadcast", authorize("SUPER_ADMIN", "CONDOMINIUM_ADMIN", "SYNDIC"), WhatsAppController.broadcast);

// Novo: Listar unidades para visitação
router.get("/unidades", authorize("SUPER_ADMIN", "CONDOMINIUM_ADMIN", "SYNDIC", "DOORMAN"), WhatsAppController.listarUnidades);

// Novo: Listar visitas criadas via WhatsApp
router.get("/visitas", authorize("SUPER_ADMIN", "CONDOMINIUM_ADMIN", "SYNDIC", "DOORMAN"), WhatsAppController.listarVisitas);

// Novo: Atualizar status de visita
router.patch("/visita/:id/status", authorize("DOORMAN"), WhatsAppController.atualizarStatusVisita);

export default router;
