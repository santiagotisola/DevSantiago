/**
 * Maintenance Alerts Worker
 * Runs a daily repeatable job that sends notifications for preventive maintenance
 * schedules due within the next 7 days.
 */
import { Queue, Worker, Job } from "bullmq";
import { redis } from "../../config/redis";
import { logger } from "../../config/logger";
import { prisma } from "../../config/prisma";
import { maintenanceService } from "./maintenance.service";
import { NotificationService } from "../../notifications/notification.service";

const log = logger.child({ module: "maintenance.alerts.worker" });

const QUEUE_NAME = "maintenance-alerts";

// ── Queue ──────────────────────────────────────────────────────────
export const maintenanceAlertsQueue = new Queue(QUEUE_NAME, {
  connection: redis as any,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: 50,
  },
});

// ── Register daily repeatable job on startup ───────────────────────
export async function registerMaintenanceAlertsSchedule() {
  await maintenanceAlertsQueue.add(
    "check-due-schedules",
    {},
    {
      repeat: { pattern: "0 7 * * *" }, // every day at 07:00
      jobId: "maintenance-alerts-daily",
    },
  );
  log.info("Maintenance alerts daily job registered (cron: 0 7 * * *)");
}

// ── Worker ─────────────────────────────────────────────────────────
export const maintenanceAlertsWorker = new Worker(
  QUEUE_NAME,
  async (_job: Job) => {
    log.info("Running maintenance due-date check");

    const dueSchedules = await maintenanceService.listDueSchedules(7);

    if (dueSchedules.length === 0) {
      log.info("No maintenance schedules due in the next 7 days");
      return;
    }

    log.info(`Found ${dueSchedules.length} schedule(s) due soon`);

    for (const schedule of dueSchedules) {
      const condominiumId = schedule.condominiumId;

      // Find CONDOMINIUM_ADMIN and SYNDIC users in this condominium
      const adminUsers = await prisma.user.findMany({
        where: {
          condominiumUsers: {
            some: {
              condominiumId,
              role: { in: ["CONDOMINIUM_ADMIN", "SYNDIC"] },
              isActive: true,
            },
          },
        },
        select: { id: true },
      });

      const recipients = adminUsers;

      const dueDate = new Date(schedule.nextDueDate);
      const today = new Date();
      const diffDays = Math.ceil(
        (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );

      const dateLabel = dueDate.toLocaleDateString("pt-BR");
      const urgency =
        diffDays <= 0
          ? "VENCIDA"
          : diffDays === 1
            ? "amanhã"
            : `em ${diffDays} dias`;
      const title =
        diffDays <= 0
          ? `Manutenção Vencida: ${schedule.title}`
          : `Manutenção Preventiva: ${schedule.title}`;
      const message =
        diffDays <= 0
          ? `A manutenção "${schedule.title}" (${schedule.category}) em ${schedule.location} está vencida desde ${dateLabel}. Realize o serviço o quanto antes.`
          : `A manutenção "${schedule.title}" (${schedule.category}) em ${schedule.location} está prevista para ${dateLabel} (${urgency}).`;

      const alertKey = `maintenance-alert:${schedule.id}:${dateLabel}`;
      const wasQueued = await redis.set(
        alertKey,
        "1",
        "EX",
        60 * 60 * 24,
        "NX",
      );

      if (!wasQueued) {
        log.info(
          `Skipping duplicate maintenance alert for schedule ${schedule.id}`,
        );
        continue;
      }

      await Promise.all(
        recipients.map((u) =>
          NotificationService.enqueue({
            userId: u.id,
            type: "MAINTENANCE",
            title,
            message,
            data: {
              scheduleId: schedule.id,
              condominiumId,
              nextDueDate: schedule.nextDueDate,
            },
            channels: ["inapp", "email"],
          }).catch((err) =>
            log.error(`Failed to enqueue alert for user ${u.id}`, err),
          ),
        ),
      );
    }

    log.info("Maintenance alerts dispatch complete");
  },
  { connection: redis as any },
);

maintenanceAlertsWorker.on("failed", (job, err) => {
  log.error(`Maintenance alerts job ${job?.id} failed`, { error: err.message });
});
