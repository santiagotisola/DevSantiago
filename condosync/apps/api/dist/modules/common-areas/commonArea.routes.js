"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const prisma_1 = require("../../config/prisma");
const auth_1 = require("../../middleware/auth");
const errorHandler_1 = require("../../middleware/errorHandler");
const validateRequest_1 = require("../../utils/validateRequest");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
async function ensureUnitAccess(req, unitId) {
    const unit = await prisma_1.prisma.unit.findUniqueOrThrow({
        where: { id: unitId },
        select: { id: true, condominiumId: true },
    });
    if (req.user.role === client_1.UserRole.SUPER_ADMIN) {
        return unit;
    }
    const membership = await prisma_1.prisma.condominiumUser.findFirst({
        where: {
            userId: req.user.userId,
            condominiumId: unit.condominiumId,
            isActive: true,
        },
        select: { role: true, unitId: true },
    });
    if (!membership) {
        throw new errorHandler_1.ForbiddenError("Acesso negado a esta unidade");
    }
    if (membership.role === client_1.UserRole.RESIDENT && membership.unitId !== unit.id) {
        throw new errorHandler_1.ForbiddenError("Morador so pode acessar a propria unidade");
    }
    return unit;
}
async function ensureReservationAccess(req, reservationId, options) {
    const reservation = await prisma_1.prisma.reservation.findUniqueOrThrow({
        where: { id: reservationId },
        select: {
            id: true,
            requestedBy: true,
            unitId: true,
            commonArea: { select: { condominiumId: true } },
        },
    });
    if (req.user.role === client_1.UserRole.SUPER_ADMIN) {
        return reservation;
    }
    const membership = await prisma_1.prisma.condominiumUser.findFirst({
        where: {
            userId: req.user.userId,
            condominiumId: reservation.commonArea.condominiumId,
            isActive: true,
        },
        select: { role: true, unitId: true },
    });
    if (!membership) {
        throw new errorHandler_1.ForbiddenError("Acesso negado a esta reserva");
    }
    const isManagement = membership.role === client_1.UserRole.CONDOMINIUM_ADMIN ||
        membership.role === client_1.UserRole.SYNDIC;
    if (options?.managementOnly && !isManagement) {
        throw new errorHandler_1.ForbiddenError("Apenas a administracao pode executar esta acao");
    }
    if (options?.residentOwnOnly &&
        membership.role === client_1.UserRole.RESIDENT &&
        (membership.unitId !== reservation.unitId ||
            reservation.requestedBy !== req.user.userId)) {
        throw new errorHandler_1.ForbiddenError("Morador so pode acessar a propria reserva");
    }
    return reservation;
}
router.get("/condominium/:condominiumId", auth_1.authorizeCondominium, async (req, res) => {
    const areas = await prisma_1.prisma.commonArea.findMany({
        where: { condominiumId: req.params.condominiumId, isActive: true },
        include: {
            _count: { select: { reservations: true } },
        },
    });
    res.json({ success: true, data: { areas } });
});
router.post("/", (0, auth_1.authorize)("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"), auth_1.authorizeCondominium, async (req, res) => {
    const schema = zod_1.z.object({
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
    const data = (0, validateRequest_1.validateRequest)(schema, req.body);
    const area = await prisma_1.prisma.commonArea.create({ data });
    res.status(201).json({ success: true, data: { area } });
});
router.patch("/:id", (0, auth_1.authorize)("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"), async (req, res) => {
    const schema = zod_1.z.object({
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
    const data = (0, validateRequest_1.validateRequest)(schema, req.body);
    const area = await prisma_1.prisma.commonArea.update({
        where: { id: req.params.id },
        data,
    });
    res.json({ success: true, data: { area } });
});
router.delete("/:id", (0, auth_1.authorize)("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"), async (req, res) => {
    await prisma_1.prisma.commonArea.update({
        where: { id: req.params.id },
        data: { isActive: false },
    });
    res.json({ success: true });
});
router.get("/:areaId/reservations", async (req, res) => {
    const { startDate, endDate } = req.query;
    const area = await prisma_1.prisma.commonArea.findUniqueOrThrow({
        where: { id: req.params.areaId },
        select: { condominiumId: true },
    });
    req.params.condominiumId = area.condominiumId;
    await (0, auth_1.authorizeCondominium)(req, res, async () => { });
    const reservations = await prisma_1.prisma.reservation.findMany({
        where: {
            commonAreaId: req.params.areaId,
            status: { in: ["PENDING", "CONFIRMED"] },
            ...(startDate &&
                endDate && {
                startDate: { gte: new Date(startDate) },
                endDate: { lte: new Date(endDate) },
            }),
        },
        orderBy: { startDate: "asc" },
    });
    res.json({ success: true, data: { reservations } });
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
router.post("/reservations", async (req, res) => {
    const data = (0, validateRequest_1.validateRequest)(reservationSchema, req.body);
    const unit = await ensureUnitAccess(req, data.unitId);
    const area = await prisma_1.prisma.commonArea.findUniqueOrThrow({
        where: { id: data.commonAreaId },
    });
    if (area.condominiumId !== unit.condominiumId) {
        throw new errorHandler_1.ForbiddenError("A unidade informada nao pertence ao mesmo condominio da area");
    }
    const conflict = await prisma_1.prisma.reservation.findFirst({
        where: {
            commonAreaId: data.commonAreaId,
            status: { in: ["PENDING", "CONFIRMED"] },
            OR: [
                {
                    startDate: { lte: new Date(data.endDate) },
                    endDate: { gte: new Date(data.startDate) },
                },
            ],
        },
    });
    if (conflict) {
        return res.status(409).json({
            success: false,
            error: { code: "CONFLICT", message: "Area ja reservada neste periodo" },
        });
    }
    const reservation = await prisma_1.prisma.reservation.create({
        data: {
            ...data,
            startDate: new Date(data.startDate),
            endDate: new Date(data.endDate),
            requestedBy: req.user.userId,
            status: area.requiresApproval ? "PENDING" : "CONFIRMED",
        },
    });
    res.status(201).json({ success: true, data: { reservation } });
});
router.patch("/reservations/:id/approve", (0, auth_1.authorize)("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"), async (req, res) => {
    await ensureReservationAccess(req, req.params.id, { managementOnly: true });
    const reservation = await prisma_1.prisma.reservation.update({
        where: { id: req.params.id },
        data: { status: "CONFIRMED", approvedBy: req.user.userId },
    });
    res.json({ success: true, data: { reservation } });
});
router.patch("/reservations/:id/cancel", async (req, res) => {
    await ensureReservationAccess(req, req.params.id, {
        residentOwnOnly: true,
    });
    const reservation = await prisma_1.prisma.reservation.update({
        where: { id: req.params.id },
        data: {
            status: "CANCELED",
            canceledBy: req.user.userId,
            cancelReason: req.body.reason,
        },
    });
    res.json({ success: true, data: { reservation } });
});
router.get("/reservations/unit/:unitId", async (req, res) => {
    await ensureUnitAccess(req, req.params.unitId);
    const reservations = await prisma_1.prisma.reservation.findMany({
        where: { unitId: req.params.unitId },
        include: { commonArea: { select: { name: true } } },
        orderBy: { startDate: "desc" },
    });
    res.json({ success: true, data: { reservations } });
});
router.get("/reservations/condominium/:condominiumId", auth_1.authorizeCondominium, async (req, res) => {
    const reservations = await prisma_1.prisma.reservation.findMany({
        where: {
            commonArea: { condominiumId: req.params.condominiumId },
        },
        include: {
            commonArea: { select: { name: true } },
        },
        orderBy: { startDate: "desc" },
        take: 50,
    });
    res.json({ success: true, data: { reservations } });
});
exports.default = router;
//# sourceMappingURL=commonArea.routes.js.map