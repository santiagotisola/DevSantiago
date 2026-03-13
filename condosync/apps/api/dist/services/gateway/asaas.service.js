"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.asaasService = exports.AsaasService = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../../config/logger");
class AsaasService {
    constructor() {
        this.baseUrl = 'https://sandbox.asaas.com/api/v3'; // Sandbox para dev
    }
    async createPayment(charge, config) {
        try {
            // 1. Criar cobrança no Asaas
            const response = await axios_1.default.post(`${this.baseUrl}/payments`, {
                customer: charge.unitId, // No Asaas, precisaríamos do ID do cliente (morador). 
                // Simplificação: Assume que já existe ou criaremos antes.
                billingType: 'UNDEFINED', // Deixa o morador escolher (Boleto/PIX/Cartão)
                value: Number(charge.amount),
                dueDate: charge.dueDate,
                description: charge.description,
                externalReference: charge.id,
            }, { headers: { access_token: config.apiKey } });
            const payment = response.data;
            // 2. Buscar QR Code PIX se necessário
            let pixQrCode, pixCopyPaste;
            try {
                const pixRes = await axios_1.default.get(`${this.baseUrl}/payments/${payment.id}/pixQrCode`, {
                    headers: { access_token: config.apiKey },
                });
                pixQrCode = pixRes.data.encodedImage;
                pixCopyPaste = pixRes.data.payload;
            }
            catch (e) {
                logger_1.logger.warn(`Falha ao buscar PIX para cobrança ${payment.id}`);
            }
            return {
                gatewayId: payment.id,
                gatewayStatus: payment.status,
                paymentLink: payment.invoiceUrl,
                boletoUrl: payment.bankSlipUrl,
                boletoCode: payment.identificationField,
                pixQrCode,
                pixCopyPaste,
            };
        }
        catch (error) {
            logger_1.logger.error('Erro ao criar pagamento no Asaas:', error.response?.data || error.message);
            throw new Error('Falha na integração com o gateway de pagamento.');
        }
    }
    async getPaymentStatus(gatewayId, apiKey) {
        const response = await axios_1.default.get(`${this.baseUrl}/payments/${gatewayId}`, {
            headers: { access_token: apiKey },
        });
        const statusMap = {
            RECEIVED: 'PAID',
            CONFIRMED: 'PAID',
            OVERDUE: 'OVERDUE',
            CANCELLED: 'CANCELED',
            PENDING: 'PENDING',
        };
        return statusMap[response.data.status] || 'PENDING';
    }
    async refundPayment(gatewayId, apiKey) {
        await axios_1.default.post(`${this.baseUrl}/payments/${gatewayId}/refund`, {}, {
            headers: { access_token: apiKey },
        });
        return true;
    }
}
exports.AsaasService = AsaasService;
exports.asaasService = new AsaasService();
//# sourceMappingURL=asaas.service.js.map