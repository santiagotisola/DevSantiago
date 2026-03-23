"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const validateRequest_1 = require("../../utils/validateRequest");
const zod_1 = require("zod");
const unit_service_1 = require("./unit.service");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
const unitSchema = zod_1.z.object({
    condominiumId: zod_1.z.string().uuid(),
    identifier: zod_1.z.string().min(1),
    block: zod_1.z.string().optional(),
    street: zod_1.z.string().optional(),
    floor: zod_1.z.string().optional(),
    type: zod_1.z.string().optional(),
    area: zod_1.z.number().positive().optional(),
    bedrooms: zod_1.z.number().int().positive().optional(),
    status: zod_1.z
        .enum(["OCCUPIED", "VACANT", "UNDER_RENOVATION", "BLOCKED"])
        .optional(),
    fraction: zod_1.z.number().positive().optional(),
    notes: zod_1.z.string().optional(),
});
router.get("/condominium/:condominiumId", auth_1.authorizeCondominium, async (req, res) => {
    const units = await unit_service_1.unitService.list(req.params.condominiumId, req.user, req.query.status);
    res.json({ success: true, data: { units } });
});
router.post("/", (0, auth_1.authorize)("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"), async (req, res) => {
    const data = (0, validateRequest_1.validateRequest)(unitSchema, req.body);
    const unit = await unit_service_1.unitService.create(data, req.user);
    res.status(201).json({ success: true, data: { unit } });
});
router.get("/:id", async (req, res) => {
    const unit = await unit_service_1.unitService.findById(req.params.id, req.user);
    res.json({ success: true, data: { unit } });
});
router.put("/:id", (0, auth_1.authorize)("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"), async (req, res) => {
    const { condominiumId: _ignored, ...rest } = (0, validateRequest_1.validateRequest)(unitSchema.partial(), req.body);
    const unit = await unit_service_1.unitService.update(req.params.id, rest, req.user);
    res.json({ success: true, data: { unit } });
});
exports.default = router;
//# sourceMappingURL=unit.routes.js.map