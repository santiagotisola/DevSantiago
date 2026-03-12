import { z } from 'zod';
import { LostAndFoundStatus } from '@prisma/client';

export const createLostAndFoundSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Título é obrigatório'),
    description: z.string().optional(),
    category: z.string().min(1, 'Categoria é obrigatória'),
    place: z.string().optional(),
    status: z.nativeEnum(LostAndFoundStatus).default(LostAndFoundStatus.FOUND),
    foundDate: z.string().optional().nullable(),
    lostDate: z.string().optional().nullable(),
  })
});

export const updateLostAndFoundSchema = z.object({
  body: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    category: z.string().optional(),
    place: z.string().optional(),
    status: z.nativeEnum(LostAndFoundStatus).optional(),
    returnedTo: z.string().optional().nullable(),
    returnedAt: z.string().optional().nullable(),
  })
});
