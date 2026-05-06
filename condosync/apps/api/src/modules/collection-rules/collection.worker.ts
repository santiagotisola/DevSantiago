/**
 * Collection Rule Worker
 * Cron diário às 09:00 — para cada cobrança OVERDUE, verifica qual step da
 * régua de cobrança ativa deve disparar e enfileira notificações.
 */
import { Queue, Worker, Job } from "bullmq";
import { redis } from "../../config/redis";
import { logger } from "../../config/logger";
import { prisma } from "../../config/prisma";
import { NotificationService } from "../../notifications/notification.service";

const log = logger.child({ module: "collection.worker" });
const QUEUE_NAME = "collection-rule";

export const collectionQueue = new Queue(QUEUE_NAME, {
  connection: redis as any,
  defaultJobOptions: { removeOnComplete: true, removeOnFail: 100 },
});

export async function registerCollectionSchedule() {
  await collectionQueue.add(
    "run-collection-rules",
    {},
    {
      repeat: { pattern: "0 9 * * *" }, // todo dia às 09:00
      jobId: "collection-rules-daily",
    },
  );
  log.info("Collection rules daily job registered (cron: 0 9 * * *)");
}

export const collectionWorker = new Worker(
  QUEUE_NAME,
  async (_job: Job) => {
    log.info("Running collection rules check");
    const now = new Date();

    // Busca todas as cobranças OVERDUE com rule ativa no mesmo condomínio
    const overdueCharges = await prisma.charge.findMany({
      where: { status: "OVERDUE" },
      include: {
        unit: {
          include: {
            residents: {
              where: { role: "RESIDENT", isActive: true },
              include: { user: { select: { id: true, name: true, email: true, phone: true } } },
            },
          },
        },
        account: { select: { condominiumId: true } },
      },
    });

    let notified = 0;

    for (const charge of overdueCharges) {
      const condominiumId = charge.account.condominiumId;
      const daysOverdue = Math.floor(
        (now.getTime() - charge.dueDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Busca régua ativa do condomínio
      const rule = await prisma.collectionRule.findFirst({
        where: { condominiumId, isActive: true },
        include: { steps: { orderBy: { daysAfterDue: "asc" } } },
      });
      if (!rule || rule.steps.length === 0) continue;

      // Encontra o step cujo daysAfterDue === daysOverdue (dispara exatamente no dia)
      const step = rule.steps.find((s) => s.daysAfterDue === daysOverdue);
      if (!step) continue;

      const residents = charge.unit.residents.map((cu) => cu.user);
      const amountFormatted = `R$ ${Number(charge.amount).toFixed(2).replace(".", ",")}`;
      const dueFormatted = charge.dueDate.toLocaleDateString("pt-BR");

      for (const resident of residents) {
        const message = step.messageTemplate
          .replace("{{nome}}", resident.name)
          .replace("{{valor}}", amountFormatted)
          .replace("{{vencimento}}", dueFormatted)
          .replace("{{dias}}", String(daysOverdue));

        if (step.channels.includes("inapp")) {
          await NotificationService.enqueue({
            userId: resident.id,
            type: "FINANCIAL",
            title: `Cobrança em atraso — ${daysOverdue} dia(s)`,
            message,
            channels: ["inapp"],
            data: { chargeId: charge.id },
          });
        }

        if (step.channels.includes("email")) {
          await NotificationService.enqueue({
            userId: resident.id,
            type: "FINANCIAL",
            title: `Cobrança em atraso — ${daysOverdue} dia(s)`,
            message,
            channels: ["email"],
            data: { chargeId: charge.id },
          });
        }

        notified++;
      }
    }

    log.info(`Collection rules: ${notified} notificações enviadas`);
  },
  { connection: redis as any },
);

collectionWorker.on("failed", (job, err) =>
  log.error(`Collection job ${job?.id} failed`, err),
);
