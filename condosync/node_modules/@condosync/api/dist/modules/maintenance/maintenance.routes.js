"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const maintenance_service_1 = require("./maintenance.service");
const auth_1 = require("../../middleware/auth");
const validateRequest_1 = require("../../utils/validateRequest");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
const createSchema = zod_1.z.object({
    condominiumId: zod_1.z.string().uuid(),
    unitId: zod_1.z.string().uuid().optional(),
    title: zod_1.z.string().min(3),
    description: zod_1.z.string().optional().default(""),
    category: zod_1.z.string().min(2).optional().default("Geral"),
    location: zod_1.z.string().optional(),
    priority: zod_1.z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
    photoUrls: zod_1.z.array(zod_1.z.string().url()).optional(),
    estimatedCost: zod_1.z.number().positive().optional(),
    scheduledAt: zod_1.z.string().datetime().optional(),
});
const updateStatusSchema = zod_1.z.object({
    status: zod_1.z.enum([
        "OPEN",
        "IN_PROGRESS",
        "WAITING_PARTS",
        "COMPLETED",
        "CANCELED",
    ]),
    resolution: zod_1.z.string().optional(),
    finalCost: zod_1.z.number().positive().optional(),
    rating: zod_1.z.number().min(1).max(5).optional(),
    feedback: zod_1.z.string().optional(),
});
const updateOrderSchema = zod_1.z.object({
    title: zod_1.z.string().min(3).optional(),
    description: zod_1.z.string().min(10).optional(),
    category: zod_1.z.string().min(2).optional(),
    location: zod_1.z.string().optional(),
    priority: zod_1.z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
    estimatedCost: zod_1.z.number().positive().optional(),
    scheduledAt: zod_1.z.string().datetime().optional(),
});
const assignSchema = zod_1.z.object({
    serviceProviderId: zod_1.z.string().uuid().optional(),
    assignedTo: zod_1.z.string().optional(),
});
router.get("/condominium/:condominiumId", (0, auth_1.authorize)("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"), auth_1.authorizeCondominium, async (req, res) => {
    const data = await maintenance_service_1.maintenanceService.listOrders(req.params.condominiumId, {
        status: req.query.status,
        priority: req.query.priority,
        category: req.query.category,
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
    });
    res.json({ success: true, data });
});
router.post("/", (0, auth_1.authorize)("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"), async (req, res) => {
    const data = (0, validateRequest_1.validateRequest)(createSchema, req.body);
    const order = await maintenance_service_1.maintenanceService.create({
        condominiumId: data.condominiumId,
        title: data.title,
        description: data.description ?? "",
        category: data.category ?? "Geral",
        unitId: data.unitId,
        location: data.location,
        priority: data.priority,
        photoUrls: data.photoUrls,
        estimatedCost: data.estimatedCost,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
    }, req.user.userId, req.user);
    res.status(201).json({ success: true, data: { order } });
});
router.get("/:id", (0, auth_1.authorize)("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"), async (req, res) => {
    const order = await maintenance_service_1.maintenanceService.findById(req.params.id, req.user);
    res.json({ success: true, data: { order } });
});
router.patch("/:id", (0, auth_1.authorize)("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"), async (req, res) => {
    const data = (0, validateRequest_1.validateRequest)(updateOrderSchema, req.body);
    const order = await maintenance_service_1.maintenanceService.updateOrder(req.params.id, req.user, {
        ...data,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
    });
    res.json({ success: true, data: { order } });
});
router.patch("/:id/status", (0, auth_1.authorize)("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"), async (req, res) => {
    const data = (0, validateRequest_1.validateRequest)(updateStatusSchema, req.body);
    const order = await maintenance_service_1.maintenanceService.updateStatus(req.params.id, data.status, req.user, data);
    res.json({ success: true, data: { order } });
});
router.patch("/:id/assign", (0, auth_1.authorize)("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"), async (req, res) => {
    const data = (0, validateRequest_1.validateRequest)(assignSchema, req.body);
    const order = await maintenance_service_1.maintenanceService.assign(req.params.id, req.user, data.serviceProviderId, data.assignedTo);
    res.json({ success: true, data: { order } });
});
router.get("/schedules/:condominiumId", (0, auth_1.authorize)("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"), auth_1.authorizeCondominium, async (req, res) => {
    const schedules = await maintenance_service_1.maintenanceService.listSchedules(req.params.condominiumId);
    res.json({ success: true, data: { schedules } });
});
const scheduleCreateSchema = zod_1.z.object({
    condominiumId: zod_1.z.string().uuid(),
    title: zod_1.z.string().min(3),
    description: zod_1.z.string().optional(),
    category: zod_1.z.string().min(2),
    location: zod_1.z.string().min(2),
    frequency: zod_1.z.enum([
        "diário",
        "semanal",
        "quinzenal",
        "mensal",
        "trimestral",
        "semestral",
        "anual",
    ]),
    nextDueDate: zod_1.z.string().datetime(),
    estimatedCost: zod_1.z.number().positive().optional(),
});
const scheduleUpdateSchema = scheduleCreateSchema
    .omit({ condominiumId: true })
    .partial();
router.post("/schedules", (0, auth_1.authorize)("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"), auth_1.authorizeCondominium, async (req, res) => {
    const data = (0, validateRequest_1.validateRequest)(scheduleCreateSchema, req.body);
    const schedule = await maintenance_service_1.maintenanceService.createSchedule(req.user, {
        ...data,
        nextDueDate: new Date(data.nextDueDate),
    });
    res.status(201).json({ success: true, data: { schedule } });
});
router.patch("/schedules/:id/done", (0, auth_1.authorize)("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"), async (req, res) => {
    const schedule = await maintenance_service_1.maintenanceService.markScheduleDone(req.params.id, req.user);
    res.json({ success: true, data: { schedule } });
});
router.patch("/schedules/:id", (0, auth_1.authorize)("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"), async (req, res) => {
    const data = (0, validateRequest_1.validateRequest)(scheduleUpdateSchema, req.body);
    const schedule = await maintenance_service_1.maintenanceService.updateSchedule(req.params.id, req.user, {
        ...data,
        nextDueDate: data.nextDueDate ? new Date(data.nextDueDate) : undefined,
    });
    res.json({ success: true, data: { schedule } });
});
router.delete("/schedules/:id", (0, auth_1.authorize)("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"), async (req, res) => {
    await maintenance_service_1.maintenanceService.deleteSchedule(req.params.id, req.user);
    res.json({ success: true });
});
exports.default = router;
//# sourceMappingURL=maintenance.routes.js.map