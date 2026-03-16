"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const zod_1 = require("zod");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'test', 'production']).default('development'),
    PORT: zod_1.z.string().default('3333'),
    DATABASE_URL: zod_1.z.string().min(1, 'DATABASE_URL é obrigatório'),
    JWT_SECRET: zod_1.z.string().min(32, 'JWT_SECRET deve ter ao menos 32 caracteres'),
    JWT_REFRESH_SECRET: zod_1.z.string().min(32),
    JWT_EXPIRES_IN: zod_1.z.string().default('1h'),
    JWT_REFRESH_EXPIRES_IN: zod_1.z.string().default('7d'),
    CORS_ORIGINS: zod_1.z.string().default('http://localhost:5173'),
    UPLOAD_PATH: zod_1.z.string().default('./uploads'),
    MAX_FILE_SIZE: zod_1.z.string().default('5242880'), // 5MB
    SMTP_HOST: zod_1.z.string().optional(),
    SMTP_PORT: zod_1.z.string().default('587'),
    SMTP_USER: zod_1.z.string().optional(),
    SMTP_PASS: zod_1.z.string().optional(),
    SMTP_FROM: zod_1.z.string().default('noreply@condosync.com.br'),
    BCRYPT_ROUNDS: zod_1.z.string().default('12'),
    REDIS_URL: zod_1.z.string().min(1, 'REDIS_URL é obrigatório'),
    OPENAI_API_KEY: zod_1.z.string().optional(),
    OPENAI_MODEL: zod_1.z.string().default('gpt-4o-mini'),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.error('❌ Variáveis de ambiente inválidas:');
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
}
exports.env = parsed.data;
//# sourceMappingURL=env.js.map