import { logger } from "../config/logger";
import { tryAcquireLeaderLock } from "../config/redis";

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

  const workers = [
    notificationWorker,
    maintenanceAlertsWorker,
    financeWorker,
    contractAlertsWorker,
    collectionWorker,
    balanceteWorker,
  ].filter(Boolean) as Array<{ close(): Promise<void> }>;

  // Leader election: só uma réplica registra os repeatables.
  // Demais réplicas ainda processam jobs (são consumers), mas não
  // duplicam triggers de cron.
  const isLeader = await tryAcquireLeaderLock("schedulers", 4 * 60);
  if (isLeader) {
    log.info("Eleito líder — registrando schedulers (cron)");
    await Promise.all([
      registerMaintenanceAlertsSchedule(),
      registerFinanceSchedule(),
      registerContractAlertsSchedule(),
      registerCollectionSchedule(),
      registerBalanceteSchedule(),
    ]);

    // Renovar a lock periodicamente para que outra réplica não
    // assuma erradamente.
    const renew = setInterval(
      () => {
        tryAcquireLeaderLock("schedulers", 4 * 60).catch((err) =>
          log.error({ err }, "Falha ao renovar leader lock"),
        );
      },
      3 * 60 * 1000,
    );
    renew.unref();
  } else {
    log.info("Outra réplica é líder — apenas processando jobs como consumer");
  }

  return {
    async close() {
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
