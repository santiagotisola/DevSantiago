/**
 * Fixtures compartilhadas para testes de integração multi-tenant.
 *
 * `seedTwoCondominiums` cria a estrutura mínima para validar
 * isolamento cross-tenant: 2 condomínios, 1 SUPER_ADMIN, 1 SYNDIC
 * em A, 1 RESIDENT em A, 1 SYNDIC em B. Retorna IDs que os specs
 * usam direto.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

export interface TenantFixture {
  superAdmin: { id: string; token: string };
  condoA: {
    id: string;
    syndic: { id: string; token: string };
    resident: { id: string; token: string };
  };
  condoB: {
    id: string;
    syndic: { id: string; token: string };
  };
}

export async function cleanDatabase(prisma: PrismaClient) {
  // Truncate em ordem que respeita FKs. Postgres TRUNCATE … CASCADE
  // resolve, mas listamos para clareza.
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "financial_transactions",
      "charges",
      "financial_accounts",
      "financial_categories",
      "fines",
      "tickets",
      "ticket_messages",
      "parcels",
      "visitors",
      "vehicles",
      "vehicle_access_logs",
      "dependents",
      "notifications",
      "audit_logs",
      "refresh_tokens",
      "password_resets",
      "webhook_events",
      "condominium_users",
      "units",
      "condominiums",
      "users"
    RESTART IDENTITY CASCADE;
  `);
}

import jwt from "jsonwebtoken";

function sign(userId: string, role: string): string {
  return jwt.sign(
    { userId, role, name: `Test ${role}` },
    process.env.JWT_SECRET!,
    { expiresIn: "1h" },
  );
}

export async function seedTwoCondominiums(
  prisma: PrismaClient,
): Promise<TenantFixture> {
  const passwordHash = await bcrypt.hash("Test@123456", 4);

  const superAdmin = await prisma.user.create({
    data: {
      email: "super@test.local",
      name: "Super",
      passwordHash,
      role: "SUPER_ADMIN",
    },
  });

  const [condoA, condoB] = await Promise.all([
    prisma.condominium.create({
      data: {
        name: "Condo A",
        cnpj: "11111111000111",
        address: "Rua A, 1",
        city: "São Paulo",
        state: "SP",
        zipCode: "01000000",
      },
    }),
    prisma.condominium.create({
      data: {
        name: "Condo B",
        cnpj: "22222222000122",
        address: "Rua B, 2",
        city: "São Paulo",
        state: "SP",
        zipCode: "02000000",
      },
    }),
  ]);

  const syndicA = await prisma.user.create({
    data: {
      email: "syndic-a@test.local",
      name: "Syndic A",
      passwordHash,
      role: "SYNDIC",
    },
  });
  const residentA = await prisma.user.create({
    data: {
      email: "resident-a@test.local",
      name: "Resident A",
      passwordHash,
      role: "RESIDENT",
    },
  });
  const syndicB = await prisma.user.create({
    data: {
      email: "syndic-b@test.local",
      name: "Syndic B",
      passwordHash,
      role: "SYNDIC",
    },
  });

  await prisma.condominiumUser.createMany({
    data: [
      { userId: syndicA.id, condominiumId: condoA.id, role: "SYNDIC", isActive: true },
      { userId: residentA.id, condominiumId: condoA.id, role: "RESIDENT", isActive: true },
      { userId: syndicB.id, condominiumId: condoB.id, role: "SYNDIC", isActive: true },
    ],
  });

  return {
    superAdmin: { id: superAdmin.id, token: sign(superAdmin.id, "SUPER_ADMIN") },
    condoA: {
      id: condoA.id,
      syndic: { id: syndicA.id, token: sign(syndicA.id, "SYNDIC") },
      resident: { id: residentA.id, token: sign(residentA.id, "RESIDENT") },
    },
    condoB: {
      id: condoB.id,
      syndic: { id: syndicB.id, token: sign(syndicB.id, "SYNDIC") },
    },
  };
}
