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
        const result = await pet_service_1.petService.listByCondominium(condominiumId, Number(page) || 1, Number(limit) || 20);
        return res.json(result);
    }
    async listByUnit(req, res) {
        const { unitId } = req.params;
        const pets = await pet_service_1.petService.listByUnit(unitId);
        return res.json(pets);
    }
    async getById(req, res) {
        const { id } = req.params;
        const pet = await pet_service_1.petService.getById(id);
        return res.json(pet);
    }
    async create(req, res) {
        const validData = (0, validateRequest_1.validateRequest)(pet_validation_1.createPetSchema, { body: req.body });
        const pet = await pet_service_1.petService.create(validData.body);
        return res.status(201).json(pet);
    }
    async update(req, res) {
        const { id } = req.params;
        const validData = (0, validateRequest_1.validateRequest)(pet_validation_1.updatePetSchema, { body: req.body });
        const pet = await pet_service_1.petService.update(id, validData.body);
        return res.json(pet);
    }
    async delete(req, res) {
        const { id } = req.params;
        await pet_service_1.petService.delete(id);
        return res.status(204).send();
    }
}
exports.PetController = PetController;
exports.petController = new PetController();
//# sourceMappingURL=pet.controller.js.map