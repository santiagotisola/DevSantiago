/**
 * Remove o condomínio "Aldeia do Vale" e todos os seus dados.
 * Para executar: node prisma/remove-aldeia.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TABELAS = [
  'unit', 'condominiumUser', 'employee', 'serviceProvider',
  'commonArea', 'financialAccount', 'announcement', 'occurrence',
  'maintenanceSchedule', 'contract', 'poll', 'assembly',
  'lostAndFound', 'condominiumDocument', 'panicAlert',
  'visitorRecurrence', 'auditLog', 'rolePermission',
];

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log(' REMOÇÃO — Condomínio Aldeia do Vale');
  console.log('═══════════════════════════════════════════════════════════\n');

  const condo = await prisma.condominium.findFirst({
    where: { name: { contains: 'Aldeira' } },
    include: {
      _count: {
        select: {
          units: true, condominiumUsers: true, employees: true,
          commonAreas: true, financialAccounts: true, announcements: true,
          occurrences: true, contracts: true, polls: true, assemblies: true,
          lostAndFoundItems: true, documents: true,
        }
      }
    }
  });

  if (!condo) {
    console.log('ℹ️  Condomínio "Aldeira do Vale" não encontrado. Nada a fazer.');
    await prisma.$disconnect();
    return;
  }

  console.log(`ID   : ${condo.id}`);
  console.log(`Nome : ${condo.name}`);
  console.log('\nRegistros vinculados:');
  Object.entries(condo._count).forEach(([k, v]) => {
    if (v > 0) console.log(`  ${k.padEnd(22)}: ${v}`);
  });

  const totalVinculados = Object.values(condo._count).reduce((a, b) => a + b, 0);
  if (totalVinculados === 0) {
    console.log('  (sem registros vinculados)');
  }

  console.log('\n─── Removendo dados vinculados ─────────────────────────────');

  await prisma.$transaction(async (tx) => {
    for (const model of TABELAS) {
      try {
        const result = await tx[model].deleteMany({
          where: { condominiumId: condo.id },
        });
        if (result.count > 0) {
          console.log(`  ✅ ${model.padEnd(25)}: ${result.count} removido(s)`);
        }
      } catch (err) {
        // modelo sem condominiumId direto — ignora
      }
    }

    await tx.condominium.delete({ where: { id: condo.id } });
    console.log(`\n  🗑️  Condomínio "${condo.name}" removido.`);
  });

  // Resultado final
  const restantes = await prisma.condominium.findMany();
  console.log('\n─── Condomínios restantes no banco ─────────────────────────');
  restantes.forEach(c => console.log(`  ${c.name} (${c.id})`));

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(' Remoção concluída.');
  console.log('═══════════════════════════════════════════════════════════\n');

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
