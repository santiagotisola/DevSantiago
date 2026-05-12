import { env } from '../config/env';

/**
 * Especificação OpenAPI 3.1 curada manualmente. Documenta os endpoints
 * mais usados por integrações externas e parceiros — não cobre o catálogo
 * inteiro (35+ módulos) pra evitar drift. Para gerar partes específicas
 * a partir de zod schemas, use @asteasolutions/zod-to-openapi nos módulos
 * que precisarem.
 */
export function buildOpenApiSpec() {
  const serverUrl = env.FRONTEND_URL.replace(/:5173$/, ':3333').replace(/\/$/, '');
  return {
    openapi: '3.1.0',
    info: {
      title: 'CondoSync API',
      version: '1.0.0',
      description:
        'API REST do CondoSync. Autenticação via Bearer JWT. Endpoints sensíveis exigem 2FA. ' +
        'Multi-tenant: a maioria das rotas filtra por condomínio através de membership do usuário. ' +
        'Rate-limit padrão: 200 req / 15min por IP; rotas de auth: 10 req / 15min.',
      contact: {
        name: 'Suporte CondoSync',
        email: 'contato@condosync.com.br',
      },
      license: {
        name: 'Proprietary',
      },
    },
    servers: [
      { url: `${serverUrl}/api/v1`, description: 'Atual' },
    ],
    tags: [
      { name: 'Auth', description: 'Autenticação, login, refresh, 2FA' },
      { name: 'Invitations', description: 'Convites de usuário (acesso por token público)' },
      { name: 'Push', description: 'Web Push notifications (VAPID)' },
      { name: 'WebAuthn', description: 'Passkeys / biometria' },
      { name: 'Plans', description: 'Planos de assinatura (SUPER_ADMIN)' },
      { name: 'Condominiums', description: 'Condomínios' },
      { name: 'Units', description: 'Unidades' },
      { name: 'Residents', description: 'Moradores' },
      { name: 'Dashboard', description: 'KPIs e séries temporais' },
      { name: 'Audit', description: 'Logs de auditoria' },
      { name: 'Sessions', description: 'Sessões ativas (refresh tokens)' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description:
            'JWT access token obtido em POST /auth/login. Expira em 1h; renove via POST /auth/refresh.',
        },
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          required: ['success', 'error'],
          properties: {
            success: { type: 'boolean', enum: [false] },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
        SuccessEnvelope: {
          type: 'object',
          required: ['success'],
          properties: {
            success: { type: 'boolean', enum: [true] },
            data: { type: 'object' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            cpf: { type: 'string', nullable: true },
            role: {
              type: 'string',
              enum: [
                'SUPER_ADMIN',
                'CONDOMINIUM_ADMIN',
                'SYNDIC',
                'DOORMAN',
                'RESIDENT',
                'SERVICE_PROVIDER',
                'COUNCIL_MEMBER',
              ],
            },
            isActive: { type: 'boolean' },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['password'],
          properties: {
            identifier: {
              type: 'string',
              description: 'Email OU CPF (apenas dígitos ou com pontuação)',
              example: 'admin@condosync.com.br',
            },
            email: { type: 'string', description: 'Legacy — preferir identifier' },
            password: { type: 'string', format: 'password', minLength: 1 },
          },
        },
        LoginResponse: {
          oneOf: [
            {
              description: 'Login bem-sucedido sem 2FA',
              type: 'object',
              properties: {
                user: { $ref: '#/components/schemas/User' },
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' },
              },
            },
            {
              description: 'Login pediu 2FA — chame /auth/2fa-challenge',
              type: 'object',
              properties: {
                requires2FA: { type: 'boolean', enum: [true] },
                challengeToken: { type: 'string', description: 'Válido por 5min' },
              },
            },
          ],
        },
        Invitation: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string', nullable: true },
            role: { type: 'string' },
            condominium: {
              type: 'object',
              properties: { id: { type: 'string' }, name: { type: 'string' } },
            },
            unit: { type: 'object', nullable: true },
            expiresAt: { type: 'string', format: 'date-time' },
            acceptedAt: { type: 'string', format: 'date-time', nullable: true },
            status: {
              type: 'string',
              enum: ['pending', 'accepted', 'expired', 'revoked'],
            },
          },
        },
        Plan: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            slug: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string', nullable: true },
            price: { type: 'number' },
            maxUnits: { type: 'integer' },
            features: { type: 'array', items: { type: 'string' } },
            isActive: { type: 'boolean' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    paths: {
      // ── Auth ──────────────────────────────────────────────────
      '/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login com email ou CPF',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } },
            },
          },
          responses: {
            '200': {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: { $ref: '#/components/schemas/LoginResponse' },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Credenciais inválidas',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
            },
            '429': { description: 'Rate-limit atingido (10/15min)' },
          },
        },
      },
      '/auth/2fa-challenge': {
        post: {
          tags: ['Auth'],
          summary: 'Verifica código 2FA após login que pediu requires2FA',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['challengeToken', 'code'],
                  properties: {
                    challengeToken: { type: 'string' },
                    code: {
                      type: 'string',
                      description: '6 dígitos do app autenticador OU XXXXX-XXXXX backup code',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Tokens emitidos' },
            '401': { description: 'Código inválido ou challenge expirado' },
          },
        },
      },
      '/auth/refresh': {
        post: {
          tags: ['Auth'],
          summary: 'Renova access token via refresh token',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['refreshToken'],
                  properties: { refreshToken: { type: 'string' } },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Novos accessToken+refreshToken (rotação)' },
            '401': { description: 'Refresh inválido — re-login obrigatório' },
          },
        },
      },
      '/auth/me': {
        get: {
          tags: ['Auth'],
          summary: 'Dados do usuário autenticado',
          responses: { '200': { description: 'OK' } },
        },
      },

      // ── 2FA ───────────────────────────────────────────────────
      '/2fa/setup': {
        post: {
          tags: ['Auth'],
          summary: 'Inicia setup 2FA — retorna QR + secret',
          responses: { '200': { description: 'qrDataUrl + secret + otpauthUrl' } },
        },
      },
      '/2fa/verify': {
        post: {
          tags: ['Auth'],
          summary: 'Confirma setup com primeiro código — devolve 10 backup codes (única exibição)',
          responses: { '200': { description: 'backupCodes' } },
        },
      },

      // ── Invitations ───────────────────────────────────────────
      '/invitations/public/{token}': {
        get: {
          tags: ['Invitations'],
          summary: 'Preview público do convite (sem login)',
          security: [],
          parameters: [
            { name: 'token', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {
            '200': {
              description: 'Detalhes do convite',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: {
                        type: 'object',
                        properties: { invitation: { $ref: '#/components/schemas/Invitation' } },
                      },
                    },
                  },
                },
              },
            },
            '404': { description: 'Token desconhecido' },
            '400': { description: 'Convite expirado, revogado ou já aceito' },
          },
        },
      },
      '/invitations/public/{token}/accept': {
        post: {
          tags: ['Invitations'],
          summary: 'Aceita o convite e define senha',
          security: [],
          parameters: [
            { name: 'token', in: 'path', required: true, schema: { type: 'string' } },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['password'],
                  properties: {
                    password: { type: 'string', minLength: 8 },
                    name: { type: 'string' },
                    cpf: { type: 'string' },
                    phone: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'userId + condominiumId' },
            '400': { description: 'Validação ou estado inválido' },
          },
        },
      },
      '/invitations': {
        get: {
          tags: ['Invitations'],
          summary: 'Lista convites de um condomínio',
          parameters: [
            {
              name: 'condominiumId',
              in: 'query',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: { '200': { description: 'Lista' } },
        },
        post: {
          tags: ['Invitations'],
          summary: 'Cria convite',
          responses: { '201': { description: 'invitationId + sentTo' } },
        },
      },

      // ── Push ──────────────────────────────────────────────────
      '/push/vapid-key': {
        get: {
          tags: ['Push'],
          summary: 'Chave pública VAPID para cliente subscrever',
          security: [],
          responses: { '200': { description: 'publicKey + enabled' } },
        },
      },
      '/push/subscribe': {
        post: {
          tags: ['Push'],
          summary: 'Registra subscription do dispositivo',
          responses: { '201': { description: 'subscriptionId' } },
        },
      },

      // ── Plans ─────────────────────────────────────────────────
      '/plans': {
        get: {
          tags: ['Plans'],
          summary: 'Lista planos disponíveis',
          parameters: [
            { name: 'active', in: 'query', schema: { type: 'boolean' } },
          ],
          responses: {
            '200': {
              description: 'Lista de planos',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: {
                        type: 'object',
                        properties: {
                          plans: { type: 'array', items: { $ref: '#/components/schemas/Plan' } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ['Plans'],
          summary: 'Cria plano (SUPER_ADMIN)',
          responses: { '201': { description: 'Plan' }, '403': { description: 'Apenas SUPER_ADMIN' } },
        },
      },

      // ── Condominiums ──────────────────────────────────────────
      '/condominiums': {
        get: {
          tags: ['Condominiums'],
          summary: 'Lista condomínios que o usuário tem acesso',
          responses: { '200': { description: 'Lista' } },
        },
        post: {
          tags: ['Condominiums'],
          summary: 'Cria condomínio (SUPER_ADMIN)',
          responses: { '201': { description: 'condominium' } },
        },
      },
      '/condominiums/{id}/plan': {
        patch: {
          tags: ['Condominiums', 'Plans'],
          summary: 'Atribui plano ao condomínio (SUPER_ADMIN)',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['planSlug'],
                  properties: {
                    planSlug: { type: 'string' },
                    maxUnits: {
                      type: 'integer',
                      description: 'Opcional — sobrescreve maxUnits do plano',
                    },
                  },
                },
              },
            },
          },
          responses: { '200': { description: 'condominium atualizado' } },
        },
      },

      // ── Units ─────────────────────────────────────────────────
      '/units/condominium/{condominiumId}': {
        get: {
          tags: ['Units'],
          summary: 'Lista unidades de um condomínio',
          parameters: [
            { name: 'condominiumId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'status', in: 'query', schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Lista de units' } },
        },
      },

      // ── Dashboard ─────────────────────────────────────────────
      '/dashboard/{condominiumId}': {
        get: {
          tags: ['Dashboard'],
          summary: 'Dashboard básico do condomínio',
          parameters: [
            { name: 'condominiumId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'KPIs e métricas operacionais' } },
        },
      },
      '/dashboard/{condominiumId}/syndic': {
        get: {
          tags: ['Dashboard'],
          summary: 'Dashboard expandido para síndico (KPIs financeiros + séries temporais)',
          parameters: [
            { name: 'condominiumId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'KPIs, chargesByMonth, top inadimplentes' } },
        },
      },
      '/dashboard/saas': {
        get: {
          tags: ['Dashboard'],
          summary: 'Dashboard SaaS (SUPER_ADMIN) — MRR, churn, funil',
          responses: { '200': { description: 'KPIs, planBreakdown, adoptionFunnel, growthSeries' } },
        },
      },

      // ── Audit ─────────────────────────────────────────────────
      '/audit': {
        get: {
          tags: ['Audit'],
          summary: 'Lista logs de auditoria',
          parameters: [
            { name: 'condominiumId', in: 'query', schema: { type: 'string' } },
            { name: 'module', in: 'query', schema: { type: 'string' } },
            { name: 'action', in: 'query', schema: { type: 'string' } },
            { name: 'from', in: 'query', schema: { type: 'string', format: 'date-time' } },
            { name: 'to', in: 'query', schema: { type: 'string', format: 'date-time' } },
            { name: 'q', in: 'query', schema: { type: 'string' } },
            { name: 'page', in: 'query', schema: { type: 'integer' } },
            { name: 'pageSize', in: 'query', schema: { type: 'integer', maximum: 100 } },
          ],
          responses: { '200': { description: 'Paginated audit logs' } },
        },
      },

      // ── Sessions ──────────────────────────────────────────────
      '/sessions': {
        get: {
          tags: ['Sessions'],
          summary: 'Sessões ativas (refresh tokens) do usuário',
          responses: { '200': { description: 'Lista de sessions' } },
        },
      },
      '/sessions/revoke-others': {
        post: {
          tags: ['Sessions'],
          summary: 'Encerra todas as sessões exceto a atual',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { currentRefreshToken: { type: 'string' } },
                },
              },
            },
          },
          responses: { '200': { description: 'revoked count' } },
        },
      },
    },
  } as const;
}
