/**
 * Panic SOS — serviço de apoio às rotas e ao worker de escalonamento.
 *
 * Status é DERIVADO em runtime (sem enum/coluna persistida), com a
 * prioridade: resolvedAt > acknowledgedAt > escalatedAt > ACTIVE.
 */
import { Queue, type ConnectionOptions } from "bullmq";
import { bullConnection } from "../../config/redis";
import { io } from "../../server";
import { env } from "../../config/env";
import { logger } from "../../config/logger";

const log = logger.child({ module: "panic.service" });

export const PANIC_ESCALATION_QUEUE = "panic-escalation";

// Fila de jobs ATRASADOS (um por alerta) que escalam alertas não
// reconhecidos a tempo. Definida aqui (não no worker) para evitar
// dependência circular: o worker importa daqui; este arquivo não
// importa do worker.
export const panicEscalationQueue = new Queue(PANIC_ESCALATION_QUEUE, {
  // cast só de tipo (mesmo skew ioredis×bullmq dos demais workers do repo);
  // runtime aceita a instância Redis.
  connection: bullConnection() as unknown as ConnectionOptions,
  defaultJobOptions: { removeOnComplete: true, removeOnFail: 50 },
});

export type PanicStatus = "RESOLVED" | "ACKNOWLEDGED" | "ESCALATED" | "ACTIVE";

interface PanicLike {
  id: string;
  condominiumId: string;
  triggeredBy: string;
  resolvedAt?: Date | null;
  acknowledgedAt?: Date | null;
  acknowledgedBy?: string | null;
  escalatedAt?: Date | null;
}

export function panicStatus(alert: {
  resolvedAt?: Date | null;
  acknowledgedAt?: Date | null;
  escalatedAt?: Date | null;
}): PanicStatus {
  if (alert.resolvedAt) return "RESOLVED";
  if (alert.acknowledgedAt) return "ACKNOWLEDGED";
  if (alert.escalatedAt) return "ESCALATED";
  return "ACTIVE";
}

function escalationJobId(alertId: string): string {
  // BullMQ NÃO permite ":" em custom jobId ("Custom Id cannot contain :").
  // alertId é UUID (sem ":"), então o hífen mantém o id determinístico.
  return `panic-escalation-${alertId}`;
}

/**
 * Agenda a escalação do alerta para daqui a PANIC_ESCALATION_MINUTES.
 * jobId determinístico permite cancelar quando reconhecido/resolvido.
 * Quem chama deve envolver em try/catch — falha aqui NÃO pode derrubar
 * o disparo do pânico (o disparo é mais crítico que a escalação).
 */
export async function scheduleEscalation(alertId: string): Promise<void> {
  const minutes = Number.parseInt(env.PANIC_ESCALATION_MINUTES, 10);
  const safeMinutes = Number.isFinite(minutes) && minutes > 0 ? minutes : 3;
  await panicEscalationQueue.add(
    "escalate",
    { alertId },
    { jobId: escalationJobId(alertId), delay: safeMinutes * 60_000 },
  );
}

/**
 * Cancela o job de escalação. É apenas OTIMIZAÇÃO — a proteção real
 * contra corrida é o update atômico no handler do worker
 * (WHERE escalatedAt IS NULL ...). Por isso nunca lança.
 */
export async function cancelEscalation(alertId: string): Promise<void> {
  try {
    const job = await panicEscalationQueue.getJob(escalationJobId(alertId));
    if (job) await job.remove();
  } catch (err) {
    log.warn(
      "Falha ao cancelar job de escalação (no-op; guard atômico protege)",
      { err: err instanceof Error ? err.message : err, alertId },
    );
  }
}

/**
 * Emite atualização de status do alerta:
 *  - para a sala staff do condomínio (monitoramento na portaria);
 *  - para o usuário que disparou (UI do morador acompanha o status).
 */
export function emitPanicUpdate(alert: PanicLike): void {
  const payload = {
    alertId: alert.id,
    condominiumId: alert.condominiumId,
    status: panicStatus(alert),
    acknowledgedBy: alert.acknowledgedBy ?? null,
    acknowledgedAt: alert.acknowledgedAt ?? null,
    escalatedAt: alert.escalatedAt ?? null,
    resolvedAt: alert.resolvedAt ?? null,
  };
  io.to(`condominium:${alert.condominiumId}:staff`).emit("panic:update", payload);
  io.to(`user:${alert.triggeredBy}`).emit("panic:update", payload);
}
