import { UserRole, VisitorStatus } from "@prisma/client";
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
type VisitorActor = {
    userId: string;
    role: UserRole;
};
export declare class VisitorService {
    private ensureUnitAccess;
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
            serviceProviderId: string | null;
            scheduledAt: Date | null;
            notes: string | null;
            photoUrl: string | null;
            document: string | null;
            documentType: string | null;
            company: string | null;
            reason: string | null;
            preAuthorizedBy: string | null;
            entryAt: Date | null;
            exitAt: Date | null;
            registeredBy: string | null;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    create(data: CreateVisitorDTO, actor: VisitorActor): Promise<{
        status: import(".prisma/client").$Enums.VisitorStatus;
        id: string;
        createdAt: Date;
        name: string;
        phone: string | null;
        updatedAt: Date;
        unitId: string;
        serviceProviderId: string | null;
        scheduledAt: Date | null;
        notes: string | null;
        photoUrl: string | null;
        document: string | null;
        documentType: string | null;
        company: string | null;
        reason: string | null;
        preAuthorizedBy: string | null;
        entryAt: Date | null;
        exitAt: Date | null;
        registeredBy: string | null;
    }>;
    registerEntry(visitorId: string, registeredBy: string, photoUrl?: string): Promise<{
        status: import(".prisma/client").$Enums.VisitorStatus;
        id: string;
        createdAt: Date;
        name: string;
        phone: string | null;
        updatedAt: Date;
        unitId: string;
        serviceProviderId: string | null;
        scheduledAt: Date | null;
        notes: string | null;
        photoUrl: string | null;
        document: string | null;
        documentType: string | null;
        company: string | null;
        reason: string | null;
        preAuthorizedBy: string | null;
        entryAt: Date | null;
        exitAt: Date | null;
        registeredBy: string | null;
    }>;
    registerExit(visitorId: string, registeredBy: string): Promise<{
        status: import(".prisma/client").$Enums.VisitorStatus;
        id: string;
        createdAt: Date;
        name: string;
        phone: string | null;
        updatedAt: Date;
        unitId: string;
        serviceProviderId: string | null;
        scheduledAt: Date | null;
        notes: string | null;
        photoUrl: string | null;
        document: string | null;
        documentType: string | null;
        company: string | null;
        reason: string | null;
        preAuthorizedBy: string | null;
        entryAt: Date | null;
        exitAt: Date | null;
        registeredBy: string | null;
    }>;
    authorize(visitorId: string, actor: VisitorActor, authorized: boolean): Promise<{
        status: import(".prisma/client").$Enums.VisitorStatus;
        id: string;
        createdAt: Date;
        name: string;
        phone: string | null;
        updatedAt: Date;
        unitId: string;
        serviceProviderId: string | null;
        scheduledAt: Date | null;
        notes: string | null;
        photoUrl: string | null;
        document: string | null;
        documentType: string | null;
        company: string | null;
        reason: string | null;
        preAuthorizedBy: string | null;
        entryAt: Date | null;
        exitAt: Date | null;
        registeredBy: string | null;
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
        serviceProviderId: string | null;
        scheduledAt: Date | null;
        notes: string | null;
        photoUrl: string | null;
        document: string | null;
        documentType: string | null;
        company: string | null;
        reason: string | null;
        preAuthorizedBy: string | null;
        entryAt: Date | null;
        exitAt: Date | null;
        registeredBy: string | null;
    }>;
    update(id: string, data: Partial<Pick<CreateVisitorDTO, "name" | "document" | "documentType" | "phone" | "company" | "reason" | "notes" | "scheduledAt">>): Promise<{
        status: import(".prisma/client").$Enums.VisitorStatus;
        id: string;
        createdAt: Date;
        name: string;
        phone: string | null;
        updatedAt: Date;
        unitId: string;
        serviceProviderId: string | null;
        scheduledAt: Date | null;
        notes: string | null;
        photoUrl: string | null;
        document: string | null;
        documentType: string | null;
        company: string | null;
        reason: string | null;
        preAuthorizedBy: string | null;
        entryAt: Date | null;
        exitAt: Date | null;
        registeredBy: string | null;
    }>;
    historyByUnit(unitId: string, actor: VisitorActor, page?: number, limit?: number): Promise<{
        visitors: {
            status: import(".prisma/client").$Enums.VisitorStatus;
            id: string;
            createdAt: Date;
            name: string;
            phone: string | null;
            updatedAt: Date;
            unitId: string;
            serviceProviderId: string | null;
            scheduledAt: Date | null;
            notes: string | null;
            photoUrl: string | null;
            document: string | null;
            documentType: string | null;
            company: string | null;
            reason: string | null;
            preAuthorizedBy: string | null;
            entryAt: Date | null;
            exitAt: Date | null;
            registeredBy: string | null;
        }[];
        total: number;
        page: number;
        limit: number;
    }>;
}
export declare const visitorService: VisitorService;
export {};
//# sourceMappingURL=visitor.service.d.ts.map