import * as Sentry from "@sentry/node";
import type { Queue } from "bullmq";
import { logger } from "../config/logger";
import {
  releaseLeaderLock,
  renewLeaderLock,
  tryAcquireLeaderLock,
} from "../config/redis";
import {
  bullJobDuration,
  bullJobsTotal,
  bullLeaderRenewals,
  bullQueueDepth,
} from "../config/metrics";

const log = logger.child({ module: "workers" });

export interface WorkerHandles {
  /**
   * Fecha todos os workers BullMQ registrados, drenando jobs em
   * andamento. Chamado no graceful shutdown do server.ts.
   */
  close(): Promise<void>;
}

/**
 * Registra os workers e schedulers BullMQ.
 *
 * Workers BullMQ são "competitive consumers" naturalmente — N
 * réplicas processando a mesma fila apenas dividem o trabalho.
 * Mas a REGISTRAÇÃO de repeatables (cron) precisa acontecer em
 * uma réplica só, senão cada cron tick pode disparar múltiplas
 * execuções (mitigado por `jobId` mas não eliminado para
 * schedulers que esquecem o jobId).
 *
 * Por isso, dividimos:
 *   - Workers: rodam em todas as réplicas (com RUN_WORKERS=true).
 *   - Repeatables: rodam só na réplica que vence o leader lock
 *     em Redis (TTL renovado a cada 4min).
 */
