"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateLostAndFoundSchema = exports.createLostAndFoundSchema = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
exports.createLostAndFoundSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().min(1, 'Título é obrigatório'),
        description: zod_1.z.string().optional(),
        category: zod_1.z.string().min(1, 'Categoria é obrigatória'),
        place: zod_1.z.string().optional(),
        status: zod_1.z.nativeEnum(client_1.LostAndFoundStatus).default(client_1.LostAndFoundStatus.FOUND),
        foundDate: zod_1.z.string().optional().nullable(),
        lostDate: zod_1.z.string().optional().nullable(),
    })
});
exports.updateLostAndFoundSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().optional(),
        description: zod_1.z.string().optional(),
        category: zod_1.z.string().optional(),
        place: zod_1.z.string().optional(),
        status: zod_1.z.nativeEnum(client_1.LostAndFoundStatus).optional(),
        returnedTo: zod_1.z.string().optional().nullable(),
        returnedAt: zod_1.z.string().optional().nullable(),
    })
});
//# sourceMappingURL=lost-and-found.validation.js.map