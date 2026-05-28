# ⚡ IMPACTO TÉCNICO PRÁTICO — Checklist Deploy Ready
**Data**: 27 de Maio de 2026  
**Objetivo**: Listar mudanças técnicas necessárias no código para estar pronto para produção com FREE tier  
**Status**: Em Progresso (algumas já feitas)

---

## 📋 CHECKLIST: O QUE FALTA PARA DEPLOY

### ✅ JÁ IMPLEMENTADO

#### 1. ✅ Suporte a Groq API (IA Gratuita)
- **Arquivo**: `apps/api/src/modules/ai/ai.routes.ts`
- **O que foi feito**:
  - Função `getAIConfig()` com prioridade para Groq
  - Fallback automático para OpenAI se GROQ_API_KEY não definido
  - Mensagens de status mostram qual provider está em uso
- **Status**: ✅ COMPLETO

#### 2. ✅ Rate Limiter sem Redis (MemStore)
- **Arquivo**: `apps/api/src/middleware/rateLimiter.ts`
- **O que foi feito**:
  - Rate limiter com fallback para MemStore (built-in)
  - Redis store carregado em background se disponível
  - Não quebra quando Redis indisponível
- **Status**: ✅ COMPLETO

#### 3. ✅ Variáveis de Ambiente Documentadas
- **Arquivo**: `apps/api/.env.example`
- **O que foi feito**:
  - GROQ_API_KEY adicionado
  - Comentários explicando FREE vs PAGO
- **Status**: ✅ COMPLETO

---

### ⚠️ FALTA IMPLEMENTAR

#### 1. 🟠 Database Migrations (Render/Neon)

**Problema**: Migrations devem rodar em produção antes do API iniciar

**O que fazer**:

```bash
# apps/api/Dockerfile (já existe, verificar)
# Deve ter no build:
RUN npx prisma migrate deploy
# (Automático ao iniciar Render)
```

**Status**: ⚠️ Verificar se está no Dockerfile

**Como checar**:
```bash
grep "prisma migrate" apps/api/Dockerfile
```

---

#### 2. 🟠 SMTP vs Resend (Fallback em Produção)

**Problema**: Em dev usa SMTP (Mailpit), em prod precisa usar Resend

**Código atual** (`apps/api/src/config/email.ts` ou similar):
```typescript
// ❌ PROBLEMA: Sempre tenta SMTP
const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  // ... etc
});
```

**O que fazer**: Detectar automaticamente e usar Resend em produção

```typescript
// ✅ SOLUÇÃO: Usar Resend se configurado
function getEmailConfig() {
  if (env.RESEND_API_KEY && env.NODE_ENV === 'production') {
    // Importar @resend/api ou similiar
    return {
      provider: 'resend',
      apiKey: env.RESEND_API_KEY,
    };
  }
  
  // Fallback para SMTP (dev/staging)
  return {
    provider: 'smtp',
    transport: nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: parseInt(env.SMTP_PORT),
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    }),
  };
}
```

**Impacto**: Sem isso, emails falharam em produção (Resend API não será usado)

**Status**: 🔴 CRÍTICO — Implementar antes de deploy

---

#### 3. 🟠 VAPID Keys Validadas em Startup

**Problema**: VAPID keys são necessárias para push, mas não são validadas ao iniciar

**O que fazer**: Validar VAPID keys no `server.ts`

```typescript
// apps/api/src/server.ts
if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
  logger.warn('⚠️ VAPID keys não configuradas — push notifications desabilitadas');
}
```

**Status**: 🟡 NÃO-CRÍTICO (push é nice-to-have, não core)

---

#### 4. 🟠 MongoDB Connection Pooling

**Problema**: MongoDB em produção precisa de pool de conexões

**Código atual**:
```typescript
// ❌ Conexão simples
const mongodb = await mongoose.connect(env.MONGODB_URI);
```

**O que fazer**: Adicionar options de pooling

```typescript
// ✅ Com pool
const mongodb = await mongoose.connect(env.MONGODB_URI, {
  maxPoolSize: 10,
  minPoolSize: 5,
  serverSelectionTimeoutMS: 5000,
  retryWrites: true,
});
```

