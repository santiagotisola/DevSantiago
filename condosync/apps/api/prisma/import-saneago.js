/**
 * IMPORTAÇÃO SANEAGO 04/2026 — 39 registros prontos
 * Condomínio Residencial Veredas do Bosque
 *
 * Cria usuário com senha padrão Morador@2026 e vincula à unidade.
 * Para executar: node prisma/import-saneago.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const REGISTROS = [
  { name: 'Alexandre Ferreira Abrao',               email: 'alexandre@gmail.com',  casa: 43 },
  { name: 'Aparecida Ferreira Cardoso',              email: 'aparecida@gmail.com',  casa: 68 },
  { name: 'Bruno Martins Suanno',                    email: 'bruno40@gmail.com',    casa: 40 },
  { name: 'Flavio Augusto Curado Moraes',            email: 'flavio@gmail.com',     casa: 5  },
  { name: 'Haroldo Pereira de Macedo',               email: 'haroldo@gmail.com',    casa: 64 },
  { name: 'Helber Quintela Freitas',                 email: 'helber@gmail.com',     casa: 48 },
  { name: 'Jean Jose de Jesus',                      email: 'jean@gmail.com',       casa: 46 },
  { name: 'Jesse Mendes de Andrade',                 email: 'jesse@gmail.com',      casa: 49 },
  { name: 'Jonathas Matias de Carvalho',             email: 'jonathas@gmail.com',   casa: 23 },
  { name: 'Karla Maria Gomes Pontes',                email: 'karla@gmail.com',      casa: 67 },
  { name: 'Ketian Susan Pains Rodrigues Silva',      email: 'ketian@gmail.com',     casa: 45 },
  { name: 'Livia Vanessa de Freitas Martins',        email: 'livia@gmail.com',      casa: 53 },
  { name: 'Marcio Caiado de Castro',                 email: 'marcio@gmail.com',     casa: 27 },
  { name: 'Karine Dias de Abreu',                    email: 'karine12@gmail.com',   casa: 12, role: 'SYNDIC' },
  { name: 'Santiago Sola Neto',                      email: 'santiago12@gmail.com', casa: 12 },
  { name: 'Maria Aparecida de Jesus Fernandes',      email: 'maria11@gmail.com',    casa: 11 },
  { name: 'Maria Izabel Rodrigues de Andrade',       email: 'maria1@gmail.com',     casa: 1  },
  { name: 'Maria Izabel Rodrigues de Andrade',       email: 'maria26@gmail.com',    casa: 26 },
  { name: 'Marines Honorato Pinheiro',               email: 'marines@gmail.com',    casa: 7  },
  { name: 'Matheus Cardoso Martins',                 email: 'matheus@gmail.com',    casa: 61 },
  { name: 'Michel Blezins de Arruda',                email: 'michel@gmail.com',     casa: 38 },
  { name: 'Michelly Marcklin Goncalves',             email: 'michelly@gmail.com',   casa: 57 },
  { name: 'Murilo Jose do Carmo',                    email: 'murilo@gmail.com',     casa: 35 },
  { name: 'Paulo Roberto Oliveira',                  email: 'paulo@gmail.com',      casa: 34 },
  { name: 'Priscilla Carvalho Ferreira Lima',        email: 'priscilla@gmail.com',  casa: 60 },
  { name: 'Rafaella Neta dos Santos Fagundes',       email: 'rafaella@gmail.com',   casa: 24 },
  { name: 'Raimunda Pereira da Silva',               email: 'raimunda@gmail.com',   casa: 30 },
  { name: 'Renata Rodrigues de Lima',                email: 'renata@gmail.com',     casa: 42 },
  { name: 'Rodrigo Sartori Seltz',                   email: 'rodrigo@gmail.com',    casa: 36 },
  { name: 'Selma Ribeiro de Alencar',                email: 'selma@gmail.com',      casa: 28 },
  { name: 'Sergey Robert Magalhaes',                 email: 'sergey@gmail.com',     casa: 50 },
  { name: 'Sergio Luciano Rodrigues de Oliveira',    email: 'sergio39@gmail.com',   casa: 39 },
  { name: 'Sergio Marcelo Rodrigues de Oliveira',    email: 'sergio37@gmail.com',   casa: 37 },
  { name: 'Sidney Silva de Faria',                   email: 'sidney@gmail.com',     casa: 51 },
  { name: 'Thiago de Oliveira Magalhaes',            email: 'thiago54@gmail.com',   casa: 54 },
  { name: 'Thiago Semao Pires',                      email: 'thiago44@gmail.com',   casa: 44 },
  { name: 'Victor Cruz Pereira',                     email: 'victor@gmail.com',     casa: 65 },
  { name: 'Vinicius Gontijo de Campos',              email: 'vinicius@gmail.com',   casa: 21 },
  { name: 'Wiler Jose Borges Monteiro',              email: 'wiler@gmail.com',       casa: 52 },
  { name: 'Wilibaldo de Sousa Neto',                 email: 'wilibaldo@gmail.com',  casa: 17 },
  { name: 'Winicius Ferreira de Oliveira',           email: 'winicius@gmail.com',   casa: 29 },
];

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log(' IMPORTAÇÃO SANEAGO → CondoSync');
  console.log(' 39 moradores novos — senha padrão: Morador@2026');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Localiza condomínio com mais unidades
  const condos = await prisma.condominium.findMany({
    where: { name: { contains: 'Veredas do Bosque' } },
    include: { _count: { select: { units: true } } },
  });
  const condo = condos.sort((a, b) => b._count.units - a._count.units)[0];

  if (!condo) {
    console.error('❌ Condomínio não encontrado!');
    process.exit(1);
  }
  console.log(`✅ Condomínio: ${condo.name} (${condo.id})\n`);

  // Carrega todas as unidades do condomínio
  const units = await prisma.unit.findMany({
    where: { condominiumId: condo.id },
  });
  const unitMap = {};
  units.forEach(u => {
    const num = parseInt(u.identifier.replace(/\D/g, ''), 10);
    unitMap[num] = u;
  });

  const passwordHash = await bcrypt.hash('Morador@2026', 12);

  let ok = 0, erros = 0;
  const resultados = [];

  for (const reg of REGISTROS) {
    const unit = unitMap[reg.casa];
    if (!unit) {
      console.error(`  ❌ CASA ${reg.casa} não encontrada — ${reg.name}`);
      erros++;
      resultados.push({ ...reg, status: 'ERRO_UNIDADE' });
      continue;
    }

    try {
      // Verifica se email já existe
      const emailExistente = await prisma.user.findUnique({ where: { email: reg.email } });
      if (emailExistente) {
        console.warn(`  ⚠️  Email ${reg.email} já existe — pulando ${reg.name}`);
        erros++;
        resultados.push({ ...reg, status: 'EMAIL_DUPLICADO' });
        continue;
      }

      // Cria usuário + CondominiumUser + atualiza unidade em transação
      await prisma.$transaction(async (tx) => {
        const userRole = reg.role || 'RESIDENT';
        const user = await tx.user.create({
          data: {
            name: reg.name,
            email: reg.email,
            passwordHash,
            role: userRole,
            isActive: true,
            emailVerified: false,
          },
        });

        await tx.condominiumUser.create({
          data: {
            userId: user.id,
            condominiumId: condo.id,
            unitId: unit.id,
            role: userRole,
            isActive: true,
          },
        });

        await tx.unit.update({
          where: { id: unit.id },
          data: { status: 'OCCUPIED' },
        });
      });

      console.log(`  ✅ CASA ${String(reg.casa).padStart(2, '0')} | ${reg.name} | ${reg.email}`);
      ok++;
      resultados.push({ ...reg, status: 'CRIADO' });
    } catch (err) {
      console.error(`  ❌ ERRO CASA ${reg.casa} | ${reg.name}: ${err.message}`);
      erros++;
      resultados.push({ ...reg, status: 'ERRO', erro: err.message });
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(` ✅ Criados com sucesso : ${ok}`);
  console.log(` ❌ Erros / pulados     : ${erros}`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('\n Senha padrão de todos os moradores criados: Morador@2026');
  console.log(' Os moradores podem trocar a senha no primeiro acesso.\n');

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
