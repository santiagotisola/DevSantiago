"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePetSchema = exports.createPetSchema = void 0;
const zod_1 = require("zod");
exports.createPetSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, 'Nome é obrigatório'),
        type: zod_1.z.string().min(1, 'Tipo é obrigatório'),
        breed: zod_1.z.string().optional(),
        size: zod_1.z.string().optional(),
        gender: zod_1.z.string().optional(),
        birthDate: zod_1.z.string().optional().nullable(),
        color: zod_1.z.string().optional(),
        weight: zod_1.z.number().optional(),
        lastVaccination: zod_1.z.string().optional().nullable(),
        notes: zod_1.z.string().optional(),
        unitId: zod_1.z.string().uuid('ID da unidade inválido')
    })
});
exports.updatePetSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().optional(),
        type: zod_1.z.string().optional(),
        breed: zod_1.z.string().optional(),
        size: zod_1.z.string().optional(),
        gender: zod_1.z.string().optional(),
        birthDate: zod_1.z.string().optional().nullable(),
        color: zod_1.z.string().optional(),
        weight: zod_1.z.number().optional(),
        lastVaccination: zod_1.z.string().optional().nullable(),
        notes: zod_1.z.string().optional(),
        unitId: zod_1.z.string().uuid('ID da unidade inválido').optional(),
        isActive: zod_1.z.boolean().optional()
    })
});
//# sourceMappingURL=pet.validation.js.map