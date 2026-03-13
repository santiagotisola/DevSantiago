"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prismaMock = void 0;
// Injetar variáveis de ambiente para os testes antes de carregar o código
process.env.DATABASE_URL = 'postgresql://dummy:dummy@localhost:5432/dummy';
process.env.JWT_SECRET = 'super-secret-key-at-least-32-characters-long';
process.env.JWT_REFRESH_SECRET = 'super-secret-refresh-key-at-least-32-characters-long';
process.env.NODE_ENV = 'test';
const vitest_1 = require("vitest");
const vitest_mock_extended_1 = require("vitest-mock-extended");
const prisma_1 = require("../config/prisma");
// Mock do Prisma Client
vitest_1.vi.mock('../config/prisma', () => ({
    __esModule: true,
    prisma: (0, vitest_mock_extended_1.mockDeep)(),
}));
/**
 * Helper para facilitar o uso do prismaMock em testes
 */
exports.prismaMock = prisma_1.prisma;
// Resetar mocks antes de cada teste para evitar interferência
(0, vitest_1.beforeEach)(() => {
    (0, vitest_mock_extended_1.mockReset)(exports.prismaMock);
});
//# sourceMappingURL=setup.js.map