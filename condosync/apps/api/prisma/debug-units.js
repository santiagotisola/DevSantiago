"use strict";
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  const [total, conds] = await Promise.all([
    p.unit.count(),
    p.condominium.findMany({ select: { id: true, name: true } }),
  ]);
  console.log("Total units:", total);
  console.log("Condominios:", JSON.stringify(conds, null, 2));

  // Conta unidades por condominiumId
  const byCondo = await p.unit.groupBy({
    by: ["condominiumId"],
    _count: true,
  });
  console.log("Units por condominio:", JSON.stringify(byCondo, null, 2));
}

main().finally(() => p.$disconnect());
