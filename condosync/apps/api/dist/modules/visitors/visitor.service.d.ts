import { VisitorStatus } from '@prisma/client';
export interface CreateVisitorDTO {
    unitId: string;
    name: string;
    document?: string;
    documentType?: string;
    phone?: string;
    company?: string;
    reason?: string;
    scheduledAt?: Date;
    notes?: string;
}
export declare class VisitorService {
    list(condominiumId: string, filters: {
        unitId?: string;
        status?: VisitorStatus;
        date?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        visitors: ({
            unit: {
                identifier: string;
                block: string | null;
            };
        } & {
            status: import(".prisma/client").$Enums.VisitorStatus;
            id: string;
            createdAt: Date;
            name: string;
            phone: string | null;
            updatedAt: Date;
            unitId: string;
            notes: string | null;
            photoUrl: string | null;
            document: string | null;
            documentType: string | null;
            company: string | null;
            reason: string | null;
            preAuthorizedBy: string | null;
            scheduledAt: Date | null;
            entryAt: Date | null;
            exitAt: Date | null;
            registeredBy: string | null;
            serviceProviderId: string | null;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    create(data: CreateVisitorDTO, authorizedBy?: string): Promise<{
        status: import(".prisma/client").$Enums.VisitorStatus;
        id: string;
        createdAt: Date;
        name: string;
        phone: string | null;
        updatedAt: Date;
        unitId: string;
        notes: string | null;
        photoUrl: string | null;
        document: string | null;
        documentType: string | null;
        company: string | null;
        reason: string | null;
        preAuthorizedBy: string | null;
        scheduledAt: Date | null;
        entryAt: Date | null;
        exitAt: Date | null;
        registeredBy: string | null;
        serviceProviderId: string | null;
    }>;
    registerEntry(visitorId: string, registeredBy: string, photoUrl?: string): Promise<{
        status: import(".prisma/client").$Enums.VisitorStatus;
        id: string;
        createdAt: Date;
        name: string;
        phone: string | null;
        updatedAt: Date;
        unitId: string;
        notes: string | null;
        photoUrl: string | null;
        document: string | null;
        documentType: string | null;
        company: string | null;
        reason: string | null;
        preAuthorizedBy: string | null;
        scheduledAt: Date | null;
        entryAt: Date | null;
        exitAt: Date | null;
        registeredBy: string | null;
        serviceProviderId: string | null;
    }>;
    registerExit(visitorId: string, registeredBy: string): Promise<{
        status: import(".prisma/client").$Enums.VisitorStatus;
        id: string;
        createdAt: Date;
        name: string;
        phone: string | null;
        updatedAt: Date;
        unitId: string;
        notes: string | null;
        photoUrl: string | null;
        document: string | null;
        documentType: string | null;
        company: string | null;
        reason: string | null;
        preAuthorizedBy: string | null;
        scheduledAt: Date | null;
        entryAt: Date | null;
        exitAt: Date | null;
        registeredBy: string | null;
        serviceProviderId: string | null;
    }>;
    authorize(visitorId: string, userId: string, authorized: boolean): Promise<{
        status: import(".prisma/client").$Enums.VisitorStatus;
        id: string;
        createdAt: Date;
        name: string;
        phone: string | null;
        updatedAt: Date;
        unitId: string;
        notes: string | null;
        photoUrl: string | null;
        document: string | null;
        documentType: string | null;
        company: string | null;
        reason: string | null;
        preAuthorizedBy: string | null;
        scheduledAt: Date | null;
        entryAt: Date | null;
        exitAt: Date | null;
        registeredBy: string | null;
        serviceProviderId: string | null;
    }>;
    findById(id: string): Promise<{
        unit: {
            identifier: string;
            condominiumId: string;
            block: string | null;
        };
    } & {
        status: import(".prisma/client").$Enums.VisitorStatus;
        id: string;
        createdAt: Date;
        name: string;
        phone: string | null;
        updatedAt: Date;
        unitId: string;
        notes: string | null;
        photoUrl: string | null;
        document: string | null;
        documentType: string | null;
        company: string | null;
        reason: string | null;
        preAuthorizedBy: string | null;
        scheduledAt: Date | null;
        entryAt: Date | null;
        exitAt: Date | null;
        registeredBy: string | null;
        serviceProviderId: string | null;
    }>;
    historyByUnit(unitId: string, page?: number, limit?: number): Promise<{
        visitors: {
            status: import(".prisma/client").$Enums.VisitorStatus;
            id: string;
            createdAt: Date;
            name: string;
            phone: string | null;
            updatedAt: Date;
            unitId: string;
            notes: string | null;
            photoUrl: string | null;
            document: string | null;
            documentType: string | null;
            company: string | null;
            reason: string | null;
            preAuthorizedBy: string | null;
            scheduledAt: Date | null;
            entryAt: Date | null;
            exitAt: Date | null;
            registeredBy: string | null;
            serviceProviderId: string | null;
        }[];
        total: number;
        page: number;
        limit: number;
    }>;
}
export declare const visitorService: VisitorService;
//# sourceMappingURL=visitor.service.d.ts.map