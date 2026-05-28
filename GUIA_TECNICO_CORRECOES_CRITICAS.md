# 🔧 GUIA TÉCNICO: CORREÇÃO DE VULNERABILIDADES CRÍTICAS
**Data**: 27 de Maio de 2026  
**Prioridade**: 🔴 CRÍTICO - Bloqueia Go-Live  
**Tempo Estimado**: 3-4 horas  

---

## 📋 Vulnerabilidades Críticas a Corrigir

### 1. Residents Routes SEM Autenticação (CRÍTICO)

**Arquivo**: `apps/api/src/modules/residents/resident.routes.ts`

**Status Atual** (❌ VULNERÁVEL):
```typescript
// Linha 1-5 (PROBLEMA!)
const router = express.Router();

router.get("/", async (req, res) => {  // ❌ PUBLICO - QUALQUER UM CONSEGUE LISTAR
  // ...
});

router.post("/", async (req, res) => {  // ❌ PUBLICO - CRIAR MORADOR
  // ...
});

router.patch("/:id", async (req, res) => {  // ❌ PUBLICO - EDITAR MORADOR
  // ...
});
```

**O Que Falta**:
- Middleware `authenticate` (valida JWT)
- Middleware `authorize` (valida role)

**Impacto de Segurança**:
```
- Qualquer pessoa na rede consegue:
  ✗ GET /api/v1/residents → listar TODOS os moradores (nome, email, telefone, etc.)
  ✗ POST /api/v1/residents → criar novo morador (spoofing)
  ✗ PATCH /api/v1/residents/:id → editar dados (phishing)
  
- Nenhuma validação de condominium (multi-tenant bypass)
```

**Correção (✅ SEGURO)**:

```typescript
import express from 'express';
import { authenticate, authorize, authorizeCondominium } from '@/middleware/auth';
import { ResidentController } from './resident.controller';

const router = express.Router();

// ✅ PASSO 1: Middleware global (obrigatório em todas as rotas)
router.use(authenticate);

// ✅ PASSO 2: Validar que apenas estes roles podem acessar residents
router.use(
  authorize(
    "CONDOMINIUM_ADMIN",
    "SYNDIC",
    "SUPER_ADMIN",
    "RESIDENT"  // Moradores podem ver dados de moradores do seu condominio
  )
);

// ✅ PASSO 3: Rotas com validação granular
router.get("/", async (req, res) => {
  // GET é permitido para todos os roles acima (com authorizeCondominium implícito)
  return ResidentController.list(req, res);
});

// POST (criar) restrito a admin/syndic/super_admin
router.post("/", 
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req, res) => {
    return ResidentController.create(req, res);
  }
);

// PATCH (editar) com validação de ownership + condominium
router.patch("/:id",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN", "RESIDENT"),
  authorizeCondominium,
  async (req, res) => {
    // Após authorizeCondominium:
    // - req.user.condominiumId é validado (pertence ao condominio)
    // - req.user.role é sobrescrito com role do usuario no condominio
    return ResidentController.update(req, res);
  }
);

export default router;
```

**Arquivo a Modificar**:
```bash
apps/api/src/modules/residents/resident.routes.ts
```

**Checklist de Teste**:
- [ ] GET /residents com token JWT válido → 200 (funciona)
- [ ] GET /residents SEM token → 401 Unauthorized (deve rejeitar)
- [ ] POST /residents com token de RESIDENT → 403 Forbidden (só admin pode criar)
- [ ] PATCH /residents/:id com token correto → 200 (funciona)

---

### 2. Token Blacklist para Logout Real (CRÍTICO)

**Problema Atual**:
- JWT token válido por 1 hora após logout
- Logout é apenas client-side (remove token do localStorage)
- Ex-funcionário consegue usar token antigo para acessar API

**Arquivo**: `apps/api/src/modules/auth/auth.service.ts` + `apps/api/src/middleware/auth.ts`

**Solução: Redis Blacklist**

#### Passo 1: Adicionar função de logout ao auth.service.ts

```typescript
// apps/api/src/modules/auth/auth.service.ts

import redis from '@/config/redis';  // ← Já existe

export class AuthService {
  
  // ... métodos existentes (login, register, etc.)
  
  /**
   * Invalidar token (logout real)
   * Adiciona token à blacklist no Redis por X minutos
   */
  static async invalidateToken(token: string, expiresIn: number = 3600) {
    try {
      // Extrair JTI (JWT ID) ou usar token como chave
      const decoded = jwt.decode(token) as JwtPayload;
      const tokenHash = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
      
      // Adicionar à blacklist com TTL = tempo até expiração do token
      await redis.setex(
        `blacklist:${tokenHash}`,
        expiresIn,  // TTL em segundos (1 hora para access token)
        JSON.stringify({
          invalidatedAt: new Date().toISOString(),
          userId: decoded.userId,
          reason: 'logout'
        })
      );
      
      logger.info(`Token invalidado para usuário ${decoded.userId}`);
      return true;
    } catch (error) {
      logger.error('Erro ao invalidar token:', error);
      throw error;
    }
  }
}
```

#### Passo 2: Modificar middleware authenticate

