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
import { registerRepeatable } from "../../workers/schedulerHelpers";

const log = logger.child({ module: "collection.worker" });
const QUEUE_NAME = "collection-rule";

export const collectionQueue = new Queue(QUEUE_NAME, {
  connection: redis as any,
  defaultJobOptions: { removeOnComplete: true, removeOnFail: 100 },
});

export async function registerCollectionSchedule() {
  await registerRepeatable(
    collectionQueue,
    "run-collection-rules",
    "0 9 * * *",
    { jobId: "collection-rules-daily" },
  );
  log.info("Collection rules daily job registered (cron: 0 9 * * *)");
}

export const collectionWorker = new Worker(
  QUEUE_NAME,
  async (_job: Job) => {
    log.info("Running collection rules check");
    const now = new Date();

    // 1. Busca todas as cobranças OVERDUE.
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

    if (overdueCharges.length === 0) {
      log.info("No overdue charges — skipping");
      return;
    }

    // 2. Carrega TODAS as réguas ativas dos condomínios envolvidos
    //    em UMA query (em vez de 1 por charge — antes era N+1).
    //    Em pico de inadimplência (500+ charges) o ganho é ~500x.
    const condominiumIds = Array.from(
      new Set(overdueCharges.map((c) => c.account.condominiumId)),
    );
    const rules = await prisma.collectionRule.findMany({
      where: { condominiumId: { in: condominiumIds }, isActive: true },
      include: { steps: { orderBy: { daysAfterDue: "asc" } } },
    });
    const ruleByCondo = new Map(rules.map((r) => [r.condominiumId, r]));

    let notified = 0;

    for (const charge of overdueCharges) {
      const condominiumId = charge.account.condominiumId;
      const daysOverdue = Math.floor(
        (now.getTime() - charge.dueDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      const rule = ruleByCondo.get(condominiumId);
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

        // Enfileira em paralelo por canal — antes serializava
        // inapp/email seq.
        const enqueues: Promise<unknown>[] = [];
        if (step.channels.includes("inapp")) {
          enqueues.push(
            NotificationService.enqueue({
              userId: resident.id,
              type: "FINANCIAL",
              title: `Cobrança em atraso — ${daysOverdue} dia(s)`,
              message,
              channels: ["inapp"],
              data: { chargeId: charge.id },
            }),
          );
        }
        if (step.channels.includes("email")) {
          enqueues.push(
            NotificationService.enqueue({
              userId: resident.id,
              type: "FINANCIAL",
              title: `Cobrança em atraso — ${daysOverdue} dia(s)`,
              message,
              channels: ["email"],
              data: { chargeId: charge.id },
            }),
          );
        }
        await Promise.all(enqueues);
        notified++;
      }
    }

    log.info(
      { overdueCount: overdueCharges.length, condos: condominiumIds.length, notified },
      "Collection rules: notificações enviadas",
    );
  },
  { connection: redis as any },
);

collectionWorker.on("failed", (job, err) =>
  log.error(`Collection job ${job?.id} failed`, err),
);
