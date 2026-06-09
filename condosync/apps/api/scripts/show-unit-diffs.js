const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function run() {
  const CONDO_ID = 'bf201f72-9858-4a6f-960e-c55260becb1d';
  const normalize = (s) => String(s || '').trim().toLowerCase();

  const localUnits = await p.unit.findMany({
    where: { condominiumId: CONDO_ID },
    orderBy: { identifier: 'asc' },
  });

  const remoteUnits = require('../prisma/remote-units.json');

  console.log('\n=== CAMPOS DIVERGENTES ===\n');
  let diffs = 0;
  for (const local of localUnits) {
    const remote = remoteUnits.find(r => normalize(r.identifier) === normalize(local.identifier));
    if (!remote) continue;
    const changes = {};
    if ((remote.block || null) !== (local.block || null)) changes.block = { local: local.block, remote: remote.block };
    if ((remote.type || null) !== (local.type || null)) changes.type = { local: local.type, remote: remote.type };
    if ((remote.area || null) !== (local.area || null)) changes.area = { local: local.area, remote: remote.area };
    if ((remote.fraction || null) !== (local.fraction || null)) changes.fraction = { local: local.fraction, remote: remote.fraction };
    if ((remote.floor || null) !== (local.floor || null)) changes.floor = { local: local.floor, remote: remote.floor };
    if ((remote.notes || null) !== (local.notes || null)) changes.notes = { local: local.notes, remote: remote.notes };
    if ((remote.status || 'VACANT') !== (local.status || 'VACANT')) changes.status = { local: local.status, remote: remote.status };
    if (Object.keys(changes).length > 0) {
      diffs++;
      if (diffs <= 10) {
        console.log(`${local.identifier}:`);
        for (const [field, val] of Object.entries(changes)) {
          console.log(`  ${field}: "${val.local}" → "${val.remote}"`);
        }
      }
    }
  }
  console.log(`\nTotal com divergência: ${diffs} de ${localUnits.length}`);

  await p.$disconnect();
}

run().catch(async e => { console.error(e); await p.$disconnect(); process.exit(1); });
