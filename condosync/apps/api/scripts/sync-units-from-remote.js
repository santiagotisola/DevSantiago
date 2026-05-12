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
  const remoteMap = new Map(remoteUnits.map(u => [normalize(u.identifier), u]));

  let updated = 0;
  let skipped = 0;

  for (const local of localUnits) {
    const remote = remoteMap.get(normalize(local.identifier));
    if (!remote) { skipped++; continue; }

    const updateData = {};

    // block: usar o do remoto (Rua 01, Rua 02... são os blocos/ruas corretos)
    if (remote.block && remote.block !== local.block) {
      updateData.block = remote.block;
    }

    // type: usar remoto se local não tem
    if (remote.type && !local.type) {
      updateData.type = remote.type;
    }

    // floor: usar remoto se local não tem
    if (remote.floor && !local.floor) {
      updateData.floor = remote.floor;
    }

    // notes: usar remoto se local não tem
    if (remote.notes && !local.notes) {
      updateData.notes = remote.notes;
    }

    // status: OCCUPIED se qualquer um dos dois indicar ocupado
    const remoteOccupied = remote.status === 'OCCUPIED';
    const localOccupied = local.status === 'OCCUPIED';
    if (remoteOccupied && !localOccupied) {
      updateData.status = 'OCCUPIED';
    }

    if (Object.keys(updateData).length > 0) {
      await p.unit.update({ where: { id: local.id }, data: updateData });
      console.log(`✅ ${local.identifier}: ${JSON.stringify(updateData)}`);
      updated++;
    }
  }

  console.log(`\n✅ Atualizadas: ${updated}`);
  console.log(`⏭️  Sem mudanças: ${localUnits.length - updated - skipped}`);
  console.log(`❌ Não encontradas no remoto: ${skipped}`);

  await p.$disconnect();
}

run().catch(async e => { console.error(e); await p.$disconnect(); process.exit(1); });
