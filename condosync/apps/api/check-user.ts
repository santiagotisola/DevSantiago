import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'santiagoti_sola@hotmail.com' },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      passwordHash: true,
      createdAt: true
    }
  });

  if (!user) {
    console.log('❌ Usuário não encontrado');
    console.log('\nDigite um email válido. Usuários conhecidos:');
    const allUsers = await prisma.user.findMany({
      select: { email: true, name: true, role: true },
      take: 20
    });
    for (const u of allUsers) {
      console.log(`  - ${u.email} (${u.name}) - ${u.role}`);
    }
    return;
  }

  console.log('✅ Usuário encontrado!\n');
  console.log(`Email: ${user.email}`);
  console.log(`Nome: ${user.name}`);
  console.log(`Papel: ${user.role}`);
  console.log(`Criado em: ${new Date(user.createdAt).toLocaleDateString('pt-BR')}`);
  console.log(`\nSenha (hash): ${user.passwordHash?.substring(0, 20)}...`);
  console.log('\n⚠️  Senhas são hashadas com bcrypt e não podem ser recuperadas.');
  console.log('Opções:');
  console.log('  1. Redefinir a senha usando o endpoint /forgot-password');
  console.log('  2. Atualizar a senha diretamente no banco (não recomendado)');
  console.log('  3. Testar com uma senha conhecida se for um usuário de teste');

  // Se for um usuário de teste conhecido, diga a senha
  const testUsers: Record<string, string> = {
    'atendimentoveredasbosque@gmail.com': 'Admin@2026',
    'sindico@parqueverde.com.br': 'Sindico@2026',
    'porteiro@parqueverde.com.br': 'Porteiro@2026',
    'atendimento@parqueverde.com.br': 'Atendimento@2026',
    'morador1@parqueverde.com.br': 'Morador@2026'
  };

  if (testUsers[user.email]) {
    console.log(`\n✅ USUÁRIO DE TESTE ENCONTRADO!`);
    console.log(`Senha padrão: ${testUsers[user.email]}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
