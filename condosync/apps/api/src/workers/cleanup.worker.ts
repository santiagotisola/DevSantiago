/**
 * Cleanup worker — roda diariamente às 03:30 e remove:
 *  • Invitations pendentes expirados há > 7 dias.
 *  • RefreshTokens com expiresAt < now (já não valem).
 *  • PasswordResets com expiresAt < now.
 *  • AuditLogs com mais de 180 dias (retenção default; planos enterprise
 *    poderiam estender essa janela, mas hoje não diferenciamos).
 */
import { Queue, Worker, Job } from "bullmq";
import { bullConnection } from "../config/redis";
import { logger } from "../config/logger";
import { prisma } from "../config/prisma";
import { registerRepeatable } from "./schedulerHelpers";

const log = logger.child({ module: "cleanup.worker" });
const QUEUE_NAME = "cleanup";

export const cleanupQueue = new Queue(QUEUE_NAME, {
  connection: bullConnection(),
  defaultJobOptions: { removeOnComplete: true, removeOnFail: 50 },
});

export async function registerCleanupSchedule() {
  await registerRepeatable(cleanupQueue, "daily-cleanup", "30 3 * * *", {
    jobId: "cleanup-daily",
  });
  log.info("Cleanup diário registrado (cron: 30 3 * * *)");
}

const AUDIT_RETENTION_DAYS = Number(process.env.AUDIT_RETENTION_DAYS ?? "180");
const INVITATION_GRACE_DAYS = Number(process.env.INVITATION_GRACE_DAYS ?? "7");

export const cleanupWorker = new Worker(
  QUEUE_NAME,
  async (_job: Job) => {
    const now = new Date();
    const auditCutoff = new Date(now.getTime() - AUDIT_RETENTION_DAYS * 86_400_000);
    const inviteCutoff = new Date(now.getTime() - INVITATION_GRACE_DAYS * 86_400_000);

    const [expiredInvites, expiredRefresh, expiredPwd, oldAudit] = await Promise.all([
      prisma.invitation.deleteMany({
        where: { usedAt: null, expiresAt: { lt: inviteCutoff } },
      }),
      prisma.refreshToken.deleteMany({ where: { expiresAt: { lt: now } } }),
      prisma.passwordReset.deleteMany({ where: { expiresAt: { lt: now } } }),
      prisma.auditLog.deleteMany({ where: { createdAt: { lt: auditCutoff } } }),
    ]);

    log.info(
      {
        invitations: expiredInvites.count,
        refreshTokens: expiredRefresh.count,
        passwordResets: expiredPwd.count,
        auditLogs: oldAudit.count,
        auditRetentionDays: AUDIT_RETENTION_DAYS,
      },
      "Cleanup diário concluído",
    );
  },
  { connection: bullConnection() },
);

cleanupWorker.on("failed", (job, err) => {
  log.error({ jobId: job?.id, err: err?.message }, "Cleanup falhou");
});
