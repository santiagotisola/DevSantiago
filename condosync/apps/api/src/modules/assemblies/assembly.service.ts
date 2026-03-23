import { prisma } from "../../config/prisma";
import { AssemblyStatus, UserRole } from "@prisma/client";
import { AppError, ForbiddenError } from "../../middleware/errorHandler";
import { NotificationService } from "../../notifications/notification.service";

type AssemblyActor = { userId: string; role: UserRole };

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

// Valid status transitions: SCHEDULED → IN_PROGRESS → FINISHED
const VALID_TRANSITIONS: Record<AssemblyStatus, AssemblyStatus[]> = {
  [AssemblyStatus.SCHEDULED]: [AssemblyStatus.IN_PROGRESS],
  [AssemblyStatus.IN_PROGRESS]: [AssemblyStatus.FINISHED],
  [AssemblyStatus.FINISHED]: [],
  [AssemblyStatus.CANCELED]: [],
};

export class AssemblyService {
  private async ensureAssemblyAccess(assemblyId: string, actor: AssemblyActor) {
    const assembly = await prisma.assembly.findUniqueOrThrow({
      where: { id: assemblyId },
      select: { id: true, condominiumId: true },
    });
    if (actor.role !== UserRole.SUPER_ADMIN) {
      const membership = await prisma.condominiumUser.findFirst({
        where: {
          userId: actor.userId,
          condominiumId: assembly.condominiumId,
          isActive: true,
        },
        select: { id: true },
      });
      if (!membership)
        throw new ForbiddenError("Acesso negado a esta assembleia");
    }
    return assembly;
  }

  async list(condominiumId: string, page = 1, limit = 20) {
    const [assemblies, total] = await prisma.$transaction([
      prisma.assembly.findMany({
        where: { condominiumId },
        orderBy: { scheduledAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.assembly.count({ where: { condominiumId } }),
    ]);

    return {
      assemblies,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getById(id: string, actor: AssemblyActor) {
    await this.ensureAssemblyAccess(id, actor);
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

  async create(data: CreateAssemblyDTO, actor: AssemblyActor) {
    // Verify actor is a member of the condominium
    if (actor.role !== UserRole.SUPER_ADMIN) {
      const membership = await prisma.condominiumUser.findFirst({
        where: {
          userId: actor.userId,
          condominiumId: data.condominiumId,
          isActive: true,
        },
        select: { id: true },
      });
      if (!membership)
        throw new ForbiddenError("Acesso negado a este condomínio");
    }

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
          type: "ASSEMBLY",
          title: "Nova Assembleia Agendada",
          message: `Uma nova assembleia "${data.title}" foi agendada para ${data.scheduledAt.toLocaleString("pt-BR")}.`,
          data: { assemblyId: assembly.id },
          channels: ["inapp", "email"],
        }),
      ),
    );

    return assembly;
  }

  async updateStatus(id: string, status: AssemblyStatus, actor: AssemblyActor) {
    await this.ensureAssemblyAccess(id, actor);

    const current = await prisma.assembly.findUniqueOrThrow({
      where: { id },
      select: { status: true },
    });

    const allowed = VALID_TRANSITIONS[current.status];
    if (!allowed.includes(status)) {
      throw new AppError(
        `Transição inválida: ${current.status} → ${status}. Transições permitidas: ${allowed.join(", ") || "nenhuma"}`,
        400,
      );
    }

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
            type: "ASSEMBLY",
            title: "Assembleia Iniciada",
            message: `A assembleia "${assembly.title}" começou agora. Participe pelo link no sistema.`,
            data: { assemblyId: assembly.id },
            channels: ["inapp"],
          }),
        ),
      );
    }

    return assembly;
  }

  async vote(
    votingItemId: string,
    userId: string,
    optionId: string,
    actor: AssemblyActor,
  ) {
    // Verificar se a assembleia está em progresso
    const votingItem = await prisma.assemblyVotingItem.findUniqueOrThrow({
      where: { id: votingItemId },
      include: { assembly: true },
    });

    if (votingItem.assembly.status !== AssemblyStatus.IN_PROGRESS) {
      throw new AppError(
        "Votação só é permitida enquanto a assembleia está em progresso",
      );
    }

    // Verificar membership do votante [A4]
    await this.ensureAssemblyAccess(votingItem.assemblyId, actor);

    return prisma.assemblyVote.upsert({
      where: {
        votingItemId_userId: { votingItemId, userId },
      },
      update: { optionId, votedAt: new Date() },
      create: { votingItemId, userId, optionId },
    });
  }

  async registerAttendance(
    assemblyId: string,
    userId: string,
    actor: AssemblyActor,
  ) {
    await this.ensureAssemblyAccess(assemblyId, actor);
    return prisma.assemblyAttendee.upsert({
      where: {
        assemblyId_userId: { assemblyId, userId },
      },
      update: {},
      create: { assemblyId, userId },
    });
  }

  async getVotingResults(assemblyId: string, actor: AssemblyActor) {
    await this.ensureAssemblyAccess(assemblyId, actor);
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
