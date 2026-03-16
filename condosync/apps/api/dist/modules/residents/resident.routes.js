"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../../config/prisma");
const auth_1 = require("../../middleware/auth");
const errorHandler_1 = require("../../middleware/errorHandler");
const validateRequest_1 = require("../../utils/validateRequest");
const zod_1 = require("zod");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const resident_service_1 = require("./resident.service");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// Dependentes de uma unidade
router.get('/unit/:unitId/dependents', async (req, res) => {
    const dependents = await prisma_1.prisma.dependent.findMany({
        where: { unitId: req.params.unitId, isActive: true },
    });
    res.json({ success: true, data: { dependents } });
});
const dependentSchema = zod_1.z.object({
    unitId: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(2),
    relationship: zod_1.z.string().min(2),
    birthDate: zod_1.z.string().datetime().optional(),
    cpf: zod_1.z.string().optional(),
    photoUrl: zod_1.z.string().url().optional(),
});
router.post('/dependents', async (req, res) => {
    const data = (0, validateRequest_1.validateRequest)(dependentSchema, req.body);
    const dependent = await prisma_1.prisma.dependent.create({
        data: { ...data, birthDate: data.birthDate ? new Date(data.birthDate) : undefined },
    });
    res.status(201).json({ success: true, data: { dependent } });
});
router.delete('/dependents/:id', async (req, res) => {
    await prisma_1.prisma.dependent.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ success: true });
});
// Residentes de um condomínio
router.get('/condominium/:condominiumId', async (req, res) => {
    const residents = await prisma_1.prisma.condominiumUser.findMany({
        where: { condominiumId: req.params.condominiumId, role: 'RESIDENT', isActive: true },
        include: {
            user: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true, cpf: true } },
            unit: {
                select: {
                    id: true,
                    identifier: true,
                    block: true,
                    dependents: { where: { isActive: true }, orderBy: { name: 'asc' } },
                },
            },
        },
        orderBy: { joinedAt: 'asc' },
    });
    res.json({ success: true, data: { residents } });
});
const createResidentSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    email: zod_1.z.string().email(),
    phone: zod_1.z.string().optional(),
    cpf: zod_1.z.string().optional(),
    unitId: zod_1.z.string().uuid(),
    condominiumId: zod_1.z.string().uuid(),
});
router.post('/', (0, auth_1.authorize)('CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), async (req, res) => {
    const data = (0, validateRequest_1.validateRequest)(createResidentSchema, req.body);
    await resident_service_1.residentService.assertResidentUnitBelongsToCondominium(data.condominiumId, data.unitId);
    // Cria ou reutiliza usuário pelo e-mail
    let user = await prisma_1.prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
        const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';
        const passwordHash = await bcryptjs_1.default.hash(tempPassword, 10);
        user = await prisma_1.prisma.user.create({
            data: {
                name: data.name,
                email: data.email,
                ...(data.phone ? { phone: data.phone } : {}),
                ...(data.cpf ? { cpf: data.cpf } : {}),
                passwordHash,
                role: 'RESIDENT',
            },
        });
    }
    else {
        // Atualiza nome, telefone e CPF com os dados do formulário
        user = await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: {
                name: data.name,
                ...(data.phone ? { phone: data.phone } : {}),
                ...(data.cpf ? { cpf: data.cpf } : {}),
            },
        });
    }
    // Verifica se já é morador deste condomínio
    const existing = await prisma_1.prisma.condominiumUser.findFirst({
        where: { userId: user.id, condominiumId: data.condominiumId },
    });
    if (existing) {
        res.status(409).json({ success: false, message: 'Morador já vinculado a este condomínio' });
        return;
    }
    const resident = await prisma_1.prisma.condominiumUser.create({
        data: {
            userId: user.id,
            condominiumId: data.condominiumId,
            unitId: data.unitId,
            role: 'RESIDENT',
        },
        include: {
            user: { select: { id: true, name: true, email: true, phone: true, cpf: true } },
            unit: { select: { id: true, identifier: true, block: true } },
        },
    });
    res.status(201).json({ success: true, data: { resident } });
});
const updateResidentSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).optional(),
    phone: zod_1.z.string().optional(),
    cpf: zod_1.z.string().optional(),
    unitId: zod_1.z.string().uuid(),
});
// Atualiza dados do morador (user + unidade)
router.patch('/:id', (0, auth_1.authorize)('CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), async (req, res) => {
    const data = (0, validateRequest_1.validateRequest)(updateResidentSchema, req.body);
    const condominiumUser = await prisma_1.prisma.condominiumUser.findUniqueOrThrow({
        where: { id: req.params.id },
        include: { user: true },
    });
    if (condominiumUser.role !== 'RESIDENT') {
        throw new errorHandler_1.ValidationError('Dados invalidos', {
            id: ['O registro informado nao pertence a um morador.'],
        });
    }
    await resident_service_1.residentService.assertResidentUnitBelongsToCondominium(condominiumUser.condominiumId, data.unitId);
    // Atualiza dados do usuário
    if (data.name || data.phone !== undefined || data.cpf !== undefined) {
        await prisma_1.prisma.user.update({
            where: { id: condominiumUser.userId },
            data: {
                ...(data.name ? { name: data.name } : {}),
                ...(data.phone !== undefined ? { phone: data.phone || null } : {}),
                ...(data.cpf !== undefined ? { cpf: data.cpf || null } : {}),
            },
        });
    }
    // Atualiza unidade
    const updated = await prisma_1.prisma.condominiumUser.update({
        where: { id: req.params.id },
        data: { unitId: data.unitId },
        include: {
            user: { select: { id: true, name: true, email: true, phone: true, cpf: true } },
            unit: { select: { id: true, identifier: true, block: true } },
        },
    });
    res.json({ success: true, data: { resident: updated } });
});
// Remove morador do condomínio (desativa vínculo)
router.delete('/:id', (0, auth_1.authorize)('CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), async (req, res) => {
    await prisma_1.prisma.condominiumUser.update({
        where: { id: req.params.id },
        data: { isActive: false },
    });
    res.json({ success: true });
});
exports.default = router;
//# sourceMappingURL=resident.routes.js.map