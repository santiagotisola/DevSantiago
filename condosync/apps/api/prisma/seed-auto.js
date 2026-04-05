// Seed automático — cria Super Admin e condomínio base (idempotente via upsert).
// Executado automaticamente pelo entrypoint.sh na inicialização do container.
"use strict";

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Aplicando seed base (idempotente)...");

  // ── Super Admin ──────────────────────────────────────────────────────────
  const password = await bcrypt.hash("Admin@2026", 12);
  const superAdmin = await prisma.user.upsert({
    where: { email: "admin@condosync.com.br" },
    update: {},
    create: {
      name: "Super Admin",
      email: "admin@condosync.com.br",
      passwordHash: password,
      role: "SUPER_ADMIN",
      isActive: true,
      emailVerified: true,
    },
  });
  console.log("✅ Super admin:", superAdmin.email);

  // ── Condomínio base: Residencial Veredas do Bosque ───────────────────────
  const condominium = await prisma.condominium.upsert({
    where: { cnpj: "12345678000195" },
    update: {},
    create: {
      name: "Residencial Veredas do Bosque",
      cnpj: "12345678000195",
      address: "Rua das Palmeiras, 500",
      city: "Goiânia",
      state: "GO",
      zipCode: "74000000",
      phone: "(62) 3000-0000",
      email: "admin@veredasdobosque.com.br",
      plan: "professional",
      maxUnits: 80,
    },
  });
  console.log("✅ Condomínio:", condominium.name);

  // ── Associar Super Admin ao condomínio ───────────────────────────────────
  await prisma.condominiumUser.upsert({
    where: { userId_condominiumId: { userId: superAdmin.id, condominiumId: condominium.id } },
    update: {},
    create: {
      userId: superAdmin.id,
      condominiumId: condominium.id,
      role: "SUPER_ADMIN",
      isActive: true,
    },
  });
  console.log("✅ Super admin associado ao condomínio");

  // ── Síndico padrão ───────────────────────────────────────────────────────
  const syndicPwd = await bcrypt.hash("Sindico@2026", 12);
  const syndic = await prisma.user.upsert({
    where: { email: "sindico@veredasdobosque.com.br" },
    update: {},
    create: {
      name: "Carlos Silva",
      email: "sindico@veredasdobosque.com.br",
      passwordHash: syndicPwd,
      phone: "(62) 99100-0001",
      role: "SYNDIC",
      isActive: true,
      emailVerified: true,
    },
  });
  await prisma.condominiumUser.upsert({
    where: { userId_condominiumId: { userId: syndic.id, condominiumId: condominium.id } },
    update: {},
    create: { userId: syndic.id, condominiumId: condominium.id, role: "SYNDIC", isActive: true },
  });

  // ── Porteiro padrão ──────────────────────────────────────────────────────
  const doormanPwd = await bcrypt.hash("Porteiro@2026", 12);
  const doorman = await prisma.user.upsert({
    where: { email: "porteiro@veredasdobosque.com.br" },
    update: {},
    create: {
      name: "João Porteiro",
      email: "porteiro@veredasdobosque.com.br",
      passwordHash: doormanPwd,
      phone: "(62) 99100-0002",
      role: "DOORMAN",
      isActive: true,
      emailVerified: true,
    },
  });
  await prisma.condominiumUser.upsert({
    where: { userId_condominiumId: { userId: doorman.id, condominiumId: condominium.id } },
    update: {},
    create: { userId: doorman.id, condominiumId: condominium.id, role: "DOORMAN", isActive: true },
  });

  console.log("✅ Síndico e porteiro criados/verificados");
  console.log("ℹ️  Para dados de demo completos rode: node prisma/seed-demo.js");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e.message);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
