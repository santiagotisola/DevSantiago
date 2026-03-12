"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const lost_and_found_controller_1 = require("./lost-and-found.controller");
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// Listar todos os itens do condomínio
router.get('/condominium/:condominiumId', lost_and_found_controller_1.lostAndFoundController.list);
// Detalhes de um item
router.get('/:id', lost_and_found_controller_1.lostAndFoundController.getById);
// Registrar novo item
router.post('/condominium/:condominiumId', lost_and_found_controller_1.lostAndFoundController.create);
// Atualizar item
router.patch('/:id', lost_and_found_controller_1.lostAndFoundController.update);
// Deletar item
router.delete('/:id', lost_and_found_controller_1.lostAndFoundController.delete);
exports.default = router;
//# sourceMappingURL=lost-and-found.routes.js.map