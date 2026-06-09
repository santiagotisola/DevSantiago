/**
 * UNIFICAÇÃO DOS DOIS CONDOMÍNIOS "RESIDENCIAL VEREDAS DO BOSQUE"
 *
 * Move todos os dados do condomínio duplicado para o correto e remove o duplicado.
 * Para executar: node prisma/unify-condominiums.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// IDs identificados na análise anterior
const ID_CORRETO  = 'c4d94440-61ef-4068-a1c7-e9767f3784d1'; // 70 unidades
const ID_DUPLICADO = 'd9e7f656-3814-4a06-80b7-cb0c30c8b8db'; // vazio após fix anterior

// Tabelas e seus campos de FK para o condomínio
const TABELAS = [
  { model: 'unit',                    field: 'condominiumId' },
  { model: 'condominiumUser',         field: 'condominiumId' },
  { model: 'employee',                field: 'condominiumId' },
  { model: 'serviceProvider',         field: 'condominiumId' },
  { model: 'commonArea',              field: 'condominiumId' },
  { model: 'financialAccount',        field: 'condominiumId' },
  { model: 'announcement',            field: 'condominiumId' },
  { model: 'occurrence',              field: 'condominiumId' },
  { model: 'maintenanceSchedule',     field: 'condominiumId' },
  { model: 'contract',                field: 'condominiumId' },
  { model: 'poll',                    field: 'condominiumId' },
  { model: 'assembly',                field: 'condominiumId' },
  { model: 'lostAndFound',            field: 'condominiumId' },
  { model: 'condominiumDocument',     field: 'condominiumId' },
  { model: 'panicAlert',              field: 'condominiumId' },
  { model: 'visitorRecurrence',       field: 'condominiumId' },
  { model: 'auditLog',                field: 'condominiumId' },
  { model: 'rolePermission',          field: 'condominiumId' },
];

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log(' UNIFICAÇÃO DE CONDOMÍNIOS DUPLICADOS');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Verifica existência de ambos
  const [correto, duplicado] = await Promise.all([
    prisma.condominium.findUnique({ where: { id: ID_CORRETO } }),
    prisma.condominium.findUnique({ where: { id: ID_DUPLICADO } }),
  ]);

  if (!correto) { console.error('❌ Condomínio CORRETO não encontrado!'); process.exit(1); }
  if (!duplicado) {
    console.log('ℹ️  Condomínio duplicado não existe no banco. Nada a fazer.');
    await prisma.$disconnect();
    return;
  }

  console.log(`✅ Destino  : ${correto.name} (${ID_CORRETO})`);
  console.log(`🔄 Origem   : ${duplicado.name} (${ID_DUPLICADO})\n`);

  // Diagnóstico: conta registros no duplicado
  console.log('─── Diagnóstico do condomínio duplicado ───────────────────');
  let totalRegistros = 0;
  for (const t of TABELAS) {
    try {
      const count = await prisma[t.model].count({ where: { [t.field]: ID_DUPLICADO } });
      if (count > 0) {
        console.log(`  ${t.model.padEnd(25)} : ${count} registro(s)`);
        totalRegistros += count;
      }
    } catch (_) {
      // modelo não existe ou não tem o campo
    }
  }

  if (totalRegistros === 0) {
    console.log('  (sem registros vinculados)\n');
  } else {
    console.log(`\n  Total a migrar: ${totalRegistros} registro(s)\n`);
  }

  // Migração dentro de transação
  console.log('─── Iniciando migração ─────────────────────────────────────');
  await prisma.$transaction(async (tx) => {
    for (const t of TABELAS) {
      try {
        // CondominiumUser tem unique [userId, condominiumId] — evita conflito
        if (t.model === 'condominiumUser') {
          const rows = await tx.condominiumUser.findMany({
            where: { condominiumId: ID_DUPLICADO },
          });
          let movidos = 0;
          for (const row of rows) {
            // verifica se já existe no destino para o mesmo userId
            const existe = await tx.condominiumUser.findUnique({
              where: { userId_condominiumId: { userId: row.userId, condominiumId: ID_CORRETO } },
            });
            if (!existe) {
              await tx.condominiumUser.update({
                where: { id: row.id },
                data: { condominiumId: ID_CORRETO },
              });
              movidos++;
            } else {
              await tx.condominiumUser.delete({ where: { id: row.id } });
              console.log(`    ℹ️  condominiumUser duplicado removido (userId: ${row.userId})`);
            }
          }
          if (movidos > 0) console.log(`  ✅ condominiumUser        : ${movidos} movido(s)`);
          continue;
        }

        // RolePermission tem unique [role, permissionId, condominiumId] — pula conflitos
        if (t.model === 'rolePermission') {
          const rows = await tx.rolePermission.findMany({
            where: { condominiumId: ID_DUPLICADO },
          });
          let movidos = 0;
          for (const row of rows) {
            try {
              await tx.rolePermission.update({
                where: { id: row.id },
                data: { condominiumId: ID_CORRETO },
              });
              movidos++;
            } catch (_) {
              await tx.rolePermission.delete({ where: { id: row.id } });
            }
          }
          if (movidos > 0) console.log(`  ✅ rolePermission         : ${movidos} movido(s)`);
          continue;
        }

        // Demais tabelas: update em massa
        const result = await tx[t.model].updateMany({
          where: { [t.field]: ID_DUPLICADO },
          data: { [t.field]: ID_CORRETO },
        });
        if (result.count > 0) {
          console.log(`  ✅ ${t.model.padEnd(25)}: ${result.count} registro(s) movido(s)`);
        }
      } catch (err) {
        console.warn(`  ⚠️  ${t.model}: ${err.message}`);
      }
    }

    // Remove o condomínio duplicado
    await tx.condominium.delete({ where: { id: ID_DUPLICADO } });
    console.log(`\n  🗑️  Condomínio duplicado removido (${ID_DUPLICADO})`);
  });

  // Verifica resultado final
  console.log('\n─── Resultado final ────────────────────────────────────────');
  const condos = await prisma.condominium.findMany({ where: { name: { contains: 'Veredas do Bosque' } } });
  condos.forEach(c => console.log(`  ${c.name} — ${c.id}`));

  const totalUnidades = await prisma.unit.count({ where: { condominiumId: ID_CORRETO } });
  const totalMoradores = await prisma.condominiumUser.count({ where: { condominiumId: ID_CORRETO } });
  console.log(`\n  Unidades no condomínio unificado : ${totalUnidades}`);
  console.log(`  Usuários no condomínio unificado : ${totalMoradores}`);

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(' Unificação concluída com sucesso.');
  console.log('═══════════════════════════════════════════════════════════\n');

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
