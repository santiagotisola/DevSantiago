import { AssemblyStatus } from '@prisma/client';
export interface CreateAssemblyDTO {
    condominiumId: string;
    title: string;
    description?: string;
    meetingUrl?: string;
    scheduledAt: Date;
    createdBy: string;
    votingItems?: {
        title: string;
        description?: string;
        options: {
            id: string;
            text: string;
        }[];
    }[];
}
export declare class AssemblyService {
    list(condominiumId: string, page?: number, limit?: number): Promise<{
        assemblies: {
            status: import(".prisma/client").$Enums.AssemblyStatus;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            condominiumId: string;
            title: string;
            description: string | null;
            scheduledAt: Date;
            startedAt: Date | null;
            createdBy: string;
            meetingUrl: string | null;
            finishedAt: Date | null;
            minutesUrl: string | null;
        }[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getById(id: string): Promise<{
        _count: {
            attendees: number;
        };
        votingItems: ({
            _count: {
                votes: number;
            };
        } & {
            options: import("@prisma/client/runtime/library").JsonValue;
            id: string;
            title: string;
            description: string | null;
            assemblyId: string;
        })[];
    } & {
        status: import(".prisma/client").$Enums.AssemblyStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        condominiumId: string;
        title: string;
        description: string | null;
        scheduledAt: Date;
        startedAt: Date | null;
        createdBy: string;
        meetingUrl: string | null;
        finishedAt: Date | null;
        minutesUrl: string | null;
    }>;
    create(data: CreateAssemblyDTO): Promise<{
        votingItems: {
            options: import("@prisma/client/runtime/library").JsonValue;
            id: string;
            title: string;
            description: string | null;
            assemblyId: string;
        }[];
    } & {
        status: import(".prisma/client").$Enums.AssemblyStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        condominiumId: string;
        title: string;
        description: string | null;
        scheduledAt: Date;
        startedAt: Date | null;
        createdBy: string;
        meetingUrl: string | null;
        finishedAt: Date | null;
        minutesUrl: string | null;
    }>;
    updateStatus(id: string, status: AssemblyStatus): Promise<{
        status: import(".prisma/client").$Enums.AssemblyStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        condominiumId: string;
        title: string;
        description: string | null;
        scheduledAt: Date;
        startedAt: Date | null;
        createdBy: string;
        meetingUrl: string | null;
        finishedAt: Date | null;
        minutesUrl: string | null;
    }>;
    vote(votingItemId: string, userId: string, optionId: string): Promise<{
        id: string;
        userId: string;
        votedAt: Date;
        optionId: string;
        votingItemId: string;
    }>;
    registerAttendance(assemblyId: string, userId: string): Promise<{
        id: string;
        userId: string;
        joinedAt: Date;
        assemblyId: string;
        leftAt: Date | null;
    }>;
    getVotingResults(assemblyId: string): Promise<{
        id: string;
        title: string;
        results: {
            votes: number;
            id: string;
            text: string;
        }[];
        totalVotes: number;
    }[]>;
}
export declare const assemblyService: AssemblyService;
//# sourceMappingURL=assembly.service.d.ts.map