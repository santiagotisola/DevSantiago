const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function run() {
  const localUnits = await p.unit.findMany({
    where: { condominiumId: 'bf201f72-9858-4a6f-960e-c55260becb1d' },
    orderBy: { identifier: 'asc' },
    select: { id: true, identifier: true, block: true, type: true, status: true, area: true, fraction: true, floor: true, notes: true }
  });

  console.log(`\nUnidades locais (${localUnits.length}):`);
  localUnits.slice(0, 5).forEach(u => console.log(` ${u.identifier} | ${u.block || ''} | ${u.status}`));
  console.log('...');

  const remoteUnits = require('../prisma/remote-units.json');
  console.log(`\nUnidades remotas (${remoteUnits.length}):`);
  remoteUnits.slice(0, 5).forEach(u => console.log(` ${u.identifier} | ${u.block || ''} | ${u.status}`));

  // Comparar por identifier normalizado
  const normalize = (s) => String(s || '').trim().toLowerCase();
  const localMap = new Map(localUnits.map(u => [normalize(u.identifier), u]));
  const remoteMap = new Map(remoteUnits.map(u => [normalize(u.identifier), u]));

  const onlyLocal = localUnits.filter(u => !remoteMap.has(normalize(u.identifier)));
  const onlyRemote = remoteUnits.filter(u => !localMap.has(normalize(u.identifier)));
  const inBoth = localUnits.filter(u => remoteMap.has(normalize(u.identifier)));

  console.log(`\nSomente no local (${onlyLocal.length}):`, onlyLocal.map(u => u.identifier).join(', ') || 'nenhuma');
  console.log(`Somente no remoto (${onlyRemote.length}):`, onlyRemote.map(u => u.identifier).join(', ') || 'nenhuma');
  console.log(`Em ambos (${inBoth.length})`);

  await p.$disconnect();
}

run().catch(async e => { console.error(e); await p.$disconnect(); process.exit(1); });
