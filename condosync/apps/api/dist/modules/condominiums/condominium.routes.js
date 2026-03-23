"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../../config/prisma");
const auth_1 = require("../../middleware/auth");
const validateRequest_1 = require("../../utils/validateRequest");
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const errorHandler_1 = require("../../middleware/errorHandler");
const resident_service_1 = require("../residents/resident.service");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
/** Verifica que o ator pertence ao condomÃ­nio indicado */
async function ensureCondominiumMembership(userId, role, condominiumId) {
    if (role === client_1.UserRole.SUPER_ADMIN)
        return;
    const membership = await prisma_1.prisma.condominiumUser.findFirst({
        where: { userId, condominiumId, isActive: true },
        select: { id: true },
    });
    if (!membership)
        throw new errorHandler_1.ForbiddenError('Acesso negado a este condomÃ­nio');
}
const createSchema = zod_1.z.object({
    name: zod_1.z.string().min(3),
    cnpj: zod_1.z.string().regex(/^\d{14}$/, 'CNPJ deve conter 14 dígitos numéricos').optional(),
    address: zod_1.z.string().optional(),
    city: zod_1.z.string().optional(),
    state: zod_1.z.string().optional(),
    zipCode: zod_1.z.string().optional(),
    phone: zod_1.z.string().optional(),
    email: zod_1.z.string().email().optional(),
    timezone: zod_1.z.string().optional(),
    plan: zod_1.z.enum(['basic', 'professional', 'enterprise']).optional(),
    maxUnits: zod_1.z.number().int().positive().optional(),
});
router.get('/', async (req, res) => {
    const condominiums = await prisma_1.prisma.condominium.findMany({
        where: req.user.role === 'SUPER_ADMIN'
            ? {}
            : { condominiumUsers: { some: { userId: req.user.userId, isActive: true } } },
        include: { _count: { select: { units: true, condominiumUsers: true } } },
        orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: { condominiums } });
});
router.post('/', (0, auth_1.authorize)('SUPER_ADMIN'), async (req, res) => {
    const data = (0, validateRequest_1.validateRequest)(createSchema, req.body);
    const condominium = await prisma_1.prisma.condominium.create({
        data: {
            address: '',
            city: '',
            state: '',
            zipCode: '',
            ...data,
        },
    });
    res.status(201).json({ success: true, data: { condominium } });
});
// D1 â€” GET /:id verifica membership para nÃ£o-super-admins
router.get('/:id', async (req, res) => {
    await ensureCondominiumMembership(req.user.userId, req.user.role, req.params.id);
    const condominium = await prisma_1.prisma.condominium.findUniqueOrThrow({
        where: { id: req.params.id },
        include: {
            _count: { select: { units: true, employees: true, serviceProviders: true, commonAreas: true } },
        },
    });
    res.json({ success: true, data: { condominium } });
});
// D2 â€” PUT /:id verifica membership antes de editar
router.put('/:id', (0, auth_1.authorize)('CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), async (req, res) => {
    await ensureCondominiumMembership(req.user.userId, req.user.role, req.params.id);
    const data = (0, validateRequest_1.validateRequest)(createSchema.partial(), req.body);
    const condominium = await prisma_1.prisma.condominium.update({ where: { id: req.params.id }, data });
    res.json({ success: true, data: { condominium } });
});
// Adicionar membro ao condomÃ­nio
router.post('/:id/members', (0, auth_1.authorize)('CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), async (req, res) => {
    await ensureCondominiumMembership(req.user.userId, req.user.role, req.params.id);
    const schema = zod_1.z.object({
        userId: zod_1.z.string().uuid(),
        role: zod_1.z.nativeEnum(client_1.UserRole),
        unitId: zod_1.z.string().uuid().optional(),
    });
    const { userId, role, unitId } = (0, validateRequest_1.validateRequest)(schema, req.body);
    resident_service_1.residentService.assertResidentRoleRequiresUnit(role, unitId);
    if (role === client_1.UserRole.RESIDENT) {
        await resident_service_1.residentService.assertResidentUnitBelongsToCondominium(req.params.id, unitId);
    }
    const member = await prisma_1.prisma.condominiumUser.upsert({
        where: { userId_condominiumId: { userId, condominiumId: req.params.id } },
        update: { role, unitId, isActive: true },
        create: { userId, condominiumId: req.params.id, role, unitId },
    });
    res.status(201).json({ success: true, data: { member } });
});
// D3 â€” GET /:id/members requer autorizaÃ§Ã£o e membership
router.get('/:id/members', (0, auth_1.authorize)('CONDOMINIUM_ADMIN', 'SYNDIC', 'COUNCIL_MEMBER', 'SUPER_ADMIN'), async (req, res) => {
    await ensureCondominiumMembership(req.user.userId, req.user.role, req.params.id);
    const members = await prisma_1.prisma.condominiumUser.findMany({
        where: { condominiumId: req.params.id, isActive: true },
        include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true, phone: true } },
            unit: { select: { identifier: true, block: true } },
        },
        orderBy: { joinedAt: 'asc' },
    });
    res.json({ success: true, data: { members } });
});
// D4 â€” DELETE /:id/members verifica membership do ator
router.delete('/:id/members/:userId', (0, auth_1.authorize)('CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), async (req, res) => {
    await ensureCondominiumMembership(req.user.userId, req.user.role, req.params.id);
    await prisma_1.prisma.condominiumUser.deleteMany({
        where: { condominiumId: req.params.id, userId: req.params.userId },
    });
    res.json({ success: true });
});
exports.default = router;
//# sourceMappingURL=condominium.routes.js.map