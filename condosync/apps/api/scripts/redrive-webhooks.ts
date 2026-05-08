/**
 * Re-enfileira WebhookEvents pendentes (processedAt IS NULL) para
 * o BullMQ worker. Útil se Redis tiver caído entre a gravação do
 * evento e o pickup do worker, ou se BullMQ apagou jobs por
 * removeOnFail.
 *
 * Uso:
 *   npm run redrive:webhooks -- --provider=asaas --older-than=10m --dry-run
 *   npm run redrive:webhooks -- --provider=asaas --older-than=10m --apply
 *
 * Idempotente: cada evento é re-enfileirado com jobId fixo, BullMQ
 * deduplica.
 */
import { PrismaClient } from "@prisma/client";
import { enqueueWebhookProcessing } from "../src/modules/webhooks/webhook.processor";

const prisma = new PrismaClient();

function parseDuration(s: string): number {
  const m = /^(\d+)([smh])$/.exec(s);
  if (!m) throw new Error(`duration inválida: ${s} (use 5m, 1h, 30s)`);
  const n = parseInt(m[1], 10);
  return n * { s: 1000, m: 60_000, h: 3_600_000 }[m[2] as "s" | "m" | "h"]!;
}

async function main() {
  const args = process.argv.slice(2);
  const provider = args.find((a) => a.startsWith("--provider="))?.split("=")[1] ?? "asaas";
  const olderThan = args.find((a) => a.startsWith("--older-than="))?.split("=")[1] ?? "10m";
  const dryRun = args.includes("--dry-run");
  const apply = args.includes("--apply");
  const maxAttempts = Number(
    args.find((a) => a.startsWith("--max-attempts="))?.split("=")[1] ?? 5,
  );

  if (!dryRun && !apply) {
    console.error("Uso: redrive-webhooks --provider=asaas --older-than=10m [--dry-run|--apply]");
    process.exit(1);
  }

  const cutoff = new Date(Date.now() - parseDuration(olderThan));

  const pending = await prisma.webhookEvent.findMany({
    where: {
      provider,
      processedAt: null,
      receivedAt: { lt: cutoff },
      attempts: { lt: maxAttempts },
    },
    orderBy: { receivedAt: "asc" },
    take: 1000,
  });

  console.log(
    `Encontrados ${pending.length} webhook_events pendentes (provider=${provider}, older-than=${olderThan})`,
  );

  if (dryRun) {
    for (const e of pending.slice(0, 20)) {
      console.log(
        `  - ${e.id} externalId=${e.externalId} eventType=${e.eventType} attempts=${e.attempts} receivedAt=${e.receivedAt.toISOString()}`,
      );
    }
    if (pending.length > 20) console.log(`  ... e ${pending.length - 20} outros`);
    return;
  }

  let enqueued = 0;
  for (const e of pending) {
    try {
      await enqueueWebhookProcessing(e.id);
      enqueued++;
    } catch (err) {
      console.error(`Falha ao enfileirar ${e.id}:`, err);
    }
  }

  console.log(`✅ Re-enfileirados: ${enqueued}/${pending.length}`);
  console.log("Acompanhar processamento via /metrics:");
  console.log("  webhook_asaas_events_total{result=\"processed\"}");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
