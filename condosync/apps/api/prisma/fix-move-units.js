"use strict";
// fix-move-units.js — Move unidades do condo errado para o condo correto
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

const CONDO_CORRETO  = "c4d94440-61ef-4068-a1c7-e9767f3784d1"; // 13 unidades (usuário logado)
const CONDO_ERRADO   = "d9e7f656-3814-4a06-80b7-cb0c30c8b8db"; // 57 unidades (seed errado)

async function main() {
  const unidades = await p.unit.findMany({ where: { condominiumId: CONDO_ERRADO } });
  console.log(`Encontradas ${unidades.length} unidades no condomínio errado. Movendo...`);

  let ok = 0;
  let skip = 0;

  for (const u of unidades) {
    // Verifica se já existe no condo correto com mesmo identifier+block
    const existe = await p.unit.findFirst({
      where: { condominiumId: CONDO_CORRETO, identifier: u.identifier },
    });

    if (existe) {
      console.log(`  = ${u.identifier} já existe no condo correto, pulando`);
      skip++;
      continue;
    }

    await p.unit.update({
      where: { id: u.id },
      data: { condominiumId: CONDO_CORRETO },
    });
    console.log(`  -> ${u.identifier} movida`);
    ok++;
  }

  console.log(`\n✅ ${ok} movidas, ${skip} já existiam.`);
}

main().catch(e => { console.error("Erro:", e.message); process.exit(1); }).finally(() => p.$disconnect());
