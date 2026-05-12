const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
async function main() {
  const hash = await bcrypt.hash('Admin@2026', 12);
  const r = await prisma.user.updateMany({
    where: { email: { in: ['atendimentoveredasbosque@gmail.com','admin@condosync.com.br','sindico@veredasdobosque.com.br'] } },
    data: { passwordHash: hash },
  });
  console.log('Senhas redefinidas:', r.count, 'usuário(s) → senha: Admin@2026');
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
