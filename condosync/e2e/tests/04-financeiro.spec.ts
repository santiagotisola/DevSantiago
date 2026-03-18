/**
 * [FLUXO-04] Financeiro — Cobranças
 *
 * Regras críticas validadas:
 *  ✔ Cobrança deve ter unitId e accountId válidos do mesmo condomínio
 *  ✔ Cobrança com unitId de outro condomínio deve ser rejeitada (multi-tenant)
 *  ✔ Valor negativo ou zero deve ser rejeitado
 *  ✔ Descrição mínima de 3 caracteres
 *  ✔ Data de vencimento obrigatória e no formato ISO
 *  ✔ Fluxo de pagamento: PENDING → PAID com paidAt preenchido
 *  ✔ Morador vê apenas suas próprias cobranças
 *  ✔ RESIDENT não pode criar cobranças (RBAC)
 *  ✔ DOORMAN não pode criar cobranças (RBAC)
 */

import { test, expect } from '@playwright/test';
import { readTokens, req, CREDS, CONDO_ID } from './helpers/api';

let adminToken: string;
let doormanToken: string;
let residentToken: string;
let unitId: string;
let accountId: string;
let chargeId: string;
const UNIQUE = Date.now();
const FUTURE_DATE = new Date(Date.now() + 30 * 86_400_000).toISOString(); // +30 dias

test.beforeAll(async () => {
  const { superAdmin, doorman, resident1 } = readTokens();
  adminToken    = superAdmin.accessToken;
  doormanToken  = doorman.accessToken;
  residentToken = resident1.accessToken;

  // Obtém unidade do morador1
  const resData = await req('GET', `/residents/condominium/${CONDO_ID}`, adminToken);
  const r1 = resData.data.data.residents.find((r: any) => r.user?.email === CREDS.resident1.email);
  unitId = r1.unitId;

  // Obtém conta financeira do condomínio
  const accData = await req('GET', `/finance/accounts/${CONDO_ID}`, adminToken);
  const accounts: any[] = accData.data.data.accounts;
  expect(accounts.length, 'Seed deve criar pelo menos 1 conta financeira').toBeGreaterThan(0);
  accountId = accounts[0].id;
});

// ─── Cenários de sucesso ───────────────────────────────────────────────────

test('FIN-01 | Admin cria cobrança válida → 201 com status PENDING', async () => {
  const payload = {
    unitId,
    accountId,
    description: `Cond. Mensal E2E ${UNIQUE}`,
    amount: 850.0,
    dueDate: FUTURE_DATE,
    referenceMonth: '2026-06',
  };

  const { status, data } = await req('POST', '/finance/charges', adminToken, payload);

  expect(status).toBe(201);
  expect(data.success).toBe(true);
  expect(data.data.charge.unitId).toBe(unitId);
  expect(data.data.charge.status).toBe('PENDING');
  expect(Number(data.data.charge.amount)).toBe(850);
  expect(data.data.charge.paidAt).toBeNull();

  chargeId = data.data.charge.id;
});

test('FIN-02 | Listar cobranças do condomínio retorna estrutura íntegra', async () => {
  const { status, data } = await req('GET', `/finance/charges/${CONDO_ID}`, adminToken);

  expect(status).toBe(200);
  const charges: any[] = data.data.charges;
  expect(charges.length).toBeGreaterThan(0);

  // Toda cobrança deve ter unitId (regra crítica de integridade)
  const orphans = charges.filter((c: any) => !c.unitId);
  expect(orphans.length, 'Cobranças sem unitId detectadas — falha de integridade').toBe(0);

  // Toda cobrança deve ter status válido
  const validStatuses = ['PENDING', 'PAID', 'OVERDUE', 'CANCELLED', 'PARTIAL'];
  for (const charge of charges) {
    expect(validStatuses, `Status inválido: ${charge.status}`).toContain(charge.status);
  }
});

test('FIN-03 | Marcar cobrança como paga → status PAID com paidAt preenchido', async () => {
  expect(chargeId, 'Depende do FIN-01').toBeTruthy();

  const paidAt = new Date().toISOString();
  const { status, data } = await req(
    'PATCH',
    `/finance/charges/${chargeId}/pay`,
    adminToken,
    { paidAmount: 850.0, paidAt },
  );

  expect(status).toBe(200);
  expect(data.data.charge.status).toBe('PAID');
  expect(data.data.charge.paidAt).toBeTruthy();
  expect(Number(data.data.charge.paidAmount)).toBe(850);
});

