import { ChargeStatus } from '@prisma/client';
import { IGatewayService, GatewayPaymentResponse } from './types';
export declare class AsaasService implements IGatewayService {
    private readonly baseUrl;
    createPayment(charge: any, config: {
        apiKey: string;
    }): Promise<GatewayPaymentResponse>;
    getPaymentStatus(gatewayId: string, apiKey: string): Promise<ChargeStatus>;
    refundPayment(gatewayId: string, apiKey: string): Promise<boolean>;
}
export declare const asaasService: AsaasService;
//# sourceMappingURL=asaas.service.d.ts.map