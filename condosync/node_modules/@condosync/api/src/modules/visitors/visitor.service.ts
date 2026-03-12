import { prisma } from '../../config/prisma';
import { NotFoundError, ForbiddenError } from '../../middleware/errorHandler';
import { VisitorStatus } from '@prisma/client';
import { NotificationService } from '../../notifications/notification.service';

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

export class VisitorService {
  async list(condominiumId: string, filters: {
    unitId?: string;
    status?: VisitorStatus;
    date?: string;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 20, ...where } = filters;

    const [visitors, total] = await prisma.$transaction([
      prisma.visitor.findMany({
        where: {
          unit: { condominiumId },
          ...(where.unitId && { unitId: where.unitId }),
          ...(where.status && { status: where.status }),
          ...(where.date && {
            createdAt: {
              gte: new Date(`${where.date}T00:00:00`),
              lte: new Date(`${where.date}T23:59:59`),
            },
          }),
        },
        include: { unit: { select: { identifier: true, block: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.visitor.count({
        where: { unit: { condominiumId }, ...(where.unitId && { unitId: where.unitId }) },
      }),
    ]);

    return { visitors, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async create(data: CreateVisitorDTO, authorizedBy?: string) {
    const unit = await prisma.unit.findUniqueOrThrow({ where: { id: data.unitId } });

    const visitor = await prisma.visitor.create({
      data: {
        ...data,
        preAuthorizedBy: authorizedBy,
        status: authorizedBy ? VisitorStatus.AUTHORIZED : VisitorStatus.PENDING,
      },
    });

    // Notificar morador
    if (authorizedBy) {
      await NotificationService.enqueue({
        userId: authorizedBy,
        type: 'VISITOR',
        title: 'Visitante pré-autorizado',
        message: `${data.name} foi pré-autorizado para sua unidade`,
        data: { visitorId: visitor.id },
        channels: ['inapp', 'email'],
      });
    }

    return visitor;
  }

  async registerEntry(visitorId: string, registeredBy: string, photoUrl?: string) {
    const visitor = await prisma.visitor.findUniqueOrThrow({ where: { id: visitorId } });

    if (visitor.status === VisitorStatus.INSIDE) {
      throw new ForbiddenError('Visitante já está dentro do condomínio');
    }

    const updated = await prisma.visitor.update({
      where: { id: visitorId },
      data: {
        status: VisitorStatus.INSIDE,
        entryAt: new Date(),
        registeredBy,
        ...(photoUrl && { photoUrl }),
      },
    });

    // Notificar morador da unidade
    const unitUsers = await prisma.condominiumUser.findMany({
      where: { unitId: visitor.unitId },
      select: { userId: true },
    });

    await Promise.all(
      unitUsers.map((u) =>
        NotificationService.enqueue({
          userId: u.userId,
          type: 'VISITOR',
          title: 'Visitante chegou',
          message: `${visitor.name} entrou no condomínio`,
          data: { visitorId: visitor.id },
          channels: ['inapp', 'email'],
        })
      )
    );

    return updated;
  }

  async registerExit(visitorId: string, registeredBy: string) {
    const visitor = await prisma.visitor.findUniqueOrThrow({ where: { id: visitorId } });

    return prisma.visitor.update({
      where: { id: visitorId },
      data: { status: VisitorStatus.LEFT, exitAt: new Date(), registeredBy },
    });
  }

  async authorize(visitorId: string, userId: string, authorized: boolean) {
    return prisma.visitor.update({
      where: { id: visitorId },
      data: {
        status: authorized ? VisitorStatus.AUTHORIZED : VisitorStatus.DENIED,
        preAuthorizedBy: userId,
      },
    });
  }

  async findById(id: string) {
    return prisma.visitor.findUniqueOrThrow({
      where: { id },
      include: { unit: { select: { identifier: true, block: true, condominiumId: true } } },
    });
  }

  async historyByUnit(unitId: string, page = 1, limit = 20) {
    const [visitors, total] = await prisma.$transaction([
      prisma.visitor.findMany({
        where: { unitId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.visitor.count({ where: { unitId } }),
    ]);
    return { visitors, total, page, limit };
  }
}

export const visitorService = new VisitorService();
