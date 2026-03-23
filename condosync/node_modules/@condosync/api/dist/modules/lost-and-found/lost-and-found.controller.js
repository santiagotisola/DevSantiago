"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lostAndFoundController = exports.LostAndFoundController = void 0;
const lost_and_found_service_1 = require("./lost-and-found.service");
const validateRequest_1 = require("../../utils/validateRequest");
const lost_and_found_validation_1 = require("./lost-and-found.validation");
class LostAndFoundController {
    async list(req, res) {
        const { condominiumId } = req.params;
        const { page, limit } = req.query;
        const result = await lost_and_found_service_1.lostAndFoundService.list(condominiumId, req.user, Number(page) || 1, Number(limit) || 20);
        return res.json(result);
    }
    // F1 — passa actor para verificação IDOR
    async getById(req, res) {
        const { id } = req.params;
        const item = await lost_and_found_service_1.lostAndFoundService.getById(id, req.user);
        return res.json(item);
    }
    async create(req, res) {
        const { condominiumId } = req.params;
        const actor = req.user;
        const validData = (0, validateRequest_1.validateRequest)(lost_and_found_validation_1.createLostAndFoundSchema, { body: req.body });
        const item = await lost_and_found_service_1.lostAndFoundService.create(validData.body, actor.userId, condominiumId);
        return res.status(201).json(item);
    }
    // F2 — passa actor para verificação IDOR
    async update(req, res) {
        const { id } = req.params;
        const validData = (0, validateRequest_1.validateRequest)(lost_and_found_validation_1.updateLostAndFoundSchema, { body: req.body });
        const item = await lost_and_found_service_1.lostAndFoundService.update(id, validData.body, req.user);
        return res.json(item);
    }
    // F3 — passa actor para verificação IDOR
    async delete(req, res) {
        const { id } = req.params;
        await lost_and_found_service_1.lostAndFoundService.delete(id, req.user);
        return res.status(204).send();
    }
}
exports.LostAndFoundController = LostAndFoundController;
exports.lostAndFoundController = new LostAndFoundController();
//# sourceMappingURL=lost-and-found.controller.js.map