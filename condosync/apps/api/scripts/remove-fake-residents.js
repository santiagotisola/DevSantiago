const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function run() {
  const users = await p.user.findMany({
    where: { email: { contains: '@veredasdobosque.com.br' } },
    select: { id: true, email: true }
  });
  console.log('Moradores fictícios encontrados:', users.length);
  for (const u of users) {
    await p.condominiumUser.deleteMany({ where: { userId: u.id } });
    await p.user.delete({ where: { id: u.id } });
  }
  console.log('Removidos:', users.length);
  await p.$disconnect();
}

run().catch(async e => { console.error(e); await p.$disconnect(); process.exit(1); });
