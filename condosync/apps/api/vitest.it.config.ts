/**
 * Configuração de testes de INTEGRAÇÃO (it) — sobe Postgres real
 * via @testcontainers/postgresql. Separado do vitest.config.ts
 * para que `npm test` continue rápido (mocks) e `npm run test:it`
 * rode os caros.
 */
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    // Setup fica em test/it/setup.ts — sobe o container, aplica
    // migrations, expõe DATABASE_URL para os specs.
    globalSetup: ["./src/test/it/global-setup.ts"],
    include: ["src/**/*.it.test.ts"],
    exclude: ["node_modules", "**/dist/**"],
    // Containers não são free — limita paralelismo.
    pool: "forks",
    poolOptions: {
      forks: { singleFork: true },
    },
    testTimeout: 30_000,
    hookTimeout: 60_000,
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
