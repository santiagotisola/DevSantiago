import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Buscar o condomínio
  const condominium = await prisma.condominium.findFirst({
    where: { name: { contains: 'Veredas do Bosque' } }
  });

  if (!condominium) {
    console.log('❌ Condomínio não encontrado');
    return;
  }

  console.log('=== CONDOMÍNIO ===');
  console.log(`ID: ${condominium.id}`);
  console.log(`Nome: ${condominium.name}`);
  console.log(`Endereço: ${condominium.address}`);
  console.log(`CNPJ: ${condominium.cnpj}`);
  console.log(`Criado em: ${new Date(condominium.createdAt).toLocaleDateString('pt-BR')}`);

  // Contar dados
  const [
    unitsCount,
    condominiumUsersCount,
    visitorsCount,
    parcelsCount,
    vehiclesCount,
    chargesCount,
    announcementsCount,
    commonAreasCount,
    reservationsCount,
    maintenanceCount,
    employeesCount,
    serviceProvidersCount,
    photosCount,
    occurrencesCount
  ] = await Promise.all([
    prisma.unit.count({ where: { condominiumId: condominium.id } }),
    prisma.condominiumUser.count({ where: { condominiumId: condominium.id } }),
    prisma.visitor.count({ where: { unit: { condominiumId: condominium.id } } }),
    prisma.parcel.count({ where: { unit: { condominiumId: condominium.id } } }),
    prisma.vehicle.count({ where: { unit: { condominiumId: condominium.id } } }),
    prisma.charge.count({ where: { unit: { condominiumId: condominium.id } } }),
    prisma.announcement.count({ where: { condominiumId: condominium.id } }),
    prisma.commonArea.count({ where: { condominiumId: condominium.id } }),
    prisma.reservation.count({ where: { commonArea: { condominiumId: condominium.id } } }),
    prisma.serviceOrder.count({ where: { condominiumId: condominium.id } }),
    prisma.employee.count({ where: { condominiumId: condominium.id } }),
    prisma.serviceProvider.count({ where: { condominiumId: condominium.id } }),
    prisma.photo.count({ where: { condominiumId: condominium.id } }),
    prisma.occurrence.count({ where: { condominiumId: condominium.id } })
  ]);

  console.log('\n=== DADOS ASSOCIADOS ===\n');
  console.log(`🏠 Unidades: ${unitsCount}`);
  console.log(`👥 Usuários do Condomínio: ${condominiumUsersCount}`);
  console.log(`👤 Visitantes: ${visitorsCount}`);
  console.log(`📦 Encomendas: ${parcelsCount}`);
  console.log(`🚗 Veículos: ${vehiclesCount}`);
  console.log(`💳 Cobranças: ${chargesCount}`);
  console.log(`📢 Avisos: ${announcementsCount}`);
  console.log(`🏢 Áreas Comuns: ${commonAreasCount}`);
  console.log(`📅 Reservas: ${reservationsCount}`);
  console.log(`🔧 Manutenção/Chamados: ${maintenanceCount}`);
  console.log(`👔 Funcionários: ${employeesCount}`);
  console.log(`🛠️ Prestadores de Serviço: ${serviceProvidersCount}`);
  console.log(`🖼️ Fotos: ${photosCount}`);
  console.log(`⚠️ Ocorrências: ${occurrencesCount}`);

  // Detalhes das Unidades
  console.log('\n=== UNIDADES ===');
  const units = await prisma.unit.findMany({
    where: { condominiumId: condominium.id },
    take: 10
  });

  for (const unit of units) {
    console.log(`\n  Unidade ${unit.id.slice(0, 8)}`);
    console.log(`  - Identificador: ${unit.identifier}`);
    console.log(`  - Bloco: ${unit.block || 'N/A'}`);
  }
  if (unitsCount > 10) console.log(`  ... e mais ${unitsCount - 10} unidades`);

  // Detalhes de Usuários do Condomínio
  console.log('\n\n=== USUÁRIOS DO CONDOMÍNIO ===');
  const condoUsers = await prisma.condominiumUser.findMany({
    where: { condominiumId: condominium.id },
    include: { user: true },
    take: 10
  });

  for (const cu of condoUsers) {
    console.log(`\n  ${cu.user.name} (${cu.user.email})`);
    console.log(`  - Papel: ${cu.role}`);
    console.log(`  - Membro desde: ${new Date(cu.joinedAt).toLocaleDateString('pt-BR')}`);
  }
  if (condominiumUsersCount > 10) console.log(`  ... e mais ${condominiumUsersCount - 10} usuários`);

  // Áreas Comuns
  console.log('\n\n=== ÁREAS COMUNS ===');
  const areas = await prisma.commonArea.findMany({
    where: { condominiumId: condominium.id }
  });

  for (const area of areas) {
    console.log(`\n  ${area.name}`);
    console.log(`  - Capacidade: ${area.capacity} pessoas`);
    console.log(`  - Ativa: ${area.isActive ? 'Sim' : 'Não'}`);
  }

  // Resumo Geral
  console.log('\n\n=== RESUMO GERAL ===');
  const totalRecords = unitsCount + condominiumUsersCount + visitorsCount + parcelsCount + 
                      vehiclesCount + chargesCount + announcementsCount + commonAreasCount + 
                      reservationsCount + maintenanceCount + employeesCount + 
                      serviceProvidersCount + photosCount + occurrencesCount;
  console.log(`Total de registros: ${totalRecords}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

