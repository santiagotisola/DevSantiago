"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../../config/prisma");
const auth_1 = require("../../middleware/auth");
const validateRequest_1 = require("../../utils/validateRequest");
const zod_1 = require("zod");
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
    status: zod_1.z.enum(["OCCUPIED", "VACANT", "UNDER_RENOVATION", "BLOCKED"]).optional(),
    fraction: zod_1.z.number().positive().optional(),
    notes: zod_1.z.string().optional(),
});
router.get("/condominium/:condominiumId", async (req, res) => {
    const units = await prisma_1.prisma.unit.findMany({
        where: {
            condominiumId: req.params.condominiumId,
            ...(req.query.status && { status: req.query.status }),
        },
        include: {
            _count: { select: { residents: true, vehicles: true } },
            residents: {
                where: { isActive: true },
                include: { user: { select: { id: true, name: true } } },
                take: 1,
            },
        },
        orderBy: [{ block: "asc" }, { identifier: "asc" }],
    });
    res.json({ success: true, data: { units } });
});
router.post("/", (0, auth_1.authorize)("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"), async (req, res) => {
    const data = (0, validateRequest_1.validateRequest)(unitSchema, req.body);
    const unit = await prisma_1.prisma.unit.create({ data });
    res.status(201).json({ success: true, data: { unit } });
});
router.get("/:id", async (req, res) => {
    const unit = await prisma_1.prisma.unit.findUniqueOrThrow({
        where: { id: req.params.id },
        include: {
            residents: {
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            phone: true,
                            avatarUrl: true,
                        },
                    },
                },
            },
            vehicles: { where: { isActive: true } },
            dependents: { where: { isActive: true } },
        },
    });
    res.json({ success: true, data: { unit } });
});
router.put("/:id", (0, auth_1.authorize)("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"), async (req, res) => {
    const data = (0, validateRequest_1.validateRequest)(unitSchema.partial(), req.body);
    const unit = await prisma_1.prisma.unit.update({
        where: { id: req.params.id },
        data,
    });
    res.json({ success: true, data: { unit } });
});
exports.default = router;
//# sourceMappingURL=unit.routes.js.map