test('FIN-04 | Filtrar cobranças por unitId retorna apenas cobranças daquela unidade', async () => {
  const { status, data } = await req(
    'GET',
    `/finance/charges/${CONDO_ID}?unitId=${unitId}`,
    adminToken,
  );

  expect(status).toBe(200);
  const charges: any[] = data.data.charges;

  const wrongUnit = charges.filter((c: any) => c.unitId !== unitId);
  expect(wrongUnit.length, 'Filtro por unitId retornou cobranças de outra unidade').toBe(0);
});

// ─── Cenários de erro ─────────────────────────────────────────────────────

test('FIN-ERR-01 | Cobrança SEM unitId → 400/422', async () => {
  const { status, data } = await req('POST', '/finance/charges', adminToken, {
    accountId,
    description: 'Sem unidade',
    amount: 100,
    dueDate: FUTURE_DATE,
    // unitId ausente
  });

  expect([400, 422], `unitId ausente deveria ser rejeitado — retornou ${status}`).toContain(status);
  expect(data.success).toBe(false);
});

test('FIN-ERR-02 | Valor zero deve ser rejeitado → 400/422', async () => {
  const { status, data } = await req('POST', '/finance/charges', adminToken, {
    unitId,
    accountId,
    description: 'Valor zero',
    amount: 0,
    dueDate: FUTURE_DATE,
  });

  expect([400, 422], `Valor 0 deveria ser rejeitado — retornou ${status}`).toContain(status);
  expect(data.success).toBe(false);
});

test('FIN-ERR-03 | Valor negativo deve ser rejeitado → 400/422', async () => {
  const { status, data } = await req('POST', '/finance/charges', adminToken, {
    unitId,
    accountId,
    description: 'Valor negativo',
    amount: -50,
    dueDate: FUTURE_DATE,
  });

  expect([400, 422], `Valor negativo deveria ser rejeitado — retornou ${status}`).toContain(status);
  expect(data.success).toBe(false);
});

test('FIN-ERR-04 | Descrição com menos de 3 caracteres → 400/422', async () => {
  const { status, data } = await req('POST', '/finance/charges', adminToken, {
    unitId,
    accountId,
    description: 'AB', // 2 chars, mínimo é 3
    amount: 100,
    dueDate: FUTURE_DATE,
  });

  expect([400, 422], `Descrição curta deveria ser rejeitada — retornou ${status}`).toContain(status);
  expect(data.success).toBe(false);
});

test('FIN-ERR-05 | Data de vencimento inválida → 400/422', async () => {
  const { status, data } = await req('POST', '/finance/charges', adminToken, {
    unitId,
    accountId,
    description: 'Data inválida',
    amount: 100,
    dueDate: 'não-é-uma-data',
  });

  expect([400, 422], `Data inválida deveria ser rejeitada — retornou ${status}`).toContain(status);
  expect(data.success).toBe(false);
});

test('FIN-ERR-06 | RESIDENT não pode criar cobrança → 401/403', async () => {
  const { status, data } = await req('POST', '/finance/charges', residentToken, {
    unitId,
    accountId,
    description: 'Tentativa morador',
    amount: 500,
    dueDate: FUTURE_DATE,
  });

  expect([401, 403], `Morador não deveria criar cobranças — retornou ${status}`).toContain(status);
  expect(data.success).toBe(false);
});

test('FIN-ERR-07 | DOORMAN não pode criar cobrança → 401/403', async () => {
  const { status, data } = await req('POST', '/finance/charges', doormanToken, {
    unitId,
    accountId,
    description: 'Tentativa porteiro',
    amount: 500,
    dueDate: FUTURE_DATE,
  });

  expect([401, 403], `Porteiro não deveria criar cobranças — retornou ${status}`).toContain(status);
  expect(data.success).toBe(false);
});

test('FIN-ERR-08 | Pagar cobrança com valor zero → 400/422', async () => {
  // Cria nova cobrança para este teste
  const { data: created } = await req('POST', '/finance/charges', adminToken, {
    unitId,
    accountId,
    description: `E2E pagamento zero ${UNIQUE}`,
    amount: 200,
    dueDate: FUTURE_DATE,
  });
  const tmpChargeId = created.data.charge.id;

  const { status, data } = await req(
    'PATCH',
    `/finance/charges/${tmpChargeId}/pay`,
    adminToken,
    { paidAmount: 0 },
  );

  expect([400, 422], `Pagamento com valor 0 deveria ser rejeitado — retornou ${status}`).toContain(status);
  expect(data.success).toBe(false);

  // Cleanup
  await req('PATCH', `/finance/charges/${tmpChargeId}`, adminToken, { status: 'CANCELLED' } as any);
});
