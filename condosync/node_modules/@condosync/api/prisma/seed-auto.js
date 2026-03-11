// Seed automático mínimo — cria apenas o Super Admin se o banco estiver vazio.
// Executado automaticamente pelo entrypoint.sh na inicialização do container.
'use strict';

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.user.count();

  if (count > 0) {
    console.log('ℹ️  Banco já possui dados — seed ignorado.');
    return;
  }

  console.log('🌱 Banco vazio — criando dados iniciais...');

  const password = await bcrypt.hash('Admin@2026', 12);

  await prisma.user.create({
    data: {
      name: 'Super Admin',
      email: 'admin@condosync.com.br',
      password,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });

  console.log('✅ Super admin criado: admin@condosync.com.br / Admin@2026');
  console.log('ℹ️  Para dados completos de demo, rode: docker compose exec api npx tsx prisma/seed.ts');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e.message);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
