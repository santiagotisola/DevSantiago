import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const INSECURE_SECRET_PATTERNS: RegExp[] = [
  /condosync-super-secret/i,
  /change-?in-?production/i,
  /troque-por/i,
];

const isInsecureSecret = (value: string) =>
  INSECURE_SECRET_PATTERNS.some((re) => re.test(value));

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.string().default('3333'),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatório'),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter ao menos 32 caracteres'),
    JWT_REFRESH_SECRET: z.string().min(32),
    JWT_EXPIRES_IN: z.string().default('1h'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
    CORS_ORIGINS: z.string().default('http://localhost:5173'),
    UPLOAD_PATH: z.string().default('./uploads'),
    MAX_FILE_SIZE: z.string().default('5242880'), // 5MB
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.string().default('587'),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_FROM: z.string().default('noreply@condosync.com.br'),
    BCRYPT_ROUNDS: z.string().default('12'),
    REDIS_URL: z.string().min(1, 'REDIS_URL é obrigatório'),
    OPENAI_API_KEY: z.string().optional(),
    OPENAI_MODEL: z.string().default('gpt-4o-mini'),
    // Groq — alternativa gratuita ao OpenAI (console.groq.com)
    GROQ_API_KEY: z.string().optional(),
    GROQ_MODEL: z.string().default('llama-3.3-70b-versatile'),
    ASAAS_WEBHOOK_TOKEN: z.string().optional(),
    FRONTEND_URL: z.string().default('http://localhost:5173'),
    // Resend — e-mail transacional em produção
    RESEND_API_KEY: z.string().optional(),
    // Sentry — monitoramento de erros em produção
    SENTRY_DSN: z.string().optional(),
    // Encryption — chave-mestre (base64, 32 bytes) usada para cifrar
    // campos sensíveis no DB (gatewayKey, gatewayConfig, etc).
    // Gerar com: openssl rand -base64 32
    APP_ENCRYPTION_KEY: z.string().optional(),
    // Chave anterior — usada apenas em rotação (decrypt fallback).
    APP_ENCRYPTION_KEY_PREVIOUS: z.string().optional(),
    // VAPID — Web Push (Q1.3). Gerar com `npx web-push generate-vapid-keys`.
    // Sem essas chaves push silenciosamente desliga (não quebra o app).
    VAPID_PUBLIC_KEY: z.string().optional(),
    VAPID_PRIVATE_KEY: z.string().optional(),
    VAPID_SUBJECT: z.string().default('mailto:contato@condosync.com.br'),
    // WebAuthn / Passkeys (Q1.5). RP_ID é o domínio (sem protocolo); a
    // origin precisa bater no que o navegador envia.
    WEBAUTHN_RP_NAME: z.string().default('CondoSync'),
    WEBAUTHN_RP_ID: z.string().optional(),
    WEBAUTHN_ORIGIN: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (isInsecureSecret(data.JWT_SECRET)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_SECRET'],
        message:
          'JWT_SECRET parece um valor de exemplo/default. Gere um novo com `openssl rand -base64 48`.',
      });
    }
    if (isInsecureSecret(data.JWT_REFRESH_SECRET)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_REFRESH_SECRET'],
        message:
          'JWT_REFRESH_SECRET parece um valor de exemplo/default. Gere um novo com `openssl rand -base64 48`.',
      });
    }
    if (data.JWT_SECRET === data.JWT_REFRESH_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_REFRESH_SECRET'],
        message: 'JWT_REFRESH_SECRET deve ser diferente de JWT_SECRET.',
      });
    }
    // Em produção, email transacional é obrigatório (convites de morador,
    // recuperação de senha, etc). Em dev/test podemos cair no Mailpit SMTP.
    if (data.NODE_ENV === 'production' && !data.RESEND_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['RESEND_API_KEY'],
        message:
          'RESEND_API_KEY é obrigatório em produção (convites de morador e reset de senha dependem disso).',
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Variáveis de ambiente inválidas:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
