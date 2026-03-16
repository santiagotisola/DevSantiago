import { z } from 'zod';
export declare const createChargeSchema: z.ZodObject<{
    unitId: z.ZodString;
    accountId: z.ZodString;
    categoryId: z.ZodOptional<z.ZodString>;
    description: z.ZodString;
    amount: z.ZodNumber;
    dueDate: z.ZodString;
    referenceMonth: z.ZodOptional<z.ZodString>;
    interestRate: z.ZodOptional<z.ZodNumber>;
    penaltyAmount: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    unitId: string;
    description: string;
    dueDate: string;
    accountId: string;
    amount: number;
    referenceMonth?: string | undefined;
    categoryId?: string | undefined;
    penaltyAmount?: number | undefined;
    interestRate?: number | undefined;
}, {
    unitId: string;
    description: string;
    dueDate: string;
    accountId: string;
    amount: number;
    referenceMonth?: string | undefined;
    categoryId?: string | undefined;
    penaltyAmount?: number | undefined;
    interestRate?: number | undefined;
}>;
export declare const updateChargeSchema: z.ZodObject<{
    unitId: z.ZodOptional<z.ZodString>;
    accountId: z.ZodOptional<z.ZodString>;
    categoryId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    description: z.ZodOptional<z.ZodString>;
    amount: z.ZodOptional<z.ZodNumber>;
    dueDate: z.ZodOptional<z.ZodString>;
    referenceMonth: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    interestRate: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    penaltyAmount: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    unitId?: string | undefined;
    description?: string | undefined;
    dueDate?: string | undefined;
    accountId?: string | undefined;
    amount?: number | undefined;
    referenceMonth?: string | undefined;
    categoryId?: string | undefined;
    penaltyAmount?: number | undefined;
    interestRate?: number | undefined;
}, {
    unitId?: string | undefined;
    description?: string | undefined;
    dueDate?: string | undefined;
    accountId?: string | undefined;
    amount?: number | undefined;
    referenceMonth?: string | undefined;
    categoryId?: string | undefined;
    penaltyAmount?: number | undefined;
    interestRate?: number | undefined;
}>;
export declare const ratioSchema: z.ZodObject<{
    condominiumId: z.ZodString;
    accountId: z.ZodString;
    categoryId: z.ZodOptional<z.ZodString>;
    description: z.ZodString;
    totalAmount: z.ZodNumber;
    dueDate: z.ZodString;
    referenceMonth: z.ZodString;
    method: z.ZodEnum<["equal", "fraction"]>;
}, "strip", z.ZodTypeAny, {
    condominiumId: string;
    description: string;
    dueDate: string;
    accountId: string;
    referenceMonth: string;
    totalAmount: number;
    method: "fraction" | "equal";
    categoryId?: string | undefined;
}, {
    condominiumId: string;
    description: string;
    dueDate: string;
    accountId: string;
    referenceMonth: string;
    totalAmount: number;
    method: "fraction" | "equal";
    categoryId?: string | undefined;
}>;
export declare const paySchema: z.ZodObject<{
    paidAmount: z.ZodNumber;
    paidAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    paidAmount: number;
    paidAt?: string | undefined;
}, {
    paidAmount: number;
    paidAt?: string | undefined;
}>;
export declare const createTransactionSchema: z.ZodObject<{
    accountId: z.ZodString;
    categoryId: z.ZodOptional<z.ZodString>;
    type: z.ZodEnum<["INCOME", "EXPENSE"]>;
    amount: z.ZodNumber;
    description: z.ZodString;
    dueDate: z.ZodString;
    paidAt: z.ZodOptional<z.ZodString>;
    referenceMonth: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "INCOME" | "EXPENSE";
    description: string;
    dueDate: string;
    accountId: string;
    amount: number;
    notes?: string | undefined;
    referenceMonth?: string | undefined;
    categoryId?: string | undefined;
    paidAt?: string | undefined;
}, {
    type: "INCOME" | "EXPENSE";
    description: string;
    dueDate: string;
    accountId: string;
    amount: number;
    notes?: string | undefined;
    referenceMonth?: string | undefined;
    categoryId?: string | undefined;
    paidAt?: string | undefined;
}>;
export declare const ratioInstallmentsSchema: z.ZodObject<{
    condominiumId: z.ZodString;
    accountId: z.ZodString;
    categoryId: z.ZodOptional<z.ZodString>;
    description: z.ZodString;
    totalAmount: z.ZodNumber;
    firstDueDate: z.ZodString;
    installments: z.ZodNumber;
    intervalDays: z.ZodNumber;
    method: z.ZodEnum<["equal", "fraction"]>;
}, "strip", z.ZodTypeAny, {
    condominiumId: string;
    description: string;
    accountId: string;
    totalAmount: number;
    method: "fraction" | "equal";
    firstDueDate: string;
    installments: number;
    intervalDays: number;
    categoryId?: string | undefined;
}, {
    condominiumId: string;
    description: string;
    accountId: string;
    totalAmount: number;
    method: "fraction" | "equal";
    firstDueDate: string;
    installments: number;
    intervalDays: number;
    categoryId?: string | undefined;
}>;
export declare const chargeInstallmentsSchema: z.ZodObject<{
    unitId: z.ZodString;
    accountId: z.ZodString;
    categoryId: z.ZodOptional<z.ZodString>;
    description: z.ZodString;
    amount: z.ZodNumber;
    firstDueDate: z.ZodString;
    installments: z.ZodNumber;
    intervalDays: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    unitId: string;
    description: string;
    accountId: string;
    amount: number;
    firstDueDate: string;
    installments: number;
    intervalDays: number;
    categoryId?: string | undefined;
}, {
    unitId: string;
    description: string;
    accountId: string;
    amount: number;
    firstDueDate: string;
    installments: number;
    intervalDays: number;
    categoryId?: string | undefined;
}>;
export type CreateChargeInput = z.infer<typeof createChargeSchema>;
export type UpdateChargeInput = z.infer<typeof updateChargeSchema>;
export type RatioInput = z.infer<typeof ratioSchema>;
export type PayInput = z.infer<typeof paySchema>;
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
//# sourceMappingURL=finance.validation.d.ts.map