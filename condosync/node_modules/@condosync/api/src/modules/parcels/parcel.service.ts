import { prisma } from "../../config/prisma";
import { ParcelStatus, UserRole } from "@prisma/client";
import { NotificationService } from "../../notifications/notification.service";
import {
  ConflictError,
  ForbiddenError,
  ValidationError,
} from "../../middleware/errorHandler";

type ParcelActor = { userId: string; role: UserRole };

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
  async list(
    condominiumId: string,
    filters: {
      unitId?: string;
      status?: ParcelStatus;
      page?: number;
      limit?: number;
    },
  ) {
    const { page = 1, limit = 20, unitId, status } = filters;

    const [parcels, total] = await prisma.$transaction([
      prisma.parcel.findMany({
        where: {
          unit: { condominiumId },
          ...(unitId && { unitId }),
          ...(status && { status }),
        },
        include: { unit: { select: { identifier: true, block: true } } },
        orderBy: { receivedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.parcel.count({ where: { unit: { condominiumId } } }),
    ]);

    return {
      parcels,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private async ensureParcelAccess(id: string, actor: ParcelActor) {
    const parcel = await prisma.parcel.findUniqueOrThrow({
      where: { id },
      include: { unit: { select: { condominiumId: true } } },
    });
    if (actor.role !== UserRole.SUPER_ADMIN) {
      const membership = await prisma.condominiumUser.findFirst({
        where: {
          userId: actor.userId,
          condominiumId: parcel.unit.condominiumId,
          isActive: true,
        },
      });
      if (!membership)
        throw new ForbiddenError("Acesso negado a esta encomenda");
    }
    return parcel;
  }

  async register(
    data: RegisterParcelDTO,
    registeredBy: string,
    actor: ParcelActor,
  ) {
    const unit = await prisma.unit.findFirst({ where: { id: data.unitId } });
    if (!unit) {
      throw new ValidationError("Unidade inválida", {
        unitId: ["Unidade não encontrada"],
      });
    }
    if (actor.role !== UserRole.SUPER_ADMIN) {
      const membership = await prisma.condominiumUser.findFirst({
        where: {
          userId: actor.userId,
          condominiumId: unit.condominiumId,
          isActive: true,
        },
      });
      if (!membership) throw new ForbiddenError("Acesso negado a esta unidade");
    }
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
          type: "PARCEL",
          title: "Encomenda recebida",
          message: `Nova encomenda ${data.carrier ? `da ${data.carrier}` : ""} aguarda retirada`,
          data: {
            parcelId: parcel.id,
            storageLocation: data.storageLocation,
            trackingCode: data.trackingCode,
          },
          channels: ["inapp", "email"],
        }),
      ),
    );

    return parcel;
  }

  async update(
    id: string,
    actor: ParcelActor,
    data: Partial<Omit<RegisterParcelDTO, "unitId">>,
  ) {
    await this.ensureParcelAccess(id, actor);
    return prisma.parcel.update({
      where: { id },
      data,
    });
  }

  async confirmPickup(
    id: string,
    pickedUpBy: string,
    actor: ParcelActor,
    signature?: string,
  ) {
    const parcel = await this.ensureParcelAccess(id, actor);
    if (
      parcel.status === ParcelStatus.PICKED_UP ||
      parcel.status === ParcelStatus.RETURNED
    ) {
      throw new ConflictError(
        `Encomenda não pode ser retirada com status ${parcel.status}`,
      );
    }
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

  async cancel(id: string, actor: ParcelActor, reason?: string) {
    const parcel = await this.ensureParcelAccess(id, actor);
    if (parcel.status === ParcelStatus.PICKED_UP || parcel.status === ParcelStatus.RETURNED) {
      throw new ConflictError(`Encomenda não pode ser cancelada com status ${parcel.status}`);
    }
    return prisma.parcel.update({
      where: { id },
      data: {
        status: ParcelStatus.RETURNED,
        notes: reason,
      },
    });
  }

  async findById(id: string, actor: ParcelActor) {
    await this.ensureParcelAccess(id, actor);
    return prisma.parcel.findUniqueOrThrow({
      where: { id },
      include: {
        unit: {
          select: { identifier: true, block: true, condominiumId: true },
        },
      },
    });
  }

  async pendingByUnit(unitId: string, actor: ParcelActor) {
    const unit = await prisma.unit.findUniqueOrThrow({ where: { id: unitId } });
    if (actor.role !== UserRole.SUPER_ADMIN) {
      const membership = await prisma.condominiumUser.findFirst({
        where: {
          userId: actor.userId,
          condominiumId: unit.condominiumId,
          isActive: true,
        },
      });
      if (!membership) throw new ForbiddenError("Acesso negado a esta unidade");
    }
    return prisma.parcel.findMany({
      where: {
        unitId,
        status: { in: [ParcelStatus.RECEIVED, ParcelStatus.NOTIFIED] },
      },
      orderBy: { receivedAt: "desc" },
    });
  }
}

export const parcelService = new ParcelService();
