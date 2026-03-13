"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../../config/prisma");
const auth_1 = require("../../middleware/auth");
const validateRequest_1 = require("../../utils/validateRequest");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
const vehicleSchema = zod_1.z.object({
    unitId: zod_1.z.string().uuid(),
    plate: zod_1.z.string().min(7).max(8).toUpperCase(),
    brand: zod_1.z.string().min(2),
    model: zod_1.z.string().min(2),
    color: zod_1.z.string().min(2),
    year: zod_1.z.number().int().min(1980).max(new Date().getFullYear() + 1).optional(),
    type: zod_1.z.enum(['CAR', 'MOTORCYCLE', 'TRUCK', 'BICYCLE', 'OTHER']).optional(),
});
router.get('/unit/:unitId', async (req, res) => {
    const vehicles = await prisma_1.prisma.vehicle.findMany({
        where: { unitId: req.params.unitId, isActive: true },
    });
    res.json({ success: true, data: { vehicles } });
});
router.post('/', async (req, res) => {
    const data = (0, validateRequest_1.validateRequest)(vehicleSchema, req.body);
    const vehicle = await prisma_1.prisma.vehicle.create({ data });
    res.status(201).json({ success: true, data: { vehicle } });
});
router.put('/:id', async (req, res) => {
    const data = (0, validateRequest_1.validateRequest)(vehicleSchema.partial(), req.body);
    const vehicle = await prisma_1.prisma.vehicle.update({ where: { id: req.params.id }, data });
    res.json({ success: true, data: { vehicle } });
});
router.delete('/:id', async (req, res) => {
    await prisma_1.prisma.vehicle.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ success: true });
});
// Registro de acesso de veículos
router.get('/access-logs/:condominiumId', (0, auth_1.authorize)('DOORMAN', 'CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), async (req, res) => {
    const logs = await prisma_1.prisma.vehicleAccessLog.findMany({
        where: {
            vehicle: { unit: { condominiumId: req.params.condominiumId } },
        },
        include: {
            vehicle: { include: { unit: { select: { identifier: true, block: true } } } },
        },
        orderBy: { entryAt: 'desc' },
        take: 50,
    });
    res.json({ success: true, data: { logs } });
});
router.post('/access-logs', (0, auth_1.authorize)('DOORMAN', 'CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), async (req, res) => {
    const schema = zod_1.z.object({
        plate: zod_1.z.string(),
        vehicleId: zod_1.z.string().uuid().optional(),
        unitId: zod_1.z.string().uuid().optional(),
        isResident: zod_1.z.boolean().optional(),
        notes: zod_1.z.string().optional(),
    });
    const data = (0, validateRequest_1.validateRequest)(schema, req.body);
    const log = await prisma_1.prisma.vehicleAccessLog.create({ data: { ...data, registeredBy: req.user.userId } });
    res.status(201).json({ success: true, data: { log } });
});
router.patch('/access-logs/:id/exit', (0, auth_1.authorize)('DOORMAN', 'CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), async (req, res) => {
    const log = await prisma_1.prisma.vehicleAccessLog.update({
        where: { id: req.params.id },
        data: { exitAt: new Date() },
    });
    res.json({ success: true, data: { log } });
});
exports.default = router;
//# sourceMappingURL=vehicle.routes.js.map