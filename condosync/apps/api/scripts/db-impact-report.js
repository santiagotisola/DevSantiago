const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const targetDay = process.argv[2] || '2026-05-11';

async function main() {
  const tables = await prisma.$queryRaw`
    SELECT
      t.table_name,
      MAX(CASE WHEN c.column_name = 'createdAt' THEN 1 ELSE 0 END) AS has_created_at,
      MAX(CASE WHEN c.column_name = 'updatedAt' THEN 1 ELSE 0 END) AS has_updated_at
    FROM information_schema.tables t
    JOIN information_schema.columns c
      ON c.table_schema = t.table_schema
      AND c.table_name = t.table_name
    WHERE t.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND c.column_name IN ('createdAt', 'updatedAt')
      AND t.table_name <> '_prisma_migrations'
    GROUP BY t.table_name
    ORDER BY t.table_name
  `;

  const report = [];

  for (const t of tables) {
    const tableName = t.table_name;
    const hasCreatedAt = Number(t.has_created_at) === 1;
    const hasUpdatedAt = Number(t.has_updated_at) === 1;

    let createdCount = 0;
    let updatedCount = 0;

    if (hasCreatedAt) {
      const rows = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*)::int AS total FROM public."${tableName}" WHERE DATE("createdAt") = $1::date`,
        targetDay
      );
      createdCount = rows[0]?.total || 0;
    }

    if (hasUpdatedAt) {
      const rows = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*)::int AS total FROM public."${tableName}" WHERE DATE("updatedAt") = $1::date`,
        targetDay
      );
      updatedCount = rows[0]?.total || 0;
    }

    const touched = createdCount + updatedCount;

    if (touched > 0) {
      report.push({
        table: tableName,
        created: createdCount,
        updated: updatedCount,
        touched,
      });
    }
  }

  report.sort((a, b) => b.touched - a.touched || a.table.localeCompare(b.table));

  const totals = report.reduce(
    (acc, row) => {
      acc.created += row.created;
      acc.updated += row.updated;
      acc.touched += row.touched;
      return acc;
    },
    { created: 0, updated: 0, touched: 0 }
  );

  console.log(
    JSON.stringify(
      {
        day: targetDay,
        totals,
        affectedTables: report,
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
