"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../../config/prisma");
const auth_1 = require("../../middleware/auth");
const validateRequest_1 = require("../../utils/validateRequest");
const errorHandler_1 = require("../../middleware/errorHandler");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate, (0, auth_1.authorize)('CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'));
/** Verifica que o ator pertence ao condomÃ­nio */
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
const employeeSchema = zod_1.z.object({
    condominiumId: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(2),
    cpf: zod_1.z.string().length(11).optional(),
    role: zod_1.z.string().min(2),
    phone: zod_1.z.string().optional(),
    email: zod_1.z.string().email().optional(),
    shift: zod_1.z.enum(['MORNING', 'AFTERNOON', 'NIGHT', 'FULL_DAY']).optional().default('MORNING'),
    shiftType: zod_1.z.enum(['MORNING', 'AFTERNOON', 'NIGHT', 'FULL_DAY']).optional(),
    admissionDate: zod_1.z.string().datetime().optional(),
    salaryAmount: zod_1.z.number().positive().optional(),
    notes: zod_1.z.string().optional(),
});
router.get('/condominium/:condominiumId', async (req, res) => {
    await ensureCondominiumMembership(req.user.userId, req.user.role, req.params.condominiumId);
    const employees = await prisma_1.prisma.employee.findMany({
        where: { condominiumId: req.params.condominiumId, isActive: true },
        orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: { employees } });
});
// E3 â€” verifica membership para condominiumId do body
router.post('/', async (req, res) => {
    const data = (0, validateRequest_1.validateRequest)(employeeSchema, req.body);
    await ensureCondominiumMembership(req.user.userId, req.user.role, data.condominiumId);
    const shift = data.shift ?? data.shiftType ?? 'MORNING';
    const { shiftType: _st, ...rest } = data;
    const employee = await prisma_1.prisma.employee.create({
        data: {
            ...rest,
            shift,
            cpf: rest.cpf ?? '',
            admissionDate: data.admissionDate ? new Date(data.admissionDate) : new Date(),
        },
    });
    res.status(201).json({ success: true, data: { employee } });
});
// E1 â€” IDOR fix: busca funcionÃ¡rio, verifica condomÃ­nio antes de editar
router.put('/:id', async (req, res) => {
    const existing = await prisma_1.prisma.employee.findUniqueOrThrow({
        where: { id: req.params.id },
        select: { condominiumId: true },
    });
    await ensureCondominiumMembership(req.user.userId, req.user.role, existing.condominiumId);
    const data = (0, validateRequest_1.validateRequest)(employeeSchema.partial(), req.body);
    const employee = await prisma_1.prisma.employee.update({
        where: { id: req.params.id },
        data: { ...data, admissionDate: data.admissionDate ? new Date(data.admissionDate) : undefined },
    });
    res.json({ success: true, data: { employee } });
});
// E2 â€” IDOR fix: busca funcionÃ¡rio, verifica condomÃ­nio antes de desativar
router.delete('/:id', async (req, res) => {
    const existing = await prisma_1.prisma.employee.findUniqueOrThrow({
        where: { id: req.params.id },
        select: { condominiumId: true },
    });
    await ensureCondominiumMembership(req.user.userId, req.user.role, existing.condominiumId);
    await prisma_1.prisma.employee.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ success: true });
});
exports.default = router;
//# sourceMappingURL=employee.routes.js.map