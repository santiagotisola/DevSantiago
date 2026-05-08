import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from "bcrypt";
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
  // Helper: gera um JWT real assinado com a mesma chave de teste,
  // já que após o hardening o service verifica a assinatura ANTES
  // de tocar no DB.
  const signRefresh = (payload: object) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const jwt = require('jsonwebtoken');
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  };

  it('lança UnauthorizedError para refresh token com assinatura inválida', async () => {
    await expect(authService.refreshTokens('lixo')).rejects.toThrow(
      UnauthorizedError,
    );
  });

  it('detecta reuso e revoga toda a família quando token JWT-válido não está no DB', async () => {
    const token = signRefresh({ userId: 'user-1', role: 'RESIDENT' });
    prismaMock.refreshToken.findUnique.mockResolvedValue(null);
    prismaMock.refreshToken.deleteMany.mockResolvedValue({ count: 3 });

    await expect(authService.refreshTokens(token)).rejects.toThrow(
      UnauthorizedError,
    );
    expect(prismaMock.refreshToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
    });
  });

  it('lança UnauthorizedError para refresh token expirado no DB', async () => {
    const token = signRefresh({ userId: 'user-1', role: 'RESIDENT' });
    prismaMock.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-1',
      token,
      userId: 'user-1',
      expiresAt: new Date('2020-01-01'),
    } as any);

    await expect(authService.refreshTokens(token)).rejects.toThrow(
      UnauthorizedError,
    );
  });

  it('emite tokens com role atual do DB, não do JWT', async () => {
    // JWT antigo dizendo SUPER_ADMIN; DB diz RESIDENT (rebaixado).
    const token = signRefresh({ userId: 'user-1', role: 'SUPER_ADMIN' });
    prismaMock.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-1',
      token,
      userId: 'user-1',
      expiresAt: new Date(Date.now() + 86_400_000),
    } as any);
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      role: 'RESIDENT',
      name: 'João',
      isActive: true,
    } as any);
    prismaMock.refreshToken.delete.mockResolvedValue({} as any);
    prismaMock.refreshToken.create.mockResolvedValue({} as any);

    const result = await authService.refreshTokens(token);
    // Decodifica o novo access token e confirma role rebaixada.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(result.accessToken, process.env.JWT_SECRET);
    expect(decoded.role).toBe('RESIDENT');
  });
});

// ─── logout ───────────────────────────────────────────────────────────────────
describe('AuthService.logout', () => {
  const signRefresh = (payload: object) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const jwt = require('jsonwebtoken');
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  };

  it('é noop silencioso para refresh token inválido (não vaza existência)', async () => {
    await expect(authService.logout('lixo')).resolves.toBeUndefined();
    expect(prismaMock.refreshToken.deleteMany).not.toHaveBeenCalled();
  });

  it('deleta com filtro de userId derivado do JWT (impede DoS de sessão alheia)', async () => {
    prismaMock.refreshToken.deleteMany.mockResolvedValue({ count: 1 });
    const token = signRefresh({ userId: 'user-1', role: 'RESIDENT' });

    await authService.logout(token);
    expect(prismaMock.refreshToken.deleteMany).toHaveBeenCalledWith({
      where: { token, userId: 'user-1' },
    });
  });
});

// ─── register: anti-enumeração ────────────────────────────────────────────────
describe('AuthService.register (anti-enumeration)', () => {
  it('mensagem genérica em colisão de e-mail (sem distinguir e-mail vs cpf)', async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser as any);

    await expect(
      authService.register({ name: 'X', email: mockUser.email, password: 'Senha@123' }),
    ).rejects.toThrowError(/não foi possível concluir o cadastro/i);
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