**Impacto**: Sem pooling, primeiras conexões são lentas (~5s)

**Status**: 🟡 IMPORTANTE — Implementar antes de primeiro deploy

---

#### 5. 🟠 Sentry Inicializado Corretamente

**Problema**: Sentry deve inicializar ANTES de outros imports

**Status atual** (`apps/api/src/server.ts`):
```typescript
import * as Sentry from '@sentry/node';

// ✅ Já está no topo
if (process.env.SENTRY_DSN && process.env.NODE_ENV === 'production') {
  Sentry.init({ ... });
}
```

**Impacto**: Sem isso, erros não são capturados em Sentry

**Status**: ✅ JÁ IMPLEMENTADO

---

#### 6. 🟠 Health Check Endpoint Pronto

**Problema**: Render/UptimeRobot precisam verificar se API está up

**Status atual** (`apps/api/src/server.ts`):
```typescript
router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});
```

**O que melhorar**: Adicionar verificação de database

```typescript
// ✅ MELHORADO: Verifica conexão com DB
router.get('/health', async (req, res) => {
  try {
    // Testar conexão com PostgreSQL
    await prisma.$queryRaw`SELECT 1`;
    
    // Testar conexão com Redis (se disponível)
    if (redis) {
      await redis.ping();
    }
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      redis: 'connected',
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});
```

**Impacto**: Sem isso, UptimeRobot não consegue confirmar que serviço acordou do sleep mode

**Status**: 🟡 IMPORTANTE — Implementar para monitoramento funcionar

---

#### 7. 🟠 Cors Dinâmico por Ambiente

**Problema**: CORS está hardcoded no código (risco)

**Status atual**:
```typescript
// ❌ Problemático se CORS_ORIGINS não estiver definido corretamente
app.use(cors({ origin: env.CORS_ORIGINS.split(',') }));
```

**O que fazer**: Validar e registrar CORS ao iniciar

```typescript
// ✅ COM VALIDAÇÃO
const corsOrigins = env.CORS_ORIGINS.split(',').map(o => o.trim());
logger.info('CORS Origins configurados:', corsOrigins);

app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));
```

**Impacto**: Sem isso, frontend pode não conseguir comunicar com API

**Status**: 🟡 IMPORTANTE — Validar antes de deploy

---

#### 8. 🟠 Error Handler Logging em Produção

**Problema**: Erros precisam ser logados centralizadamente em produção

**Status atual** (`apps/api/src/middleware/errorHandler.ts`):
```typescript
// ✅ Já existe Sentry.captureException
// Mas precisa validar que está sendo chamado
```

**O que verificar**:
- Erros estão sendo capturados por Sentry em produção?
- Logs estão sendo escritos em arquivo?

**Recomendação**: Adicionar winston file transport

```typescript
// apps/api/src/config/logger.ts
const logger = winston.createLogger({
  transports: [
    new winston.transports.Console(),
    // ✅ Adicionar para produção
    ...(env.NODE_ENV === 'production' ? [
      new winston.transports.File({
        filename: '/app/logs/error.log',
        level: 'error',
      }),
      new winston.transports.File({
        filename: '/app/logs/combined.log',
      }),
    ] : []),
  ],
});
```

**Status**: 🟡 NÃO-CRÍTICO (Sentry já captura), mas recomendado

---

#### 9. 🟠 Graceful Shutdown

**Problema**: Quando Render reinicia serviço, é importante fechar conexões corretamente

**O que fazer**: Implementar signal handlers

```typescript
// apps/api/src/server.ts
process.on('SIGTERM', async () => {
  logger.info('SIGTERM recebido. Fechando conexões...');
  
  // Fechar server HTTP
  httpServer.close(async () => {
    // Fechar Prisma
    await prisma.$disconnect();
    
    // Fechar Redis
    if (redis) {
      await redis.quit();
    }
    
    // Fechar MongoDB
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    
    logger.info('Aplicação encerrada corretamente');
    process.exit(0);
  });
  
  // Timeout de 30s para forçar saída
  setTimeout(() => {
    logger.error('Timeout ao fechar aplicação, forçando exit');
    process.exit(1);
  }, 30000);
});
```

