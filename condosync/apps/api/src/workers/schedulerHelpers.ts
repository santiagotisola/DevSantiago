import type { Queue, JobsOptions } from "bullmq";
import { logger } from "../config/logger";

const log = logger.child({ module: "schedulerHelpers" });

/**
 * Registra um repeatable garantindo idempotência mesmo se o pattern
 * mudar entre deploys.
 *
 * Problema sem teardown: se um deploy mudar `repeat.pattern` de
 * "0 9 * * *" para "0 8 * * *", BullMQ vai criar um novo repeatable
 * (com hash diferente) sem remover o antigo. Resultado: cron 2x/dia.
 *
 * Esta função:
 *  1. Lista os repeatables atuais.
 *  2. Remove qualquer um cujo `name` bata com o que vamos registrar
 *     (cobre tanto pattern antigo quanto qualquer instância órfã
 *     de outras réplicas/jobIds passados).
 *  3. Adiciona o novo com `jobId` fixo (deduplicação BullMQ).
 *
 * `attempts` e `backoff` aplicados como defaults; podem ser
 * sobrescritos via `options`.
 */
export async function registerRepeatable(
  queue: Queue,
  name: string,
  pattern: string,
  options: Omit<JobsOptions, "repeat" | "jobId"> & { jobId?: string } = {},
) {
  const jobId = options.jobId ?? `repeat:${name}`;

  // 1. Remove repeatables antigos com o mesmo `name` (mas pattern
  //    potencialmente diferente, hash distinto, ou deixados por
  //    réplicas anteriores sem jobId).
  const existing = await queue.getRepeatableJobs();
  const stale = existing.filter((j) => j.name === name);
  for (const job of stale) {
    try {
      await queue.removeRepeatableByKey(job.key);
      log.info(
        { queue: queue.name, jobName: name, key: job.key },
        "Repeatable órfão removido",
      );
    } catch (err) {
      log.warn({ err, jobKey: job.key }, "Falha removendo repeatable órfão");
    }
  }

  // 2. Adiciona o novo com jobId fixo (BullMQ deduplica em
  //    multi-réplica).
  await queue.add(name, {}, {
    attempts: 5,
    backoff: { type: "exponential", delay: 30_000 },
    removeOnComplete: 100,
    removeOnFail: 1000,
    ...options,
    jobId,
    repeat: { pattern },
  });

  log.info(
    { queue: queue.name, jobName: name, pattern, jobId },
    "Repeatable registrado",
  );
}
