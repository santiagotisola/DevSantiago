import { LostAndFoundStatus, UserRole } from '@prisma/client';
type LostActor = {
    userId: string;
    role: UserRole;
};
interface CreateLostAndFoundDTO {
    title: string;
    description?: string;
    category: string;
    place?: string;
    status?: LostAndFoundStatus;
    foundDate?: string | null;
    lostDate?: string | null;
}
interface UpdateLostAndFoundDTO {
    title?: string;
    description?: string;
    category?: string;
    place?: string;
    status?: LostAndFoundStatus;
    returnedTo?: string | null;
    returnedAt?: string | null;
}
export declare class LostAndFoundService {
    private ensureAccess;
    list(condominiumId: string, actor: LostActor, page?: number, limit?: number): Promise<{
        items: {
            status: import(".prisma/client").$Enums.LostAndFoundStatus;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            condominiumId: string;
            title: string;
            description: string | null;
            category: string;
            photoUrl: string | null;
            place: string | null;
            foundDate: Date | null;
            lostDate: Date | null;
            returnedAt: Date | null;
            returnedTo: string | null;
            createdById: string;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getById(id: string, actor: LostActor): Promise<{
        createdBy: {
            name: string;
        };
    } & {
        status: import(".prisma/client").$Enums.LostAndFoundStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        condominiumId: string;
        title: string;
        description: string | null;
        category: string;
        photoUrl: string | null;
        place: string | null;
        foundDate: Date | null;
        lostDate: Date | null;
        returnedAt: Date | null;
        returnedTo: string | null;
        createdById: string;
    }>;
    create(data: CreateLostAndFoundDTO, createdById: string, condominiumId: string): Promise<{
        status: import(".prisma/client").$Enums.LostAndFoundStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        condominiumId: string;
        title: string;
        description: string | null;
        category: string;
        photoUrl: string | null;
        place: string | null;
        foundDate: Date | null;
        lostDate: Date | null;
        returnedAt: Date | null;
        returnedTo: string | null;
        createdById: string;
    }>;
    update(id: string, data: UpdateLostAndFoundDTO, actor: LostActor): Promise<{
        status: import(".prisma/client").$Enums.LostAndFoundStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        condominiumId: string;
        title: string;
        description: string | null;
        category: string;
        photoUrl: string | null;
        place: string | null;
        foundDate: Date | null;
        lostDate: Date | null;
        returnedAt: Date | null;
        returnedTo: string | null;
        createdById: string;
    }>;
    delete(id: string, actor: LostActor): Promise<{
        status: import(".prisma/client").$Enums.LostAndFoundStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        condominiumId: string;
        title: string;
        description: string | null;
        category: string;
        photoUrl: string | null;
        place: string | null;
        foundDate: Date | null;
        lostDate: Date | null;
        returnedAt: Date | null;
        returnedTo: string | null;
        createdById: string;
    }>;
}
export declare const lostAndFoundService: LostAndFoundService;
export {};
//# sourceMappingURL=lost-and-found.service.d.ts.map