**Impacto**: Sem isso, conexões podem ficar abertas, causando memory leak

**Status**: 🟡 IMPORTANTE — Implementar antes de produção

---

#### 10. 🟠 Environment Variables Validation

**Problema**: Se faltar variável obrigatória, app inicia com erro silencioso

**Status atual** (`apps/api/src/config/env.ts`):
```typescript
// ✅ Já usa Zod para validação
// Mas precisa verificar que está validando em startup
```

**O que checar**:
```typescript
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Variáveis de ambiente inválidas:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1); // ✅ Deve fazer isso
}
```

**Status**: ✅ JÁ IMPLEMENTADO

---

### 🔧 IMPLEMENTAÇÃO: ORDEM DE PRIORIDADE

#### 🔴 CRÍTICO (Antes de Primeira Deploy)

1. **Email Resend Integration** (2-3h)
   - Implementar fallback SMTP vs Resend
   - Testar email em Render
   
2. **Health Check com DB** (30min)
   - Validar conexão ao iniciar
   - Responder 503 se DB down

3. **CORS Validation** (15min)
   - Logar CORS origins ao iniciar
   - Validar que web consegue chamar API

#### 🟠 ALTO (Antes de ir para Produção)

4. **MongoDB Connection Pooling** (30min)
   - Adicionar pool settings
   - Testar com múltiplas conexões

5. **Graceful Shutdown** (1h)
   - Implementar signal handlers
   - Testar com `docker kill`

6. **VAPID Keys Validation** (15min)
   - Avisar se keys não estão configuradas
   - Desabilitar push notifications gracefully

#### 🟡 MÉDIO (Melhorias)

7. **File Logging** (30min)
   - Adicionar winston file transport
   - Armazenar logs em `/app/logs`

8. **Database Migrations Check** (30min)
   - Verificar que Dockerfile roda migrations
   - Testar primeira deploy

---

## 📝 TEMPLATE: CHECKLIST PRÉ-DEPLOY

```markdown
# Deploy Checklist — Antes de Ir para Produção

- [ ] Code Review realizado
- [ ] TypeScript sem erros (npx tsc --noEmit)
- [ ] Testes passando (npm test)
- [ ] Email Resend funcionando em staging
- [ ] Health check respondendo 200
- [ ] CORS configurado corretamente
- [ ] Sentry DSN definido
- [ ] VAPID keys validadas
- [ ] UptimeRobot ping configurado
- [ ] Variáveis de ambiente copiadas para Render
- [ ] Database migrations testadas
- [ ] MongoDB pooling ativado
- [ ] Graceful shutdown testado
- [ ] Logs sendo escritos em arquivo
- [ ] Alertas Sentry funcionando
- [ ] E2E tests em staging passando
- [ ] Performance teste (>100 req/s)
- [ ] Segurança: CORS, Rate limit, helmet
- [ ] DNS apontando para Render
- [ ] SSL/TLS ativado em Cloudflare
```

---

## 🎯 RESUMO: IMPACTO DE NÃO FAZER ISSO

| Mudança | Sem Implementação | Com Implementação |
|---------|------------------|-------------------|
| **Email Resend** | Emails não enviam em prod | ✅ Funciona |
| **Health Check DB** | UptimeRobot falha | ✅ Monitora corretamente |
| **CORS Validation** | Frontend pode não conectar | ✅ Debug rápido |
| **Graceful Shutdown** | Memory leak, conexões abertas | ✅ Limpo |
| **MongoDB Pooling** | Primeiras 10 requisições lentas | ✅ Rápido desde início |
| **VAPID Validation** | Push silenciosamente falha | ✅ Aviso claro |

---

**Status**: 3/10 implementações prontas  
**Tempo estimado**: ~6-8h para completar tudo  
**Bloqueadores críticos**: Email Resend + Health Check

---

**Próximo Passo**: Implementar as mudanças críticas conforme necessário para deploy
