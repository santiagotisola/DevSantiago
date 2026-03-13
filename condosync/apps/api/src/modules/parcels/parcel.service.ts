import { prisma } from '../../config/prisma';
import { ParcelStatus } from '@prisma/client';
import { NotificationService } from '../../notifications/notification.service';

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

export class ParcelService {
  async list(condominiumId: string, filters: {
    unitId?: string;
    status?: ParcelStatus;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 20, unitId, status } = filters;

    const [parcels, total] = await prisma.$transaction([
      prisma.parcel.findMany({
        where: {
          unit: { condominiumId },
          ...(unitId && { unitId }),
          ...(status && { status }),
        },
        include: { unit: { select: { identifier: true, block: true } } },
        orderBy: { receivedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.parcel.count({ where: { unit: { condominiumId } } }),
    ]);

    return { parcels, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async register(data: RegisterParcelDTO, registeredBy: string) {
    const parcel = await prisma.parcel.create({
      data: { ...data, registeredBy, status: ParcelStatus.RECEIVED },
    });

    // Notificar moradores da unidade
    const unitUsers = await prisma.condominiumUser.findMany({
      where: { unitId: data.unitId },
      select: { userId: true },
    });

    await prisma.parcel.update({
      where: { id: parcel.id },
      data: { notifiedAt: new Date() },
    });

    await Promise.all(
      unitUsers.map((u) =>
        NotificationService.enqueue({
          userId: u.userId,
          type: 'PARCEL',
          title: 'Encomenda recebida',
          message: `Nova encomenda ${data.carrier ? `da ${data.carrier}` : ''} aguarda retirada`,
          data: {
            parcelId: parcel.id,
            storageLocation: data.storageLocation,
            trackingCode: data.trackingCode,
          },
          channels: ['inapp', 'email'],
        })
      )
    );

    return parcel;
  }

  async update(id: string, data: Partial<Omit<RegisterParcelDTO, 'unitId'>>) {
    return prisma.parcel.update({
      where: { id },
      data,
    });
  }

  async confirmPickup(id: string, pickedUpBy: string, signature?: string) {
    return prisma.parcel.update({
      where: { id },
      data: {
        status: ParcelStatus.PICKED_UP,
        pickedUpAt: new Date(),
        pickedUpBy,
        pickupSignature: signature,
      },
    });
  }

  async cancel(id: string, reason?: string) {
    return prisma.parcel.update({
      where: { id },
      data: {
        status: ParcelStatus.RETURNED,
        notes: reason,
      },
    });
  }

  async findById(id: string) {
    return prisma.parcel.findUniqueOrThrow({
      where: { id },
      include: { unit: { select: { identifier: true, block: true, condominiumId: true } } },
    });
  }

  async pendingByUnit(unitId: string) {
    return prisma.parcel.findMany({
      where: { unitId, status: { in: [ParcelStatus.RECEIVED, ParcelStatus.NOTIFIED] } },
      orderBy: { receivedAt: 'desc' },
    });
  }
}

export const parcelService = new ParcelService();
