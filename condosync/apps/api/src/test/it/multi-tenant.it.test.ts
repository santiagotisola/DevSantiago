/**
 * Suite de SMOKE de isolamento multi-tenant rodando contra Postgres
 * REAL (testcontainers). Diferente da suite de mocks em
 * `multi-tenant-isolation.test.ts`, esta exercita o stack completo:
 * Express + Prisma + DB.
 *
 * Rodar com: npm run test:it
 */
import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import {
  cleanDatabase,
  seedTwoCondominiums,
  type TenantFixture,
} from "./fixtures";

let prisma: PrismaClient;
let app: import("express").Express;
let fix: TenantFixture;

beforeAll(async () => {
  prisma = new PrismaClient();
  // App é importado depois do globalSetup que injeta DATABASE_URL.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  app = require("../../server").default;
});

beforeEach(async () => {
  await cleanDatabase(prisma);
  fix = await seedTwoCondominiums(prisma);
});

describe("Multi-tenant cross-tenant — fines", () => {
  it("SYNDIC de A não pode ler multa do condo B", async () => {
    const fineB = await prisma.fine.create({
      data: {
        condominiumId: fix.condoB.id,
        unitId: "00000000-0000-0000-0000-000000000000", // mock — schema permite
        reportedBy: fix.condoB.syndic.id,
        description: "Test fine",
        regulation: "Art. 1",
        amount: 100,
        appealDeadline: new Date(Date.now() + 86_400_000),
      },
    });

    const res = await request(app)
      .get(`/api/v1/fines/${fix.condoB.id}`)
      .set("Authorization", `Bearer ${fix.condoA.syndic.token}`);

    expect(res.status).toBe(403);
    expect(fineB.id).toBeTruthy();
  });

  it("SYNDIC de A NÃO pode submeter recurso em multa do condo B", async () => {
    const fineB = await prisma.fine.create({
      data: {
        condominiumId: fix.condoB.id,
        unitId: "00000000-0000-0000-0000-000000000000",
        reportedBy: fix.condoB.syndic.id,
        description: "Multa B",
        regulation: "Art. 1",
        amount: 100,
        appealDeadline: new Date(Date.now() + 86_400_000),
      },
    });

    const res = await request(app)
      .post(`/api/v1/fines/${fineB.id}/appeal`)
      .set("Authorization", `Bearer ${fix.condoA.syndic.token}`)
      .send({ appealText: "tentando" });

    expect([403, 404]).toContain(res.status);
  });
});

describe("Multi-tenant cross-tenant — webhook idempotência", () => {
  it("dois POSTs idênticos no webhook produzem apenas 1 financial_transaction", async () => {
    const account = await prisma.financialAccount.create({
      data: {
        condominiumId: fix.condoA.id,
        name: "Conta A",
        gatewayType: "ASAAS",
      },
    });
    const unit = await prisma.unit.create({
      data: {
        condominiumId: fix.condoA.id,
        identifier: "101",
        block: "A",
      },
    });
    const charge = await prisma.charge.create({
      data: {
        unitId: unit.id,
        accountId: account.id,
        description: "Mensal",
        amount: 350,
        dueDate: new Date(),
        gatewayId: "pay-it-1",
      },
    });

    const body = {
      id: "evt-it-1",
      event: "PAYMENT_RECEIVED",
      payment: { id: "pay-it-1", value: 350 },
    };

    const r1 = await request(app)
      .post("/api/v1/webhooks/asaas")
      .set("asaas-access-token", process.env.ASAAS_WEBHOOK_TOKEN!)
      .send(body);
    const r2 = await request(app)
      .post("/api/v1/webhooks/asaas")
      .set("asaas-access-token", process.env.ASAAS_WEBHOOK_TOKEN!)
      .send(body);

    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);

    const txs = await prisma.financialTransaction.count({
      where: { chargeId: charge.id, type: "INCOME" },
    });
    expect(txs).toBe(1);
  });
});
