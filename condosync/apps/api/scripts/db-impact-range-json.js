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
  const baseDir = __dirname;
  const result = {
    generatedAt: new Date().toISOString(),
    range: { start, end },
    days: [],
  };

  for (const day of dateRange(start, end)) {
    const raw = execSync(`node scripts/db-impact-report.js ${day}`, {
      cwd: path.resolve(baseDir, '..'),
      encoding: 'utf-8',
    });

    const parsed = JSON.parse(raw);
    result.days.push(parsed);
  }

  result.summary = result.days.reduce(
    (acc, day) => {
      acc.created += day.totals.created;
      acc.updated += day.totals.updated;
      acc.touched += day.totals.touched;
      return acc;
    },
    { created: 0, updated: 0, touched: 0 }
  );

  const outputPath = path.resolve(baseDir, '..', 'reports', `db-impact-${start}-to-${end}.json`);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');

  console.log(JSON.stringify({ outputPath, summary: result.summary }, null, 2));
}

main();
