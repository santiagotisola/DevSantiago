import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { webhookAsaasEvents } from '../../config/metrics';
import { enqueueWebhookProcessing } from './webhook.processor';

const router = Router();

const AsaasWebhookSchema = z.object({
  // Asaas envia "id" no nível raiz a partir da v3 do webhook
  // (event id do próprio gateway). Mantemos optional + fallback
  // para compor a chave de idempotência.
  id: z.string().min(1).optional(),
  event: z.string().min(1),
  payment: z
    .object({
      id: z.string().min(1),
      value: z.coerce.number().finite().nonnegative(),
      status: z.string().optional(),
      confirmedDate: z.string().optional(),
      clientPaymentDate: z.string().optional(),
    })
    .passthrough(),
});

type AsaasWebhookPayload = z.infer<typeof AsaasWebhookSchema>;

const compareTokens = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
};

/**
 * POST /webhooks/asaas
 *
 * Outbox pattern: handler é apenas o "front door" — autentica,
 * valida, persiste atomicamente e enfileira processamento.
 * Worker (webhook.processor.ts) faz o trabalho real com retry
 * automático em falhas transitórias.
 *
 * Garantias:
 *  - Token obrigatório, comparação constant-time.
 *  - Body parseado com zod.
 *  - WebhookEvent.create com UNIQUE (provider, externalId) →
 *    duplicatas idempotentes (200 silencioso).
 *  - Processamento NUNCA bloqueia o response do Asaas → 200 rápido,
 *    sem timeout do gateway nem retry desnecessário.
 *  - Se o processamento falhar, BullMQ retry exponencial. Row
 *    permanece pendente até sucesso ou alerta operacional.
 */
router.post('/asaas', async (req: Request, res: Response) => {
  // 1. Auth: token obrigatório, sempre. Sem token configurado = 503.
  const expected = env.ASAAS_WEBHOOK_TOKEN;
  if (!expected) {
    logger.error(
      'Webhook Asaas chamado mas ASAAS_WEBHOOK_TOKEN não está configurado',
    );
    return res.status(503).json({ error: 'Webhook indisponível' });
  }

  const incoming = String(req.headers['asaas-access-token'] ?? '');
  if (!incoming || !compareTokens(incoming, expected)) {
    logger.warn('Webhook Asaas rejeitado — token inválido');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // 2. Validação do payload — qualquer corpo malformado é 400.
  let body: AsaasWebhookPayload;
  try {
    body = AsaasWebhookSchema.parse(req.body);
  } catch (err) {
    logger.warn({ err }, 'Webhook Asaas com payload inválido');
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const { event, payment } = body;
  const externalId = body.id ?? `${event}:${payment.id}`;

  // 3. Persiste o evento (atômico, idempotente).
  let webhookEventId: string;
  try {
    const wh = await prisma.webhookEvent.create({
      data: {
        provider: 'asaas',
        externalId,
        eventType: event,
        payload: req.body as Prisma.InputJsonValue,
      },
    });
    webhookEventId = wh.id;
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      // Duplicata: outra entrega anterior já gravou esse evento.
      // Pode ter sido processada ou estar pendente; em qualquer
      // caso, NÃO precisamos enfileirar de novo (jobId garantiria
      // dedupe, mas mais barato evitar). 200 sem efeito.
      logger.info(
        { externalId, event },
        'Webhook Asaas duplicado — ignorado idempotentemente',
      );
      webhookAsaasEvents.labels(event, 'duplicate').inc();
      return res.status(200).send();
    }
    webhookAsaasEvents.labels(event, 'error').inc();
    throw err;
  }

  // 4. Enfileira processamento. Falha aqui é não-fatal: row já está
  //    persistida com processedAt=null; um job de "drenar pendentes"
  //    pode reprocessá-la (ver runbook). Mas em prática Redis é
  //    confiável; se enqueue falhar, o request já gravou — Asaas
  //    recebe 200, e operador resolve.
  try {
    await enqueueWebhookProcessing(webhookEventId);
  } catch (err) {
    logger.error(
      { err, webhookEventId },
      'Falha ao enfileirar processamento — row pendente',
    );
    // Não retornar erro para Asaas: o evento está gravado.
  }

  webhookAsaasEvents.labels(event, 'received').inc();
  logger.info(
    { event, paymentId: payment.id, externalId, webhookEventId },
    'Webhook Asaas recebido — enfileirado para processamento',
  );

  return res.status(200).send();
});

export default router;
