/**
 * ANÁLISE DE IMPORTAÇÃO — SANEAGO 04/2026
 * Condomínio Residencial Veredas do Bosque
 *
 * Fonte: Resumo do Faturamento das Contas Individualizadas — Conta 1199397
 * Gerado em: 08/05/2026
 *
 * O script NÃO altera dados. Apenas analisa e reporta o que seria importado.
 * Para executar: node prisma/analyze-saneago-import.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────────────────────
// DADOS EXTRAÍDOS DO PDF SANEAGO (70 residências + 1 área comum)
// Coluna "Nome do Cliente" → nome  |  "Complemento" → casa (número)
// ─────────────────────────────────────────────────────────────────────────────
const SANEAGO_DATA = [
  // ── Pág. 1 ──
  { name: 'Alexandre Ferreira Abrao',                  casa: 43 },
  { name: 'Alfeu Mendes',                              casa: 14 },
  { name: 'Ana Ruth Oliveira Rodrigues',               casa: 6  },
  { name: 'Andre Luiz Rocha Vasconcelos',              casa: 8  },
  { name: 'Antonio Bizerra Loiola Filho',              casa: 16 },
  { name: 'Aparecida Ferreira Cardoso',                casa: 68 },
  { name: 'Bruno Leonardo de Souza',                   casa: 19 },
  { name: 'Bruno Martins Suanno',                      casa: 40 },
  { name: 'Bruno Meletti Neto',                        casa: 63 },
  { name: 'Celia Karine Goncalves',                    casa: 56 },
  { name: 'Charles Kassab',                            casa: 9  },
  { name: 'Cleber Barbosa de Souza Martins',           casa: 66 },
  // PISCINA → área comum do condomínio, ignorada
  { name: 'Danilo Francisco da Cunha',                 casa: 32 },
  { name: 'Dermicon Mendes de Matos',                  casa: 2  },
  { name: 'Eduardo Carlos do Vale',                    casa: 18 },
  { name: 'Eliana de Souza Araujo',                    casa: 22 },
  { name: 'Elisangela Silva Moreira do Nascimento',    casa: 59 },
  { name: 'Euclides Fernando de Oliveira Castro',      casa: 70 },
  { name: 'Eufrasia Francisca da Silva',               casa: 31 },
  { name: 'Fernando Bacelar de Sousa',                 casa: 20 },
  { name: 'Flavio Augusto Curado Moraes',              casa: 5  },
  { name: 'Gabriella Neta dos Santos',                 casa: 47 },
  // ── Pág. 2 ──
  { name: 'Getulio Carlos Correia Morales',            casa: 69 },
  { name: 'Girley Soares da Silva',                    casa: 13 },
  { name: 'Haroldo Pereira de Macedo',                 casa: 64 },
  { name: 'Helber Quintela Freitas',                   casa: 48 },
  { name: 'Henrique Resende Nogueira',                 casa: 4  },
  { name: 'Jean Jose de Jesus',                        casa: 46 },
  { name: 'Jesse Mendes de Andrade',                   casa: 49 },
  { name: 'Jonathas Matias de Carvalho',               casa: 23 },
  { name: 'Juliana Venancio Goncalves',                casa: 41 },
  { name: 'Karla Maria Gomes Pontes',                  casa: 67 },
  { name: 'Kelly Cristina Lolli Ghetti',               casa: 3  },
  { name: 'Ketian Susan Pains Rodrigues Silva',        casa: 45 },
  { name: 'Livia Vanessa de Freitas Martins',          casa: 53 },
  { name: 'Marcio Caiado de Castro',                   casa: 27 },
  { name: 'Marcos Vinicios Soares Lima',               casa: 15 },
  { name: 'Maria Aparecida de Jesus Fernandes',        casa: 11 },
  { name: 'Maria Izabel Rodrigues de Andrade',         casa: 1  }, // mesmo nome → CASA 1
  { name: 'Maria Izabel Rodrigues de Andrade',         casa: 26 }, // mesmo nome → CASA 26
  { name: 'Marines Honorato Pinheiro',                 casa: 7  },
  { name: 'Matheus Cardoso Martins',                   casa: 61 },
  { name: 'Mauricio Batista Leite',                    casa: 10 },
  { name: 'Metal Ligth Esquadrias em Aluminio Ltda',   casa: 33 }, // empresa
  { name: 'Michel Blezins de Arruda',                  casa: 38 },
  // ── Pág. 3 ──
  { name: 'Michelly Marcklin Goncalves',               casa: 57 },
  { name: 'Milena Nonato da Costa',                    casa: 62 },
  { name: 'Multi House Representacoes Ltda',           casa: 58 }, // empresa
  { name: 'Murilo Jose do Carmo',                      casa: 35 },
  { name: 'Paulo Roberto Oliveira',                    casa: 34 },
  { name: 'Pedro Diego Santana Neves',                 casa: 25 },
  { name: 'Priscilla Carvalho Ferreira Lima',          casa: 60 },
  { name: 'Rafaella Neta dos Santos Fagundes',         casa: 24 },
  { name: 'Raimunda Pereira da Silva',                 casa: 30 },
  { name: 'Renata Rodrigues de Lima',                  casa: 42 },
  { name: 'Rodrigo Sartori Seltz',                     casa: 36 },
  { name: 'Santiago Sola Neto',                        casa: 12 },
  { name: 'Selma Ribeiro de Alencar',                  casa: 28 },
  { name: 'Sergey Robert Magalhaes',                   casa: 50 },
  { name: 'Sergio Luciano Rodrigues de Oliveira',      casa: 39 },
  { name: 'Sergio Marcelo Rodrigues de Oliveira',      casa: 37 },
  { name: 'Sidney Silva de Faria',                     casa: 51 },
  { name: 'Thiago de Oliveira Magalhaes',              casa: 54 },
  { name: 'Thiago Semao Pires',                        casa: 44 },
  { name: 'Veredas Empreendimentos Imobiliarios Ltda', casa: 55 }, // empresa
  { name: 'Victor Cruz Pereira',                       casa: 65 },
  { name: 'Vinicius Gontijo de Campos',                casa: 21 },
  { name: 'Wiler Jose Borges Monteiro',                casa: 52 },
  // ── Pág. 4 ──
  { name: 'Wilibaldo de Sousa Neto',                   casa: 17 },
  { name: 'Winicius Ferreira de Oliveira',             casa: 29 },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Remove acentos e converte para lowercase */
