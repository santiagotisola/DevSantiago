import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { logger } from '../../config/logger';

const router = Router();

// Eventos que processamos. Outros eventos são apenas registrados
// como WebhookEvent para auditoria e respondidos com 200.
const PAYMENT_RECEIVED_EVENTS = new Set([
  'PAYMENT_RECEIVED',
  'PAYMENT_CONFIRMED',
]);

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
  // timingSafeEqual exige buffers de mesmo tamanho.
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
};

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
  // Chave de idempotência: usa o id do evento se houver,
  // senão compõe (event + paymentId).
  const externalId = body.id ?? `${event}:${payment.id}`;

  // 3. Idempotência: tentamos gravar o evento. Se duplicado, 200 sem efeito.
  try {
    await prisma.webhookEvent.create({
      data: {
        provider: 'asaas',
        externalId,
        eventType: event,
        payload: req.body as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      logger.info(
        { externalId, event },
        'Webhook Asaas duplicado — ignorado idempotentemente',
      );
      return res.status(200).send();
    }
    throw err;
  }

  logger.info(
    { event, paymentId: payment.id, externalId },
    'Webhook Asaas recebido',
  );

  // 4. Processamento por tipo de evento.
  if (PAYMENT_RECEIVED_EVENTS.has(event)) {
    const charge = await prisma.charge.findFirst({
      where: { gatewayId: payment.id },
      include: { account: true },
    });

    if (!charge) {
      logger.warn(
        { gatewayId: payment.id },
        'Cobrança não encontrada para gatewayId',
      );
      return res.status(200).send();
    }

    if (charge.status === 'PAID') {
      return res.status(200).send();
    }

    try {
      await prisma.$transaction([
        prisma.charge.update({
          where: { id: charge.id },
          data: {
            status: 'PAID',
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
            type: 'INCOME',
            amount: payment.value,
            description: `Recebimento: ${charge.description} (Unidade ${charge.unitId})`,
            dueDate: charge.dueDate,
            paidAt: new Date(),
            referenceMonth: charge.referenceMonth,
            chargeId: charge.id,
            createdBy: 'SYSTEM_WEBHOOK',
          },
        }),
      ]);
      logger.info({ chargeId: charge.id }, 'Pagamento processado');
    } catch (err) {
      // P2002 no índice único parcial fin_tx_charge_income_unique
      // significa que outra réplica já processou o mesmo charge —
      // aceitamos como sucesso silencioso.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        logger.info(
          { chargeId: charge.id },
          'Transação INCOME já existe para este charge — duplicado',
        );
        return res.status(200).send();
      }
      throw err;
    }
  } else if (event === 'PAYMENT_OVERDUE') {
    await prisma.charge.updateMany({
      where: { gatewayId: payment.id },
      data: { status: 'OVERDUE', gatewayStatus: 'OVERDUE' },
    });
  }

  return res.status(200).send();
});

export default router;