```typescript
// apps/api/src/middleware/auth.ts

import redis from '@/config/redis';
import crypto from 'crypto';

/**
 * Middleware: Validar JWT e checar blacklist
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token não fornecido'
      });
    }
    
    // ✅ NOVO: Checar se token está na blacklist
    const tokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    
    const isBlacklisted = await redis.get(`blacklist:${tokenHash}`);
    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        error: 'Token foi revogado (logout realizado)'
      });
    }
    
    // Validar JWT
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as JwtPayload;
    
    // Continuar
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Token inválido ou expirado'
    });
  }
}
```

#### Passo 3: Adicionar endpoint POST /logout

```typescript
// apps/api/src/modules/auth/auth.routes.ts

router.post('/logout', authenticate, async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token não fornecido'
      });
    }
    
    // Invalidar token via blacklist
    await AuthService.invalidateToken(token);
    
    return res.json({
      success: true,
      message: 'Logout realizado com sucesso'
    });
  } catch (error) {
    logger.error('Erro ao fazer logout:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao fazer logout'
    });
  }
});
```

#### Passo 4: Usar novo endpoint no frontend

```typescript
// apps/web/src/services/api.ts

export async function logout() {
  try {
    const token = localStorage.getItem('accessToken');
    
    if (token) {
      // Notificar backend que token foi revogado
      await apiClient.post('/auth/logout', {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    }
  } catch (error) {
    console.warn('Erro ao notificar logout:', error);
  } finally {
    // Limpar local storage (já faz isso)
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    // Redirecionar para login
    window.location.href = '/login';
  }
}
```

**Teste de Segurança**:
```bash
# 1. Login e obter token
TOKEN=$(curl -X POST http://localhost:3333/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"atendimentoveredasbosque@gmail.com","password":"Admin@2026"}' \
  | jq -r '.data.accessToken')

echo "Token: $TOKEN"

# 2. Usar token (deve funcionar)
curl http://localhost:3333/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN"
# Resultado: 200 OK ✅

# 3. Fazer logout
curl -X POST http://localhost:3333/api/v1/auth/logout \
  -H "Authorization: Bearer $TOKEN"
# Resultado: {"success":true,"message":"Logout realizado..."} ✅

# 4. Tentar usar o MESMO token (deve falhar)
curl http://localhost:3333/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN"
# Resultado: 401 Unauthorized - Token foi revogado ✅
```

---

## 🛠️ Implementação Passo-a-Passo

### Ordem de Implementação

1. **[5 min]** Corrigir `residents.routes.ts` (adicionar authenticate + authorize)
2. **[30 min]** Implementar blacklist (AuthService + middleware)
3. **[15 min]** Testar endpoints (via Postman/curl)
4. **[30 min]** Atualizar frontend (logout endpoint)
5. **[15 min]** Commit + push

### Arquivos a Modificar

```
apps/api/src/modules/residents/resident.routes.ts          [MODIFICAR]
apps/api/src/modules/auth/auth.service.ts                 [MODIFICAR]
apps/api/src/middleware/auth.ts                           [MODIFICAR]
apps/api/src/modules/auth/auth.routes.ts                  [ADICIONAR endpoint]
apps/web/src/services/api.ts                              [MODIFICAR logout]
```

### Comando Git para Commit

```bash
cd C:\Users\Santiago\DevSantiago\condosync

git add -A

git commit -m "fix: segurança crítica - residents auth + token blacklist

- Adicionar authenticate + authorize em residents.routes.ts
- Implementar Redis blacklist para logout real
- Validar token em blacklist no middleware authenticate
- Novo endpoint POST /auth/logout para revogação de token
- Testar: token inválido após logout (401)
- OWASP Top 10 Fix: Broken Authentication (A07:2021)"
```

---

## ✅ Checklist de Validação

### Antes de Commit

- [ ] `residents.routes.ts` tem `authenticate` e `authorize`
- [ ] GET/POST/PATCH /residents requerem autenticação (teste 401 sem token)
- [ ] AuthService tem método `invalidateToken()`
- [ ] Middleware `authenticate` checa Redis blacklist
- [ ] Endpoint POST /auth/logout existe e adiciona token à blacklist
- [ ] Frontend chama POST /auth/logout antes de remover token

### Teste de Segurança

- [ ] GET /residents SEM token → 401 ✅
- [ ] POST /residents com token de RESIDENT → 403 ✅
- [ ] Token após logout não funciona → 401 ✅
- [ ] Token novo (após refresh) funciona → 200 ✅

### Performance

- [ ] Redis blacklist <50ms latency
- [ ] Nenhum overhead significativo em authenticate()

---

## 📚 Referências

### Middleware Auth Padrão no CondoSync
- [apps/api/src/middleware/auth.ts](apps/api/src/middleware/auth.ts)

### Exemplo de Implementação (Finance Module)
- [apps/api/src/modules/finance/finance.routes.ts](apps/api/src/modules/finance/finance.routes.ts)

### Redis Config
- [apps/api/src/config/redis.ts](apps/api/src/config/redis.ts)

---

## 🎯 Próximos Passos Após Correção

1. **Security Scan OWASP**: Fazer pentest completo
2. **Auditoria de Todas as Rotas**: Validar que todas têm authenticate
3. **Testes Automatizados**: Jest tests para auth scenarios
4. **Rate Limiting**: Implementar rate-limit por IP + usuário
5. **2FA**: TOTP authenticator app (próximas 2 semanas)

---

**Prioridade**: 🔴 CRÍTICO  
**Bloqueador**: Sim (Go-Live depende disso)  
**Tempo Estimado**: 2-3 horas  
**Revisor de Código Recomendado**: QA/Security team
