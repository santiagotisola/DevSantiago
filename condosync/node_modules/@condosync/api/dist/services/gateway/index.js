"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GatewayFactory = void 0;
const asaas_service_1 = require("./asaas.service");
class GatewayFactory {
    static getService(type) {
        switch (type) {
            case 'ASAAS':
                return asaas_service_1.asaasService;
            default:
                return null;
        }
    }
}
exports.GatewayFactory = GatewayFactory;
//# sourceMappingURL=index.js.map