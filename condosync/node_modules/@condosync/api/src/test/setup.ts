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
