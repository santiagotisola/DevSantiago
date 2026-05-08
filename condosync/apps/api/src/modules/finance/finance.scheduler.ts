/**
 * Finance Scheduler
 * Cron jobs via BullMQ:
 *  - Daily: mark overdue charges (PENDING past due date → OVERDUE)
 *  - Daily: send 3-day payment reminder notifications
 */
import { Queue, Worker } from "bullmq";
import { bullConnection } from "../../config/redis";
import { prisma } from "../../config/prisma";
import { logger } from "../../config/logger";
import { io } from "../../server";
import { registerRepeatable } from "../../workers/schedulerHelpers";

const log = logger.child({ module: "finance.scheduler" });

const QUEUE_NAME = "finance-scheduler";

// ─── Queue ────────────────────────────────────────────────────
export const financeQueue = new Queue(QUEUE_NAME, { connection: bullConnection() });

// ─── Worker ───────────────────────────────────────────────────
export const financeWorker = new Worker(
  QUEUE_NAME,
  async (job) => {
    if (job.name === "mark-overdue") {
      await markOverdueCharges();
    } else if (job.name === "payment-reminders") {
      await sendPaymentReminders();
    }
  },
  { connection: bullConnection() },
);

financeWorker.on("completed", (job) => log.info(`Job ${job.name} completed`));
financeWorker.on("failed", (job, err) =>
  log.error(`Job ${job?.name} failed`, err),
);

// ─── Mark overdue ─────────────────────────────────────────────
async function markOverdueCharges() {
  const now = new Date();
  const result = await prisma.charge.updateMany({
    where: {
      status: "PENDING",
      dueDate: { lt: now },
    },
    data: { status: "OVERDUE" },
  });
  log.info(`Marked ${result.count} charges as OVERDUE`);
  return result.count;
}

// ─── 3-day reminders ──────────────────────────────────────────
async function sendPaymentReminders() {
  const inThreeDays = new Date();
  inThreeDays.setDate(inThreeDays.getDate() + 3);
  const startOfDay = new Date(inThreeDays);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(inThreeDays);
  endOfDay.setHours(23, 59, 59, 999);

  const charges = await prisma.charge.findMany({
    where: {
      status: "PENDING",
      dueDate: { gte: startOfDay, lte: endOfDay },
    },
    include: {
      unit: {
        include: {
          residents: { where: { role: "RESIDENT" }, include: { user: true } },
        },
      },
    },
  });

  let notified = 0;
  for (const charge of charges) {
    const residents = charge.unit.residents.map((cu) => cu.user);
    for (const resident of residents) {
      try {
        await prisma.notification.create({
          data: {
            userId: resident.id,
            type: "FINANCIAL",
            title: "Cobrança vencendo em breve",
            message: `Sua cobrança "${charge.description}" vence em 3 dias. Valor: R$ ${Number(charge.amount).toFixed(2).replace(".", ",")}`,
          },
        });
        // Notify via WebSocket if resident is online
        io.to(`user:${resident.id}`).emit("notification:new", {
          type: "FINANCIAL",
          title: "Cobrança vencendo em breve",
        });
        notified++;
      } catch (err) {
        log.error(`Failed to notify resident ${resident.id}`, err);
      }
    }
  }
  log.info(`Sent ${notified} payment reminder notifications`);
}

// ─── Schedule daily jobs ──────────────────────────────────────
//
// registerRepeatable centraliza:
//  - Teardown de repeatables com mesmo `name` (mata órfãos antigos
//    se o pattern mudar em deploys futuros).
//  - jobId fixo para dedupe entre réplicas.
//  - attempts/backoff defaults.
export async function registerFinanceSchedule() {
  await registerRepeatable(financeQueue, "mark-overdue", "0 1 * * *", {
    jobId: "finance-mark-overdue",
  });
  await registerRepeatable(
    financeQueue,
    "payment-reminders",
    "0 9 * * *",
    { jobId: "finance-payment-reminders" },
  );

  log.info("Finance scheduler registered (daily at 01:00 and 09:00 UTC)");
}
