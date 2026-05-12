const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const condominiums = await prisma.condominium.findMany({
    select: { id: true, name: true, cnpj: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  const perCondominium = [];
  for (const condo of condominiums) {
    const [units, usersLinked, residentsLinked] = await Promise.all([
      prisma.unit.count({ where: { condominiumId: condo.id } }),
      prisma.condominiumUser.count({ where: { condominiumId: condo.id } }),
      prisma.condominiumUser.count({
        where: {
          condominiumId: condo.id,
          user: { role: 'RESIDENT' },
        },
      }),
    ]);

    perCondominium.push({
      id: condo.id,
      name: condo.name,
      cnpj: condo.cnpj,
      createdAt: condo.createdAt,
      units,
      usersLinked,
      residentsLinked,
    });
  }

  const [
    condominiumsTotal,
    unitsTotal,
    usersTotal,
    residentsTotal,
    condominiumUsersTotal,
    visitorsTotal,
    parcelsTotal,
  ] = await Promise.all([
    prisma.condominium.count(),
    prisma.unit.count(),
    prisma.user.count(),
    prisma.user.count({ where: { role: 'RESIDENT' } }),
    prisma.condominiumUser.count(),
    prisma.visitor.count(),
    prisma.parcel.count(),
  ]);

  const usersByDay = await prisma.$queryRaw`
    SELECT DATE("createdAt")::text AS day, COUNT(*)::int AS total
    FROM users
    GROUP BY DATE("createdAt")
    ORDER BY day DESC
    LIMIT 15
  `;

  console.log(
    JSON.stringify(
      {
        totals: {
          condominiums: condominiumsTotal,
          units: unitsTotal,
          users: usersTotal,
          residents: residentsTotal,
          condominiumUsers: condominiumUsersTotal,
          visitors: visitorsTotal,
          parcels: parcelsTotal,
        },
        perCondominium,
        usersByDay,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
