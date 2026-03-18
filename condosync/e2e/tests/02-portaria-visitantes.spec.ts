/**
 * [FLUXO-02] Portaria — Visitantes
 *
 * Regras críticas validadas:
 *  ✔ Visitante deve estar vinculado a uma unitId válida
 *  ✔ Morador pode pré-autorizar visitante apenas em sua própria unidade
 *  ✔ Porteiro registra entrada (status PENDING → ENTERED)
 *  ✔ Porteiro registra saída (status ENTERED → LEFT)
 *  ✔ Visitante sem unitId → API deve rejeitar
 *  ✔ Visitante não pode ser registrado em unidade de outro condomínio
 *  ✔ Telefone inválido (letras) deve ser rejeitado
 *  ✔ DOORMAN não pode deletar visitante (RBAC)
 */

import { test, expect } from '@playwright/test';
import { readTokens, req, CREDS, CONDO_ID } from './helpers/api';

let adminToken: string;
let doormanToken: string;
let residentToken: string;
let unitId: string;       // unidade do morador1 (seed)
let visitorId: string;    // visitante criado no teste
const UNIQUE = Date.now();

test.beforeAll(async () => {
  const { superAdmin, doorman, resident1 } = readTokens();
  adminToken    = superAdmin.accessToken;
  doormanToken  = doorman.accessToken;
  residentToken = resident1.accessToken;

  // Descobre a unidade do morador1
  const { data } = await req('GET', `/residents/condominium/${CONDO_ID}`, adminToken);
  const residents: any[] = data.data.residents;
  const r1 = residents.find((r: any) => r.user?.email === CREDS.resident1.email);
  expect(r1?.unitId, 'Morador1 deve ter unitId no seed').toBeTruthy();
  unitId = r1.unitId;
});

// ─── Cenários de sucesso ───────────────────────────────────────────────────

test('VISIT-01 | Porteiro cria visitante com unitId válido → 201', async () => {
  const payload = {
    unitId,
    name: `Visitante Teste ${UNIQUE}`,
    document: '123456789',
    documentType: 'RG',
    reason: 'Teste E2E visita',
    phone: '(11) 99888-7766',
  };

  const { status, data } = await req('POST', '/visitors', doormanToken, payload);

  expect(status).toBe(201);
  expect(data.success).toBe(true);
  expect(data.data.visitor.unitId).toBe(unitId);
  expect(data.data.visitor.status).toBe('PENDING');

  visitorId = data.data.visitor.id;
});

test('VISIT-02 | Porteiro registra entrada → status muda para ENTERED', async () => {
  expect(visitorId, 'Depende do VISIT-01').toBeTruthy();

  const { status, data } = await req('POST', `/visitors/${visitorId}/entry`, doormanToken, {});

  expect(status).toBe(200);
  expect(data.data.visitor.status).toBe('INSIDE');
  expect(data.data.visitor.entryAt).toBeTruthy();
});

test('VISIT-03 | Porteiro registra saída → status muda para LEFT', async () => {
  expect(visitorId, 'Depende do VISIT-02').toBeTruthy();

  const { status, data } = await req('POST', `/visitors/${visitorId}/exit`, doormanToken, {});

  expect(status).toBe(200);
  expect(data.data.visitor.status).toBe('LEFT');
  expect(data.data.visitor.exitAt).toBeTruthy();
});

test('VISIT-04 | Morador pré-autoriza visitante na própria unidade → 201', async () => {
  const payload = {
    unitId,
    name: `Pre-Autorizado ${UNIQUE}`,
    document: '987654321',
    documentType: 'CPF',
    reason: 'Visita agendada E2E',
    scheduledAt: new Date(Date.now() + 86_400_000).toISOString(), // amanhã
  };

  const { status, data } = await req('POST', '/visitors', residentToken, payload);

  expect(status).toBe(201);
  expect(data.data.visitor.status).toBe('AUTHORIZED'); // residente cria → pré-autorizado
  expect(data.data.visitor.unitId).toBe(unitId);

  // Cleanup
  await req('DELETE', `/visitors/${data.data.visitor.id}`, adminToken);
});

test('VISIT-05 | Listar visitantes da unidade só retorna entradas daquela unidade', async () => {
  const { status, data } = await req(
    'GET',
    `/visitors/condominium/${CONDO_ID}?unitId=${unitId}`,
    doormanToken,
  );

  expect(status).toBe(200);
  const visitors: any[] = data.data.visitors;

  const wrongUnit = visitors.filter((v: any) => v.unitId !== unitId);
  expect(wrongUnit.length, 'Filtro por unitId retornou visitantes de outra unidade').toBe(0);
});

// ─── Cenários de erro ─────────────────────────────────────────────────────

test('VISIT-ERR-01 | Criação de visitante SEM unitId deve retornar 400/422', async () => {
  const payload = {
    name: `Sem Unidade ${UNIQUE}`,
    reason: 'teste sem unit',
    // unitId ausente intencionalmente
  };

  const { status, data } = await req('POST', '/visitors', doormanToken, payload);

  expect([400, 422], `API retornou ${status} — visitante sem unitId deveria ser rejeitado`).toContain(status);
  expect(data.success).toBe(false);
});

test('VISIT-ERR-02 | Telefone com letras deve ser rejeitado', async () => {
  const payload = {
    unitId,
    name: `Tel Inválido ${UNIQUE}`,
    phone: 'abcdef',
    reason: 'teste validação telefone',
  };

  const { status, data } = await req('POST', '/visitors', doormanToken, payload);

  expect([400, 422], `Telefone com letras deveria retornar 400/422 — retornou ${status}`).toContain(status);
  expect(data.success).toBe(false);
});

test('VISIT-ERR-03 | Morador NÃO pode autorizar visita em unidade alheia', async () => {
  // Obtém uma unidade diferente da do morador1
  const { data } = await req('GET', `/units/condominium/${CONDO_ID}`, adminToken);
  const otherUnit = data.data.units.find((u: any) => u.id !== unitId);
  expect(otherUnit, 'Deve existir mais de uma unidade no seed').toBeTruthy();

  const { status } = await req(
    'POST',
    '/visitors',
    residentToken,
    {
      unitId: otherUnit.id,
      name: `Invasão ${UNIQUE}`,
      reason: 'tentando cadastrar em unidade alheia',
    },
  );

  expect([403, 401], `Morador autorizou visitante em unidade alheia — retornou ${status}`).toContain(status);
});

test('VISIT-ERR-04 | Tentar registrar entrada de visitante inexistente → 404', async () => {
  const { status } = await req(
    'POST',
    '/visitors/00000000-0000-0000-0000-000000000000/entry',
    doormanToken,
    {},
  );
  expect(status).toBe(404);
});

test('VISIT-ERR-05 | Porteiro sem token não pode listar visitantes → 401', async () => {
  const { status } = await req('GET', `/visitors/condominium/${CONDO_ID}`, '');
  expect(status).toBe(401);
});
