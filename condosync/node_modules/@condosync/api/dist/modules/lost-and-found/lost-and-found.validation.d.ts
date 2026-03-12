import { z } from 'zod';
export declare const createLostAndFoundSchema: z.ZodObject<{
    body: z.ZodObject<{
        title: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        category: z.ZodString;
        place: z.ZodOptional<z.ZodString>;
        status: z.ZodDefault<z.ZodNativeEnum<{
            LOST: "LOST";
            FOUND: "FOUND";
            RETURNED: "RETURNED";
            DISCARDED: "DISCARDED";
        }>>;
        foundDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        lostDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        status: "RETURNED" | "LOST" | "FOUND" | "DISCARDED";
        title: string;
        category: string;
        description?: string | undefined;
        place?: string | undefined;
        foundDate?: string | null | undefined;
        lostDate?: string | null | undefined;
    }, {
        title: string;
        category: string;
        status?: "RETURNED" | "LOST" | "FOUND" | "DISCARDED" | undefined;
        description?: string | undefined;
        place?: string | undefined;
        foundDate?: string | null | undefined;
        lostDate?: string | null | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        status: "RETURNED" | "LOST" | "FOUND" | "DISCARDED";
        title: string;
        category: string;
        description?: string | undefined;
        place?: string | undefined;
        foundDate?: string | null | undefined;
        lostDate?: string | null | undefined;
    };
}, {
    body: {
        title: string;
        category: string;
        status?: "RETURNED" | "LOST" | "FOUND" | "DISCARDED" | undefined;
        description?: string | undefined;
        place?: string | undefined;
        foundDate?: string | null | undefined;
        lostDate?: string | null | undefined;
    };
}>;
export declare const updateLostAndFoundSchema: z.ZodObject<{
    body: z.ZodObject<{
        title: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        category: z.ZodOptional<z.ZodString>;
        place: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodNativeEnum<{
            LOST: "LOST";
            FOUND: "FOUND";
            RETURNED: "RETURNED";
            DISCARDED: "DISCARDED";
        }>>;
        returnedTo: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        returnedAt: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        status?: "RETURNED" | "LOST" | "FOUND" | "DISCARDED" | undefined;
        title?: string | undefined;
        description?: string | undefined;
        category?: string | undefined;
        place?: string | undefined;
        returnedAt?: string | null | undefined;
        returnedTo?: string | null | undefined;
    }, {
        status?: "RETURNED" | "LOST" | "FOUND" | "DISCARDED" | undefined;
        title?: string | undefined;
        description?: string | undefined;
        category?: string | undefined;
        place?: string | undefined;
        returnedAt?: string | null | undefined;
        returnedTo?: string | null | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        status?: "RETURNED" | "LOST" | "FOUND" | "DISCARDED" | undefined;
        title?: string | undefined;
        description?: string | undefined;
        category?: string | undefined;
        place?: string | undefined;
        returnedAt?: string | null | undefined;
        returnedTo?: string | null | undefined;
    };
}, {
    body: {
        status?: "RETURNED" | "LOST" | "FOUND" | "DISCARDED" | undefined;
        title?: string | undefined;
        description?: string | undefined;
        category?: string | undefined;
        place?: string | undefined;
        returnedAt?: string | null | undefined;
        returnedTo?: string | null | undefined;
    };
}>;
//# sourceMappingURL=lost-and-found.validation.d.ts.map