import { z } from 'zod';
export declare const createPetSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodString;
        type: z.ZodString;
        breed: z.ZodOptional<z.ZodString>;
        size: z.ZodOptional<z.ZodString>;
        gender: z.ZodOptional<z.ZodString>;
        birthDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        color: z.ZodOptional<z.ZodString>;
        weight: z.ZodOptional<z.ZodNumber>;
        lastVaccination: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        notes: z.ZodOptional<z.ZodString>;
        unitId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: string;
        name: string;
        unitId: string;
        notes?: string | undefined;
        birthDate?: string | null | undefined;
        color?: string | undefined;
        breed?: string | undefined;
        size?: string | undefined;
        gender?: string | undefined;
        weight?: number | undefined;
        lastVaccination?: string | null | undefined;
    }, {
        type: string;
        name: string;
        unitId: string;
        notes?: string | undefined;
        birthDate?: string | null | undefined;
        color?: string | undefined;
        breed?: string | undefined;
        size?: string | undefined;
        gender?: string | undefined;
        weight?: number | undefined;
        lastVaccination?: string | null | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        type: string;
        name: string;
        unitId: string;
        notes?: string | undefined;
        birthDate?: string | null | undefined;
        color?: string | undefined;
        breed?: string | undefined;
        size?: string | undefined;
        gender?: string | undefined;
        weight?: number | undefined;
        lastVaccination?: string | null | undefined;
    };
}, {
    body: {
        type: string;
        name: string;
        unitId: string;
        notes?: string | undefined;
        birthDate?: string | null | undefined;
        color?: string | undefined;
        breed?: string | undefined;
        size?: string | undefined;
        gender?: string | undefined;
        weight?: number | undefined;
        lastVaccination?: string | null | undefined;
    };
}>;
export declare const updatePetSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        type: z.ZodOptional<z.ZodString>;
        breed: z.ZodOptional<z.ZodString>;
        size: z.ZodOptional<z.ZodString>;
        gender: z.ZodOptional<z.ZodString>;
        birthDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        color: z.ZodOptional<z.ZodString>;
        weight: z.ZodOptional<z.ZodNumber>;
        lastVaccination: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        notes: z.ZodOptional<z.ZodString>;
        unitId: z.ZodOptional<z.ZodString>;
        isActive: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        type?: string | undefined;
        name?: string | undefined;
        isActive?: boolean | undefined;
        unitId?: string | undefined;
        notes?: string | undefined;
        birthDate?: string | null | undefined;
        color?: string | undefined;
        breed?: string | undefined;
        size?: string | undefined;
        gender?: string | undefined;
        weight?: number | undefined;
        lastVaccination?: string | null | undefined;
    }, {
        type?: string | undefined;
        name?: string | undefined;
        isActive?: boolean | undefined;
        unitId?: string | undefined;
        notes?: string | undefined;
        birthDate?: string | null | undefined;
        color?: string | undefined;
        breed?: string | undefined;
        size?: string | undefined;
        gender?: string | undefined;
        weight?: number | undefined;
        lastVaccination?: string | null | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        type?: string | undefined;
        name?: string | undefined;
        isActive?: boolean | undefined;
        unitId?: string | undefined;
        notes?: string | undefined;
        birthDate?: string | null | undefined;
        color?: string | undefined;
        breed?: string | undefined;
        size?: string | undefined;
        gender?: string | undefined;
        weight?: number | undefined;
        lastVaccination?: string | null | undefined;
    };
}, {
    body: {
        type?: string | undefined;
        name?: string | undefined;
        isActive?: boolean | undefined;
        unitId?: string | undefined;
        notes?: string | undefined;
        birthDate?: string | null | undefined;
        color?: string | undefined;
        breed?: string | undefined;
        size?: string | undefined;
        gender?: string | undefined;
        weight?: number | undefined;
        lastVaccination?: string | null | undefined;
    };
}>;
//# sourceMappingURL=pet.validation.d.ts.map