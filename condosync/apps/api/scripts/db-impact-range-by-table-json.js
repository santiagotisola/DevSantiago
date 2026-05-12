const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const start = process.argv[2] || '2026-05-06';
const end = process.argv[3] || '2026-05-11';

function* dateRange(startDate, endDate) {
  const current = new Date(`${startDate}T00:00:00Z`);
  const last = new Date(`${endDate}T00:00:00Z`);

  while (current <= last) {
    yield current.toISOString().slice(0, 10);
    current.setUTCDate(current.getUTCDate() + 1);
  }
}

function main() {
  const rootDir = path.resolve(__dirname, '..');

  const result = {
    generatedAt: new Date().toISOString(),
    range: { start, end },
    summary: { created: 0, updated: 0, touched: 0 },
    byTable: {},
    days: [],
  };

  for (const day of dateRange(start, end)) {
    const raw = execSync(`node scripts/db-impact-report.js ${day}`, {
      cwd: rootDir,
      encoding: 'utf-8',
    });

    const dayData = JSON.parse(raw);
    result.days.push({
      day,
      totals: dayData.totals,
    });

    result.summary.created += dayData.totals.created;
    result.summary.updated += dayData.totals.updated;
    result.summary.touched += dayData.totals.touched;

    for (const table of dayData.affectedTables) {
      if (!result.byTable[table.table]) {
        result.byTable[table.table] = {
          created: 0,
          updated: 0,
          touched: 0,
          days: [],
        };
      }

      result.byTable[table.table].created += table.created;
      result.byTable[table.table].updated += table.updated;
      result.byTable[table.table].touched += table.touched;
      result.byTable[table.table].days.push({
        day,
        created: table.created,
        updated: table.updated,
        touched: table.touched,
      });
    }
  }

  const byTableSorted = Object.entries(result.byTable)
    .sort((a, b) => b[1].touched - a[1].touched || a[0].localeCompare(b[0]))
    .reduce((acc, [table, data]) => {
      acc[table] = data;
      return acc;
    }, {});

  result.byTable = byTableSorted;

  const outputPath = path.resolve(
    rootDir,
    'reports',
    `db-impact-by-table-${start}-to-${end}.json`
  );

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');

  console.log(
    JSON.stringify(
      {
        outputPath,
        summary: result.summary,
        tables: Object.keys(result.byTable).length,
      },
      null,
      2
    )
  );
}

main();
