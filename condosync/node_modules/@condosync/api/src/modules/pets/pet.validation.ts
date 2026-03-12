import { z } from 'zod';

export const createPetSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    type: z.string().min(1, 'Tipo é obrigatório'),
    breed: z.string().optional(),
    size: z.string().optional(),
    gender: z.string().optional(),
    birthDate: z.string().optional().nullable(),
    color: z.string().optional(),
    weight: z.number().optional(),
    lastVaccination: z.string().optional().nullable(),
    notes: z.string().optional(),
    unitId: z.string().uuid('ID da unidade inválido')
  })
});

export const updatePetSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    type: z.string().optional(),
    breed: z.string().optional(),
    size: z.string().optional(),
    gender: z.string().optional(),
    birthDate: z.string().optional().nullable(),
    color: z.string().optional(),
    weight: z.number().optional(),
    lastVaccination: z.string().optional().nullable(),
    notes: z.string().optional(),
    unitId: z.string().uuid('ID da unidade inválido').optional(),
    isActive: z.boolean().optional()
  })
});
