import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { prismaMock } from '../../test/setup';
import { makeTestApp, makeAuthHeader } from '../../test/testApp';

// Mock do invitation.service para evitar lidar com hashing/email/etc
vi.mock('./invitation.service', () => ({
  invitationService: {
    previewByToken: vi.fn(),
    accept: vi.fn(),
    create: vi.fn(),
    listByCondominium: vi.fn(),
    resend: vi.fn(),
    revoke: vi.fn(),
  },
}));

import invitationRoutes from './invitation.routes';
import { invitationService } from './invitation.service';

const app = makeTestApp('/invitations', invitationRoutes);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Rotas públicas (sem auth)', () => {
  it('GET /public/:token devolve preview', async () => {
    (invitationService.previewByToken as any).mockResolvedValue({
      email: 'a@b.com',
      role: 'RESIDENT',
    });
    const r = await request(app).get('/invitations/public/abc123');
    expect(r.status).toBe(200);
    expect(r.body.data.invitation.email).toBe('a@b.com');
    expect(invitationService.previewByToken).toHaveBeenCalledWith('abc123');
  });

  it('POST /public/:token/accept exige password e devolve resultado', async () => {
    (invitationService.accept as any).mockResolvedValue({
      user: { id: 'u1' },
      accessToken: 'at',
      refreshToken: 'rt',
    });
    const r = await request(app)
      .post('/invitations/public/abc123/accept')
      .send({ password: 'Strong@2026' });
    expect(r.status).toBe(200);
    expect(invitationService.accept).toHaveBeenCalledWith(
      expect.objectContaining({ token: 'abc123', password: 'Strong@2026' }),
    );
  });

  it('POST /public/:token/accept valida senha mínima (8 chars)', async () => {
    const r = await request(app)
      .post('/invitations/public/abc/accept')
      .send({ password: 'short' });
    expect(r.status).toBe(422);
  });
});

describe('Rotas autenticadas', () => {
  const { header, userId } = makeAuthHeader('admin-1', 'CONDOMINIUM_ADMIN');

  beforeEach(() => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: userId,
      isActive: true,
      role: 'CONDOMINIUM_ADMIN',
    } as any);
  });

  it('POST / cria convite e grava audit log', async () => {
    // ensureCanManageCondominium: precisa de membership
    prismaMock.condominiumUser.findFirst.mockResolvedValue({
      role: 'CONDOMINIUM_ADMIN',
    } as any);
    (invitationService.create as any).mockResolvedValue({ id: 'inv-1' });
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const r = await request(app)
      .post('/invitations')
      .set('Authorization', header)
      .send({
        email: 'novo@b.com',
        role: 'RESIDENT',
        condominiumId: '00000000-0000-0000-0000-000000000001',
      });
    expect(r.status).toBe(201);
    expect(invitationService.create).toHaveBeenCalled();
    const audit = prismaMock.auditLog.create.mock.calls[0]?.[0] as any;
    expect(audit?.data.action).toBe('CREATE');
    expect(audit?.data.module).toBe('invitations');
  });

  it('POST / 403 quando ator não gerencia o condomínio', async () => {
    prismaMock.condominiumUser.findFirst.mockResolvedValue(null);
    const r = await request(app)
      .post('/invitations')
      .set('Authorization', header)
      .send({
        email: 'x@y.com',
        role: 'RESIDENT',
        condominiumId: '00000000-0000-0000-0000-000000000001',
      });
    expect(r.status).toBe(403);
    expect(invitationService.create).not.toHaveBeenCalled();
  });

  it('POST / 403 quando ator não-SUPER_ADMIN tenta convidar SUPER_ADMIN', async () => {
    prismaMock.condominiumUser.findFirst.mockResolvedValue({
      role: 'CONDOMINIUM_ADMIN',
    } as any);
    const r = await request(app)
      .post('/invitations')
      .set('Authorization', header)
      .send({
        email: 'godmode@b.com',
        role: 'SUPER_ADMIN',
        condominiumId: '00000000-0000-0000-0000-000000000001',
      });
    expect(r.status).toBe(403);
  });

  it('DELETE /:id revoga + audit', async () => {
    prismaMock.invitation.findUnique.mockResolvedValue({
      condominiumId: 'c1',
    } as any);
    prismaMock.condominiumUser.findFirst.mockResolvedValue({
      role: 'CONDOMINIUM_ADMIN',
    } as any);
    (invitationService.revoke as any).mockResolvedValue(undefined);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const r = await request(app)
      .delete('/invitations/inv-1')
      .set('Authorization', header);
    expect(r.status).toBe(200);
    expect(invitationService.revoke).toHaveBeenCalledWith('inv-1', 'c1');
    const audit = prismaMock.auditLog.create.mock.calls[0]?.[0] as any;
    expect(audit?.data.action).toBe('REVOKE');
  });

  it('DELETE /:id 404 quando o convite não existe', async () => {
    prismaMock.invitation.findUnique.mockResolvedValue(null);
    const r = await request(app)
      .delete('/invitations/none')
      .set('Authorization', header);
    expect(r.status).toBe(404);
  });
});
