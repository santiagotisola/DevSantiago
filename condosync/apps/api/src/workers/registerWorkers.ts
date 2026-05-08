import { logger } from "../config/logger";
import {
  releaseLeaderLock,
  renewLeaderLock,
  tryAcquireLeaderLock,
} from "../config/redis";
import { bullJobsTotal, bullLeaderRenewals } from "../config/metrics";

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
  ].filter(Boolean) as WorkerLike[];

  // Pluga métricas Prometheus em cada worker.
  for (const w of workers) {
    const queueName = w.name ?? "unknown";
    w.on?.("completed", () => {
      bullJobsTotal.labels(queueName, "completed").inc();
    });
    w.on?.("failed", () => {
      bullJobsTotal.labels(queueName, "failed").inc();
    });
  }

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
