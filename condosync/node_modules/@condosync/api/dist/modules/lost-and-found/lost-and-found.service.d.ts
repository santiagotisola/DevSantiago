export declare class LostAndFoundService {
    list(condominiumId: string, page?: number, limit?: number): Promise<{
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
    getById(id: string): Promise<{
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
    create(data: any, createdById: string, condominiumId: string): Promise<{
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
    update(id: string, data: any): Promise<{
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
    delete(id: string): Promise<{
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
//# sourceMappingURL=lost-and-found.service.d.ts.map