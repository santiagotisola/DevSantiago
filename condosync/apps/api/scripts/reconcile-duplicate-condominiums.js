const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const CLEANUP_SEED_CASAS = process.argv.includes('--cleanup-seed-casas');

async function countForCondominium(condominiumId) {
  const [units, usersLinked, residentsLinked] = await Promise.all([
    prisma.unit.count({ where: { condominiumId } }),
    prisma.condominiumUser.count({ where: { condominiumId } }),
    prisma.condominiumUser.count({ where: { condominiumId, user: { role: 'RESIDENT' } } }),
  ]);

  return { units, usersLinked, residentsLinked };
}

async function main() {
  const condos = await prisma.condominium.findMany({
    select: { id: true, name: true, cnpj: true, createdAt: true },
    orderBy: [{ name: 'asc' }, { createdAt: 'asc' }],
  });

  const grouped = new Map();
  for (const condo of condos) {
    const key = condo.name.trim().toLowerCase();
    const list = grouped.get(key) || [];
    list.push(condo);
    grouped.set(key, list);
  }

  const duplicateGroups = [...grouped.values()].filter((g) => g.length > 1);

  if (duplicateGroups.length === 0) {
    console.log('Nenhum condomínio duplicado por nome foi encontrado.');
    return;
  }

  console.log('Duplicidades detectadas (por nome):');
  for (const group of duplicateGroups) {
    console.log(`- ${group[0].name}: ${group.length} registros`);
    group.forEach((item) => {
      console.log(`  id=${item.id} | cnpj=${item.cnpj} | createdAt=${item.createdAt.toISOString()}`);
    });
  }

  if (!APPLY) {
    console.log('');
    console.log('Modo DRY RUN: nada foi alterado.');
    console.log('Execute com --apply para reconciliar automaticamente.');
    return;
  }

  const tablesWithCondominiumId = await prisma.$queryRaw`
    SELECT table_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name = 'condominiumId'
      AND table_name NOT IN ('condominiums', 'units', 'condominium_users')
    ORDER BY table_name
  `;

  for (const group of duplicateGroups) {
    const ordered = [...group].sort((a, b) => a.createdAt - b.createdAt);
    const primary = ordered[0];
    const duplicates = ordered.slice(1);
    const cleanupThreshold = duplicates[0].createdAt;

    for (const duplicate of duplicates) {
      console.log('');
      console.log(`Reconciling duplicate ${duplicate.id} -> primary ${primary.id}`);

      const beforePrimary = await countForCondominium(primary.id);
      const beforeDuplicate = await countForCondominium(duplicate.id);

      console.log('Antes:');
      console.log(`  Primary units=${beforePrimary.units}, usersLinked=${beforePrimary.usersLinked}`);
      console.log(`  Duplicate units=${beforeDuplicate.units}, usersLinked=${beforeDuplicate.usersLinked}`);

      await prisma.$transaction(async (tx) => {
        const duplicateLinks = await tx.condominiumUser.findMany({
          where: { condominiumId: duplicate.id },
          select: { userId: true, role: true },
        });

        for (const link of duplicateLinks) {
          await tx.condominiumUser.upsert({
            where: {
              userId_condominiumId: {
                userId: link.userId,
                condominiumId: primary.id,
              },
            },
            update: { isActive: true },
            create: {
              userId: link.userId,
              condominiumId: primary.id,
              role: link.role,
              isActive: true,
            },
          });
        }

        for (const row of tablesWithCondominiumId) {
          await tx.$executeRawUnsafe(
            `UPDATE ${row.table_name} SET "condominiumId" = $1 WHERE "condominiumId" = $2`,
            primary.id,
            duplicate.id
          );
        }

        const duplicateUnits = await tx.unit.findMany({
          where: { condominiumId: duplicate.id },
          select: { id: true },
        });

        const duplicateUnitIds = duplicateUnits.map((u) => u.id);
        if (duplicateUnitIds.length > 0) {
          await tx.condominiumUser.updateMany({
            where: {
              unitId: { in: duplicateUnitIds },
            },
            data: { unitId: null },
          });
        }

        await tx.$executeRaw`
          DELETE FROM condominium_users
          WHERE "condominiumId" = ${duplicate.id}
        `;

        await tx.$executeRaw`
          DELETE FROM units
          WHERE "condominiumId" = ${duplicate.id}
        `;

        await tx.condominium.delete({ where: { id: duplicate.id } });
      });

      const afterPrimary = await countForCondominium(primary.id);
      console.log('Depois:');
      console.log(`  Primary units=${afterPrimary.units}, usersLinked=${afterPrimary.usersLinked}`);
      console.log(`  Duplicate removido: ${duplicate.id}`);
    }

    if (CLEANUP_SEED_CASAS) {
      const cleanupUnits = await prisma.unit.findMany({
        where: {
          condominiumId: primary.id,
          identifier: { startsWith: 'Casa ' },
          block: 'A',
          createdAt: { gte: cleanupThreshold },
        },
        select: { id: true, identifier: true, createdAt: true },
      });

      if (cleanupUnits.length > 0) {
        const cleanupIds = cleanupUnits.map((u) => u.id);
        await prisma.$transaction(async (tx) => {
          await tx.condominiumUser.updateMany({
            where: { unitId: { in: cleanupIds } },
            data: { unitId: null },
          });

          await tx.unit.deleteMany({ where: { id: { in: cleanupIds } } });
        });

        console.log('Cleanup de unidades seed no condomínio primário concluído:');
        console.log(`  Removidas ${cleanupUnits.length} unidades Casa A criadas após ${cleanupThreshold.toISOString()}`);
      } else {
        console.log('Nenhuma unidade seed para cleanup no condomínio primário.');
      }
    }
  }

  console.log('');
  console.log('Reconciliação finalizada com sucesso.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
