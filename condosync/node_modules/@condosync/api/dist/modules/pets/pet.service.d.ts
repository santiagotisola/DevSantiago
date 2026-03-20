export declare class PetService {
    listByCondominium(condominiumId: string, page?: number, limit?: number): Promise<{
        pets: ({
            unit: {
                identifier: string;
                block: string | null;
            };
        } & {
            type: string;
            id: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            unitId: string;
            notes: string | null;
            birthDate: Date | null;
            photoUrl: string | null;
            color: string | null;
            breed: string | null;
            size: string | null;
            gender: string | null;
            weight: number | null;
            lastVaccination: Date | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    listByUnit(unitId: string): Promise<{
        type: string;
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        unitId: string;
        notes: string | null;
        birthDate: Date | null;
        photoUrl: string | null;
        color: string | null;
        breed: string | null;
        size: string | null;
        gender: string | null;
        weight: number | null;
        lastVaccination: Date | null;
    }[]>;
    getById(id: string): Promise<{
        unit: {
            type: string | null;
            status: import(".prisma/client").$Enums.UnitStatus;
            identifier: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            condominiumId: string;
            block: string | null;
            street: string | null;
            floor: string | null;
            area: number | null;
            bedrooms: number | null;
            fraction: import("@prisma/client/runtime/library").Decimal;
            notes: string | null;
        };
    } & {
        type: string;
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        unitId: string;
        notes: string | null;
        birthDate: Date | null;
        photoUrl: string | null;
        color: string | null;
        breed: string | null;
        size: string | null;
        gender: string | null;
        weight: number | null;
        lastVaccination: Date | null;
    }>;
    create(data: any): Promise<{
        type: string;
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        unitId: string;
        notes: string | null;
        birthDate: Date | null;
        photoUrl: string | null;
        color: string | null;
        breed: string | null;
        size: string | null;
        gender: string | null;
        weight: number | null;
        lastVaccination: Date | null;
    }>;
    update(id: string, data: any): Promise<{
        type: string;
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        unitId: string;
        notes: string | null;
        birthDate: Date | null;
        photoUrl: string | null;
        color: string | null;
        breed: string | null;
        size: string | null;
        gender: string | null;
        weight: number | null;
        lastVaccination: Date | null;
    }>;
    delete(id: string): Promise<{
        type: string;
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        unitId: string;
        notes: string | null;
        birthDate: Date | null;
        photoUrl: string | null;
        color: string | null;
        breed: string | null;
        size: string | null;
        gender: string | null;
        weight: number | null;
        lastVaccination: Date | null;
    }>;
}
export declare const petService: PetService;
//# sourceMappingURL=pet.service.d.ts.map