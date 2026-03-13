import { GatewayType } from '@prisma/client';
import { IGatewayService } from './types';
import { asaasService } from './asaas.service';

export class GatewayFactory {
  static getService(type: GatewayType): IGatewayService | null {
    switch (type) {
      case 'ASAAS':
        return asaasService;
      default:
        return null;
    }
  }
}
