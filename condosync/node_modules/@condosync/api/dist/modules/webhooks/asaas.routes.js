"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../../config/prisma");
const logger_1 = require("../../config/logger");
const router = (0, express_1.Router)();
// Endpoint: /api/v1/webhooks/asaas
router.post('/asaas', async (req, res) => {
    const { event, payment } = req.body;
    logger_1.logger.info(`Webhook Asaas recebido: ${event} para pagamento ${payment.id}`);
    // 1. Verificar se o evento é de pagamento confirmado ou recebido
    if (['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'].includes(event)) {
        const charge = await prisma_1.prisma.charge.findFirst({
            where: { gatewayId: payment.id },
            include: { account: true },
        });
        if (!charge) {
            logger_1.logger.warn(`Cobrança não encontrada para gatewayId: ${payment.id}`);
            return res.status(200).send(); // Responder 200 para o Asaas não reenviar
        }
        if (charge.status === 'PAID') {
            return res.status(200).send();
        }
        // 2. Atualizar status da cobrança e criar transação financeira
        await prisma_1.prisma.$transaction([
            // Atualizar cobrança
            prisma_1.prisma.charge.update({
                where: { id: charge.id },
                data: {
                    status: 'PAID',
                    paidAt: new Date(payment.confirmedDate || payment.clientPaymentDate || new Date()),
                    paidAmount: payment.value,
                    gatewayStatus: payment.status,
                },
            }),
            // Criar transação de crédito na conta
            prisma_1.prisma.financialTransaction.create({
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
        logger_1.logger.info(`Pagamento processado com sucesso: ${charge.id}`);
    }
    // 3. Tratar outros eventos (vencimento, cancelamento, etc) opcionalmente
    if (event === 'PAYMENT_OVERDUE') {
        await prisma_1.prisma.charge.updateMany({
            where: { gatewayId: payment.id },
            data: { status: 'OVERDUE', gatewayStatus: 'OVERDUE' },
        });
    }
    return res.status(200).send();
});
exports.default = router;
//# sourceMappingURL=asaas.routes.js.map