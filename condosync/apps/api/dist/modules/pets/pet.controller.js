"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.petController = exports.PetController = void 0;
const pet_service_1 = require("./pet.service");
const validateRequest_1 = require("../../utils/validateRequest");
const pet_validation_1 = require("./pet.validation");
class PetController {
    async list(req, res) {
        const { condominiumId } = req.params;
        const { page, limit } = req.query;
        const result = await pet_service_1.petService.listByCondominium(condominiumId, req.user, Number(page) || 1, Number(limit) || 20);
        return res.json(result);
    }
    async listByUnit(req, res) {
        const { unitId } = req.params;
        const pets = await pet_service_1.petService.listByUnit(unitId, req.user);
        return res.json(pets);
    }
    // I2 — passa actor
    async getById(req, res) {
        const { id } = req.params;
        const pet = await pet_service_1.petService.getById(id, req.user);
        return res.json(pet);
    }
    // I1 — passa actor para validação de unitId
    async create(req, res) {
        const validData = (0, validateRequest_1.validateRequest)(pet_validation_1.createPetSchema, { body: req.body });
        const pet = await pet_service_1.petService.create(validData.body, req.user);
        return res.status(201).json(pet);
    }
    // I2 — passa actor
    async update(req, res) {
        const { id } = req.params;
        const validData = (0, validateRequest_1.validateRequest)(pet_validation_1.updatePetSchema, { body: req.body });
        const pet = await pet_service_1.petService.update(id, validData.body, req.user);
        return res.json(pet);
    }
    // I2 — passa actor
    async delete(req, res) {
        const { id } = req.params;
        await pet_service_1.petService.delete(id, req.user);
        return res.status(204).send();
    }
}
exports.PetController = PetController;
exports.petController = new PetController();
//# sourceMappingURL=pet.controller.js.map