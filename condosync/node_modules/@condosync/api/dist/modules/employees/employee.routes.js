"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../../config/prisma");
const auth_1 = require("../../middleware/auth");
const validateRequest_1 = require("../../utils/validateRequest");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate, (0, auth_1.authorize)('CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'));
const employeeSchema = zod_1.z.object({
    condominiumId: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(2),
    cpf: zod_1.z.string().length(11),
    role: zod_1.z.string().min(2),
    phone: zod_1.z.string().optional(),
    email: zod_1.z.string().email().optional(),
    shift: zod_1.z.enum(['MORNING', 'AFTERNOON', 'NIGHT', 'FULL_DAY']),
    admissionDate: zod_1.z.string().datetime(),
    salaryAmount: zod_1.z.number().positive().optional(),
    notes: zod_1.z.string().optional(),
});
router.get('/condominium/:condominiumId', async (req, res) => {
    const employees = await prisma_1.prisma.employee.findMany({
        where: { condominiumId: req.params.condominiumId, isActive: true },
        orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: { employees } });
});
router.post('/', async (req, res) => {
    const data = (0, validateRequest_1.validateRequest)(employeeSchema, req.body);
    const employee = await prisma_1.prisma.employee.create({ data: { ...data, admissionDate: new Date(data.admissionDate) } });
    res.status(201).json({ success: true, data: { employee } });
});
router.put('/:id', async (req, res) => {
    const data = (0, validateRequest_1.validateRequest)(employeeSchema.partial(), req.body);
    const employee = await prisma_1.prisma.employee.update({
        where: { id: req.params.id },
        data: { ...data, admissionDate: data.admissionDate ? new Date(data.admissionDate) : undefined },
    });
    res.json({ success: true, data: { employee } });
});
router.delete('/:id', async (req, res) => {
    await prisma_1.prisma.employee.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ success: true });
});
exports.default = router;
//# sourceMappingURL=employee.routes.js.map