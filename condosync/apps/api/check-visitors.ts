import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Buscar todos os visitantes
  const visitors = await prisma.visitor.findMany();
  
  console.log('=== Visitantes Cadastrados ===\n');
  console.log(`Total: ${visitors.length} visitantes\n`);
  
  if (visitors.length === 0) {
    console.log('❌ Nenhum visitante cadastrado no sistema');
    return;
  }
  
  // Agrupar por quem registrou
  const byRegisteredBy: Record<string, any> = {};
  const byPreAuth: Record<string, number> = {};
  const userIds = new Set<string>();
  
  for (const v of visitors) {
    // Agrupar por registeredBy
    const key = v.registeredBy || 'sem-registro';
    if (!byRegisteredBy[key]) {
      byRegisteredBy[key] = {
        total: 0,
        names: []
      };
    }
    byRegisteredBy[key].total++;
    byRegisteredBy[key].names.push(v.name);
    if (v.registeredBy) userIds.add(v.registeredBy);
    
    // Agrupar por preAuthorizedBy
    if (v.preAuthorizedBy) {
      byPreAuth[v.preAuthorizedBy] = (byPreAuth[v.preAuthorizedBy] || 0) + 1;
      userIds.add(v.preAuthorizedBy);
    }
  }
  
  // Buscar info dos usuários
  const users = await prisma.user.findMany({
    where: { id: { in: Array.from(userIds) } },
    select: { id: true, name: true, email: true, role: true }
  });
  
  const userMap = new Map(users.map(u => [u.id, u]));
  
  console.log('=== Visitantes por Porteiro/Registrador ===');
  for (const [regBy, data] of Object.entries(byRegisteredBy)) {
    const user = regBy !== 'sem-registro' ? userMap.get(regBy) : null;
    console.log(`\n🚪 Registrado por: ${user ? `${user.name} (${user.email}) - ${user.role}` : 'SEM REGISTRO'}`);
    console.log(`   Total: ${data.total}`);
    console.log(`   Visitantes: ${data.names.slice(0, 3).join(', ')}${data.names.length > 3 ? '...' : ''}`);
  }
  
  console.log('\n\n=== Visitantes por Autorização Prévia ===');
  if (Object.keys(byPreAuth).length === 0) {
    console.log('Nenhum visitante com autorização prévia registrada');
  } else {
    for (const [userId, count] of Object.entries(byPreAuth)) {
      const user = userMap.get(userId);
      console.log(`👤 ${user ? `${user.name} (${user.email})` : userId} - ${count} visitante(s) autorizado(s)`);
    }
  }
  
  console.log('\n\n=== Status dos Visitantes ===');
  const byStatus: Record<string, number> = {};
  for (const v of visitors) {
    byStatus[v.status] = (byStatus[v.status] || 0) + 1;
  }
  for (const [status, count] of Object.entries(byStatus)) {
    console.log(`${status}: ${count}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
