/**
 * [FLUXO-05] Obras (Renovations) + Prestadores de Obras
 *
 * Regras críticas validadas:
 *  ✔ Obra deve ser vinculada a unitId e condominiumId válidos do mesmo condo
 *  ✔ Morador só pode criar/ver obra na própria unidade
 *  ✔ Admin pode aprovar/reprovar a obra
 *  ✔ Após aprovação, porteiro pode consultar prestadores autorizados da unidade
 *  ✔ Obra sem description mínima → 400/422
 *  ✔ Morador não pode aprovar obra (RBAC)
 *  ✔ Porteiro não pode criar obra (RBAC)
 *  ✔ Prestador de obra adicionado deve aparecer na listagem da portaria
 *  ✔ Obra de outro morador é inacessível ao morador1
 */

import { test, expect } from '@playwright/test';
import { readTokens, req, CREDS, CONDO_ID } from './helpers/api';

let adminToken: string;
let doormanToken: string;
let residentToken: string;
let unitId: string;
let renovationId: string;
let providerId: string;
const UNIQUE = Date.now();
const START = new Date().toISOString();
const END   = new Date(Date.now() + 30 * 86_400_000).toISOString();

test.beforeAll(async () => {
  const { superAdmin, doorman, resident1 } = readTokens();
  adminToken    = superAdmin.accessToken;
  doormanToken  = doorman.accessToken;
  residentToken = resident1.accessToken;

  // Obtém unidade do morador1
  const { data } = await req('GET', `/residents/condominium/${CONDO_ID}`, adminToken);
  const r1 = data.data.residents.find((r: any) => r.user?.email === CREDS.resident1.email);
  unitId = r1.unitId;
});

// ─── Cenários de sucesso ───────────────────────────────────────────────────

test('OBRA-01 | Morador cria solicitação de obra na própria unidade → 201 PENDING', async () => {
  const payload = {
    unitId,
    condominiumId: CONDO_ID,
    description: `Reforma de hidráulica — banheiro principal E2E ${UNIQUE}`,
    type: 'hidráulica',
    startDate: START,
    endDate: END,
    notes: 'Troca de encanamentos internos',
  };

  const { status, data } = await req('POST', '/renovations', residentToken, payload);

  expect(status).toBe(201);
  expect(data.success).toBe(true);
  expect(data.data.renovation.status).toBe('PENDING');
  expect(data.data.renovation.unitId).toBe(unitId);
  expect(data.data.renovation.condominiumId).toBe(CONDO_ID);

  renovationId = data.data.renovation.id;
});

test('OBRA-02 | Admin aprova a obra → status muda para APPROVED', async () => {
  expect(renovationId, 'Depende do OBRA-01').toBeTruthy();

  const { status, data } = await req(
    'PATCH',
    `/renovations/${renovationId}/approve`,
    adminToken,
    { approved: true },
  );

  expect(status).toBe(200);
  expect(data.data.renovation.status).toBe('APPROVED');
});

test('OBRA-03 | Adicionar prestador autorizado à obra → aparece na listagem', async () => {
  expect(renovationId, 'Depende do OBRA-02').toBeTruthy();

  const providerPayload = {
    name: `Carlos Encanador ${UNIQUE}`,
    serviceType: 'encanamento',
    document: '123.456.789-09',
    phone: '(11) 98765-4321',
    company: 'Hidro Serviços',
  };

  const { status, data } = await req(
    'POST',
    `/renovations/${renovationId}/providers`,
    residentToken,
    providerPayload,
  );

  expect(status).toBe(201);
  expect(data.data.provider.name).toBe(`Carlos Encanador ${UNIQUE}`);
  expect(data.data.provider.renovationId).toBe(renovationId);

  providerId = data.data.provider.id;
});

test('OBRA-04 | Portaria consulta prestadores ativos da unidade → retorna o prestador adicionado', async () => {
  expect(renovationId, 'Depende do OBRA-03').toBeTruthy();

  const { status, data } = await req(
    'GET',
    `/renovations/unit/${unitId}/active-providers`,
    doormanToken,
  );

  expect(status).toBe(200);
  // active-providers retorna renovations com authorizedProviders incluídos
  const renovations: any[] = data.data.renovations ?? [];
  const providers = renovations.flatMap((r: any) => r.authorizedProviders ?? []);

  // O prestador adicionado deve aparecer (obra está APPROVED)
  const found = providers.find((p: any) => p.name === `Carlos Encanador ${UNIQUE}`);
  expect(found, 'Prestador autorizado deve aparecer para a portaria').toBeTruthy();
});

