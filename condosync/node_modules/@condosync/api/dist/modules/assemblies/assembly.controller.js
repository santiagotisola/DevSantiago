"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assemblyController = exports.AssemblyController = void 0;
const assembly_service_1 = require("./assembly.service");
const validateRequest_1 = require("../../utils/validateRequest");
const assembly_validation_1 = require("./assembly.validation");
class AssemblyController {
    async list(req, res) {
        const { condominiumId } = req.params;
        const { page, limit } = req.query;
        const result = await assembly_service_1.assemblyService.list(condominiumId, Number(page) || 1, Number(limit) || 20);
        return res.json(result);
    }
    async getById(req, res) {
        const { id } = req.params;
        const assembly = await assembly_service_1.assemblyService.getById(id, req.user);
        return res.json(assembly);
    }
    async create(req, res) {
        const { condominiumId } = req.params;
        const actor = req.user;
        const validData = (0, validateRequest_1.validateRequest)(assembly_validation_1.createAssemblySchema, { body: req.body });
        const { body } = validData;
        const assembly = await assembly_service_1.assemblyService.create({
            ...body,
            condominiumId,
            createdBy: actor.userId,
            scheduledAt: new Date(body.scheduledAt)
        }, actor);
        return res.status(201).json(assembly);
    }
    async updateStatus(req, res) {
        const { id } = req.params;
        const actor = req.user;
        const validData = (0, validateRequest_1.validateRequest)(assembly_validation_1.updateAssemblyStatusSchema, { body: req.body });
        const { status } = validData.body;
        const assembly = await assembly_service_1.assemblyService.updateStatus(id, status, actor);
        return res.json(assembly);
    }
    async vote(req, res) {
        const { itemId } = req.params;
        const actor = req.user;
        const validData = (0, validateRequest_1.validateRequest)(assembly_validation_1.voteAssemblySchema, { body: req.body });
        const { optionId } = validData.body;
        const vote = await assembly_service_1.assemblyService.vote(itemId, actor.userId, optionId, actor);
        return res.json(vote);
    }
    async registerAttendance(req, res) {
        const { id } = req.params;
        const actor = req.user;
        const entry = await assembly_service_1.assemblyService.registerAttendance(id, actor.userId, actor);
        return res.json(entry);
    }
    async getResults(req, res) {
        const { id } = req.params;
        const results = await assembly_service_1.assemblyService.getVotingResults(id, req.user);
        return res.json(results);
    }
}
exports.AssemblyController = AssemblyController;
exports.assemblyController = new AssemblyController();
//# sourceMappingURL=assembly.controller.js.map