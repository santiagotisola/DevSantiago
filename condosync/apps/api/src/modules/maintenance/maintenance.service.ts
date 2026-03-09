import { prisma } from '../../config/prisma';
import { ServiceOrderStatus, ServiceOrderPriority } from '@prisma/client';

export interface CreateServiceOrderDTO {
  condominiumId: string;
  unitId?: string;
  title: string;
  description: string;
  category: string;
  location?: string;
  priority?: ServiceOrderPriority;
  photoUrls?: string[];
  estimatedCost?: number;
  scheduledAt?: Date;
}

export class MaintenanceService {
  async listOrders(condominiumId: string, filters: {
    status?: ServiceOrderStatus;
    priority?: ServiceOrderPriority;
    category?: string;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 20, ...where } = filters;

    const [orders, total] = await prisma.$transaction([
      prisma.serviceOrder.findMany({
        where: {
          condominiumId,
          ...(where.status && { status: where.status }),
          ...(where.priority && { priority: where.priority }),
          ...(where.category && { category: where.category }),
        },
        include: {
          unit: { select: { identifier: true, block: true } },
          serviceProvider: { select: { name: true, serviceType: true } },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.serviceOrder.count({ where: { condominiumId } }),
    ]);

    return { orders, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async create(data: CreateServiceOrderDTO, requestedBy: string) {
    return prisma.serviceOrder.create({
      data: { ...data, requestedBy, status: ServiceOrderStatus.OPEN },
    });
  }

  async updateStatus(id: string, status: ServiceOrderStatus, extra?: {
    resolution?: string;
    finalCost?: number;
    rating?: number;
    feedback?: string;
  }) {
    const updates: Record<string, unknown> = { status };
    if (status === ServiceOrderStatus.IN_PROGRESS) updates.startedAt = new Date();
    if (status === ServiceOrderStatus.COMPLETED) updates.completedAt = new Date();
    if (extra) Object.assign(updates, extra);
    return prisma.serviceOrder.update({ where: { id }, data: updates });
  }

  async assign(id: string, serviceProviderId?: string, assignedTo?: string) {
    return prisma.serviceOrder.update({
      where: { id },
      data: { serviceProviderId, assignedTo, status: ServiceOrderStatus.IN_PROGRESS, startedAt: new Date() },
    });
  }

  async listSchedules(condominiumId: string) {
    const today = new Date();
    return prisma.maintenanceSchedule.findMany({
      where: { condominiumId, isActive: true },
      orderBy: { nextDueDate: 'asc' },
    });
  }

  async findById(id: string) {
    return prisma.serviceOrder.findUniqueOrThrow({
      where: { id },
      include: {
        unit: true,
        serviceProvider: true,
        checklistItems: true,
      },
    });
  }
}

export const maintenanceService = new MaintenanceService();
