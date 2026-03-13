import { z } from 'zod';

// ─── Cobranças ──────────────────────────────────────────────

export const createChargeSchema = z.object({
  unitId: z.string().uuid(),
  accountId: z.string().uuid(),
  categoryId: z.string().uuid().optional(),
  description: z.string().min(3, 'Descrição deve ter no mínimo 3 caracteres'),
  amount: z.number().positive('Valor deve ser positivo'),
  dueDate: z.string().datetime(),
  referenceMonth: z.string().optional(),
  interestRate: z.number().min(0).optional(),
  penaltyAmount: z.number().min(0).optional(),
});

export const updateChargeSchema = createChargeSchema.partial();

export const ratioSchema = z.object({
  condominiumId: z.string().uuid(),
  accountId: z.string().uuid(),
  categoryId: z.string().uuid().optional(),
  description: z.string().min(3, 'Descrição deve ter no mínimo 3 caracteres'),
  totalAmount: z.number().positive('Valor total deve ser positivo'),
  dueDate: z.string().datetime(),
  referenceMonth: z.string(),
  method: z.enum(['equal', 'fraction']),
});

export const paySchema = z.object({
  paidAmount: z.number().positive('Valor pago deve ser positivo'),
  paidAt: z.string().datetime().optional(),
});

// ─── Transações ─────────────────────────────────────────────

export const createTransactionSchema = z.object({
  accountId: z.string().uuid(),
  categoryId: z.string().uuid().optional(),
  type: z.enum(['INCOME', 'EXPENSE']),
  amount: z.number().positive('Valor deve ser positivo'),
  description: z.string().min(3, 'Descrição deve ter no mínimo 3 caracteres'),
  dueDate: z.string().datetime(),
  paidAt: z.string().datetime().optional(),
  referenceMonth: z.string().optional(),
  notes: z.string().optional(),
});

// ─── Rateio Parcelado ──────────────────────────────────────

export const ratioInstallmentsSchema = z.object({
  condominiumId: z.string().uuid(),
  accountId: z.string().uuid(),
  categoryId: z.string().uuid().optional(),
  description: z.string().min(3, 'Descrição deve ter no mínimo 3 caracteres'),
  totalAmount: z.number().positive('Valor total deve ser positivo'),
  firstDueDate: z.string().datetime(),
  installments: z.number().int().min(2).max(60),
  intervalDays: z.number().int().min(1),
  method: z.enum(['equal', 'fraction']),
});

export const chargeInstallmentsSchema = z.object({
  unitId: z.string().uuid(),
  accountId: z.string().uuid(),
  categoryId: z.string().uuid().optional(),
  description: z.string().min(3, 'Descrição deve ter no mínimo 3 caracteres'),
  amount: z.number().positive('Valor deve ser positivo'),
  firstDueDate: z.string().datetime(),
  installments: z.number().int().min(2).max(60),
  intervalDays: z.number().int().min(1),
});

// ─── Tipos inferidos ────────────────────────────────────────

export type CreateChargeInput = z.infer<typeof createChargeSchema>;
export type UpdateChargeInput = z.infer<typeof updateChargeSchema>;
export type RatioInput = z.infer<typeof ratioSchema>;
export type PayInput = z.infer<typeof paySchema>;
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
