"use strict";
// seed-units-blocos.js
// Cria/atualiza Casa 14-40 (Rua 2) e Casa 41-70 (Rua 1) no condomínio principal
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const condominium = await prisma.condominium.findFirst({
    where: { cnpj: "12345678000195" },
  });

  if (!condominium) {
    throw new Error("Condomínio não encontrado. Execute seed-base.js primeiro.");
  }

  console.log(`✅ Condomínio: ${condominium.name}\n`);

  const unidades = [];

  // Casa 14 a 40 → Rua 2
  for (let i = 14; i <= 40; i++) {
    unidades.push({ num: i, block: "Rua 2" });
  }

  // Casa 41 a 70 → Rua 1
  for (let i = 41; i <= 70; i++) {
    unidades.push({ num: i, block: "Rua 1" });
  }

  let criadas = 0;
  let atualizadas = 0;

  for (const { num, block } of unidades) {
    const identifier = `Casa ${String(num).padStart(2, "0")}`;

    // Busca a unidade ignorando o bloco atual (pode estar null, "A", etc.)
    const existing = await prisma.unit.findFirst({
      where: { condominiumId: condominium.id, identifier },
    });

    if (existing) {
      // Atualiza o bloco se estiver diferente
      if (existing.block !== block) {
        await prisma.unit.update({
          where: { id: existing.id },
          data: { block },
        });
        atualizadas++;
        console.log(`  ~ ${identifier} → bloco atualizado para "${block}"`);
      } else {
        console.log(`  = ${identifier} já está com bloco "${block}"`);
      }
    } else {
      // Cria a unidade
      await prisma.unit.create({
        data: {
          condominiumId: condominium.id,
          identifier,
          block,
          status: "VACANT",
          fraction: 1.0,
        },
      });
      criadas++;
      console.log(`  + ${identifier} criada com bloco "${block}"`);
    }
  }

  console.log(`\n✅ Concluído! ${criadas} criadas, ${atualizadas} atualizadas.`);
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
