import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { prismaMock } from '../../test/setup';
import { makeTestApp, makeAuthHeader } from '../../test/testApp';
import preferenceRoutes from './preference.routes';

const app = makeTestApp('/notification-preferences', preferenceRoutes);
const { header, userId } = makeAuthHeader();

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.user.findUnique.mockResolvedValue({
    id: userId,
    isActive: true,
    role: 'RESIDENT',
  } as any);
});

describe('GET /notification-preferences', () => {
  it('retorna 8 tipos com defaults opt-in quando não há rows', async () => {
    prismaMock.notificationPreference.findMany.mockResolvedValue([] as any);
    const r = await request(app).get('/notification-preferences').set('Authorization', header);
    expect(r.status).toBe(200);
    expect(r.body.data.preferences).toHaveLength(8);
    expect(r.body.data.preferences[0]).toMatchObject({ inapp: true, email: true, push: true });
  });

  it('mescla rows existentes com defaults', async () => {
    prismaMock.notificationPreference.findMany.mockResolvedValue([
      { type: 'PARCEL', inapp: true, email: false, push: false },
    ] as any);
    const r = await request(app).get('/notification-preferences').set('Authorization', header);
    expect(r.status).toBe(200);
    const parcel = r.body.data.preferences.find((p: any) => p.type === 'PARCEL');
    expect(parcel).toMatchObject({ inapp: true, email: false, push: false });
    const visitor = r.body.data.preferences.find((p: any) => p.type === 'VISITOR');
    expect(visitor).toMatchObject({ inapp: true, email: true, push: true });
  });
});

describe('PUT /notification-preferences/:type', () => {
  it('400 para tipo desconhecido', async () => {
    const r = await request(app)
      .put('/notification-preferences/DESCONHECIDO')
      .set('Authorization', header)
      .send({ inapp: false });
    expect(r.status).toBe(400);
  });

  it('upsert idempotente para tipo válido', async () => {
    prismaMock.notificationPreference.upsert.mockResolvedValue({
      id: 'p1',
      userId,
      type: 'FINANCIAL',
      inapp: false,
      email: true,
      push: true,
    } as any);

    const r = await request(app)
      .put('/notification-preferences/FINANCIAL')
      .set('Authorization', header)
      .send({ inapp: false });
    expect(r.status).toBe(200);

    const call = prismaMock.notificationPreference.upsert.mock.calls[0][0] as any;
    expect(call.where).toEqual({ userId_type: { userId, type: 'FINANCIAL' } });
    expect(call.update).toEqual({ inapp: false });
  });

  it('autenticação obrigatória', async () => {
    const r = await request(app).put('/notification-preferences/PARCEL').send({ inapp: false });
    expect(r.status).toBe(401);
  });
});
