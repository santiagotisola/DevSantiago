import { ParcelStatus } from '@prisma/client';
export interface RegisterParcelDTO {
    unitId: string;
    senderName?: string;
    carrier?: string;
    trackingCode?: string;
    photoUrl?: string;
    storageLocation?: string;
    notes?: string;
}
export declare class ParcelService {
    list(condominiumId: string, filters: {
        unitId?: string;
        status?: ParcelStatus;
        page?: number;
        limit?: number;
    }): Promise<{
        parcels: ({
            unit: {
                identifier: string;
                block: string | null;
            };
        } & {
            status: import(".prisma/client").$Enums.ParcelStatus;
            id: string;
            unitId: string;
            notes: string | null;
            photoUrl: string | null;
            registeredBy: string | null;
            senderName: string | null;
            carrier: string | null;
            trackingCode: string | null;
            storageLocation: string | null;
            receivedAt: Date;
            notifiedAt: Date | null;
            pickedUpAt: Date | null;
            pickedUpBy: string | null;
            pickupSignature: string | null;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    register(data: RegisterParcelDTO, registeredBy: string): Promise<{
        status: import(".prisma/client").$Enums.ParcelStatus;
        id: string;
        unitId: string;
        notes: string | null;
        photoUrl: string | null;
        registeredBy: string | null;
        senderName: string | null;
        carrier: string | null;
        trackingCode: string | null;
        storageLocation: string | null;
        receivedAt: Date;
        notifiedAt: Date | null;
        pickedUpAt: Date | null;
        pickedUpBy: string | null;
        pickupSignature: string | null;
    }>;
    update(id: string, data: Partial<Omit<RegisterParcelDTO, 'unitId'>>): Promise<{
        status: import(".prisma/client").$Enums.ParcelStatus;
        id: string;
        unitId: string;
        notes: string | null;
        photoUrl: string | null;
        registeredBy: string | null;
        senderName: string | null;
        carrier: string | null;
        trackingCode: string | null;
        storageLocation: string | null;
        receivedAt: Date;
        notifiedAt: Date | null;
        pickedUpAt: Date | null;
        pickedUpBy: string | null;
        pickupSignature: string | null;
    }>;
    confirmPickup(id: string, pickedUpBy: string, signature?: string): Promise<{
        status: import(".prisma/client").$Enums.ParcelStatus;
        id: string;
        unitId: string;
        notes: string | null;
        photoUrl: string | null;
        registeredBy: string | null;
        senderName: string | null;
        carrier: string | null;
        trackingCode: string | null;
        storageLocation: string | null;
        receivedAt: Date;
        notifiedAt: Date | null;
        pickedUpAt: Date | null;
        pickedUpBy: string | null;
        pickupSignature: string | null;
    }>;
    cancel(id: string, reason?: string): Promise<{
        status: import(".prisma/client").$Enums.ParcelStatus;
        id: string;
        unitId: string;
        notes: string | null;
        photoUrl: string | null;
        registeredBy: string | null;
        senderName: string | null;
        carrier: string | null;
        trackingCode: string | null;
        storageLocation: string | null;
        receivedAt: Date;
        notifiedAt: Date | null;
        pickedUpAt: Date | null;
        pickedUpBy: string | null;
        pickupSignature: string | null;
    }>;
    findById(id: string): Promise<{
        unit: {
            identifier: string;
            condominiumId: string;
            block: string | null;
        };
    } & {
        status: import(".prisma/client").$Enums.ParcelStatus;
        id: string;
        unitId: string;
        notes: string | null;
        photoUrl: string | null;
        registeredBy: string | null;
        senderName: string | null;
        carrier: string | null;
        trackingCode: string | null;
        storageLocation: string | null;
        receivedAt: Date;
        notifiedAt: Date | null;
        pickedUpAt: Date | null;
        pickedUpBy: string | null;
        pickupSignature: string | null;
    }>;
    pendingByUnit(unitId: string): Promise<{
        status: import(".prisma/client").$Enums.ParcelStatus;
        id: string;
        unitId: string;
        notes: string | null;
        photoUrl: string | null;
        registeredBy: string | null;
        senderName: string | null;
        carrier: string | null;
        trackingCode: string | null;
        storageLocation: string | null;
        receivedAt: Date;
        notifiedAt: Date | null;
        pickedUpAt: Date | null;
        pickedUpBy: string | null;
        pickupSignature: string | null;
    }[]>;
}
export declare const parcelService: ParcelService;
//# sourceMappingURL=parcel.service.d.ts.map