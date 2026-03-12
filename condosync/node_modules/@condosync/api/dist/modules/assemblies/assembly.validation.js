"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.voteAssemblySchema = exports.updateAssemblyStatusSchema = exports.createAssemblySchema = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
exports.createAssemblySchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().min(3, 'O título é obrigatório'),
        description: zod_1.z.string().optional(),
        meetingUrl: zod_1.z.string().url('URL inválida').optional(),
        scheduledAt: zod_1.z.string().datetime(),
        votingItems: zod_1.z.array(zod_1.z.object({
            title: zod_1.z.string().min(3, 'Título do item é obrigatório'),
            description: zod_1.z.string().optional(),
            options: zod_1.z.array(zod_1.z.object({
                id: zod_1.z.string(),
                text: zod_1.z.string().min(1, 'Texto da opção é obrigatório'),
            })).min(2, 'O item deve ter pelo menos duas opções'),
        })).optional(),
    }),
});
exports.updateAssemblyStatusSchema = zod_1.z.object({
    body: zod_1.z.object({
        status: zod_1.z.nativeEnum(client_1.AssemblyStatus),
    }),
});
exports.voteAssemblySchema = zod_1.z.object({
    body: zod_1.z.object({
        optionId: zod_1.z.string({ required_error: 'ID da opção é obrigatório' }),
    }),
});
//# sourceMappingURL=assembly.validation.js.map