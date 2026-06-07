import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "CondoSync API",
      version: "1.0.0",
      description: "API REST para gestão de condomínios — SaaS multi-tenant",
      contact: { name: "CondoSync", email: "admin@condosync.com.br" },
    },
    servers: [
      { url: "/api/v1", description: "API v1" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            error: {
              type: "object",
              properties: {
                code: { type: "string" },
                message: { type: "string" },
              },
            },
          },
        },
        Pagination: {
          type: "object",
          properties: {
            page: { type: "integer" },
            limit: { type: "integer" },
            total: { type: "integer" },
            pages: { type: "integer" },
          },
        },
        // Auth
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 6 },
          },
        },
        LoginResponse: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: {
              type: "object",
              properties: {
                accessToken: { type: "string" },
                refreshToken: { type: "string" },
                user: { type: "object" },
              },
            },
          },
        },
        // Visitor
        Visitor: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            document: { type: "string" },
            phone: { type: "string" },
            status: { type: "string", enum: ["PENDING", "INSIDE", "LEFT", "DENIED"] },
            unitId: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        // Parcel
        Parcel: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            senderName: { type: "string" },
            carrier: { type: "string" },
            trackingCode: { type: "string" },
            status: { type: "string", enum: ["RECEIVED", "NOTIFIED", "PICKED_UP"] },
            unitId: { type: "string", format: "uuid" },
            receivedAt: { type: "string", format: "date-time" },
          },
        },
        // Unit
        Unit: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            identifier: { type: "string" },
            block: { type: "string" },
            floor: { type: "string" },
            status: { type: "string", enum: ["OCCUPIED", "VACANT", "UNDER_RENOVATION"] },
            condominiumId: { type: "string", format: "uuid" },
          },
        },
        // Camera
        Camera: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            location: { type: "string" },
            brand: { type: "string" },
            streamUrl: { type: "string" },
            isActive: { type: "boolean" },
            resolution: { type: "string" },
          },
        },
        // Ticket
        Ticket: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            title: { type: "string" },
            description: { type: "string" },
            status: { type: "string", enum: ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] },
            priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "URGENT"] },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        // Notification
        Notification: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            title: { type: "string" },
            body: { type: "string" },
            type: { type: "string" },
            isRead: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: "Auth", description: "Autenticação e JWT" },
      { name: "Dashboard", description: "Métricas e visão geral" },
      { name: "Residents", description: "Gestão de moradores" },
      { name: "Units", description: "Unidades do condomínio" },
      { name: "Visitors", description: "Controle de visitantes" },
      { name: "Parcels", description: "Gestão de encomendas" },
      { name: "Vehicles", description: "Veículos cadastrados" },
      { name: "Maintenance", description: "Ordens de serviço" },
      { name: "Finance", description: "Transações e cobranças" },
      { name: "Common Areas", description: "Reservas de áreas comuns" },
      { name: "Communication", description: "Avisos e comunicados" },
      { name: "Assemblies", description: "Assembleias e votações" },
      { name: "Tickets", description: "Chamados e suporte" },
      { name: "Cameras", description: "Monitoramento de câmeras" },
      { name: "Documents", description: "Documentos do condomínio" },
      { name: "Notifications", description: "Notificações in-app" },
      { name: "Audit", description: "Logs de auditoria" },
      { name: "Reports", description: "Relatórios PDF/Excel" },
      { name: "WhatsApp", description: "Integração WhatsApp" },
      { name: "Pets", description: "Cadastro de pets" },
      { name: "Fines", description: "Multas e infrações" },
      { name: "Key Control", description: "Controle de chaves" },
      { name: "Moving Schedule", description: "Agenda de mudanças" },
      { name: "Marketplace", description: "Parceiros e ofertas" },
      { name: "Digital Signage", description: "TV do elevador" },
    ],
    paths: {
      "/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "Login",
          security: [],
          requestBody: { content: { "application/json": { schema: { $ref: "#/components/schemas/LoginRequest" } } } },
          responses: { "200": { description: "Token JWT", content: { "application/json": { schema: { $ref: "#/components/schemas/LoginResponse" } } } } },
        },
      },
      "/auth/refresh": {
        post: { tags: ["Auth"], summary: "Refresh token", security: [], responses: { "200": { description: "Novo access token" } } },
      },
      "/dashboard/{condominiumId}": {
        get: { tags: ["Dashboard"], summary: "Métricas do condomínio", parameters: [{ name: "condominiumId", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "KPIs, charts, atividades" } } },
      },
      "/visitors/condominium/{condominiumId}": {
        get: { tags: ["Visitors"], summary: "Listar visitantes", parameters: [{ name: "condominiumId", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Lista de visitantes" } } },
      },
      "/parcels/condominium/{condominiumId}": {
        get: { tags: ["Parcels"], summary: "Listar encomendas", parameters: [{ name: "condominiumId", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Lista de encomendas" } } },
      },
      "/units/condominium/{condominiumId}": {
        get: { tags: ["Units"], summary: "Listar unidades", parameters: [{ name: "condominiumId", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Lista de unidades" } } },
      },
      "/residents/condominium/{condominiumId}": {
        get: { tags: ["Residents"], summary: "Listar moradores", parameters: [{ name: "condominiumId", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Lista de moradores" } } },
      },
      "/cameras/condominium/{condominiumId}": {
        get: { tags: ["Cameras"], summary: "Listar câmeras", parameters: [{ name: "condominiumId", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Lista de câmeras" } } },
      },
      "/cameras": {
        post: { tags: ["Cameras"], summary: "Cadastrar câmera", requestBody: { content: { "application/json": { schema: { $ref: "#/components/schemas/Camera" } } } }, responses: { "201": { description: "Câmera criada" } } },
      },
      "/cameras/{id}/toggle": {
        patch: { tags: ["Cameras"], summary: "Ativar/desativar câmera", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Status atualizado" } } },
      },
      "/maintenance/condominium/{condominiumId}": {
        get: { tags: ["Maintenance"], summary: "Listar ordens de serviço", parameters: [{ name: "condominiumId", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Lista de OS" } } },
      },
      "/tickets/{condominiumId}": {
        get: { tags: ["Tickets"], summary: "Listar chamados", parameters: [{ name: "condominiumId", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Lista de chamados" } } },
      },
      "/notifications/inbox": {
        get: { tags: ["Notifications"], summary: "Minhas notificações", responses: { "200": { description: "Lista de notificações" } } },
      },
      "/notifications/inbox/unread-count": {
        get: { tags: ["Notifications"], summary: "Contador de não lidas", responses: { "200": { description: "{ count: number }" } } },
      },
      "/notifications/inbox/{id}/read": {
        patch: { tags: ["Notifications"], summary: "Marcar como lida", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Notificação marcada" } } },
      },
      "/audit/condominium/{condominiumId}": {
        get: { tags: ["Audit"], summary: "Listar logs de auditoria", parameters: [{ name: "condominiumId", in: "path", required: true, schema: { type: "string", format: "uuid" } }, { name: "action", in: "query", schema: { type: "string" } }, { name: "entity", in: "query", schema: { type: "string" } }], responses: { "200": { description: "Lista paginada de logs" } } },
      },
      "/reports/financial/{condominiumId}/excel": {
        get: { tags: ["Reports"], summary: "Exportar relatório financeiro (Excel)", parameters: [{ name: "condominiumId", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Arquivo .xlsx", content: { "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {} } } } },
      },
      "/key-control/condominium/{condominiumId}": {
        get: { tags: ["Key Control"], summary: "Listar chaves", parameters: [{ name: "condominiumId", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Lista de chaves" } } },
      },
      "/moving-schedules/condominium/{condominiumId}": {
        get: { tags: ["Moving Schedule"], summary: "Listar mudanças agendadas", parameters: [{ name: "condominiumId", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Lista de agendamentos" } } },
      },
      "/finance/accounts/{condominiumId}": {
        get: { tags: ["Finance"], summary: "Contas financeiras", parameters: [{ name: "condominiumId", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Lista de contas" } } },
      },
      "/finance/charges/{condominiumId}": {
        get: { tags: ["Finance"], summary: "Listar cobranças", parameters: [{ name: "condominiumId", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Lista de cobranças" } } },
      },
      "/whatsapp/status/{condominiumId}": {
        get: { tags: ["WhatsApp"], summary: "Status da conexão WhatsApp", parameters: [{ name: "condominiumId", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Status da sessão" } } },
      },
      "/whatsapp/send": {
        post: { tags: ["WhatsApp"], summary: "Enviar mensagem WhatsApp", requestBody: { content: { "application/json": { schema: { type: "object", properties: { condominiumId: { type: "string" }, to: { type: "string" }, message: { type: "string" } } } } } }, responses: { "200": { description: "Mensagem enviada" } } },
      },
    },
  },
  apis: [], // We define paths inline above
};

export const swaggerSpec = swaggerJsdoc(options);
