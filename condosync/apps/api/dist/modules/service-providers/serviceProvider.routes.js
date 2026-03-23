"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../../config/prisma");
const auth_1 = require("../../middleware/auth");
const validateRequest_1 = require("../../utils/validateRequest");
const errorHandler_1 = require("../../middleware/errorHandler");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
/** Verifica que o ator pertence ao condomÃ­nio indicado */
async function ensureCondominiumMembership(userId, role, condominiumId) {
    if (role === 'SUPER_ADMIN')
        return;
    const membership = await prisma_1.prisma.condominiumUser.findFirst({
        where: { userId, condominiumId, isActive: true },
        select: { id: true },
    });
    if (!membership)
        throw new errorHandler_1.ForbiddenError('Acesso negado a este condomÃ­nio');
}
const schema = zod_1.z.object({
    condominiumId: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(2),
    cnpj: zod_1.z.string().optional(),
    cpf: zod_1.z.string().optional(),
    serviceType: zod_1.z.string().min(2),
    phone: zod_1.z.string().min(1, 'Telefone é obrigatório'),
    email: zod_1.z.string().email().optional(),
    notes: zod_1.z.string().optional(),
});
router.get('/condominium/:condominiumId', async (req, res) => {
    const providers = await prisma_1.prisma.serviceProvider.findMany({
        where: { condominiumId: req.params.condominiumId, ...(req.query.approved && { isApproved: req.query.approved === 'true' }) },
        orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: { providers } });
});
// L4 â€” verifica membership para condominiumId do body
router.post('/', (0, auth_1.authorize)('CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), async (req, res) => {
    const data = (0, validateRequest_1.validateRequest)(schema, req.body);
    await ensureCondominiumMembership(req.user.userId, req.user.role, data.condominiumId);
    const provider = await prisma_1.prisma.serviceProvider.create({ data });
    res.status(201).json({ success: true, data: { provider } });
});
// L1 â€” IDOR fix: verifica tenant antes de editar
router.put('/:id', (0, auth_1.authorize)('CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), async (req, res) => {
    const existing = await prisma_1.prisma.serviceProvider.findUniqueOrThrow({
        where: { id: req.params.id },
        select: { condominiumId: true },
    });
    await ensureCondominiumMembership(req.user.userId, req.user.role, existing.condominiumId);
    const data = (0, validateRequest_1.validateRequest)(schema.partial(), req.body);
    const provider = await prisma_1.prisma.serviceProvider.update({ where: { id: req.params.id }, data });
    res.json({ success: true, data: { provider } });
});
// L2 â€” IDOR fix: verifica tenant antes de aprovar
router.patch('/:id/approve', (0, auth_1.authorize)('CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), async (req, res) => {
    const existing = await prisma_1.prisma.serviceProvider.findUniqueOrThrow({
        where: { id: req.params.id },
        select: { condominiumId: true },
    });
    await ensureCondominiumMembership(req.user.userId, req.user.role, existing.condominiumId);
    const provider = await prisma_1.prisma.serviceProvider.update({ where: { id: req.params.id }, data: { isApproved: true } });
    res.json({ success: true, data: { provider } });
});
// L3 â€” IDOR fix: verifica tenant antes de deletar
router.delete('/:id', (0, auth_1.authorize)('CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), async (req, res) => {
    const existing = await prisma_1.prisma.serviceProvider.findUniqueOrThrow({
        where: { id: req.params.id },
        select: { condominiumId: true },
    });
    await ensureCondominiumMembership(req.user.userId, req.user.role, existing.condominiumId);
    await prisma_1.prisma.serviceProvider.delete({ where: { id: req.params.id } });
    res.json({ success: true });
});
exports.default = router;
//# sourceMappingURL=serviceProvider.routes.js.map