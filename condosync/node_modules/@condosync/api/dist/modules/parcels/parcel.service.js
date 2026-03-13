"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parcelService = exports.ParcelService = void 0;
const prisma_1 = require("../../config/prisma");
const client_1 = require("@prisma/client");
const notification_service_1 = require("../../notifications/notification.service");
class ParcelService {
    async list(condominiumId, filters) {
        const { page = 1, limit = 20, unitId, status } = filters;
        const [parcels, total] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.parcel.findMany({
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
            prisma_1.prisma.parcel.count({ where: { unit: { condominiumId } } }),
        ]);
        return { parcels, total, page, limit, totalPages: Math.ceil(total / limit) };
    }
    async register(data, registeredBy) {
        const parcel = await prisma_1.prisma.parcel.create({
            data: { ...data, registeredBy, status: client_1.ParcelStatus.RECEIVED },
        });
        // Notificar moradores da unidade
        const unitUsers = await prisma_1.prisma.condominiumUser.findMany({
            where: { unitId: data.unitId },
            select: { userId: true },
        });
        await prisma_1.prisma.parcel.update({
            where: { id: parcel.id },
            data: { notifiedAt: new Date() },
        });
        await Promise.all(unitUsers.map((u) => notification_service_1.NotificationService.enqueue({
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
        })));
        return parcel;
    }
    async update(id, data) {
        return prisma_1.prisma.parcel.update({
            where: { id },
            data,
        });
    }
    async confirmPickup(id, pickedUpBy, signature) {
        return prisma_1.prisma.parcel.update({
            where: { id },
            data: {
                status: client_1.ParcelStatus.PICKED_UP,
                pickedUpAt: new Date(),
                pickedUpBy,
                pickupSignature: signature,
            },
        });
    }
    async cancel(id, reason) {
        return prisma_1.prisma.parcel.update({
            where: { id },
            data: {
                status: client_1.ParcelStatus.RETURNED,
                notes: reason,
            },
        });
    }
    async findById(id) {
        return prisma_1.prisma.parcel.findUniqueOrThrow({
            where: { id },
            include: { unit: { select: { identifier: true, block: true, condominiumId: true } } },
        });
    }
    async pendingByUnit(unitId) {
        return prisma_1.prisma.parcel.findMany({
            where: { unitId, status: { in: [client_1.ParcelStatus.RECEIVED, client_1.ParcelStatus.NOTIFIED] } },
            orderBy: { receivedAt: 'desc' },
        });
    }
}
exports.ParcelService = ParcelService;
exports.parcelService = new ParcelService();
//# sourceMappingURL=parcel.service.js.map