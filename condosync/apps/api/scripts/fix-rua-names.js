const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function run() {
  const map = { 'Rua 1': 'Rua 01', 'Rua 2': 'Rua 02', 'Rua 3': 'Rua 03' };
  for (const [from, to] of Object.entries(map)) {
    const r = await p.unit.updateMany({ where: { block: from }, data: { block: to } });
    console.log(`${from} → ${to}: ${r.count} unidades`);
  }
  await p.$disconnect();
}
run().catch(async e => { console.error(e); await p.$disconnect(); process.exit(1); });
