// Injetar variáveis de ambiente para os testes antes de carregar o código
process.env.DATABASE_URL = 'postgresql://dummy:dummy@localhost:5432/dummy';
process.env.JWT_SECRET = 'super-secret-key-at-least-32-characters-long';
process.env.JWT_REFRESH_SECRET = 'super-secret-refresh-key-at-least-32-characters-long';
process.env.NODE_ENV = 'test';

import { beforeEach, vi } from 'vitest';
import { mockDeep, mockReset, DeepMockProxy } from 'vitest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { prisma } from '../config/prisma';

// Mock do Prisma Client
vi.mock('../config/prisma', () => ({
  __esModule: true,
  prisma: mockDeep<PrismaClient>(),
}));

/**
 * Helper para facilitar o uso do prismaMock em testes
 */
export const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

// Resetar mocks antes de cada teste para evitar interferência
beforeEach(() => {
  mockReset(prismaMock);
});
