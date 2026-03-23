import { ParcelStatus, UserRole } from "@prisma/client";
type ParcelActor = {
    userId: string;
    role: UserRole;
};
export interface RegisterParcelDTO {
    unitId: string;
    senderName?: string;
    carrier?: string;
    trackingCode?: string;
    photoUrl?: string;
    storageLocation?: string;
    deliveryPersonName?: string;
    deliveryPersonDoc?: string;
    vehiclePlate?: string;
    hasPackageDamage?: boolean;
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
            deliveryPersonName: string | null;
            deliveryPersonDoc: string | null;
            vehiclePlate: string | null;
            hasPackageDamage: boolean;
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
    private ensureParcelAccess;
    register(data: RegisterParcelDTO, registeredBy: string, actor: ParcelActor): Promise<{
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
        deliveryPersonName: string | null;
        deliveryPersonDoc: string | null;
        vehiclePlate: string | null;
        hasPackageDamage: boolean;
        receivedAt: Date;
        notifiedAt: Date | null;
        pickedUpAt: Date | null;
        pickedUpBy: string | null;
        pickupSignature: string | null;
    }>;
    update(id: string, actor: ParcelActor, data: Partial<Omit<RegisterParcelDTO, "unitId">>): Promise<{
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
        deliveryPersonName: string | null;
        deliveryPersonDoc: string | null;
        vehiclePlate: string | null;
        hasPackageDamage: boolean;
        receivedAt: Date;
        notifiedAt: Date | null;
        pickedUpAt: Date | null;
        pickedUpBy: string | null;
        pickupSignature: string | null;
    }>;
    confirmPickup(id: string, pickedUpBy: string, actor: ParcelActor, signature?: string): Promise<{
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
        deliveryPersonName: string | null;
        deliveryPersonDoc: string | null;
        vehiclePlate: string | null;
        hasPackageDamage: boolean;
        receivedAt: Date;
        notifiedAt: Date | null;
        pickedUpAt: Date | null;
        pickedUpBy: string | null;
        pickupSignature: string | null;
    }>;
    cancel(id: string, actor: ParcelActor, reason?: string): Promise<{
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
        deliveryPersonName: string | null;
        deliveryPersonDoc: string | null;
        vehiclePlate: string | null;
        hasPackageDamage: boolean;
        receivedAt: Date;
        notifiedAt: Date | null;
        pickedUpAt: Date | null;
        pickedUpBy: string | null;
        pickupSignature: string | null;
    }>;
    findById(id: string, actor: ParcelActor): Promise<{
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
        deliveryPersonName: string | null;
        deliveryPersonDoc: string | null;
        vehiclePlate: string | null;
        hasPackageDamage: boolean;
        receivedAt: Date;
        notifiedAt: Date | null;
        pickedUpAt: Date | null;
        pickedUpBy: string | null;
        pickupSignature: string | null;
    }>;
    pendingByUnit(unitId: string, actor: ParcelActor): Promise<{
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
        deliveryPersonName: string | null;
        deliveryPersonDoc: string | null;
        vehiclePlate: string | null;
        hasPackageDamage: boolean;
        receivedAt: Date;
        notifiedAt: Date | null;
        pickedUpAt: Date | null;
        pickedUpBy: string | null;
        pickupSignature: string | null;
    }[]>;
}
export declare const parcelService: ParcelService;
export {};
//# sourceMappingURL=parcel.service.d.ts.map