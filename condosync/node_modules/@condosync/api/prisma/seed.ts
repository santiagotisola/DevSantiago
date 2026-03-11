import { PrismaClient, UserRole, UnitStatus, ShiftType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // ─── Super Admin ────────────────────────────────────────────
  const superAdminPassword = await bcrypt.hash('Admin@2026', 12);
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@condosync.com.br' },
    update: {},
    create: {
      name: 'Super Administrador',
      email: 'admin@condosync.com.br',
      passwordHash: superAdminPassword,
      role: UserRole.SUPER_ADMIN,
      emailVerified: true,
    },
  });

  console.log('✅ Super admin criado:', superAdmin.email);

  // ─── Condomínio Demo ────────────────────────────────────────
  const condominium = await prisma.condominium.upsert({
    where: { cnpj: '12345678000195' },
    update: {},
    create: {
      name: 'Residencial Veredas do Bosque',
      cnpj: '12345678000195',
      address: 'Rua das Palmeiras, 500',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01310100',
      phone: '(11) 3000-0000',
      email: 'admin@parqueverde.com.br',
      plan: 'professional',
      maxUnits: 50,
    },
  });

  console.log('✅ Condomínio criado:', condominium.name);

  // ─── Síndico ────────────────────────────────────────────────
  const syndicPassword = await bcrypt.hash('Sindico@2026', 12);
  const syndic = await prisma.user.upsert({
    where: { email: 'sindico@parqueverde.com.br' },
    update: {},
    create: {
      name: 'Carlos Silva',
      email: 'sindico@parqueverde.com.br',
      passwordHash: syndicPassword,
      phone: '(11) 99999-0001',
      cpf: '11122233344',
      role: UserRole.SYNDIC,
      emailVerified: true,
    },
  });

  // ─── Porteiro ────────────────────────────────────────────────
  const doormanPassword = await bcrypt.hash('Porteiro@2026', 12);
  const doorman = await prisma.user.upsert({
    where: { email: 'porteiro@parqueverde.com.br' },
    update: {},
    create: {
      name: 'João Porteiro',
      email: 'porteiro@parqueverde.com.br',
      passwordHash: doormanPassword,
      phone: '(11) 99999-0002',
      cpf: '22233344455',
      role: UserRole.DOORMAN,
      emailVerified: true,
    },
  });

  // ─── Moradores ──────────────────────────────────────────────
  const residentPassword = await bcrypt.hash('Morador@2026', 12);
  const residents = await Promise.all(
    ['Ana Costa', 'Bruno Oliveira', 'Carla Santos', 'Diego Fernandes', 'Elena Martins'].map(
      (name, i) =>
        prisma.user.upsert({
          where: { email: `morador${i + 1}@parqueverde.com.br` },
          update: {},
          create: {
            name,
            email: `morador${i + 1}@parqueverde.com.br`,
            passwordHash: residentPassword,
            cpf: `${String(33344455566 + i).padStart(11, '0')}`,
            role: UserRole.RESIDENT,
            emailVerified: true,
          },
        })
    )
  );

  // ─── Unidades ───────────────────────────────────────────────
  const units = await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      prisma.unit.upsert({
        where: { condominiumId_identifier_block: { condominiumId: condominium.id, identifier: `Casa ${String(i + 1).padStart(2, '0')}`, block: 'A' } },
        update: {},
        create: {
          condominiumId: condominium.id,
          identifier: `Casa ${String(i + 1).padStart(2, '0')}`,
          block: 'A',
          area: 120 + i * 10,
          bedrooms: 3,
          status: i < 5 ? UnitStatus.OCCUPIED : UnitStatus.VACANT,
          fraction: 1.0,
        },
      })
    )
  );

  // ─── Associar usuários ao condomínio ────────────────────────
  await prisma.condominiumUser.upsert({
    where: { userId_condominiumId: { userId: superAdmin.id, condominiumId: condominium.id } },
    update: {},
    create: { userId: superAdmin.id, condominiumId: condominium.id, role: UserRole.CONDOMINIUM_ADMIN },
  });

  await prisma.condominiumUser.upsert({
    where: { userId_condominiumId: { userId: syndic.id, condominiumId: condominium.id } },
    update: {},
    create: { userId: syndic.id, condominiumId: condominium.id, role: UserRole.SYNDIC },
  });

  await prisma.condominiumUser.upsert({
    where: { userId_condominiumId: { userId: doorman.id, condominiumId: condominium.id } },
    update: {},
    create: { userId: doorman.id, condominiumId: condominium.id, role: UserRole.DOORMAN },
  });

  for (let i = 0; i < 5; i++) {
    await prisma.condominiumUser.upsert({
      where: { userId_condominiumId: { userId: residents[i].id, condominiumId: condominium.id } },
      update: {},
      create: {
        userId: residents[i].id,
        condominiumId: condominium.id,
        role: UserRole.RESIDENT,
        unitId: units[i].id,
      },
    });
  }

  // ─── Funcionários ────────────────────────────────────────────
  await prisma.employee.upsert({
    where: { id: 'seed-employee-001' },
    update: {},
    create: {
      id: 'seed-employee-001',
      condominiumId: condominium.id,
      name: 'João da Silva',
      cpf: '55566677788',
      role: 'Porteiro',
      shift: ShiftType.MORNING,
      admissionDate: new Date('2023-01-01'),
      phone: '(11) 99999-1111',
    },
  });

  // ─── Conta financeira ───────────────────────────────────────
  const account = await prisma.financialAccount.upsert({
    where: { id: 'seed-account-001' },
    update: {},
    create: {
      id: 'seed-account-001',
      condominiumId: condominium.id,
      name: 'Conta Principal',
      bankName: 'Banco do Brasil',
      agency: '1234',
      accountNumber: '56789-0',
      balance: 15000,
    },
  });

  // ─── Área comum ─────────────────────────────────────────────
  await prisma.commonArea.upsert({
    where: { id: 'seed-area-001' },
    update: {},
    create: {
      id: 'seed-area-001',
      condominiumId: condominium.id,
      name: 'Salão de Festas',
      description: 'Salão com capacidade para 100 pessoas, cozinha equipada',
      capacity: 100,
      rules: 'Horário: 10h às 22h. Limpeza obrigatória após uso.',
      requiresApproval: true,
      maxDaysAdvance: 30,
      openTime: '10:00',
      closeTime: '22:00',
    },
  });

  await prisma.commonArea.upsert({
    where: { id: 'seed-area-002' },
    update: {},
    create: {
      id: 'seed-area-002',
      condominiumId: condominium.id,
      name: 'Quadra Poliesportiva',
      capacity: 20,
      rules: 'Horário: 7h às 22h. Calçado esportivo obrigatório.',
      requiresApproval: false,
      openTime: '07:00',
      closeTime: '22:00',
    },
  });

  // ─── Comunicado inicial ─────────────────────────────────────
  await prisma.announcement.create({
    data: {
      condominiumId: condominium.id,
      title: 'Bem-vindos ao CondoSync!',
      content: 'O sistema de gestão do Residencial Veredas do Bosque está ativo. Utilizem o aplicativo para comunicados, reservas e chamados.',
      authorId: syndic.id,
      isPinned: true,
      isOfficial: true,
    },
  });

  console.log('✅ Seed concluído com sucesso!');
  console.log('\n📋 Credenciais de acesso:');
  console.log('  Super Admin:  admin@condosync.com.br  / Admin@2026');
  console.log('  Síndico:      sindico@parqueverde.com.br / Sindico@2026');
  console.log('  Porteiro:     porteiro@parqueverde.com.br / Porteiro@2026');
  console.log('  Morador:      morador1@parqueverde.com.br / Morador@2026');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
