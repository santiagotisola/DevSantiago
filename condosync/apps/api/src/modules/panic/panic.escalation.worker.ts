/**
 * Panic SOS — worker de escalonamento.
 *
 * Consome jobs ATRASADOS (um por alerta). Quando o delay vence, escala
 * o alerta se ele ainda estiver ativo (não reconhecido/resolvido).
 * Competitive consumer — sem leader lock (cada job roda uma vez).
 */
import { Worker, Job, type ConnectionOptions } from "bullmq";
import { bullConnection } from "../../config/redis";
import { logger } from "../../config/logger";
import { prisma } from "../../config/prisma";
import { NotificationService } from "../../notifications/notification.service";
import { auditService } from "../audit/audit.service";
import { PANIC_ESCALATION_QUEUE, emitPanicUpdate } from "./panic.service";

const log = logger.child({ module: "panic.escalation.worker" });

export const panicEscalationWorker = new Worker(
  PANIC_ESCALATION_QUEUE,
  async (job: Job<{ alertId: string }>) => {
    const { alertId } = job.data;

    // Guard ATÔMICO — proteção real contra corrida com acknowledge/resolve.
    // Só escala se o alerta ainda está ativo, não reconhecido e não escalado.
    const result = await prisma.panicAlert.updateMany({
      where: {
        id: alertId,
        acknowledgedAt: null,
        resolvedAt: null,
        escalatedAt: null,
      },
      data: { escalatedAt: new Date() },
    });
    if (result.count !== 1) {
      log.info(
        "Escalonamento ignorado (já reconhecido/resolvido/escalado)",
        { alertId },
      );
      return;
    }

    const alert = await prisma.panicAlert.findUnique({ where: { id: alertId } });
    if (!alert) return;

    // Audiência = staff OPERACIONAL do condomínio (DOORMAN/CONDOMINIUM_ADMIN/
    // SYNDIC). SUPER_ADMIN NÃO recebe notificação operacional por padrão
    // (opera via RBAC, sem vínculo operacional no condomínio). Moradores
    // NÃO são notificados na escalação.
    const staff = await prisma.condominiumUser.findMany({
      where: {
        condominiumId: alert.condominiumId,
        isActive: true,
        role: { in: ["DOORMAN", "CONDOMINIUM_ADMIN", "SYNDIC"] },
      },
      select: { userId: true },
    });

    await Promise.all(
      staff.map((s) =>
        NotificationService.enqueue({
          userId: s.userId,
          type: "PANIC",
          title: "🚨 PÂNICO NÃO ATENDIDO",
          message:
            "Um alerta de pânico não foi reconhecido a tempo e foi escalonado. Verifique imediatamente.",
          data: {
            alertId: alert.id,
            condominiumId: alert.condominiumId,
            escalated: true,
          },
          channels: ["inapp", "push"],
        }).catch(() => {}),
      ),
    );

    emitPanicUpdate(alert);

    // Audit manual — o worker não passa pelo auditMiddleware (HTTP-only).
    await auditService.write({
      condominiumId: alert.condominiumId,
      userId: null,
      action: "ESCALATE",
      module: "panic",
      entityType: "Panic",
      entityId: alert.id,
      description: "Alerta de pânico escalonado por falta de reconhecimento",
      metadata: {
        panicAlertId: alert.id,
        condominiumId: alert.condominiumId,
        triggeredBy: alert.triggeredBy,
        escalatedAt: alert.escalatedAt,
      },
    });

    log.warn("Alerta de pânico ESCALONADO", {
      alertId,
      condominiumId: alert.condominiumId,
    });
  },
  // cast só de tipo (skew ioredis×bullmq, igual aos demais workers); runtime ok.
  { connection: bullConnection() as unknown as ConnectionOptions },
);

panicEscalationWorker.on("failed", (job, err) => {
  log.error("Job de escalonamento de pânico falhou", {
    jobId: job?.id,
    err: err.message,
  });
});
