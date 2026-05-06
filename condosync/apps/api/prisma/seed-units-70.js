"use strict";
// seed-units-70.js — Cria 70 unidades (Casa 01 a Casa 70) no condomínio principal
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("🏠 Criando 70 unidades...\n");

  // Busca o condomínio principal (Residencial Veredas do Bosque)
  const condominium = await prisma.condominium.findFirst({
    where: { cnpj: "12345678000195" },
  });

  if (!condominium) {
    throw new Error("Condomínio não encontrado. Execute seed-base.js primeiro.");
  }

  console.log(`✅ Condomínio encontrado: ${condominium.name} (${condominium.id})\n`);

  let criadas = 0;
  let existentes = 0;

  for (let i = 1; i <= 70; i++) {
    const identifier = `Casa ${String(i).padStart(2, "0")}`;
    const result = await prisma.unit.upsert({
      where: {
        condominiumId_identifier_block: {
          condominiumId: condominium.id,
          identifier,
          block: "A",
        },
      },
      update: {},
      create: {
        condominiumId: condominium.id,
        identifier,
        block: "A",
        status: "VACANT",
        fraction: 1.0,
      },
    });

    if (result.createdAt.getTime() === result.updatedAt.getTime()) {
      criadas++;
      console.log(`  + ${identifier}`);
    } else {
      existentes++;
    }
  }

  console.log(`\n✅ Concluído! ${criadas} unidades criadas, ${existentes} já existiam.`);
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
