import { describe, it, expect, beforeEach, vi } from "vitest";
import express from "express";
import request from "supertest";
import { Prisma } from "@prisma/client";
import { prismaMock } from "../../test/setup";

// Setar token antes de importar a rota — env é validado no boot.
process.env.ASAAS_WEBHOOK_TOKEN = "test-token-with-at-least-32-chars-aaaa";

// Mock do logger para não poluir output do teste.
vi.mock("../../config/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

// Stub de env para garantir que ASAAS_WEBHOOK_TOKEN seja o esperado.
vi.mock("../../config/env", () => ({
  env: {
    ASAAS_WEBHOOK_TOKEN: process.env.ASAAS_WEBHOOK_TOKEN,
    NODE_ENV: "test",
  },
}));

// Importa após os mocks
// eslint-disable-next-line @typescript-eslint/no-require-imports
const router = require("./asaas.routes").default;

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/webhooks", router);
  // Default error handler para garantir status correto.
  app.use(
    (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(500).json({ error: err.message });
    },
  );
  return app;
}

const VALID_TOKEN = process.env.ASAAS_WEBHOOK_TOKEN!;

describe("POST /webhooks/asaas — segurança e idempotência", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("401 quando o header asaas-access-token está ausente", async () => {
    const app = buildApp();
    const res = await request(app).post("/webhooks/asaas").send({
      id: "evt-1",
      event: "PAYMENT_RECEIVED",
      payment: { id: "pay-1", value: 100 },
    });
    expect(res.status).toBe(401);
  });

  it("401 quando o token está incorreto", async () => {
    const app = buildApp();
    const res = await request(app)
      .post("/webhooks/asaas")
      .set("asaas-access-token", "valor-errado")
      .send({
        id: "evt-1",
        event: "PAYMENT_RECEIVED",
        payment: { id: "pay-1", value: 100 },
      });
    expect(res.status).toBe(401);
  });

  it("400 com payload malformado (sem field event/payment)", async () => {
    const app = buildApp();
    const res = await request(app)
      .post("/webhooks/asaas")
      .set("asaas-access-token", VALID_TOKEN)
      .send({ foo: "bar" });
    expect(res.status).toBe(400);
  });

  it("200 idempotente quando o mesmo externalId já foi processado", async () => {
    // 1ª gravação retorna OK; 2ª simula colisão de unique index P2002.
    prismaMock.webhookEvent.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("dup", {
        code: "P2002",
        clientVersion: "x",
      } as any),
    );

    const app = buildApp();
    const res = await request(app)
      .post("/webhooks/asaas")
      .set("asaas-access-token", VALID_TOKEN)
      .send({
        id: "evt-dup",
        event: "PAYMENT_RECEIVED",
        payment: { id: "pay-1", value: 100 },
      });
    expect(res.status).toBe(200);
    expect(prismaMock.charge.findFirst).not.toHaveBeenCalled();
  });

  it("200 e cria FinancialTransaction quando o evento é novo e a charge existe", async () => {
    prismaMock.webhookEvent.create.mockResolvedValue({} as any);
    prismaMock.charge.findFirst.mockResolvedValue({
      id: "charge-1",
      status: "PENDING",
      accountId: "acc-1",
      categoryId: "cat-1",
      description: "Taxa",
      unitId: "u-1",
      dueDate: new Date(),
      referenceMonth: "2026-05",
    } as any);
    prismaMock.$transaction.mockResolvedValue([{}, {}] as any);

    const app = buildApp();
    const res = await request(app)
      .post("/webhooks/asaas")
      .set("asaas-access-token", VALID_TOKEN)
      .send({
        id: "evt-new",
        event: "PAYMENT_RECEIVED",
        payment: { id: "pay-1", value: 100 },
      });
    expect(res.status).toBe(200);
    expect(prismaMock.$transaction).toHaveBeenCalledOnce();
  });

  it("200 silencioso quando charge não existe (evita reentrega infinita do gateway)", async () => {
    prismaMock.webhookEvent.create.mockResolvedValue({} as any);
    prismaMock.charge.findFirst.mockResolvedValue(null);

    const app = buildApp();
    const res = await request(app)
      .post("/webhooks/asaas")
      .set("asaas-access-token", VALID_TOKEN)
      .send({
        id: "evt-orphan",
        event: "PAYMENT_RECEIVED",
        payment: { id: "pay-orphan", value: 50 },
      });
    expect(res.status).toBe(200);
  });
});
