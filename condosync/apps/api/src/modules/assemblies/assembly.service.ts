import { prisma } from "../../config/prisma";
import { AssemblyStatus, UserRole } from "@prisma/client";
import { AppError, ForbiddenError } from "../../middleware/errorHandler";
import { NotificationService } from "../../notifications/notification.service";
import PDFDocument from "pdfkit";

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
          channels: ["inapp", "email", "push"],
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

  async generateMinutesPdf(assemblyId: string, actor: AssemblyActor): Promise<Buffer> {
    await this.ensureAssemblyAccess(assemblyId, actor);

    const assembly = await prisma.assembly.findUniqueOrThrow({
      where: { id: assemblyId },
      include: {
        condominium: { select: { name: true } },
        attendees: true,
        votingItems: {
          include: { votes: true },
        },
      },
    }) as any;

    // Buscar nomes dos participantes
    const attendeeUserIds: string[] = assembly.attendees.map((a: any) => a.userId);
    const attendeeUsers = await prisma.user.findMany({
      where: { id: { in: attendeeUserIds } },
      select: { id: true, name: true },
    });
    const userNameMap = new Map(attendeeUsers.map((u) => [u.id, u.name]));

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // Cabeçalho
      doc
        .fontSize(18)
        .font("Helvetica-Bold")
        .text("ATA DE ASSEMBLEIA", { align: "center" });
      doc.moveDown(0.5);
      doc
        .fontSize(14)
        .font("Helvetica")
        .text(assembly.condominium.name, { align: "center" });
      doc.moveDown(0.3);
      doc
        .fontSize(11)
        .text(
          `Data: ${assembly.scheduledAt.toLocaleDateString("pt-BR")}`,
          { align: "center" },
        );
      doc.moveDown(1.5);

      // Dados da assembleia
      doc.fontSize(13).font("Helvetica-Bold").text("Dados da Assembleia");
      doc.moveDown(0.3);
      doc.fontSize(11).font("Helvetica");
      doc.text(`Título: ${assembly.title}`);
      if (assembly.description) {
        doc.text(`Descrição: ${assembly.description}`);
      }
      doc.text(`Status: ${assembly.status}`);
      if (assembly.startedAt) {
        doc.text(`Início: ${assembly.startedAt.toLocaleString("pt-BR")}`);
      }
      if (assembly.finishedAt) {
        doc.text(`Encerramento: ${assembly.finishedAt.toLocaleString("pt-BR")}`);
      }
      doc.moveDown(1);

      // Lista de presença
      doc.fontSize(13).font("Helvetica-Bold").text("Lista de Presença");
      doc.moveDown(0.3);
      doc.fontSize(11).font("Helvetica");
      if (assembly.attendees.length === 0) {
        doc.text("Nenhum participante registrado.");
      } else {
        assembly.attendees.forEach((att: any, i: number) => {
          const name = userNameMap.get(att.userId) ?? "Usuário não identificado";
          doc.text(`${i + 1}. ${name}`);
        });
      }
      doc.moveDown(1);

      // Pautas e votação
      doc.fontSize(13).font("Helvetica-Bold").text("Pautas e Resultados de Votação");
      doc.moveDown(0.3);

      if (assembly.votingItems.length === 0) {
        doc.fontSize(11).font("Helvetica").text("Nenhuma pauta registrada.");
      } else {
        assembly.votingItems.forEach((item: any, idx: number) => {
          const options = item.options as { id: string; text: string }[];

          doc.fontSize(12).font("Helvetica-Bold").text(`${idx + 1}. ${item.title}`);
          if (item.description) {
            doc.fontSize(10).font("Helvetica-Oblique").text(item.description);
          }
          doc.fontSize(11).font("Helvetica");

          const totalVotes = item.votes.length;
          options.forEach((opt) => {
            const count = item.votes.filter((v: any) => v.optionId === opt.id).length;
            const pct = totalVotes > 0 ? ((count / totalVotes) * 100).toFixed(1) : "0.0";
            doc.text(`   • ${opt.text}: ${count} voto(s) (${pct}%)`);
          });
          doc.text(`   Total de votos: ${totalVotes}`);
          doc.moveDown(0.5);
        });
      }

      // Rodapé
      doc.moveDown(2);
      doc
        .fontSize(9)
        .font("Helvetica-Oblique")
        .text("Documento gerado automaticamente pelo CondoSync", { align: "center" });

      doc.end();
    });
  }
}

export const assemblyService = new AssemblyService();
