const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const targetDay = process.argv[2] || '2026-05-11';

async function main() {
  const condos = await prisma.condominium.findMany({
    select: { id: true, name: true, cnpj: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  const rows = [];
  for (const c of condos) {
    const [unitsTotal, linksTotal, unitsOnDayRows, linksOnDayRows] = await Promise.all([
      prisma.unit.count({ where: { condominiumId: c.id } }),
      prisma.condominiumUser.count({ where: { condominiumId: c.id } }),
      prisma.$queryRawUnsafe(
        'SELECT COUNT(*)::int AS total FROM units WHERE "condominiumId" = $1 AND DATE("createdAt") = $2::date',
        c.id,
        targetDay
      ),
      prisma.$queryRawUnsafe(
        'SELECT COUNT(*)::int AS total FROM condominium_users WHERE "condominiumId" = $1 AND DATE("joinedAt") = $2::date',
        c.id,
        targetDay
      ),
    ]);

    rows.push({
      condominiumId: c.id,
      name: c.name,
      cnpj: c.cnpj,
      createdAt: c.createdAt,
      unitsTotal,
      usersLinkedTotal: linksTotal,
      unitsCreatedOnDay: unitsOnDayRows[0]?.total || 0,
      linksCreatedOnDay: linksOnDayRows[0]?.total || 0,
    });
  }

  console.log(JSON.stringify({ day: targetDay, condominiums: rows }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
