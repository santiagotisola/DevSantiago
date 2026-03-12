"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.createModuleLogger = createModuleLogger;
const winston_1 = __importDefault(require("winston"));
const env_1 = require("./env");
const logFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.splat(), env_1.env.NODE_ENV === 'production'
    ? winston_1.default.format.json()
    : winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.printf(({ timestamp, level, message, module: mod, ...meta }) => {
        const prefix = mod ? `[${mod}] ` : '';
        const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
        return `[${timestamp}] ${level}: ${prefix}${message}${metaStr}`;
    })));
exports.logger = winston_1.default.createLogger({
    level: env_1.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: logFormat,
    transports: [
        new winston_1.default.transports.Console(),
        new winston_1.default.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        new winston_1.default.transports.File({
            filename: 'logs/combined.log',
            maxsize: 5242880,
            maxFiles: 5,
        }),
    ],
});
/**
 * Cria um logger com contexto de módulo (ex: "finance", "portaria").
 * Uso: const log = createModuleLogger('finance');
 *      log.info('Cobrança criada', { chargeId, amount });
 */
function createModuleLogger(moduleName) {
    return exports.logger.child({ module: moduleName });
}
//# sourceMappingURL=logger.js.map