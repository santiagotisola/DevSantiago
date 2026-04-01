import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { prismaMock } from '../../test/setup';
import { AppError, ConflictError, UnauthorizedError } from '../../middleware/errorHandler';

// Mock dos módulos externos que causariam efeitos colaterais
vi.mock('../../config/mail', () => ({ sendMail: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../notifications/notification.service', () => ({
  NotificationService: { enqueue: vi.fn().mockResolvedValue(undefined) },
}));

const authService = new AuthService();

// ─── Fixtures ────────────────────────────────────────────────────────────────
const HASH = bcrypt.hashSync('Senha@123', 4);

const mockUser = {
  id: 'user-1',
  name: 'João Silva',
  email: 'joao@condosync.com.br',
  passwordHash: HASH,
  role: 'RESIDENT' as const,
  isActive: true,
  phone: null,
  cpf: null,
  avatarUrl: null,
  condominiumUsers: [],
};

// ─── register ─────────────────────────────────────────────────────────────────
describe('AuthService.register', () => {
  it('cria usuário com sucesso quando e-mail e CPF são únicos', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: 'user-new',
      name: 'Maria',
      email: 'maria@test.com',
      phone: null,
      role: 'RESIDENT',
      createdAt: new Date(),
    } as any);

    const result = await authService.register({
      name: 'Maria',
      email: 'maria@test.com',
      password: 'Senha@123',
    });

    expect(result.user).toMatchObject({ email: 'maria@test.com' });
    expect(prismaMock.user.create).toHaveBeenCalledOnce();
  });

  it('lança ConflictError quando e-mail já cadastrado', async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser as any);

    await expect(
      authService.register({ name: 'X', email: mockUser.email, password: '123' }),
    ).rejects.toThrow(ConflictError);
  });
});

// ─── login ────────────────────────────────────────────────────────────────────
describe('AuthService.login', () => {
  const loginMockUser = {
    ...mockUser,
    lastLoginAt: null,
    condominiumUsers: [
      { condominium: { id: 'condo-1', name: 'Parque Verde', logoUrl: null } },
    ],
  };

  it('retorna accessToken e refreshToken com credenciais válidas', async () => {
    prismaMock.user.findUnique.mockResolvedValue(loginMockUser as any);
    prismaMock.refreshToken.create.mockResolvedValue({} as any);
    prismaMock.user.update.mockResolvedValue(loginMockUser as any);

    const result = await authService.login({ email: mockUser.email, password: 'Senha@123' });

    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(result.user.email).toBe(mockUser.email);
  });

  it('lança UnauthorizedError quando e-mail não existe', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(
      authService.login({ email: 'naoexiste@test.com', password: 'Senha@123' }),
    ).rejects.toThrow(UnauthorizedError);
  });

  it('lança UnauthorizedError quando senha está errada', async () => {
    prismaMock.user.findUnique.mockResolvedValue(loginMockUser as any);

    await expect(
      authService.login({ email: mockUser.email, password: 'SenhaErrada' }),
    ).rejects.toThrow(UnauthorizedError);
  });

  it('lança UnauthorizedError quando conta está desativada', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ ...loginMockUser, isActive: false } as any);

    await expect(
      authService.login({ email: mockUser.email, password: 'Senha@123' }),
    ).rejects.toThrow(UnauthorizedError);
  });
});

// ─── refreshTokens ────────────────────────────────────────────────────────────
describe('AuthService.refreshTokens', () => {
  it('lança UnauthorizedError para refresh token não encontrado', async () => {
    prismaMock.refreshToken.findUnique.mockResolvedValue(null);

    await expect(authService.refreshTokens('token-invalido')).rejects.toThrow(UnauthorizedError);
  });

  it('lança UnauthorizedError para refresh token expirado', async () => {
    prismaMock.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-1',
      token: 'tok',
      userId: 'user-1',
      expiresAt: new Date('2020-01-01'), // passado
    } as any);

    await expect(authService.refreshTokens('tok')).rejects.toThrow(UnauthorizedError);
  });
});

// ─── logout ───────────────────────────────────────────────────────────────────
describe('AuthService.logout', () => {
  it('deleta o refresh token sem erros', async () => {
    prismaMock.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

    await expect(authService.logout('some-token')).resolves.toBeUndefined();
    expect(prismaMock.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { token: 'some-token' } });
  });
});

// ─── requestPasswordReset ─────────────────────────────────────────────────────
describe('AuthService.requestPasswordReset', () => {
  it('retorna sem erros quando e-mail não existe (sem revelar existência)', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(authService.requestPasswordReset('naoexiste@test.com')).resolves.toBeUndefined();
    expect(prismaMock.passwordReset.create).not.toHaveBeenCalled();
  });

  it('cria token de reset quando e-mail existe', async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
    prismaMock.passwordReset.create.mockResolvedValue({} as any);

    await authService.requestPasswordReset(mockUser.email);

    expect(prismaMock.passwordReset.create).toHaveBeenCalledOnce();
  });
});

// ─── resetPassword ────────────────────────────────────────────────────────────
describe('AuthService.resetPassword', () => {
  it('lança AppError com token inválido ou expirado', async () => {
    prismaMock.passwordReset.findFirst.mockResolvedValue(null);

    await expect(authService.resetPassword('token-invalido', 'NovaSenha@123')).rejects.toThrow(AppError);
  });

  it('atualiza senha com token válido', async () => {
    prismaMock.passwordReset.findFirst.mockResolvedValue({
      id: 'reset-1',
      token: 'valid-token',
      userId: 'user-1',
      used: false,
      expiresAt: new Date(Date.now() + 3600_000),
    } as any);
    prismaMock.$transaction.mockResolvedValue([]);

    await expect(authService.resetPassword('valid-token', 'NovaSenha@123')).resolves.toBeUndefined();
    expect(prismaMock.$transaction).toHaveBeenCalledOnce();
  });
});

// ─── changePassword ───────────────────────────────────────────────────────────
describe('AuthService.changePassword', () => {
  it('lança AppError quando senha atual está errada', async () => {
    prismaMock.user.findUniqueOrThrow.mockResolvedValue(mockUser as any);

    await expect(
      authService.changePassword('user-1', 'SenhaErrada', 'NovaSenha@123'),
    ).rejects.toThrow(AppError);
  });

  it('atualiza senha com senha atual correta', async () => {
    prismaMock.user.findUniqueOrThrow.mockResolvedValue(mockUser as any);
    prismaMock.$transaction.mockResolvedValue([]);

    await expect(
      authService.changePassword('user-1', 'Senha@123', 'NovaSenha@123'),
    ).resolves.toBeUndefined();
    expect(prismaMock.$transaction).toHaveBeenCalledOnce();
  });
});
