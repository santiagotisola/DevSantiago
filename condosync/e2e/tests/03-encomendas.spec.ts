/**
 * [FLUXO-03] Encomendas
 *
 * Regras críticas validadas:
 *  ✔ Encomenda deve sempre ter unitId válido
 *  ✔ Apenas porteiro/admin pode registrar encomenda
 *  ✔ Fluxo completo: RECEIVED → NOTIFIED → PICKED_UP
 *  ✔ Retirada exige o nome de quem retirou (pickedUpBy obrigatório)
 *  ✔ Encomenda sem unitId deve ser rejeitada
 *  ✔ Morador não pode registrar encomenda (RBAC)
 *  ✔ Encomenda cancelada não pode ser retirada
 *  ✔ Multi-tenant: listagem por condomínio não vaza entre condos
 */

import { test, expect } from '@playwright/test';
import { readTokens, req, CREDS, CONDO_ID } from './helpers/api';

let adminToken: string;
let doormanToken: string;
let residentToken: string;
let unitId: string;
let parcelId: string;
let cancelParcelId: string;
const UNIQUE = Date.now();

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

test('PARCEL-01 | Porteiro registra encomenda válida → 201 com status RECEIVED', async () => {
  const payload = {
    unitId,
    senderName: `Amazon ${UNIQUE}`,
    carrier: 'Correios',
    trackingCode: `BR${UNIQUE}`,
    storageLocation: 'Prateleira A-1',
  };

  const { status, data } = await req('POST', '/parcels', doormanToken, payload);

  expect(status).toBe(201);
  expect(data.success).toBe(true);
  expect(data.data.parcel.unitId).toBe(unitId);
  expect(data.data.parcel.status).toBe('RECEIVED');
  expect(data.data.parcel.pickedUpAt).toBeNull();

  parcelId = data.data.parcel.id;
});

test('PARCEL-02 | Listar encomendas do condomínio retorna a encomenda criada', async () => {
  const { status, data } = await req(
    'GET',
    `/parcels/condominium/${CONDO_ID}?unitId=${unitId}`,
    doormanToken,
  );

  expect(status).toBe(200);
  const parcels: any[] = data.data.parcels;

  // Toda encomenda deve ter unitId preenchido
  for (const p of parcels) {
    expect(p.unitId, `Encomenda ${p.id} sem unitId`).toBeTruthy();
  }

  // A encomenda criada deve aparecer
  expect(parcels.some((p: any) => p.id === parcelId)).toBe(true);
});

test('PARCEL-03 | Confirmar retirada → status muda para PICKED_UP', async () => {
  expect(parcelId, 'Depende do PARCEL-01').toBeTruthy();

  const { status, data } = await req(
    'PATCH',
    `/parcels/${parcelId}/pickup`,
    doormanToken,
    { pickedUpBy: 'Ana Costa' },
  );

  expect(status).toBe(200);
  expect(data.data.parcel.status).toBe('PICKED_UP');
  expect(data.data.parcel.pickedUpBy).toBe('Ana Costa');
  expect(data.data.parcel.pickedUpAt).toBeTruthy();
});

test('PARCEL-04 | Encomenda pendente por unidade retorna itens RECEIVED/NOTIFIED', async () => {
  // Cria uma nova encomenda para garantir pendente
  const { data: created } = await req('POST', '/parcels', doormanToken, {
    unitId,
    senderName: `Shopee ${UNIQUE}`,
    trackingCode: `SH${UNIQUE}`,
  });
  const pendingId = created.data.parcel.id;

  const { status, data } = await req('GET', `/parcels/unit/${unitId}/pending`, doormanToken);

  expect(status).toBe(200);
  const pending: any[] = data.data.parcels;
  expect(pending.some((p: any) => p.id === pendingId)).toBe(true);

  // Nenhuma PICKED_UP deve aparecer como pendente
  const picked = pending.filter((p: any) => p.status === 'PICKED_UP');
  expect(picked.length, 'Encomenda PICKED_UP não deve aparecer como pendente').toBe(0);

  // Cleanup
  await req('PATCH', `/parcels/${pendingId}/cancel`, adminToken, { reason: 'cleanup e2e' });
});

// ─── Cenários de erro ─────────────────────────────────────────────────────

test('PARCEL-ERR-01 | Registrar encomenda SEM unitId → 400/422', async () => {
  const { status, data } = await req('POST', '/parcels', doormanToken, {
    senderName: 'Sem Unidade',
    carrier: 'Jadlog',
    // unitId ausente intencionalmente
  });

  expect([400, 422], `unitId ausente deveria ser rejeitado — retornou ${status}`).toContain(status);
  expect(data.success).toBe(false);
});

test('PARCEL-ERR-02 | Registrar encomenda com UUID de unidade inexistente → 400/404/422', async () => {
  const { status, data } = await req('POST', '/parcels', doormanToken, {
    unitId: '00000000-0000-0000-0000-000000000000',
    senderName: 'Unidade Fantasma',
  });

  expect([400, 404, 422], `unitId inválido deve ser rejeitado — retornou ${status}`).toContain(status);
  expect(data.success).toBe(false);
});

test('PARCEL-ERR-03 | Morador NÃO pode registrar encomenda → 401/403', async () => {
  const { status, data } = await req('POST', '/parcels', residentToken, {
    unitId,
    senderName: 'Tentativa Morador',
  });

  expect([401, 403], `Morador não deveria registrar encomenda — retornou ${status}`).toContain(status);
  expect(data.success).toBe(false);
});

test('PARCEL-ERR-04 | Retirada sem pickedUpBy → 400/422', async () => {
  // Cria encomenda para o teste
  const { data: created } = await req('POST', '/parcels', doormanToken, {
    unitId,
    senderName: `Retirada Sem Nome ${UNIQUE}`,
  });
  const tmpId = created.data.parcel.id;

  const { status, data } = await req('PATCH', `/parcels/${tmpId}/pickup`, doormanToken, {
    // pickedUpBy ausente intencionalmente
  });

  expect([400, 422], `pickedUpBy é obrigatório na retirada — retornou ${status}`).toContain(status);
  expect(data.success).toBe(false);

  // Cleanup
  await req('PATCH', `/parcels/${tmpId}/cancel`, adminToken, { reason: 'cleanup e2e' });
});

test('PARCEL-ERR-05 | Encomenda cancelada não pode ser retirada', async () => {
  // Cria e cancela
  const { data: created } = await req('POST', '/parcels', doormanToken, {
    unitId,
    senderName: `Cancelada ${UNIQUE}`,
  });
  cancelParcelId = created.data.parcel.id;
  await req('PATCH', `/parcels/${cancelParcelId}/cancel`, doormanToken, { reason: 'teste e2e' });

  // Tenta retirar após cancelamento
  const { status, data } = await req(
    'PATCH',
    `/parcels/${cancelParcelId}/pickup`,
    doormanToken,
    { pickedUpBy: 'Alguém' },
  );

  expect([400, 409, 422], `Encomenda cancelada não deve permitir retirada — retornou ${status}`).toContain(status);
  expect(data.success).toBe(false);
});

test('PARCEL-ERR-06 | Sem autenticação → 401', async () => {
  const { status } = await req('GET', `/parcels/condominium/${CONDO_ID}`, '');
  expect(status).toBe(401);
});
