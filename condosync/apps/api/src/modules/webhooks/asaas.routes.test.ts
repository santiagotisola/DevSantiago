import { describe, it, expect, beforeEach, beforeAll, vi } from "vitest";
import express from "express";
import request from "supertest";
import { Prisma } from "@prisma/client";
import { prismaMock } from "../../test/setup";

process.env.ASAAS_WEBHOOK_TOKEN = "test-token-with-at-least-32-chars-aaaa";

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

vi.mock("../../config/env", () => ({
  env: {
    ASAAS_WEBHOOK_TOKEN: process.env.ASAAS_WEBHOOK_TOKEN,
    NODE_ENV: "test",
  },
}));

// Mock do enqueue para não tentar tocar Redis nos testes do route.
const enqueueMock = vi.fn().mockResolvedValue(undefined);
vi.mock("./webhook.processor", () => ({
  enqueueWebhookProcessing: enqueueMock,
}));

let router: import("express").Router;

beforeAll(async () => {
  ({ default: router } = await import("./asaas.routes"));
});

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/webhooks", router);
  app.use(
    (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(500).json({ error: err.message });
    },
  );
  return app;
}

const VALID_TOKEN = process.env.ASAAS_WEBHOOK_TOKEN!;

describe("POST /webhooks/asaas — outbox front door", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("401 sem header asaas-access-token", async () => {
    const res = await request(buildApp()).post("/webhooks/asaas").send({
      id: "evt-1",
      event: "PAYMENT_RECEIVED",
      payment: { id: "pay-1", value: 100 },
    });
    expect(res.status).toBe(401);
    expect(enqueueMock).not.toHaveBeenCalled();
  });

  it("401 com token incorreto", async () => {
    const res = await request(buildApp())
      .post("/webhooks/asaas")
      .set("asaas-access-token", "valor-errado")
      .send({
        id: "evt-1",
        event: "PAYMENT_RECEIVED",
        payment: { id: "pay-1", value: 100 },
      });
    expect(res.status).toBe(401);
  });

  it("400 com payload malformado", async () => {
    const res = await request(buildApp())
      .post("/webhooks/asaas")
      .set("asaas-access-token", VALID_TOKEN)
      .send({ foo: "bar" });
    expect(res.status).toBe(400);
    expect(prismaMock.webhookEvent.create).not.toHaveBeenCalled();
  });

  it("200 idempotente quando o mesmo externalId já foi gravado (P2002)", async () => {
    prismaMock.webhookEvent.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("dup", {
        code: "P2002",
        clientVersion: "x",
      } as never),
    );

    const res = await request(buildApp())
      .post("/webhooks/asaas")
      .set("asaas-access-token", VALID_TOKEN)
      .send({
        id: "evt-dup",
        event: "PAYMENT_RECEIVED",
        payment: { id: "pay-1", value: 100 },
      });
    expect(res.status).toBe(200);
    // Não deve enfileirar duplicata.
    expect(enqueueMock).not.toHaveBeenCalled();
  });

  it("200 + enqueue quando evento novo (route NÃO toca em charge/fin_tx)", async () => {
    prismaMock.webhookEvent.create.mockResolvedValue({
      id: "wh-1",
    } as never);

    const res = await request(buildApp())
      .post("/webhooks/asaas")
      .set("asaas-access-token", VALID_TOKEN)
      .send({
        id: "evt-new",
        event: "PAYMENT_RECEIVED",
        payment: { id: "pay-1", value: 100 },
      });
    expect(res.status).toBe(200);
    expect(prismaMock.webhookEvent.create).toHaveBeenCalledOnce();
    expect(enqueueMock).toHaveBeenCalledWith("wh-1");
    // Outbox: route NÃO chama charge.findFirst nem $transaction.
    expect(prismaMock.charge.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("200 mesmo se enqueue falhar (row já gravada)", async () => {
    prismaMock.webhookEvent.create.mockResolvedValue({
      id: "wh-2",
    } as never);
    enqueueMock.mockRejectedValueOnce(new Error("redis down"));

    const res = await request(buildApp())
      .post("/webhooks/asaas")
      .set("asaas-access-token", VALID_TOKEN)
      .send({
        id: "evt-3",
        event: "PAYMENT_RECEIVED",
        payment: { id: "pay-1", value: 100 },
      });
    expect(res.status).toBe(200);
    // Operador re-drena pendentes via runbook.
  });
});
