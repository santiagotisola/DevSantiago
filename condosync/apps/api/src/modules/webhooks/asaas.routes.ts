import { Router, Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { ChargeStatus, FinancialTransactionType } from '@prisma/client';
import { logger } from '../../config/logger';

const router = Router();

// Endpoint: /api/v1/webhooks/asaas
router.post('/asaas', async (req: Request, res: Response) => {
  // Validar token do webhook (segurança contra requisições forjadas)
  if (env.ASAAS_WEBHOOK_TOKEN) {
    const incomingToken = req.headers['asaas-access-token'] as string;
    if (incomingToken !== env.ASAAS_WEBHOOK_TOKEN) {
      logger.warn('Webhook Asaas rejeitado — token inválido');
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const { event, payment } = req.body;

  logger.info(`Webhook Asaas recebido: ${event} para pagamento ${payment.id}`);

  // 1. Verificar se o evento é de pagamento confirmado ou recebido
  if (['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'].includes(event)) {
    const charge = await prisma.charge.findFirst({
      where: { gatewayId: payment.id },
      include: { account: true },
    });

    if (!charge) {
      logger.warn(`Cobrança não encontrada para gatewayId: ${payment.id}`);
      return res.status(200).send(); // Responder 200 para o Asaas não reenviar
    }

    if (charge.status === 'PAID') {
      return res.status(200).send();
    }

    // 2. Atualizar status da cobrança e criar transação financeira
    await prisma.$transaction([
      // Atualizar cobrança
      prisma.charge.update({
        where: { id: charge.id },
        data: {
          status: 'PAID',
          paidAt: new Date(payment.confirmedDate || payment.clientPaymentDate || new Date()),
          paidAmount: payment.value,
          gatewayStatus: payment.status,
        },
      }),
      // Criar transação de crédito na conta
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

    logger.info(`Pagamento processado com sucesso: ${charge.id}`);
  }

  // 3. Tratar outros eventos (vencimento, cancelamento, etc) opcionalmente
  if (event === 'PAYMENT_OVERDUE') {
    await prisma.charge.updateMany({
      where: { gatewayId: payment.id },
      data: { status: 'OVERDUE', gatewayStatus: 'OVERDUE' },
    });
  }

  return res.status(200).send();
});

export default router;
