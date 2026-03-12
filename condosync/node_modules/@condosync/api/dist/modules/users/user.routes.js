"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../../config/prisma");
const auth_1 = require("../../middleware/auth");
const validateRequest_1 = require("../../utils/validateRequest");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// Listar usuários do sistema (super admin)
router.get('/', (0, auth_1.authorize)('SUPER_ADMIN'), async (req, res) => {
    const users = await prisma_1.prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, lastLoginAt: true },
        orderBy: { createdAt: 'desc' },
        take: Number(req.query.limit) || 50,
        skip: ((Number(req.query.page) || 1) - 1) * (Number(req.query.limit) || 50),
    });
    res.json({ success: true, data: { users } });
});
// Perfil de um usuário
router.get('/:id', async (req, res) => {
    const user = await prisma_1.prisma.user.findUniqueOrThrow({
        where: { id: req.params.id },
        select: {
            id: true, name: true, email: true, phone: true, avatarUrl: true,
            role: true, createdAt: true, lastLoginAt: true,
            condominiumUsers: {
                include: { condominium: { select: { id: true, name: true } }, unit: { select: { identifier: true, block: true } } },
            },
        },
    });
    res.json({ success: true, data: { user } });
});
// Atualizar perfil
router.put('/:id', async (req, res) => {
    if (req.user.userId !== req.params.id && req.user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ success: false, error: { message: 'Acesso negado' } });
    }
    const schema = zod_1.z.object({
        name: zod_1.z.string().min(2).optional(),
        phone: zod_1.z.string().optional(),
        avatarUrl: zod_1.z.string().url().optional(),
    });
    const data = (0, validateRequest_1.validateRequest)(schema, req.body);
    const user = await prisma_1.prisma.user.update({
        where: { id: req.params.id },
        data,
        select: { id: true, name: true, email: true, phone: true, avatarUrl: true, role: true },
    });
    res.json({ success: true, data: { user } });
});
// Ativar/desativar usuário
router.patch('/:id/toggle-active', (0, auth_1.authorize)('SUPER_ADMIN', 'CONDOMINIUM_ADMIN'), async (req, res) => {
    const user = await prisma_1.prisma.user.findUniqueOrThrow({ where: { id: req.params.id }, select: { isActive: true } });
    const updated = await prisma_1.prisma.user.update({ where: { id: req.params.id }, data: { isActive: !user.isActive } });
    res.json({ success: true, data: { isActive: updated.isActive } });
});
exports.default = router;
//# sourceMappingURL=user.routes.js.map