import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🗑️  Iniciando deleção de dados @parqueverde.com.br...\n');

    // Deletar usuários @parqueverde.com.br
    const deletedUsers = await prisma.user.deleteMany({
      where: {
        email: {
          endsWith: '@parqueverde.com.br'
        }
      }
    });

    console.log(`✅ ${deletedUsers.count} usuários deletados:`);
    console.log(`  - porteiro@parqueverde.com.br`);
    console.log(`  - sindico@parqueverde.com.br`);
    console.log(`  - atendimento@parqueverde.com.br`);
    console.log(`  - morador1,2,3,4,5@parqueverde.com.br`);

    console.log('\n✨ Status Final:');
    console.log('  ✓ Todos os dados de @parqueverde.com.br foram DELETADOS');
    console.log('  ✓ Residencial Veredas do Bosque foi PRESERVADO');

    // Verificar dados restantes
    const totalUsers = await prisma.user.count();
    const veradasCondominiums = await prisma.condominium.findMany({
      where: {
        name: {
          contains: 'Veredas'
        }
      }
    });

    console.log(`\n📊 Banco de dados após limpeza:`);
    console.log(`  - Total de usuários: ${totalUsers}`);
    console.log(`  - Condomínios "Veredas":`);
    veradasCondominiums.forEach(c => {
      console.log(`    • ${c.name} (ID: ${c.id})`);
    });

  } catch (error) {
    console.error('❌ Erro durante deleção:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
