/**
 * Contract Alerts Worker
 * Cron diário às 08:30 — verifica contratos vencendo em 90/60/30/15 dias
 * e envia notificação in-app para CONDOMINIUM_ADMIN e SYNDIC.
 */
import { Queue, Worker, Job } from "bullmq";
import { redis } from "../../config/redis";
import { logger } from "../../config/logger";
import { prisma } from "../../config/prisma";
import { NotificationService } from "../../notifications/notification.service";

const log = logger.child({ module: "contract.alerts.worker" });
const QUEUE_NAME = "contract-alerts";

export const contractAlertsQueue = new Queue(QUEUE_NAME, {
  connection: redis as any,
  defaultJobOptions: { removeOnComplete: true, removeOnFail: 50 },
});

export async function registerContractAlertsSchedule() {
  await contractAlertsQueue.add(
    "check-expiring-contracts",
    {},
    {
      repeat: { pattern: "30 8 * * *" }, // todo dia às 08:30
      jobId: "contract-alerts-daily",
    },
  );
  log.info("Contract alerts daily job registered (cron: 30 8 * * *)");
}

export const contractAlertsWorker = new Worker(
  QUEUE_NAME,
  async (_job: Job) => {
    log.info("Running contract expiry check");
    const ALERT_THRESHOLDS = [90, 60, 30, 15];
    const now = new Date();

    for (const days of ALERT_THRESHOLDS) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + days);
      const start = new Date(targetDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(targetDate);
      end.setHours(23, 59, 59, 999);

      const contracts = await prisma.condominiumContract.findMany({
        where: {
          status: "ACTIVE",
          endDate: { gte: start, lte: end },
        },
      });

      for (const contract of contracts) {
        // Marca como expirado se venceu
        if (contract.endDate < now) {
          await prisma.condominiumContract.update({
            where: { id: contract.id },
            data: { status: "EXPIRED" },
          });
          continue;
        }

        const admins = await prisma.condominiumUser.findMany({
          where: {
            condominiumId: contract.condominiumId,
            role: { in: ["CONDOMINIUM_ADMIN", "SYNDIC"] },
            isActive: true,
          },
          select: { userId: true },
        });

        const urgencyLabel =
          days <= 15 ? "⚠️ URGENTE" : days <= 30 ? "🔴" : days <= 60 ? "🟠" : "🟡";

        for (const { userId } of admins) {
          await NotificationService.enqueue({
            userId,
            type: "MAINTENANCE",
            title: `${urgencyLabel} Contrato vencendo em ${days} dias`,
            message: `"${contract.title}" com ${contract.vendor} vence em ${days} dias (${contract.endDate.toLocaleDateString("pt-BR")}).`,
            channels: ["inapp", "email"],
            data: { contractId: contract.id, condominiumId: contract.condominiumId },
          });
        }

        log.info(`Alerta de contrato "${contract.title}" enviado (${days} dias)`);
      }
    }

    // Marca contratos já vencidos como EXPIRED
    await prisma.condominiumContract.updateMany({
      where: { status: "ACTIVE", endDate: { lt: now } },
      data: { status: "EXPIRED" },
    });
  },
  { connection: redis as any },
);

contractAlertsWorker.on("failed", (job, err) =>
  log.error(`Contract alert job ${job?.id} failed`, err),
);
