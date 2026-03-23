"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.visitorController = exports.VisitorController = void 0;
const visitor_service_1 = require("./visitor.service");
const validateRequest_1 = require("../../utils/validateRequest");
const zod_1 = require("zod");
const createSchema = zod_1.z.object({
    unitId: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(2),
    document: zod_1.z.string().optional(),
    documentType: zod_1.z.enum(["CPF", "RG", "CNH", "PASSPORT"]).optional(),
    phone: zod_1.z
        .string()
        .refine((v) => {
        const d = v.replace(/\D/g, "");
        return d.length >= 10 && d.length <= 11;
    }, "Telefone inválido. Use (XX) XXXXX-XXXX")
        .optional(),
    company: zod_1.z.string().optional(),
    reason: zod_1.z.string().optional(),
    scheduledAt: zod_1.z.string().datetime().optional(),
    notes: zod_1.z.string().optional(),
});
const updateSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).optional(),
    document: zod_1.z.string().optional(),
    documentType: zod_1.z.enum(["CPF", "RG", "CNH", "PASSPORT"]).optional(),
    phone: zod_1.z
        .string()
        .refine((v) => {
        const d = v.replace(/\D/g, "");
        return d.length >= 10 && d.length <= 11;
    }, "Telefone inválido. Use (XX) XXXXX-XXXX")
        .optional(),
    company: zod_1.z.string().optional(),
    reason: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
    scheduledAt: zod_1.z.string().datetime().optional(),
});
const entrySchema = zod_1.z.object({ photoUrl: zod_1.z.string().url().optional() });
const authorizeSchema = zod_1.z.object({ authorized: zod_1.z.boolean() });
class VisitorController {
    async list(req, res) {
        const condominiumId = req.params.condominiumId || req.user.condominiumId;
        const data = await visitor_service_1.visitorService.list(condominiumId, {
            unitId: req.query.unitId,
            status: req.query.status,
            date: req.query.date,
            page: Number(req.query.page) || 1,
            limit: Number(req.query.limit) || 20,
        });
        res.json({ success: true, data });
    }
    async create(req, res) {
        const data = (0, validateRequest_1.validateRequest)(createSchema, req.body);
        const visitor = await visitor_service_1.visitorService.create({
            ...data,
            scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
        }, req.user);
        res.status(201).json({ success: true, data: { visitor } });
    }
    async registerEntry(req, res) {
        const { photoUrl } = (0, validateRequest_1.validateRequest)(entrySchema, req.body);
        const visitor = await visitor_service_1.visitorService.registerEntry(req.params.id, req.user.userId, req.user, photoUrl);
        res.json({ success: true, data: { visitor } });
    }
    async registerExit(req, res) {
        const visitor = await visitor_service_1.visitorService.registerExit(req.params.id, req.user.userId, req.user);
        res.json({ success: true, data: { visitor } });
    }
    async authorize(req, res) {
        const { authorized } = (0, validateRequest_1.validateRequest)(authorizeSchema, req.body);
        const visitor = await visitor_service_1.visitorService.authorize(req.params.id, req.user, authorized);
        res.json({ success: true, data: { visitor } });
    }
    async update(req, res) {
        const data = (0, validateRequest_1.validateRequest)(updateSchema, req.body);
        const visitor = await visitor_service_1.visitorService.update(req.params.id, req.user, {
            ...data,
            scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
        });
        res.json({ success: true, data: { visitor } });
    }
    async findById(req, res) {
        const visitor = await visitor_service_1.visitorService.findById(req.params.id, req.user);
        res.json({ success: true, data: { visitor } });
    }
    async historyByUnit(req, res) {
        const data = await visitor_service_1.visitorService.historyByUnit(req.params.unitId, req.user, Number(req.query.page) || 1, Number(req.query.limit) || 20);
        res.json({ success: true, data });
    }
}
exports.VisitorController = VisitorController;
exports.visitorController = new VisitorController();
//# sourceMappingURL=visitor.controller.js.map