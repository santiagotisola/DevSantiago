"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const validateRequest_1 = require("../../utils/validateRequest");
const zod_1 = require("zod");
const commonArea_service_1 = require("./commonArea.service");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// â”€â”€â”€ Schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const createAreaSchema = zod_1.z.object({
    condominiumId: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(2),
    description: zod_1.z.string().optional(),
    capacity: zod_1.z.number().int().positive().optional(),
    rules: zod_1.z.string().optional(),
    requiresApproval: zod_1.z.boolean().optional(),
    maxDaysAdvance: zod_1.z.number().int().min(1).max(90).optional(),
    openTime: zod_1.z.string().optional(),
    closeTime: zod_1.z.string().optional(),
});
const updateAreaSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).optional(),
    description: zod_1.z.string().optional(),
    capacity: zod_1.z.number().int().positive().optional(),
    rules: zod_1.z.string().optional(),
    requiresApproval: zod_1.z.boolean().optional(),
    maxDaysAdvance: zod_1.z.number().int().min(1).max(90).optional(),
    openTime: zod_1.z.string().optional(),
    closeTime: zod_1.z.string().optional(),
    isAvailable: zod_1.z.boolean().optional(),
});
const reservationSchema = zod_1.z.object({
    commonAreaId: zod_1.z.string().uuid(),
    unitId: zod_1.z.string().uuid(),
    title: zod_1.z.string().optional(),
    startDate: zod_1.z.string().datetime(),
    endDate: zod_1.z.string().datetime(),
    guestCount: zod_1.z.number().int().positive().optional(),
    notes: zod_1.z.string().optional(),
});
// â”€â”€â”€ Ãreas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get("/condominium/:condominiumId", auth_1.authorizeCondominium, async (req, res) => {
    const areas = await commonArea_service_1.commonAreaService.listAreas(req.params.condominiumId, req.user);
    res.json({ success: true, data: { areas } });
});
router.post("/", (0, auth_1.authorize)("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"), auth_1.authorizeCondominium, async (req, res) => {
    const data = (0, validateRequest_1.validateRequest)(createAreaSchema, req.body);
    const area = await commonArea_service_1.commonAreaService.createArea(data, req.user);
    res.status(201).json({ success: true, data: { area } });
});
router.patch("/:id", (0, auth_1.authorize)("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"), async (req, res) => {
    const data = (0, validateRequest_1.validateRequest)(updateAreaSchema, req.body);
    const area = await commonArea_service_1.commonAreaService.updateArea(req.params.id, data, req.user);
    res.json({ success: true, data: { area } });
});
router.delete("/:id", (0, auth_1.authorize)("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"), async (req, res) => {
    await commonArea_service_1.commonAreaService.deleteArea(req.params.id, req.user);
    res.json({ success: true });
});
router.get("/:areaId/reservations", async (req, res) => {
    const reservations = await commonArea_service_1.commonAreaService.listAreaReservations(req.params.areaId, req.user, req.query.startDate, req.query.endDate);
    res.json({ success: true, data: { reservations } });
});
// â”€â”€â”€ Reservas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post("/reservations", async (req, res) => {
    const data = (0, validateRequest_1.validateRequest)(reservationSchema, req.body);
    const reservation = await commonArea_service_1.commonAreaService.createReservation({
        ...data,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
    }, req.user.userId, req.user);
    res.status(201).json({ success: true, data: { reservation } });
});
router.patch("/reservations/:id/approve", (0, auth_1.authorize)("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"), async (req, res) => {
    const reservation = await commonArea_service_1.commonAreaService.approveReservation(req.params.id, req.user.userId, req.user);
    res.json({ success: true, data: { reservation } });
});
router.patch("/reservations/:id/cancel", async (req, res) => {
    const reservation = await commonArea_service_1.commonAreaService.cancelReservation(req.params.id, req.user.userId, req.user, req.body.reason);
    res.json({ success: true, data: { reservation } });
});
router.get("/reservations/unit/:unitId", async (req, res) => {
    const reservations = await commonArea_service_1.commonAreaService.listReservationsByUnit(req.params.unitId, req.user);
    res.json({ success: true, data: { reservations } });
});
router.get("/reservations/condominium/:condominiumId", auth_1.authorizeCondominium, async (req, res) => {
    const reservations = await commonArea_service_1.commonAreaService.listReservationsByCondominium(req.params.condominiumId, req.user);
    res.json({ success: true, data: { reservations } });
});
exports.default = router;
//# sourceMappingURL=commonArea.routes.js.map