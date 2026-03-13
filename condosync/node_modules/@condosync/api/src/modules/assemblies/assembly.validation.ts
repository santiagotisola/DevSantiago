import { z } from 'zod';
import { AssemblyStatus } from '@prisma/client';

export const createAssemblySchema = z.object({
  body: z.object({
    title: z.string().min(3, 'O título é obrigatório'),
    description: z.string().optional(),
    meetingUrl: z.string().url('URL inválida').optional(),
    scheduledAt: z.string().datetime(),
    votingItems: z.array(
      z.object({
        title: z.string().min(3, 'Título do item é obrigatório'),
        description: z.string().optional(),
        options: z.array(
          z.object({
            id: z.string(),
            text: z.string().min(1, 'Texto da opção é obrigatório'),
          })
        ).min(2, 'O item deve ter pelo menos duas opções'),
      })
    ).optional(),
  }),
});

export const updateAssemblyStatusSchema = z.object({
  body: z.object({
    status: z.nativeEnum(AssemblyStatus),
  }),
});

export const voteAssemblySchema = z.object({
  body: z.object({
    optionId: z.string({ required_error: 'ID da opção é obrigatório' }),
  }),
});
