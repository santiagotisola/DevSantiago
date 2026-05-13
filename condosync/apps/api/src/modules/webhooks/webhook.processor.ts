/**
 * Webhook outbox processor — desacopla a gravação do webhook
 * (rápida, idempotente) do processamento (atômico, com retry).
 *
 * Fluxo:
 *   1. POST /webhooks/asaas grava WebhookEvent + enfileira job.
 *   2. Worker pega job, lê WebhookEvent pelo id.
 *   3. Se já processado (processedAt != null), skip.
 *   4. Senão, executa $transaction([charge.update, fin_tx.create])
 *      e seta processedAt.
 *   5. Em falha, lança — BullMQ retry exponencial. Após 5 tentativas,
 *      vai para failed; row continua processedAt=null para alerta
 *      operacional.
 *
 * Garantias:
 *   - WebhookEvent UNIQUE (provider, externalId) → entrega única.
 *   - $transaction atômico → charge + fin_tx coerentes.
 *   - UNIQUE parcial fin_tx_charge_income → defesa em profundidade
 *     se duas réplicas processarem o mesmo job (não deveria acontecer
 *     com BullMQ, mas é última linha).
 *   - Idempotência via processedAt: re-execução do job é noop.
 */
import { Job, Queue, Worker } from "bullmq";
import { Prisma } from "@prisma/client";
import { bullConnection } from "../../config/redis";
import { prisma } from "../../config/prisma";
import { logger } from "../../config/logger";
import { webhookAsaasEvents } from "../../config/metrics";
import { cacheKeys, invalidate } from "../../config/cache";

const log = logger.child({ module: "webhook.processor" });
const QUEUE_NAME = "webhook-processor";

export interface WebhookJobData {
  webhookEventId: string;
}

const PAYMENT_RECEIVED_EVENTS = new Set([
  "PAYMENT_RECEIVED",
  "PAYMENT_CONFIRMED",
]);

export const webhookQueue = new Queue<WebhookJobData>(QUEUE_NAME, {
  connection: bullConnection(),
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: "exponential", delay: 30_000 },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  },
});

export async function enqueueWebhookProcessing(webhookEventId: string) {
  // jobId = webhookEventId garante dedupe se a rota tentar
  // enfileirar o mesmo evento 2x (ex: retry interno).
  await webhookQueue.add(
    "process",
    { webhookEventId },
    { jobId: `webhook:${webhookEventId}` },
  );
}

interface AsaasPayment {
  id: string;
  value: number;
  status?: string;
  confirmedDate?: string;
  clientPaymentDate?: string;
}

async function processAsaasPayment(eventId: string) {
  const wh = await prisma.webhookEvent.findUnique({
    where: { id: eventId },
  });
  if (!wh) {
    log.warn({ eventId }, "WebhookEvent não encontrado — possível truncate");
    return;
  }
  if (wh.processedAt) {
    log.info(
      { eventId, externalId: wh.externalId },
      "WebhookEvent já processado — skip",
    );
    return;
  }

  const payload = wh.payload as unknown as { event: string; payment: AsaasPayment };
  const { event, payment } = payload;

  // Incrementa attempts ANTES do trabalho (mesmo que falhe, conta).
  await prisma.webhookEvent.update({
    where: { id: eventId },
    data: { attempts: { increment: 1 } },
  });

  if (PAYMENT_RECEIVED_EVENTS.has(event)) {
    const charge = await prisma.charge.findFirst({
      where: { gatewayId: payment.id },
      include: { account: true },
    });

    if (!charge) {
      log.warn(
        { gatewayId: payment.id },
        "Cobrança não encontrada — webhook arquivado sem efeito",
      );
      await prisma.webhookEvent.update({
        where: { id: eventId },
        data: {
          processedAt: new Date(),
          processingError: "charge_not_found",
        },
      });
      return;
    }

    if (charge.status === "PAID") {
      // Já marcada como paga em outra ocasião; só fechamos o evento.
      await prisma.webhookEvent.update({
        where: { id: eventId },
        data: { processedAt: new Date() },
      });
      return;
    }

    try {
      await prisma.$transaction([
        prisma.charge.update({
          where: { id: charge.id },
          data: {
            status: "PAID",
            paidAt: new Date(
              payment.confirmedDate ||
                payment.clientPaymentDate ||
                new Date(),
            ),
            paidAmount: payment.value,
            gatewayStatus: payment.status ?? null,
          },
        }),
        prisma.financialTransaction.create({
          data: {
            accountId: charge.accountId,
            categoryId: charge.categoryId,
            type: "INCOME",
            amount: payment.value,
            description: `Recebimento: ${charge.description} (Unidade ${charge.unitId})`,
            dueDate: charge.dueDate,
            paidAt: new Date(),
            referenceMonth: charge.referenceMonth,
            chargeId: charge.id,
            createdBy: "SYSTEM_WEBHOOK",
          },
        }),
        prisma.webhookEvent.update({
          where: { id: eventId },
          data: { processedAt: new Date(), processingError: null },
        }),
      ]);
      log.info({ chargeId: charge.id, eventId }, "Pagamento processado (outbox)");
      webhookAsaasEvents.labels(event, "processed").inc();
      // Invalida cache do balance — webhook acabou de criar uma
      // INCOME, listagem subsequente deve refletir.
      await invalidate(cacheKeys.accountBalance(charge.accountId)).catch(() => {});
    } catch (err) {
      // P2002 no UNIQUE parcial fin_tx_charge_income significa que
      // outro processamento (race entre duas réplicas BullMQ) já
      // criou a transação. Aceitamos: só fechamos o evento.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        log.info(
          { chargeId: charge.id, eventId },
          "fin_tx_charge_income já existe — fechando evento",
        );
        await prisma.webhookEvent.update({
          where: { id: eventId },
          data: {
            processedAt: new Date(),
            processingError: "duplicate_income_index",
          },
        });
        webhookAsaasEvents.labels(event, "duplicate").inc();
        return;
      }
      // Outros erros: registra mensagem e relança para BullMQ retry.
      const errorMsg = String((err as Error).message ?? err);
      await prisma.webhookEvent.update({
        where: { id: eventId },
        data: { processingError: errorMsg.slice(0, 1000) },
      });
      throw err;
    }
  } else if (event === "PAYMENT_OVERDUE") {
    await prisma.charge.updateMany({
      where: { gatewayId: payment.id },
      data: { status: "OVERDUE", gatewayStatus: "OVERDUE" },
    });
    await prisma.webhookEvent.update({
      where: { id: eventId },
      data: { processedAt: new Date() },
    });
  } else {
    // Evento conhecido mas sem ação: arquiva.
    await prisma.webhookEvent.update({
      where: { id: eventId },
      data: { processedAt: new Date() },
    });
  }
}

export const webhookWorker = new Worker<WebhookJobData>(
  QUEUE_NAME,
  async (job: Job<WebhookJobData>) => {
    const { webhookEventId } = job.data;
    await processAsaasPayment(webhookEventId);
  },
  {
    connection: bullConnection(),
    concurrency: Number(process.env.WEBHOOK_CONCURRENCY ?? 10),
  },
);

webhookWorker.on("failed", (job, err) => {
  log.error(
    { jobId: job?.id, eventId: job?.data?.webhookEventId, attempts: job?.attemptsMade },
    `Webhook job falhou: ${err.message}`,
  );
});
