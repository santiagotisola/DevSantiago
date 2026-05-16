import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Buscando dados relacionados a parqueverde.com.br...\n');

    // Encontrar usuários com email @parqueverde.com.br
    const usersParqueVerde = await prisma.user.findMany({
      where: {
        email: {
          endsWith: '@parqueverde.com.br'
        }
      }
    });

    console.log(`📧 Usuários encontrados: ${usersParqueVerde.length}`);
    usersParqueVerde.forEach(u => console.log(`  - ${u.email} (${u.role})`));

    // Encontrar condomínio Parque Verde
    const condominiums = await prisma.condominium.findMany({
      where: {
        name: {
          contains: 'Parque Verde'
        }
      }
    });

    console.log(`\n🏢 Condomínios encontrados: ${condominiums.length}`);
    condominiums.forEach(c => console.log(`  - ${c.name} (ID: ${c.id})`));

    console.log('\n⚠️  Você deseja deletar:');
    console.log(`  ✓ ${usersParqueVerde.length} usuários @parqueverde.com.br`);
    console.log(`  ✓ ${condominiums.length} condomínios "Parque Verde"`);
    console.log('\n📌 Dados de "Veredas do Bosque" serão PRESERVADOS');

    // Confirmação manual
    console.log('\n💾 Dados encontrados. Execute cleanup-parqueverde-delete.ts para deletar.');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
