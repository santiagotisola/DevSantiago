"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../../config/prisma");
const auth_1 = require("../../middleware/auth");
const validateRequest_1 = require("../../utils/validateRequest");
const zod_1 = require("zod");
const errorHandler_1 = require("../../middleware/errorHandler");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
const vehicleSchema = zod_1.z.object({
    unitId: zod_1.z.string().uuid(),
    plate: zod_1.z.string().min(7).max(8).transform((s) => s.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()),
    brand: zod_1.z.string().min(2),
    model: zod_1.z.string().min(2),
    color: zod_1.z.string().min(2),
    year: zod_1.z
        .number()
        .int()
        .min(1980)
        .max(new Date().getFullYear() + 1)
        .optional(),
    type: zod_1.z.enum(["CAR", "MOTORCYCLE", "TRUCK", "BICYCLE", "OTHER"]).optional(),
});
// N1 — verifica que o ator pertence ao condomínio da unidade
router.get("/unit/:unitId", async (req, res) => {
    const unit = await prisma_1.prisma.unit.findUniqueOrThrow({
        where: { id: req.params.unitId },
        select: { condominiumId: true },
    });
    if (req.user.role !== 'SUPER_ADMIN') {
        const membership = await prisma_1.prisma.condominiumUser.findFirst({
            where: { userId: req.user.userId, condominiumId: unit.condominiumId, isActive: true },
            select: { id: true },
        });
        if (!membership) {
            throw new errorHandler_1.ForbiddenError('Acesso negado a esta unidade');
        }
    }
    const vehicles = await prisma_1.prisma.vehicle.findMany({
        where: { unitId: req.params.unitId, isActive: true },
    });
    res.json({ success: true, data: { vehicles } });
});
router.post("/", async (req, res) => {
    const data = (0, validateRequest_1.validateRequest)(vehicleSchema, req.body);
    // Residents can only add vehicles to their own unit
    const user = req.user;
    if (user.role === 'RESIDENT') {
        const membership = await prisma_1.prisma.condominiumUser.findFirst({
            where: { userId: user.userId, unitId: data.unitId },
            select: { id: true },
        });
        if (!membership) {
            throw new errorHandler_1.ForbiddenError('Proibido: você só pode cadastrar veículos na sua unidade.');
        }
    }
    const vehicle = await prisma_1.prisma.vehicle.create({ data });
    res.status(201).json({ success: true, data: { vehicle } });
});
router.put("/:id", async (req, res) => {
    const data = (0, validateRequest_1.validateRequest)(vehicleSchema.partial(), req.body);
    // Ensure vehicle belongs to the user's unit if RESIDENT
    const user = req.user;
    if (user.role === 'RESIDENT') {
        const existing = await prisma_1.prisma.vehicle.findUnique({ where: { id: req.params.id }, select: { unitId: true } });
        if (!existing) {
            throw new errorHandler_1.ForbiddenError('Proibido: você não tem permissão para editar este veículo.');
        }
        const membership = await prisma_1.prisma.condominiumUser.findFirst({
            where: { userId: user.userId, unitId: existing.unitId },
            select: { id: true },
        });
        if (!membership) {
            throw new errorHandler_1.ForbiddenError('Proibido: você não tem permissão para editar este veículo.');
        }
    }
    const vehicle = await prisma_1.prisma.vehicle.update({
        where: { id: req.params.id },
        data,
    });
    res.json({ success: true, data: { vehicle } });
});
router.delete("/:id", async (req, res) => {
    // Ensure vehicle belongs to the user's unit if RESIDENT
    const user = req.user;
    if (user.role === 'RESIDENT') {
        const existing = await prisma_1.prisma.vehicle.findUnique({ where: { id: req.params.id }, select: { unitId: true } });
        if (!existing) {
            throw new errorHandler_1.ForbiddenError('Proibido: você não tem permissão para remover este veículo.');
        }
        const membership = await prisma_1.prisma.condominiumUser.findFirst({
            where: { userId: user.userId, unitId: existing.unitId },
            select: { id: true },
        });
        if (!membership) {
            throw new errorHandler_1.ForbiddenError('Proibido: você não tem permissão para remover este veículo.');
        }
    }
    await prisma_1.prisma.vehicle.update({
        where: { id: req.params.id },
        data: { isActive: false },
    });
    res.json({ success: true });
});
// Registro de acesso de veículos
router.get("/access-logs/:condominiumId", (0, auth_1.authorize)("DOORMAN", "CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"), async (req, res) => {
    // Busca IDs de todas as unidades do condomínio para filtrar logs sem vehicleId
    const unitIds = (await prisma_1.prisma.unit.findMany({
        where: { condominiumId: req.params.condominiumId },
        select: { id: true },
    })).map((u) => u.id);
    const logs = await prisma_1.prisma.vehicleAccessLog.findMany({
        where: {
            // N2 — terceira cláusula removida: vazava logs de outros condomínios
            OR: [
                { vehicle: { unit: { condominiumId: req.params.condominiumId } } },
                { vehicleId: null, unitId: { in: unitIds } },
            ],
        },
        include: {
            vehicle: {
                include: { unit: { select: { identifier: true, block: true } } },
            },
        },
        orderBy: { entryAt: "desc" },
        take: 50,
    });
    res.json({ success: true, data: { logs } });
});
router.post("/access-logs", (0, auth_1.authorize)("DOORMAN", "CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"), async (req, res) => {
    const schema = zod_1.z.object({
        plate: zod_1.z.string().min(1),
        vehicleId: zod_1.z.string().uuid().optional(),
        unitId: zod_1.z.string().uuid().optional(),
        isResident: zod_1.z.boolean().optional(),
        notes: zod_1.z.string().optional(),
    });
    const data = (0, validateRequest_1.validateRequest)(schema, req.body);
    // Tenta vincular automaticamente ao veículo cadastrado pela placa
    let vehicleId = data.vehicleId;
    let unitId = data.unitId;
    if (!vehicleId) {
        const existing = await prisma_1.prisma.vehicle.findFirst({
            where: {
                plate: data.plate.replace(/[^a-zA-Z0-9]/g, "").toUpperCase(),
                isActive: true,
            },
        });
        if (existing) {
            vehicleId = existing.id;
            unitId = unitId ?? existing.unitId;
        }
    }
    const log = await prisma_1.prisma.vehicleAccessLog.create({
        data: { ...data, vehicleId, unitId, registeredBy: req.user.userId },
    });
    res.status(201).json({ success: true, data: { log } });
});
// N3 — IDOR fix: verifica tenant do log antes de registrar saída
router.patch("/access-logs/:id/exit", (0, auth_1.authorize)("DOORMAN", "CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"), async (req, res) => {
    const existing = await prisma_1.prisma.vehicleAccessLog.findUniqueOrThrow({
        where: { id: req.params.id },
        select: {
            id: true,
            vehicle: { select: { unit: { select: { condominiumId: true } } } },
            unitId: true,
        },
    });
    const condominiumId = existing.vehicle?.unit?.condominiumId ??
        (existing.unitId
            ? (await prisma_1.prisma.unit.findUnique({ where: { id: existing.unitId }, select: { condominiumId: true } }))?.condominiumId
            : null);
    if (condominiumId && req.user.role !== 'SUPER_ADMIN') {
        const membership = await prisma_1.prisma.condominiumUser.findFirst({
            where: { userId: req.user.userId, condominiumId, isActive: true },
            select: { id: true },
        });
        if (!membership) {
            throw new errorHandler_1.ForbiddenError('Acesso negado a este log');
        }
    }
    const log = await prisma_1.prisma.vehicleAccessLog.update({
        where: { id: req.params.id },
        data: { exitAt: new Date() },
    });
    res.json({ success: true, data: { log } });
});
exports.default = router;
//# sourceMappingURL=vehicle.routes.js.map