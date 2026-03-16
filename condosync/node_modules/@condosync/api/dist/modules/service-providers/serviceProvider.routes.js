"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../../config/prisma");
const auth_1 = require("../../middleware/auth");
const validateRequest_1 = require("../../utils/validateRequest");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
const schema = zod_1.z.object({
    condominiumId: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(2),
    cnpj: zod_1.z.string().optional().or(zod_1.z.literal('')),
    cpf: zod_1.z.string().optional().or(zod_1.z.literal('')),
    serviceType: zod_1.z.string().min(2),
    phone: zod_1.z.string().optional().or(zod_1.z.literal('')),
    email: zod_1.z.string().email().optional().or(zod_1.z.literal('')),
    notes: zod_1.z.string().optional().or(zod_1.z.literal('')),
});
router.get('/condominium/:condominiumId', async (req, res) => {
    const providers = await prisma_1.prisma.serviceProvider.findMany({
        where: { condominiumId: req.params.condominiumId, ...(req.query.approved && { isApproved: req.query.approved === 'true' }) },
        orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: { providers } });
});
router.post('/', (0, auth_1.authorize)('CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), async (req, res) => {
    const data = (0, validateRequest_1.validateRequest)(schema, req.body);
    const provider = await prisma_1.prisma.serviceProvider.create({ data });
    res.status(201).json({ success: true, data: { provider } });
});
router.put('/:id', (0, auth_1.authorize)('CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), async (req, res) => {
    const data = (0, validateRequest_1.validateRequest)(schema.partial(), req.body);
    const provider = await prisma_1.prisma.serviceProvider.update({ where: { id: req.params.id }, data });
    res.json({ success: true, data: { provider } });
});
router.patch('/:id/approve', (0, auth_1.authorize)('CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), async (req, res) => {
    const provider = await prisma_1.prisma.serviceProvider.update({ where: { id: req.params.id }, data: { isApproved: true } });
    res.json({ success: true, data: { provider } });
});
router.delete('/:id', (0, auth_1.authorize)('CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), async (req, res) => {
    await prisma_1.prisma.serviceProvider.delete({ where: { id: req.params.id } });
    res.json({ success: true });
});
exports.default = router;
//# sourceMappingURL=serviceProvider.routes.js.map