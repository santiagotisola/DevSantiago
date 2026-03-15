"use strict";
// seed-base.js — versão JS do seed.ts para rodar no container de produção
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed base...\n");

  // Super Admin
  const superAdminPassword = await bcrypt.hash("Admin@2026", 12);
  const superAdmin = await prisma.user.upsert({
    where: { email: "admin@condosync.com.br" },
    update: {},
    create: {
      name: "Super Administrador",
      email: "admin@condosync.com.br",
      passwordHash: superAdminPassword,
      role: "SUPER_ADMIN",
      emailVerified: true,
    },
  });
  console.log("✅ Super admin:", superAdmin.email);

  // Condomínio
  const condominium = await prisma.condominium.upsert({
    where: { cnpj: "12345678000195" },
    update: {},
    create: {
      name: "Residencial Veredas do Bosque",
      cnpj: "12345678000195",
      address: "Rua das Palmeiras, 500",
      city: "São Paulo",
      state: "SP",
      zipCode: "01310100",
      phone: "(11) 3000-0000",
      email: "admin@parqueverde.com.br",
      plan: "professional",
      maxUnits: 50,
    },
  });
  console.log("✅ Condomínio:", condominium.name);

  // Síndico
  const syndicPassword = await bcrypt.hash("Sindico@2026", 12);
  const syndic = await prisma.user.upsert({
    where: { email: "sindico@parqueverde.com.br" },
    update: {},
    create: {
      name: "Carlos Silva",
      email: "sindico@parqueverde.com.br",
      passwordHash: syndicPassword,
      phone: "(11) 99999-0001",
      cpf: "11122233344",
      role: "SYNDIC",
      emailVerified: true,
    },
  });
  console.log("✅ Síndico:", syndic.email);

  // Porteiro
  const doormanPassword = await bcrypt.hash("Porteiro@2026", 12);
  const doorman = await prisma.user.upsert({
    where: { email: "porteiro@parqueverde.com.br" },
    update: {},
    create: {
      name: "João Porteiro",
      email: "porteiro@parqueverde.com.br",
      passwordHash: doormanPassword,
      phone: "(11) 99999-0002",
      cpf: "22233344455",
      role: "DOORMAN",
      emailVerified: true,
    },
  });
  console.log("✅ Porteiro:", doorman.email);

  // Moradores
  const residentPassword = await bcrypt.hash("Morador@2026", 12);
  const residentNames = ["Ana Costa", "Bruno Oliveira", "Carla Santos", "Diego Fernandes", "Elena Martins"];
  const residents = [];
  for (let i = 0; i < residentNames.length; i++) {
    const r = await prisma.user.upsert({
      where: { email: `morador${i + 1}@parqueverde.com.br` },
      update: {},
      create: {
        name: residentNames[i],
        email: `morador${i + 1}@parqueverde.com.br`,
        passwordHash: residentPassword,
        cpf: String(33344455566 + i).padStart(11, "0"),
        role: "RESIDENT",
        emailVerified: true,
      },
    });
    residents.push(r);
  }
  console.log(`✅ ${residents.length} moradores criados`);

  // Unidades
  const units = [];
  for (let i = 0; i < 10; i++) {
    const u = await prisma.unit.upsert({
      where: {
        condominiumId_identifier_block: {
          condominiumId: condominium.id,
          identifier: `Casa ${String(i + 1).padStart(2, "0")}`,
          block: "A",
        },
      },
      update: {},
      create: {
        condominiumId: condominium.id,
        identifier: `Casa ${String(i + 1).padStart(2, "0")}`,
        block: "A",
        area: 120 + i * 10,
        bedrooms: 3,
        status: i < 5 ? "OCCUPIED" : "VACANT",
        fraction: 1.0,
      },
    });
    units.push(u);
  }
  console.log(`✅ ${units.length} unidades criadas`);

  // Associar usuários ao condomínio
  await prisma.condominiumUser.upsert({
    where: { userId_condominiumId: { userId: superAdmin.id, condominiumId: condominium.id } },
    update: {},
    create: { userId: superAdmin.id, condominiumId: condominium.id, role: "CONDOMINIUM_ADMIN" },
  });
  await prisma.condominiumUser.upsert({
    where: { userId_condominiumId: { userId: syndic.id, condominiumId: condominium.id } },
    update: {},
    create: { userId: syndic.id, condominiumId: condominium.id, role: "SYNDIC" },
  });
  await prisma.condominiumUser.upsert({
    where: { userId_condominiumId: { userId: doorman.id, condominiumId: condominium.id } },
    update: {},
    create: { userId: doorman.id, condominiumId: condominium.id, role: "DOORMAN" },
  });
  for (let i = 0; i < 5; i++) {
    await prisma.condominiumUser.upsert({
      where: { userId_condominiumId: { userId: residents[i].id, condominiumId: condominium.id } },
      update: {},
      create: { userId: residents[i].id, condominiumId: condominium.id, role: "RESIDENT", unitId: units[i].id },
    });
  }
  console.log("✅ Usuários associados ao condomínio");

  // Funcionário
  await prisma.employee.upsert({
    where: { id: "seed-employee-001" },
    update: {},
    create: {
      id: "seed-employee-001",
      condominiumId: condominium.id,
      name: "João da Silva",
      cpf: "55566677788",
      role: "Porteiro",
      shift: "MORNING",
      admissionDate: new Date("2023-01-01"),
      phone: "(11) 99999-1111",
    },
  });

  // Conta financeira
  await prisma.financialAccount.upsert({
    where: { id: "seed-account-001" },
    update: {},
    create: {
      id: "seed-account-001",
      condominiumId: condominium.id,
      name: "Conta Principal",
      bankName: "Banco do Brasil",
      agency: "1234",
      accountNumber: "56789-0",
      balance: 15000,
    },
  });

  // Áreas comuns
  await prisma.commonArea.upsert({
    where: { id: "seed-area-001" },
    update: {},
    create: {
      id: "seed-area-001",
      condominiumId: condominium.id,
      name: "Salão de Festas",
      description: "Salão com capacidade para 100 pessoas, cozinha equipada",
      capacity: 100,
      rules: "Horário: 10h às 22h. Limpeza obrigatória após uso.",
      requiresApproval: true,
      maxDaysAdvance: 30,
      openTime: "10:00",
      closeTime: "22:00",
    },
  });
  await prisma.commonArea.upsert({
    where: { id: "seed-area-002" },
    update: {},
    create: {
      id: "seed-area-002",
      condominiumId: condominium.id,
      name: "Piscina",
      description: "Piscina adulto e infantil",
      capacity: 30,
      rules: "Horário: 8h às 20h. Uso de touca obrigatório.",
      requiresApproval: false,
      maxDaysAdvance: 7,
      openTime: "08:00",
      closeTime: "20:00",
    },
  });

  console.log("\n✅ Seed base concluído!");
  console.log("📋 Credenciais:");
  console.log("   Super Admin: admin@condosync.com.br / Admin@2026");
  console.log("   Síndico:     sindico@parqueverde.com.br / Sindico@2026");
  console.log("   Porteiro:    porteiro@parqueverde.com.br / Porteiro@2026");
  console.log("   Morador:     morador1@parqueverde.com.br / Morador@2026");
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