test('OBRA-05 | Listar obras do condomínio (admin) retorna a obra criada', async () => {
  const { status, data } = await req(
    'GET',
    `/renovations/condominium/${CONDO_ID}`,
    adminToken,
  );

  expect(status).toBe(200);
  const renovations: any[] = data.data.renovations;
  expect(renovations.some((r: any) => r.id === renovationId)).toBe(true);
});

test('OBRA-06 | Listar obras da unidade (morador) retorna apenas obras daquela unidade', async () => {
  const { status, data } = await req(
    'GET',
    `/renovations/unit/${unitId}`,
    residentToken,
  );

  expect(status).toBe(200);
  const renovations: any[] = data.data.renovations;

  const wrongUnit = renovations.filter((r: any) => r.unitId !== unitId);
  expect(wrongUnit.length, 'Listagem por unidade retornou obras de outra unidade').toBe(0);
});

// ─── Cenários de erro ─────────────────────────────────────────────────────

test('OBRA-ERR-01 | Criar obra com description curta (< 10 chars) → 400/422', async () => {
  const { status, data } = await req('POST', '/renovations', residentToken, {
    unitId,
    condominiumId: CONDO_ID,
    description: 'Curta',   // menos de 10 chars
    type: 'pintura',
    startDate: START,
  });

  expect([400, 422], `Descrição curta deveria ser rejeitada — retornou ${status}`).toContain(status);
  expect(data.success).toBe(false);
});

test('OBRA-ERR-02 | Criar obra SEM unitId → 400/422', async () => {
  const { status, data } = await req('POST', '/renovations', residentToken, {
    condominiumId: CONDO_ID,
    description: 'Descrição longa suficiente para passar a validação',
    type: 'pintura',
    startDate: START,
    // unitId ausente
  });

  expect([400, 422], `unitId ausente deveria ser rejeitado — retornou ${status}`).toContain(status);
  expect(data.success).toBe(false);
});

test('OBRA-ERR-03 | Morador NÃO pode aprovar obra → 403', async () => {
  expect(renovationId, 'Depende do OBRA-01').toBeTruthy();

  const { status, data } = await req(
    'PATCH',
    `/renovations/${renovationId}/approve`,
    residentToken,
    { approved: true },
  );

  expect([401, 403], `Morador não deveria aprovar obras — retornou ${status}`).toContain(status);
  expect(data.success).toBe(false);
});

test('OBRA-ERR-04 | DOORMAN não pode criar obra → 401/403', async () => {
  const { status, data } = await req('POST', '/renovations', doormanToken, {
    unitId,
    condominiumId: CONDO_ID,
    description: 'Porteiro tentando criar obra sem permissão',
    type: 'pintura',
    startDate: START,
  });

  expect([401, 403], `Porteiro não deveria criar obras — retornou ${status}`).toContain(status);
  expect(data.success).toBe(false);
});

test('OBRA-ERR-05 | Morador2 NÃO pode acessar obra do morador1', async () => {
  const { resident2 } = readTokens();

  // Morador2 tenta listar obras da unidade do morador1
  const { status } = await req(
    'GET',
    `/renovations/unit/${unitId}`,
    resident2.accessToken,
  );

  expect([403, 401], `Morador2 não deveria acessar obras da unidade do morador1 — retornou ${status}`).toContain(status);
});

test('OBRA-ERR-06 | Tipo de obra inválido → 400/422', async () => {
  const { status, data } = await req('POST', '/renovations', residentToken, {
    unitId,
    condominiumId: CONDO_ID,
    description: 'Obra com tipo inválido para teste E2E',
    type: 'nuclear', // não está no enum
    startDate: START,
  });

  expect([400, 422], `Tipo de obra inválido deveria ser rejeitado — retornou ${status}`).toContain(status);
  expect(data.success).toBe(false);
});

// ─── Cleanup ──────────────────────────────────────────────────────────────
test.afterAll(async () => {
  if (providerId) {
    await req('DELETE', `/renovations/${renovationId}/providers/${providerId}`, adminToken);
  }
  if (renovationId) {
    await req('DELETE', `/renovations/${renovationId}`, adminToken);
  }
});
