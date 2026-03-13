import axios from 'axios';
import { ChargeStatus } from '@prisma/client';
import { IGatewayService, GatewayPaymentResponse } from './types';
import { logger } from '../../config/logger';

export class AsaasService implements IGatewayService {
  private readonly baseUrl = 'https://sandbox.asaas.com/api/v3'; // Sandbox para dev

  async createPayment(charge: any, config: { apiKey: string }): Promise<GatewayPaymentResponse> {
    try {
      // 1. Criar cobrança no Asaas
      const response = await axios.post(
        `${this.baseUrl}/payments`,
        {
          customer: charge.unitId, // No Asaas, precisaríamos do ID do cliente (morador). 
          // Simplificação: Assume que já existe ou criaremos antes.
          billingType: 'UNDEFINED', // Deixa o morador escolher (Boleto/PIX/Cartão)
          value: Number(charge.amount),
          dueDate: charge.dueDate,
          description: charge.description,
          externalReference: charge.id,
        },
        { headers: { access_token: config.apiKey } }
      );

      const payment = response.data;

      // 2. Buscar QR Code PIX se necessário
      let pixQrCode, pixCopyPaste;
      try {
        const pixRes = await axios.get(`${this.baseUrl}/payments/${payment.id}/pixQrCode`, {
          headers: { access_token: config.apiKey },
        });
        pixQrCode = pixRes.data.encodedImage;
        pixCopyPaste = pixRes.data.payload;
      } catch (e) {
        logger.warn(`Falha ao buscar PIX para cobrança ${payment.id}`);
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
    } catch (error: any) {
      logger.error('Erro ao criar pagamento no Asaas:', error.response?.data || error.message);
      throw new Error('Falha na integração com o gateway de pagamento.');
    }
  }

  async getPaymentStatus(gatewayId: string, apiKey: string): Promise<ChargeStatus> {
    const response = await axios.get(`${this.baseUrl}/payments/${gatewayId}`, {
      headers: { access_token: apiKey },
    });

    const statusMap: Record<string, ChargeStatus> = {
      RECEIVED: 'PAID',
      CONFIRMED: 'PAID',
      OVERDUE: 'OVERDUE',
      CANCELLED: 'CANCELED',
      PENDING: 'PENDING',
    };

    return statusMap[response.data.status] || 'PENDING';
  }

  async refundPayment(gatewayId: string, apiKey: string): Promise<boolean> {
    await axios.post(`${this.baseUrl}/payments/${gatewayId}/refund`, {}, {
      headers: { access_token: apiKey },
    });
    return true;
  }
}

export const asaasService = new AsaasService();
