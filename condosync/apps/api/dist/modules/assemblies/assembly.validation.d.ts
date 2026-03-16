import { z } from 'zod';
export declare const createAssemblySchema: z.ZodObject<{
    body: z.ZodObject<{
        title: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        meetingUrl: z.ZodOptional<z.ZodString>;
        scheduledAt: z.ZodString;
        votingItems: z.ZodOptional<z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            options: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                text: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                text: string;
                id: string;
            }, {
                text: string;
                id: string;
            }>, "many">;
        }, "strip", z.ZodTypeAny, {
            options: {
                text: string;
                id: string;
            }[];
            title: string;
            description?: string | undefined;
        }, {
            options: {
                text: string;
                id: string;
            }[];
            title: string;
            description?: string | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        scheduledAt: string;
        description?: string | undefined;
        votingItems?: {
            options: {
                text: string;
                id: string;
            }[];
            title: string;
            description?: string | undefined;
        }[] | undefined;
        meetingUrl?: string | undefined;
    }, {
        title: string;
        scheduledAt: string;
        description?: string | undefined;
        votingItems?: {
            options: {
                text: string;
                id: string;
            }[];
            title: string;
            description?: string | undefined;
        }[] | undefined;
        meetingUrl?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        title: string;
        scheduledAt: string;
        description?: string | undefined;
        votingItems?: {
            options: {
                text: string;
                id: string;
            }[];
            title: string;
            description?: string | undefined;
        }[] | undefined;
        meetingUrl?: string | undefined;
    };
}, {
    body: {
        title: string;
        scheduledAt: string;
        description?: string | undefined;
        votingItems?: {
            options: {
                text: string;
                id: string;
            }[];
            title: string;
            description?: string | undefined;
        }[] | undefined;
        meetingUrl?: string | undefined;
    };
}>;
export declare const updateAssemblyStatusSchema: z.ZodObject<{
    body: z.ZodObject<{
        status: z.ZodNativeEnum<{
            SCHEDULED: "SCHEDULED";
            IN_PROGRESS: "IN_PROGRESS";
            FINISHED: "FINISHED";
            CANCELED: "CANCELED";
        }>;
    }, "strip", z.ZodTypeAny, {
        status: "IN_PROGRESS" | "CANCELED" | "SCHEDULED" | "FINISHED";
    }, {
        status: "IN_PROGRESS" | "CANCELED" | "SCHEDULED" | "FINISHED";
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        status: "IN_PROGRESS" | "CANCELED" | "SCHEDULED" | "FINISHED";
    };
}, {
    body: {
        status: "IN_PROGRESS" | "CANCELED" | "SCHEDULED" | "FINISHED";
    };
}>;
export declare const voteAssemblySchema: z.ZodObject<{
    body: z.ZodObject<{
        optionId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        optionId: string;
    }, {
        optionId: string;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        optionId: string;
    };
}, {
    body: {
        optionId: string;
    };
}>;
//# sourceMappingURL=assembly.validation.d.ts.map