import winston from 'winston';
export declare const logger: winston.Logger;
/**
 * Cria um logger com contexto de módulo (ex: "finance", "portaria").
 * Uso: const log = createModuleLogger('finance');
 *      log.info('Cobrança criada', { chargeId, amount });
 */
export declare function createModuleLogger(moduleName: string): winston.Logger;
//# sourceMappingURL=logger.d.ts.map