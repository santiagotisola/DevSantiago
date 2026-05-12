import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { prismaMock } from '../../test/setup';
import { makeTestApp, makeAuthHeader } from '../../test/testApp';
import sessionsRoutes from './sessions.routes';

const app = makeTestApp('/sessions', sessionsRoutes);
const { header, userId } = makeAuthHeader();

beforeEach(() => {
  vi.clearAllMocks();
  // authenticate middleware procura o user no DB
  prismaMock.user.findUnique.mockResolvedValue({
    id: userId,
    isActive: true,
    role: 'CONDOMINIUM_ADMIN',
  } as any);
});

describe('GET /sessions', () => {
  it('401 sem token', async () => {
    const r = await request(app).get('/sessions');
    expect(r.status).toBe(401);
  });

  it('lista sessões ativas (expiresAt > now) ordenadas por lastUsedAt desc', async () => {
    prismaMock.refreshToken.findMany.mockResolvedValue([
      { id: 's1', ipAddress: '1.1.1.1', userAgent: 'UA1', createdAt: new Date(), lastUsedAt: new Date(), expiresAt: new Date(Date.now() + 86_400_000) },
    ] as any);

    const r = await request(app).get('/sessions').set('Authorization', header);
    expect(r.status).toBe(200);
    expect(r.body.data.sessions).toHaveLength(1);

    const args = prismaMock.refreshToken.findMany.mock.calls[0][0] as any;
    expect(args.where.userId).toBe(userId);
    expect(args.where.expiresAt.gt).toBeInstanceOf(Date);
    expect(args.orderBy.lastUsedAt).toBe('desc');
  });
});

describe('DELETE /sessions/:id', () => {
  it('404 quando a sessão não pertence ao usuário', async () => {
    prismaMock.refreshToken.findFirst.mockResolvedValue(null);

    const r = await request(app).delete('/sessions/xyz').set('Authorization', header);
    expect(r.status).toBe(404);
  });

  it('revoga e grava audit log', async () => {
    prismaMock.refreshToken.findFirst.mockResolvedValue({
      id: 's1',
      userId,
      userAgent: 'UA',
      ipAddress: '1.1.1.1',
    } as any);
    prismaMock.refreshToken.delete.mockResolvedValue({} as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const r = await request(app).delete('/sessions/s1').set('Authorization', header);
    expect(r.status).toBe(200);
    expect(prismaMock.refreshToken.delete).toHaveBeenCalledWith({ where: { id: 's1' } });
    const auditCall = prismaMock.auditLog.create.mock.calls[0][0] as any;
    expect(auditCall.data.action).toBe('REVOKE_SESSION');
    expect(auditCall.data.userId).toBe(userId);
  });
});

describe('POST /sessions/revoke-others', () => {
  it('sem currentRefreshToken: revoga todas', async () => {
    prismaMock.refreshToken.deleteMany.mockResolvedValue({ count: 3 } as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const r = await request(app)
      .post('/sessions/revoke-others')
      .set('Authorization', header)
      .send({});
    expect(r.status).toBe(200);
    expect(r.body.data.revoked).toBe(3);

    const args = prismaMock.refreshToken.deleteMany.mock.calls[0][0] as any;
    expect(args.where.userId).toBe(userId);
    expect(args.where.id).toBeUndefined();
  });

  it('com currentRefreshToken válido: preserva a sessão atual', async () => {
    // Gerar um refresh token válido para passar pelo jwt.verify
    const jwt = await import('jsonwebtoken');
    const { env } = await import('../../config/env');
    const refreshToken = jwt.sign(
      { userId, tokenId: 'rt-current' },
      env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' },
    );

    prismaMock.refreshToken.findUnique.mockResolvedValue({
      id: 'keep-me',
      userId,
    } as any);
    prismaMock.refreshToken.deleteMany.mockResolvedValue({ count: 2 } as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const r = await request(app)
      .post('/sessions/revoke-others')
      .set('Authorization', header)
      .send({ currentRefreshToken: refreshToken });
    expect(r.status).toBe(200);

    const args = prismaMock.refreshToken.deleteMany.mock.calls[0][0] as any;
    expect(args.where.id).toEqual({ not: 'keep-me' });
  });
});
