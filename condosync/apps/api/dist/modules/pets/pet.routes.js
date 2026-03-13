"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pet_controller_1 = require("./pet.controller");
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// Listar todos os pets do condomínio
router.get('/condominium/:condominiumId', pet_controller_1.petController.list);
// Listar pets de uma unidade específica
router.get('/unit/:unitId', pet_controller_1.petController.listByUnit);
// Detalhes de um pet
router.get('/:id', pet_controller_1.petController.getById);
// Criar novo pet
router.post('/', pet_controller_1.petController.create);
// Atualizar pet
router.patch('/:id', pet_controller_1.petController.update);
// Deletar pet (soft delete)
router.delete('/:id', pet_controller_1.petController.delete);
exports.default = router;
//# sourceMappingURL=pet.routes.js.map