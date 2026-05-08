import axios, { AxiosInstance, AxiosError } from 'axios';
import CircuitBreaker from 'opossum';
import { ChargeStatus } from '@prisma/client';
import { IGatewayService, GatewayPaymentResponse } from './types';
import { logger } from '../../config/logger';

const log = logger.child({ module: 'asaas.service' });

/**
 * Cliente Asaas com:
 *  - Timeout 8s por request (default Node era ilimitado).
 *  - Circuit breaker (opossum): após 5 falhas em 30s, abre por
 *    60s; em half-open testa 1 request; se ok, fecha.
 *  - Retry interno NÃO — quem reagenda é o BullMQ caller (com
 *    backoff exponencial). Retry no axios viraria duplo retry.
 *  - Logs com contexto e ANTES de propagar erro (visibilidade).
 *
 * Em estado open, chamadas falham imediatamente com
 * "Breaker open" — pool de conexões HTTP não acumula em fila.
 */
export class AsaasService implements IGatewayService {
  private readonly baseUrl = 'https://sandbox.asaas.com/api/v3'; // TODO: prod via env
  private readonly http: AxiosInstance;
  private readonly breaker: CircuitBreaker<[AsaasRequest], unknown>;

  constructor() {
    this.http = axios.create({
      baseURL: this.baseUrl,
      timeout: 8_000,
      // headers default vazios — apiKey vem por request via config.
    });

    // Wrap em opossum: a função recebe um AsaasRequest e despacha.
    this.breaker = new CircuitBreaker(
      async (req: AsaasRequest) => {
        return this.http.request({
          method: req.method,
          url: req.url,
          data: req.data,
          headers: { access_token: req.apiKey },
        });
      },
      {
        timeout: 8_000,
        errorThresholdPercentage: 50,
        rollingCountTimeout: 30_000,
        rollingCountBuckets: 6,
        resetTimeout: 60_000, // half-open após 60s
        name: 'asaas',
      },
    );

    this.breaker.on('open', () =>
      log.error({ breaker: 'asaas' }, 'Circuit breaker ABERTO — Asaas degradado'),
    );
    this.breaker.on('halfOpen', () =>
      log.warn({ breaker: 'asaas' }, 'Circuit breaker HALF-OPEN — testando'),
    );
    this.breaker.on('close', () =>
      log.info({ breaker: 'asaas' }, 'Circuit breaker FECHADO — Asaas saudável'),
    );
  }

  private async request<T>(req: AsaasRequest): Promise<T> {
    try {
      const response = (await this.breaker.fire(req)) as { data: T };
      return response.data;
    } catch (err) {
      if (err instanceof AxiosError) {
        log.warn(
          {
            url: req.url,
            method: req.method,
            status: err.response?.status,
            data: err.response?.data,
            code: err.code,
          },
          'Asaas request failed',
        );
      } else {
        log.warn({ err: String(err), url: req.url }, 'Asaas request error');
      }
      throw err;
    }
  }

  async createPayment(charge: any, config: { apiKey: string }): Promise<GatewayPaymentResponse> {
    try {
      // 1. Criar cobrança
      const payment: AsaasPayment = await this.request({
        method: 'POST',
        url: '/payments',
        apiKey: config.apiKey,
        data: {
          customer: charge.unitId,
          billingType: 'UNDEFINED',
          value: Number(charge.amount),
          dueDate: charge.dueDate,
          description: charge.description,
          externalReference: charge.id,
        },
      });

      // 2. Buscar QR Code PIX (best-effort).
      let pixQrCode: string | undefined;
      let pixCopyPaste: string | undefined;
      try {
        const pix = await this.request<{ encodedImage: string; payload: string }>({
          method: 'GET',
          url: `/payments/${payment.id}/pixQrCode`,
          apiKey: config.apiKey,
        });
        pixQrCode = pix.encodedImage;
        pixCopyPaste = pix.payload;
      } catch {
        // Não-fatal — algumas cobranças não têm PIX.
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
    } catch {
      throw new Error('Falha na integração com o gateway de pagamento.');
    }
  }

  async getPaymentStatus(gatewayId: string, apiKey: string): Promise<ChargeStatus> {
    const data = await this.request<{ status: string }>({
      method: 'GET',
      url: `/payments/${gatewayId}`,
      apiKey,
    });
    const statusMap: Record<string, ChargeStatus> = {
      RECEIVED: 'PAID',
      CONFIRMED: 'PAID',
      OVERDUE: 'OVERDUE',
      CANCELLED: 'CANCELED',
      PENDING: 'PENDING',
    };
    return statusMap[data.status] || 'PENDING';
  }

  async refundPayment(gatewayId: string, apiKey: string): Promise<boolean> {
    await this.request({
      method: 'POST',
      url: `/payments/${gatewayId}/refund`,
      apiKey,
      data: {},
    });
    return true;
  }
}

interface AsaasRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  apiKey: string;
  data?: unknown;
}

interface AsaasPayment {
  id: string;
  status: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  identificationField?: string;
}

export const asaasService = new AsaasService();
