"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const assembly_controller_1 = require("./assembly.controller");
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
// Todas as rotas de assembleia requerem autenticação
router.use(auth_1.authenticate);
// Listar assembleias de um condomínio
router.get('/condominium/:condominiumId', assembly_controller_1.assemblyController.list);
// Pegar detalhes da assembleia (incluindo pauta e opções)
router.get('/:id', assembly_controller_1.assemblyController.getById);
// Pegar resultados da votação
router.get('/:id/results', assembly_controller_1.assemblyController.getResults);
// Criar assembleia — somente gestores [A1]
router.post('/condominium/:condominiumId', (0, auth_1.authorize)('SYNDIC', 'CONDOMINIUM_ADMIN', 'SUPER_ADMIN'), assembly_controller_1.assemblyController.create);
// Atualizar status da assembleia — somente gestores [A2]
router.patch('/:id/status', (0, auth_1.authorize)('SYNDIC', 'CONDOMINIUM_ADMIN', 'SUPER_ADMIN'), assembly_controller_1.assemblyController.updateStatus);
// Registrar presença do usuário logado na assembleia
router.post('/:id/attendance', assembly_controller_1.assemblyController.registerAttendance);
// Votar em um item da pauta
router.post('/items/:itemId/vote', assembly_controller_1.assemblyController.vote);
exports.default = router;
//# sourceMappingURL=assembly.routes.js.map