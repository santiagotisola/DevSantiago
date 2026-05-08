/**
 * Global setup para testes de integração: sobe um Postgres ephemeral
 * via testcontainers, aplica as migrations Prisma, expõe DATABASE_URL
 * via env. Teardown derruba o container ao fim do run.
 *
 * Reusa o mesmo container entre todos os specs (singleFork no
 * vitest.it.config.ts) para amortizar o custo do startup (~3-5s).
 *
 * Cada spec é responsável por usar `cleanDatabase(prisma)` em
 * beforeEach para garantir isolamento.
 */
import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "node:child_process";

let container: StartedPostgreSqlContainer | null = null;

export async function setup() {
  // Imagem pinada para reproducibilidade.
  container = await new PostgreSqlContainer("postgres:16-alpine")
    .withDatabase("condosync_it")
    .withUsername("test")
    .withPassword("test")
    .withReuse() // reusa entre runs locais (acelera dev)
    .start();

  const url = container.getConnectionUri();
  process.env.DATABASE_URL = url;
  // Defaults seguros para os outros validators de env.ts.
  process.env.JWT_SECRET ??= "ittest-jwt-secret-minimum-32-chars-aaa";
  process.env.JWT_REFRESH_SECRET ??= "ittest-refresh-secret-minimum-32-chars";
  process.env.REDIS_URL ??= "redis://localhost:6379/15"; // db dedicado p/ IT
  process.env.NODE_ENV = "test";
  process.env.ASAAS_WEBHOOK_TOKEN ??=
    "ittest-asaas-token-minimum-32-chars-bbb";
  process.env.APP_ENCRYPTION_KEY ??= Buffer.from(
    "ittest-encryption-key-32-bytes-z",
  ).toString("base64");

  // Aplica migrations ao DB recém-criado.
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url },
  });

  // Globais para o teardown.
  (globalThis as unknown as { __PG_CONTAINER__: StartedPostgreSqlContainer }).
    __PG_CONTAINER__ = container;
}

export async function teardown() {
  if (container) {
    await container.stop();
    container = null;
  }
}
