import { ChargeStatus } from '@prisma/client';

export interface GatewayPaymentResponse {
  gatewayId: string;
  gatewayStatus: string;
  paymentLink?: string;
  pixQrCode?: string;
  pixCopyPaste?: string;
  boletoUrl?: string;
  boletoCode?: string;
}

export interface IGatewayService {
  createPayment(charge: any, config: { apiKey: string; config?: any }): Promise<GatewayPaymentResponse>;
  getPaymentStatus(gatewayId: string, apiKey: string): Promise<ChargeStatus>;
  refundPayment(gatewayId: string, apiKey: string): Promise<boolean>;
}
