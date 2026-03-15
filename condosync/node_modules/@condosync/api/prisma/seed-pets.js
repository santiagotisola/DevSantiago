"use strict";
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("🐾 Criando dados de pets...\n");

  const condo = await prisma.condominium.findFirst({ where: { cnpj: "12345678000195" } });
  if (!condo) { console.error("❌ Condomínio não encontrado."); process.exit(1); }

  const units = await prisma.unit.findMany({ where: { condominiumId: condo.id }, take: 5 });
  if (!units.length) { console.error("❌ Nenhuma unidade encontrada."); process.exit(1); }

  const petsData = [
    { name: "Rex", type: "Cachorro", breed: "Pastor Alemão", size: "Grande", gender: "Macho", color: "Preto e Marrom", birthDate: new Date("2020-03-15"), lastVaccination: new Date("2025-03-01"), unitId: units[0].id },
    { name: "Mimi", type: "Gato", breed: "Persa", size: "Pequeno", gender: "Fêmea", color: "Branco", birthDate: new Date("2019-07-22"), lastVaccination: new Date("2025-07-01"), unitId: units[1].id },
    { name: "Bolinha", type: "Cachorro", breed: "Poodle", size: "Pequeno", gender: "Macho", color: "Bege", birthDate: new Date("2021-11-05"), lastVaccination: new Date("2025-11-01"), unitId: units[2].id },
    { name: "Luna", type: "Gato", breed: "Siamês", size: "Pequeno", gender: "Fêmea", color: "Creme e Marrom", birthDate: new Date("2022-01-10"), unitId: units[3].id },
    { name: "Thor", type: "Cachorro", breed: "Golden Retriever", size: "Grande", gender: "Macho", color: "Dourado", birthDate: new Date("2020-08-18"), lastVaccination: new Date("2025-08-01"), unitId: units[4].id },
    { name: "Mel", type: "Cachorro", breed: "Labrador", size: "Grande", gender: "Fêmea", color: "Amarelo", birthDate: new Date("2023-02-14"), lastVaccination: new Date("2025-02-01"), unitId: units[0].id },
  ];

  let count = 0;
  for (const pet of petsData) {
    await prisma.pet.create({ data: { ...pet, isActive: true } });
    count++;
  }

  console.log(`✅ ${count} pets criados!`);
  console.log("\n🐶 Pets cadastrados:");
  petsData.forEach(p => console.log(`   - ${p.name} (${p.type}, ${p.breed}) — Unidade ${units.find(u => u.id === p.unitId)?.identifier}`));
}

main()
  .catch((e) => { console.error("❌ Erro:", e.message); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
