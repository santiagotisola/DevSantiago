"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parcelController = exports.ParcelController = void 0;
const parcel_service_1 = require("./parcel.service");
const validateRequest_1 = require("../../utils/validateRequest");
const zod_1 = require("zod");
const registerSchema = zod_1.z.object({
    unitId: zod_1.z.string().uuid(),
    senderName: zod_1.z.string().optional(),
    carrier: zod_1.z.string().optional(),
    trackingCode: zod_1.z.string().optional(),
    photoUrl: zod_1.z.string().url().optional(),
    storageLocation: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
});
const pickupSchema = zod_1.z.object({
    pickedUpBy: zod_1.z.string().min(2),
    signature: zod_1.z.string().optional(),
});
const cancelSchema = zod_1.z.object({
    reason: zod_1.z.string().optional(),
});
const updateSchema = zod_1.z.object({
    senderName: zod_1.z.string().optional(),
    carrier: zod_1.z.string().optional(),
    trackingCode: zod_1.z.string().optional(),
    photoUrl: zod_1.z.string().url().optional(),
    storageLocation: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
});
class ParcelController {
    async list(req, res) {
        const condominiumId = req.params.condominiumId || req.user.condominiumId;
        const data = await parcel_service_1.parcelService.list(condominiumId, {
            unitId: req.query.unitId,
            page: Number(req.query.page) || 1,
            limit: Number(req.query.limit) || 20,
        });
        res.json({ success: true, data });
    }
    async register(req, res) {
        const data = (0, validateRequest_1.validateRequest)(registerSchema, req.body);
        const parcel = await parcel_service_1.parcelService.register(data, req.user.userId);
        res.status(201).json({ success: true, data: { parcel } });
    }
    async confirmPickup(req, res) {
        const { pickedUpBy, signature } = (0, validateRequest_1.validateRequest)(pickupSchema, req.body);
        const parcel = await parcel_service_1.parcelService.confirmPickup(req.params.id, pickedUpBy, signature);
        res.json({ success: true, data: { parcel } });
    }
    async update(req, res) {
        const data = (0, validateRequest_1.validateRequest)(updateSchema, req.body);
        const parcel = await parcel_service_1.parcelService.update(req.params.id, data);
        res.json({ success: true, data: { parcel } });
    }
    async cancel(req, res) {
        const { reason } = (0, validateRequest_1.validateRequest)(cancelSchema, req.body);
        const parcel = await parcel_service_1.parcelService.cancel(req.params.id, reason);
        res.json({ success: true, data: { parcel } });
    }
    async findById(req, res) {
        const parcel = await parcel_service_1.parcelService.findById(req.params.id);
        res.json({ success: true, data: { parcel } });
    }
    async pendingByUnit(req, res) {
        const parcels = await parcel_service_1.parcelService.pendingByUnit(req.params.unitId);
        res.json({ success: true, data: { parcels } });
    }
}
exports.ParcelController = ParcelController;
exports.parcelController = new ParcelController();
//# sourceMappingURL=parcel.controller.js.map