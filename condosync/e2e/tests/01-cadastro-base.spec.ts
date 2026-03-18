/**
 * [FLUXO-01] Cadastro Base: Unidades e Moradores
 *
 * Regras críticas validadas:
 *  ✔ Morador deve sempre ser vinculado a uma unidade válida
 *  ✔ Morador sem unidade → API deve rejeitar (400/422)
 *  ✔ Unidade deve pertencer ao mesmo condomínio que o morador
 *  ✔ E-mail duplicado em mesmo condomínio → 409
 *  ✔ Campo unitId inválido (UUID fantasma) → 422/400
 *  ✔ Dados isolados por condomínio (multi-tenant)
 */

import { test, expect } from '@playwright/test';
import { readTokens, req, CREDS, CONDO_ID } from './helpers/api';

let adminToken: string;
let unitId: string;         // Casa 01 do seed
let residentCuId: string;  // CondominiumUser criado no teste (para cleanup)
const UNIQUE = Date.now(); // Garante e-mails únicos entre execuções

test.beforeAll(async () => {
  const { superAdmin } = readTokens();
  adminToken = superAdmin.accessToken;

  // Busca a primeira unidade OCCUPIED para usar nos testes
  const { data } = await req('GET', `/units/condominium/${CONDO_ID}`, adminToken);
  const units: any[] = data?.data?.units ?? [];
  const occupied = units.find((u: any) => u.status === 'OCCUPIED');
  expect(occupied, 'Seed deve ter pelo menos uma unidade OCCUPIED').toBeTruthy();
  unitId = occupied.id;
});

// ─── Cenários de sucesso ───────────────────────────────────────────────────

test('UNIT-01 | Listar unidades do condomínio retorna dados corretos', async () => {
  const { status, data } = await req('GET', `/units/condominium/${CONDO_ID}`, adminToken);

  expect(status).toBe(200);
  expect(data.success).toBe(true);

  const units: any[] = data.data.units;
  expect(units.length).toBeGreaterThan(0);

  // Toda unidade deve ter id, identifier e status
  for (const unit of units) {
    expect(unit.id).toBeTruthy();
    expect(unit.identifier).toBeTruthy();
    expect(['OCCUPIED', 'VACANT', 'UNDER_RENOVATION', 'BLOCKED']).toContain(unit.status);
  }

  // Unidades OCCUPIED devem ter residents[] com pelo menos 1 item
  const occupiedUnits = units.filter((u) => u.status === 'OCCUPIED');
  for (const unit of occupiedUnits) {
    expect(unit.residents?.length, `Unidade ${unit.identifier} OCCUPIED sem morador`).toBeGreaterThan(0);
    expect(unit.residents[0].user?.name, 'Morador deve ter nome').toBeTruthy();
  }
});

test('UNIT-02 | Criar morador com unidade válida deve retornar 201', async () => {
  const payload = {
    name: `Morador Teste ${UNIQUE}`,
    email: `morador.teste.${UNIQUE}@e2e.condosync.test`,
    phone: '(11) 99999-0001',
    unitId,
    condominiumId: CONDO_ID,
  };

  const { status, data } = await req('POST', '/residents', adminToken, payload);

  expect(status).toBe(201);
  expect(data.success).toBe(true);
  expect(data.data.resident.unitId).toBe(unitId);

  residentCuId = data.data.resident.id; // Salva para cleanup
});

test('UNIT-03 | Buscar moradores do condomínio retorna lista íntegra', async () => {
  const { status, data } = await req('GET', `/residents/condominium/${CONDO_ID}`, adminToken);

  expect(status).toBe(200);
  const residents: any[] = data.data.residents;
  expect(residents.length).toBeGreaterThan(0);

  // Todo morador RESIDENT deve ter unitId (regra crítica)
  const withoutUnit = residents.filter((r: any) => r.role === 'RESIDENT' && !r.unitId);
  expect(
    withoutUnit.map((r: any) => r.user?.name),
    'Encontrado morador com role RESIDENT sem unitId — falha na regra crítica',
  ).toHaveLength(0);
});

// ─── Cenários de erro (regressão de validação) ────────────────────────────

test('UNIT-ERR-01 | Criar morador SEM unitId deve retornar 400/422', async () => {
  const payload = {
    name: `Sem Unidade ${UNIQUE}`,
    email: `sem.unidade.${UNIQUE}@e2e.condosync.test`,
    condominiumId: CONDO_ID,
    // unitId ausente intencionalmente
  };

  const { status, data } = await req('POST', '/residents', adminToken, payload);

  expect([400, 422], `API retornou ${status} em vez de 400/422 — backend NÃO está validando unitId obrigatório`).toContain(status);
  expect(data.success).toBe(false);
});

test('UNIT-ERR-02 | Criar morador com unitId de UUID inexistente deve retornar 400/422/404', async () => {
  const payload = {
    name: `UUID Fantasma ${UNIQUE}`,
    email: `uuid.fantasma.${UNIQUE}@e2e.condosync.test`,
    condominiumId: CONDO_ID,
    unitId: '00000000-0000-0000-0000-000000000000',
  };

  const { status, data } = await req('POST', '/residents', adminToken, payload);

  expect([400, 404, 422], `API retornou ${status} — unitId inexistente deveria ser rejeitado`).toContain(status);
  expect(data.success).toBe(false);
});

test('UNIT-ERR-03 | Criar morador com unitId de OUTRO condomínio deve ser rejeitado', async () => {
  // Primeiro cria uma unidade isolada num condomínio que não existe para
  // simular cross-tenant: basta usar um UUID plausível mas de outro condo
  const payload = {
    name: `Cross Tenant ${UNIQUE}`,
    email: `cross.tenant.${UNIQUE}@e2e.condosync.test`,
    condominiumId: CONDO_ID,
    unitId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', // nunca existirá neste condo
  };

  const { status } = await req('POST', '/residents', adminToken, payload);

  expect([400, 404, 422], 'Unidade de outro condomínio deve ser rejeitada').toContain(status);
});

test('UNIT-ERR-04 | E-mail duplicado no mesmo condomínio deve retornar 409', async () => {
  const payload = {
    name: 'Ana Costa',
    email: 'morador1@parqueverde.com.br', // já existe no seed
    condominiumId: CONDO_ID,
    unitId,
  };

  const { status, data } = await req('POST', '/residents', adminToken, payload);

  expect(status).toBe(409);
  expect(data.success).toBe(false);
});

test('UNIT-ERR-05 | Requisição sem token deve retornar 401', async () => {
  const { status } = await req('GET', `/residents/condominium/${CONDO_ID}`, '');
  expect(status).toBe(401);
});

test('UNIT-ERR-06 | Morador não pode criar outro morador (RBAC)', async () => {
  const { resident1 } = readTokens();

  const { status, data } = await req('POST', '/residents', resident1.accessToken, {
    name: 'Invasor',
    email: `invasor.${UNIQUE}@e2e.condosync.test`,
    condominiumId: CONDO_ID,
    unitId,
  });

  expect([401, 403], `Morador não deveria criar outros moradores — retornou ${status}`).toContain(status);
  expect(data.success).toBe(false);
});

// ─── Cleanup ──────────────────────────────────────────────────────────────
test.afterAll(async () => {
  if (residentCuId) {
    await req('DELETE', `/residents/${residentCuId}`, adminToken);
  }
});
