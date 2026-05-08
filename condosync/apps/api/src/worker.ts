/**
 * Entry point dedicado para rodar workers BullMQ em processo
 * separado da API HTTP. Use:
 *
 *   node dist/worker.js
 *
 * (ou `ts-node-dev --transpile-only src/worker.ts` em dev)
 *
 * Em deploy: subir como serviço sibling ao da API com a mesma
 * imagem e CMD diferente. Setar RUN_WORKERS=false na API para
 * que ela não dispare workers próprios.
 */
// OpenTelemetry hoisted — auto-instrumenta http/ioredis/bullmq/prisma
// nos workers também.
import "./config/tracing";
import "express-async-errors";
import { logger } from "./config/logger";
import { prisma } from "./config/prisma";
import { registerWorkers } from "./workers/registerWorkers";

(async () => {
  logger.info("CondoSync worker iniciando…");
  const handles = await registerWorkers();
  logger.info("Workers registrados, processando jobs.");

  // Graceful shutdown — mesma sequência que server.ts.
  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`Worker recebeu ${signal} — encerrando`);
    const force = setTimeout(() => {
      logger.error("Worker shutdown excedeu 25s — forçando exit");
      process.exit(1);
    }, 25_000);
    force.unref();
    try {
      await handles.close();
      await prisma.$disconnect();
      process.exit(0);
    } catch (err) {
      logger.error("Erro no shutdown do worker", err);
      process.exit(1);
    }
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
})().catch((err) => {
  logger.error("Falha fatal ao iniciar worker", err);
  process.exit(1);
});
