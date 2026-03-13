import { prisma } from '../../config/prisma';
import { AssemblyStatus } from '@prisma/client';
import { AppError } from '../../middleware/errorHandler';
import { NotificationService } from '../../notifications/notification.service';

export interface CreateAssemblyDTO {
  condominiumId: string;
  title: string;
  description?: string;
  meetingUrl?: string;
  scheduledAt: Date;
  createdBy: string;
  votingItems?: {
    title: string;
    description?: string;
    options: { id: string; text: string }[];
  }[];
}

export class AssemblyService {
  async list(condominiumId: string, page = 1, limit = 20) {
    const [assemblies, total] = await prisma.$transaction([
      prisma.assembly.findMany({
        where: { condominiumId },
        orderBy: { scheduledAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.assembly.count({ where: { condominiumId } }),
    ]);

    return { assemblies, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getById(id: string) {
    return prisma.assembly.findUniqueOrThrow({
      where: { id },
      include: {
        votingItems: {
          include: {
            _count: { select: { votes: true } },
          },
        },
        _count: { select: { attendees: true } },
      },
    });
  }

  async create(data: CreateAssemblyDTO) {
    const { votingItems, ...assemblyData } = data;

    const assembly = await prisma.assembly.create({
      data: {
        ...assemblyData,
        votingItems: {
          create: votingItems?.map((item) => ({
            title: item.title,
            description: item.description,
            options: item.options as any,
          })),
        },
      },
      include: { votingItems: true },
    });

    // Notificar moradores sobre a nova assembleia
    const unitUsers = await prisma.condominiumUser.findMany({
      where: { condominiumId: data.condominiumId },
      select: { userId: true },
    });

    await Promise.all(
      unitUsers.map((u) =>
        NotificationService.enqueue({
          userId: u.userId,
          type: 'ASSEMBLY',
          title: 'Nova Assembleia Agendada',
          message: `Uma nova assembleia "${data.title}" foi agendada para ${data.scheduledAt.toLocaleString('pt-BR')}.`,
          data: { assemblyId: assembly.id },
          channels: ['inapp', 'email'],
        })
      )
    );

    return assembly;
  }

  async updateStatus(id: string, status: AssemblyStatus) {
    const assembly = await prisma.assembly.update({
      where: { id },
      data: {
        status,
        ...(status === AssemblyStatus.IN_PROGRESS && { startedAt: new Date() }),
        ...(status === AssemblyStatus.FINISHED && { finishedAt: new Date() }),
      },
    });

    // Se começou, avisar que está rolando agora
    if (status === AssemblyStatus.IN_PROGRESS) {
      const unitUsers = await prisma.condominiumUser.findMany({
        where: { condominiumId: assembly.condominiumId },
        select: { userId: true },
      });

      await Promise.all(
        unitUsers.map((u) =>
          NotificationService.enqueue({
            userId: u.userId,
            type: 'ASSEMBLY',
            title: 'Assembleia Iniciada',
            message: `A assembleia "${assembly.title}" começou agora. Participe pelo link no sistema.`,
            data: { assemblyId: assembly.id },
            channels: ['inapp'],
          })
        )
      );
    }

    return assembly;
  }

  async vote(votingItemId: string, userId: string, optionId: string) {
    // Verificar se a assembleia está em progresso
    const votingItem = await prisma.assemblyVotingItem.findUniqueOrThrow({
      where: { id: votingItemId },
      include: { assembly: true },
    });

    if (votingItem.assembly.status !== AssemblyStatus.IN_PROGRESS) {
      throw new AppError('Votação só é permitida enquanto a assembleia está em progresso');
    }

    return prisma.assemblyVote.upsert({
      where: {
        votingItemId_userId: { votingItemId, userId },
      },
      update: { optionId, votedAt: new Date() },
      create: { votingItemId, userId, optionId },
    });
  }

  async registerAttendance(assemblyId: string, userId: string) {
    return prisma.assemblyAttendee.upsert({
      where: {
        assemblyId_userId: { assemblyId, userId },
      },
      update: {},
      create: { assemblyId, userId },
    });
  }

  async getVotingResults(assemblyId: string) {
    const items = await prisma.assemblyVotingItem.findMany({
      where: { assemblyId },
      include: {
        votes: true,
      },
    });

    return items.map((item) => {
      const options = item.options as { id: string; text: string }[];
      const results = options.map((opt) => ({
        ...opt,
        votes: item.votes.filter((v) => v.optionId === opt.id).length,
      }));

      return {
        id: item.id,
        title: item.title,
        results,
        totalVotes: item.votes.length,
      };
    });
  }
}

export const assemblyService = new AssemblyService();