export async function registerWorkers(): Promise<WorkerHandles> {
  // Imports locais para isolar side-effects da inicialização —
  // server.ts não paga o custo de importar os workers se
  // RUN_WORKERS=false.
  const { notificationWorker } = await import(
    "../notifications/notification.worker"
  );
  const {
    registerMaintenanceAlertsSchedule,
    maintenanceAlertsWorker,
  } = await import("../modules/maintenance/maintenance.alerts.worker");
  const { registerFinanceSchedule, financeWorker } = await import(
    "../modules/finance/finance.scheduler"
  );
  const {
    registerContractAlertsSchedule,
    contractAlertsWorker,
  } = await import("../modules/condominium-contracts/contract.alerts.worker");
  const { registerCollectionSchedule, collectionWorker } = await import(
    "../modules/collection-rules/collection.worker"
  );
  const { registerBalanceteSchedule, balanceteWorker } = await import(
    "../modules/finance/balancete.worker"
  );
  const { webhookWorker } = await import(
    "../modules/webhooks/webhook.processor"
  );

  type WorkerLike = {
    close(): Promise<void>;
    name?: string;
    on?: (
      event: "completed" | "failed",
      cb: (...args: unknown[]) => void,
    ) => void;
  };
  const workers = [
    notificationWorker,
    maintenanceAlertsWorker,
    financeWorker,
    contractAlertsWorker,
    collectionWorker,
    balanceteWorker,
    webhookWorker,
  ].filter(Boolean) as WorkerLike[];

  // Pluga métricas Prometheus + Sentry em cada worker.
  for (const w of workers) {
    const queueName = w.name ?? "unknown";
    // BullMQ job tem processedOn / finishedOn (epoch ms); usamos
    // para histograma de duração — antes a métrica existia mas
    // nunca era observada.
    w.on?.("completed", (job: unknown) => {
      bullJobsTotal.labels(queueName, "completed").inc();
      const j = job as { processedOn?: number; finishedOn?: number } | undefined;
      if (j?.processedOn && j?.finishedOn) {
        bullJobDuration
          .labels(queueName)
          .observe((j.finishedOn - j.processedOn) / 1000);
      }
    });
    w.on?.("failed", (job: unknown, err: unknown) => {
      bullJobsTotal.labels(queueName, "failed").inc();
      // Sentry — antes só logger.error; falha permanente passava
      // invisível depois de removeOnFail apagar.
      Sentry.captureException(err, {
        extra: {
          queue: queueName,
          jobId: (job as { id?: string } | undefined)?.id,
          attemptsMade: (job as { attemptsMade?: number } | undefined)
            ?.attemptsMade,
        },
        tags: { component: "bullmq", queue: queueName },
      });
    });
    w.on?.("stalled", () => {
      bullJobsTotal.labels(queueName, "stalled").inc();
    });
  }

  // Coletor periódico de queue depth — preenche o Gauge
  // bullmq_queue_depth declarado em metrics.ts mas que estava
  // sempre em 0 (ninguém chamava .set()).
  const queues: Queue[] = [];
  // Importa Queues dos mesmos módulos onde os workers vivem.
  try {
    const fin = await import("../modules/finance/finance.scheduler");
    queues.push(fin.financeQueue);
  } catch {}
  try {
    const m = await import("../modules/maintenance/maintenance.alerts.worker");
    queues.push(m.maintenanceAlertsQueue);
  } catch {}
  try {
    const c = await import(
      "../modules/condominium-contracts/contract.alerts.worker"
    );
    queues.push(c.contractAlertsQueue);
  } catch {}
  try {
    const cr = await import("../modules/collection-rules/collection.worker");
    queues.push(cr.collectionQueue);
  } catch {}
  try {
    const b = await import("../modules/finance/balancete.worker");
    queues.push(b.balanceteQueue);
  } catch {}
  try {
    const n = await import("../notifications/notification.queue");
    queues.push(n.notificationQueue as unknown as Queue);
  } catch {}
  try {
    const wh = await import("../modules/webhooks/webhook.processor");
    queues.push(wh.webhookQueue as unknown as Queue);
  } catch {}

  const depthCollector = setInterval(async () => {
    for (const q of queues) {
      try {
        const counts = await q.getJobCounts(
          "waiting",
          "active",
          "delayed",
          "failed",
          "completed",
        );
        bullQueueDepth.labels(q.name, "waiting").set(counts.waiting ?? 0);
        bullQueueDepth.labels(q.name, "active").set(counts.active ?? 0);
        bullQueueDepth.labels(q.name, "delayed").set(counts.delayed ?? 0);
        bullQueueDepth.labels(q.name, "failed").set(counts.failed ?? 0);
      } catch (err) {
        log.warn({ err, queue: q.name }, "Falha coletando queue depth");
      }
    }
  }, 15_000);
  depthCollector.unref();

  // Leader election: só uma réplica registra os repeatables.
  // Demais réplicas ainda processam jobs (são consumers), mas não
  // duplicam triggers de cron.
  const LEADER_KEY = "schedulers";
  const TTL_SECONDS = 4 * 60;
  const RENEW_INTERVAL_MS = 60 * 1000;

  const fingerprint = await tryAcquireLeaderLock(LEADER_KEY, TTL_SECONDS);
  let renewTimer: NodeJS.Timeout | null = null;

  if (fingerprint) {
    log.info({ fingerprint }, "Eleito líder — registrando schedulers (cron)");
    await Promise.all([
      registerMaintenanceAlertsSchedule(),
      registerFinanceSchedule(),
      registerContractAlertsSchedule(),
      registerCollectionSchedule(),
      registerBalanceteSchedule(),
    ]);

    // Renovação a cada 1min, TTL 4min — 3 tentativas antes do TTL
    // expirar, dando margem para falhas transientes do Redis.
    // Se a renovação falha (lock não é mais nossa), abortamos o
    // processo para que o orquestrador suba uma nova réplica que
    // dispute a eleição limpa. Continuar rodando os repeatables
    // sem leadership confirmada causaria cron 2x.
    renewTimer = setInterval(async () => {
      try {
        const renewed = await renewLeaderLock(
          LEADER_KEY,
          fingerprint,
          TTL_SECONDS,
        );
        if (!renewed) {
          bullLeaderRenewals.labels("lost").inc();
          log.error(
            { fingerprint },
            "Leader lock perdida — encerrando para re-eleição",
          );
          process.exit(1);
        }
        bullLeaderRenewals.labels("ok").inc();
      } catch (err) {
        bullLeaderRenewals.labels("error").inc();
        log.error({ err }, "Erro renovando leader lock — encerrando");
        process.exit(1);
      }
    }, RENEW_INTERVAL_MS);
    renewTimer.unref();
  } else {
    log.info("Outra réplica é líder — apenas processando jobs como consumer");
  }

  return {
    async close() {
      if (renewTimer) clearInterval(renewTimer);
      // Liberar a lock no shutdown gracioso para acelerar re-eleição
      // (sem isso, outra réplica precisa esperar o TTL expirar).
      if (fingerprint) {
        try {
          await releaseLeaderLock(LEADER_KEY, fingerprint);
        } catch (err) {
          log.warn({ err }, "Falha liberando leader lock no shutdown");
        }
      }
      await Promise.allSettled(
        workers.map(async (w) => {
          try {
            await w.close();
          } catch (err) {
            log.error({ err }, "Erro ao fechar worker");
          }
        }),
      );
    },
  };
}