function slug(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** Retorna o primeiro nome (sem partículas: de, da, do, dos, das) */
function firstName(fullName) {
  const particles = new Set(['de', 'da', 'do', 'dos', 'das', 'e']);
  const parts = slug(fullName).split(' ');
  return parts.find(p => !particles.has(p)) ?? parts[0];
}

/** Detecta se o nome é empresa */
function isEmpresa(name) {
  const u = name.toUpperCase();
  return u.includes('LTDA') || u.includes('S.A') || u.includes('ME ') || u.endsWith(' ME');
}

/**
 * Gera email: <primeiroNome>@gmail.com
 * Em caso de conflito dentro do próprio lote SANEAGO, usa <primeiroNome><casa>@gmail.com
 */
function buildEmailMap(data) {
  const baseCount = {};
  data.forEach(r => {
    const base = firstName(r.name);
    baseCount[base] = (baseCount[base] || 0) + 1;
  });

  return data.map(r => {
    const base = firstName(r.name);
    const email =
      baseCount[base] > 1
        ? `${base}${r.casa}@gmail.com`
        : `${base}@gmail.com`;
    return { ...r, email };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// ANÁLISE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(' ANÁLISE DE IMPORTAÇÃO SANEAGO → CondoSync');
  console.log(' Referência: 04/2026 | Condomínio Residencial Veredas do Bosque');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Localiza o condomínio correto — o que tem unidades cadastradas
  const condos = await prisma.condominium.findMany({
    where: { name: { contains: 'Veredas do Bosque' } },
    include: { _count: { select: { units: true } } },
  });
  const condo = condos.sort((a, b) => b._count.units - a._count.units)[0];

  if (!condo) {
    console.error('❌ Condomínio "Veredas do Bosque" não encontrado no banco!');
    process.exit(1);
  }
  console.log(`✅ Condomínio: ${condo.name}`);
  console.log(`   ID: ${condo.id}\n`);

  // Busca todas as unidades do condomínio
  const units = await prisma.unit.findMany({
    where: { condominiumId: condo.id },
    include: {
      residents: {
        where: { isActive: true },
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
    orderBy: { identifier: 'asc' },
  });

  // Busca todos os usuários existentes
  const existingUsers = await prisma.user.findMany({
    select: { id: true, name: true, email: true },
  });

  const existingEmails = new Set(existingUsers.map(u => u.email.toLowerCase()));

  // Monta mapa de unidades: identificador → unit
  const unitMap = {};
  units.forEach(u => {
    const num = parseInt(u.identifier.replace(/\D/g, ''), 10);
    unitMap[num] = u;
  });

  // Gera emails
  const dataWithEmails = buildEmailMap(SANEAGO_DATA);

  // ── Contadores
  let cntNovo = 0, cntExistente = 0, cntEmailConflito = 0;
  let cntUnidadeNaoEncontrada = 0, cntJaVinculado = 0, cntEmpresa = 0;

  const rows = {
    CRIAR:         [],
    EMAIL_CONFLITO: [],
    JA_VINCULADO:  [],
    EMPRESA:       [],
    UNIDADE_404:   [],
    NOME_EXISTENTE: [],
  };

  console.log('─── Detalhamento por entrada ──────────────────────────────────\n');

  for (const entry of dataWithEmails) {
    const unit = unitMap[entry.casa];
    const empresa = isEmpresa(entry.name);
    const emailConflito = existingEmails.has(entry.email.toLowerCase());
    const nomeExistente = existingUsers.find(
      u => slug(u.name) === slug(entry.name)
    );

    const status = [];

    if (empresa) {
      cntEmpresa++;
      rows.EMPRESA.push({ ...entry, obs: 'Pessoa jurídica — requer análise manual' });
      status.push('⚠️  EMPRESA');
    }

    if (!unit) {
      cntUnidadeNaoEncontrada++;
      rows.UNIDADE_404.push({ ...entry, obs: `CASA ${entry.casa} não encontrada no banco` });
      status.push(`❌  UNIDADE ${entry.casa} NÃO ENCONTRADA`);
    } else {
      const jaTemMorador = unit.residents.length > 0;
      if (jaTemMorador) {
        cntJaVinculado++;
        const moradores = unit.residents.map(r => r.user.name).join(', ');
        rows.JA_VINCULADO.push({ ...entry, obs: `Já possui: ${moradores}` });
        status.push(`⚠️  UNIDADE ${entry.casa} já vinculada a: ${moradores}`);
      }
    }

    if (nomeExistente) {
      cntExistente++;
      rows.NOME_EXISTENTE.push({ ...entry, usuarioId: nomeExistente.id, obs: `Email atual: ${nomeExistente.email}` });
      status.push(`ℹ️  Usuário "${entry.name}" já existe (id: ${nomeExistente.id})`);
    }

    if (emailConflito && !nomeExistente) {
      cntEmailConflito++;
      rows.EMAIL_CONFLITO.push({ ...entry, obs: `${entry.email} já em uso` });
      status.push(`⚠️  Email ${entry.email} já em uso por outro usuário`);
    }

    if (!empresa && unit && !nomeExistente && !emailConflito) {
      cntNovo++;
      rows.CRIAR.push(entry);
      status.push(`✅  NOVO — criar usuário e vincular à CASA ${entry.casa}`);
    }

    console.log(`  CASA ${String(entry.casa).padStart(2, '0')} | ${entry.name.padEnd(45)} | ${entry.email}`);
    status.forEach(s => console.log(`         ${s}`));
    console.log();
  }

  // ── Resumo ────────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(' RESUMO DA ANÁLISE');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Total de entradas no PDF         : ${SANEAGO_DATA.length}`);
  console.log(`  ✅  Prontos para criar/vincular   : ${rows.CRIAR.length}`);
  console.log(`  ℹ️   Usuário já existe (vincular?)  : ${rows.NOME_EXISTENTE.length}`);
  console.log(`  ⚠️   Email conflitante (ajustar)   : ${rows.EMAIL_CONFLITO.length}`);
  console.log(`  ⚠️   Unidade já tem morador        : ${rows.JA_VINCULADO.length}`);
  console.log(`  ⚠️   Empresas (PJ — manual)        : ${rows.EMPRESA.length}`);
  console.log(`  ❌  Unidade não encontrada no BD  : ${rows.UNIDADE_404.length}`);

  // ── Tabelas detalhadas por categoria ─────────────────────────────────────
  if (rows.CRIAR.length) {
    console.log('\n─── ✅ SERÃO CRIADOS (novo usuário + vínculo de unidade) ──────');
    console.log(`  ${'CASA'.padEnd(6)} ${'NOME'.padEnd(45)} ${'EMAIL'}`);
    console.log(`  ${'─'.repeat(80)}`);
    rows.CRIAR.forEach(r =>
      console.log(`  CASA ${String(r.casa).padStart(2, '0')} | ${r.name.padEnd(43)} | ${r.email}`)
    );
  }

  if (rows.NOME_EXISTENTE.length) {
    console.log('\n─── ℹ️  USUÁRIO JÁ EXISTE — apenas vincular unidade? ───────────');
    console.log(`  ${'CASA'.padEnd(6)} ${'NOME'.padEnd(45)} ${'OBS'}`);
    console.log(`  ${'─'.repeat(80)}`);
    rows.NOME_EXISTENTE.forEach(r =>
      console.log(`  CASA ${String(r.casa).padStart(2, '0')} | ${r.name.padEnd(43)} | ${r.obs}`)
    );
  }

  if (rows.EMAIL_CONFLITO.length) {
    console.log('\n─── ⚠️  CONFLITO DE EMAIL — precisa de ajuste manual ───────────');
    rows.EMAIL_CONFLITO.forEach(r =>
      console.log(`  CASA ${String(r.casa).padStart(2, '0')} | ${r.name} → ${r.email} | ${r.obs}`)
    );
  }

  if (rows.JA_VINCULADO.length) {
    console.log('\n─── ⚠️  UNIDADE JÁ POSSUI MORADOR NO SISTEMA ──────────────────');
    rows.JA_VINCULADO.forEach(r =>
      console.log(`  CASA ${String(r.casa).padStart(2, '0')} | ${r.name.padEnd(43)} | ${r.obs}`)
    );
  }

  if (rows.EMPRESA.length) {
    console.log('\n─── ⚠️  PESSOA JURÍDICA — tratar manualmente ───────────────────');
    rows.EMPRESA.forEach(r =>
      console.log(`  CASA ${String(r.casa).padStart(2, '0')} | ${r.name}`)
    );
  }

  if (rows.UNIDADE_404.length) {
    console.log('\n─── ❌ UNIDADES NÃO ENCONTRADAS NO BANCO ───────────────────────');
    rows.UNIDADE_404.forEach(r =>
      console.log(`  CASA ${String(r.casa).padStart(2, '0')} | ${r.name}`)
    );
  }

  // ── Preview do SQL que será gerado na importação ─────────────────────────
  console.log('\n─── 📋 PREVIEW — emails que seriam gerados (prontos para criar) ─');
  rows.CRIAR.forEach(r =>
    console.log(`  INSERT user: name="${r.name}" email="${r.email}" → vincular unit CASA ${r.casa}`)
  );

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(' Análise concluída. Nenhum dado foi alterado.');
  console.log(' Para executar a importação: node prisma/import-saneago.js');
  console.log('═══════════════════════════════════════════════════════════════\n');

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
