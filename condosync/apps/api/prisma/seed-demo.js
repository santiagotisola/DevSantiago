"use strict";
// ─── Seed de dados demo para validação do sistema ──────────────────────────
// Executa: node prisma/seed-demo.js
// Adiciona visitantes, encomendas, ordens de serviço, cobranças,
// reservas de área comum, ocorrências, comunicados e enquetes.

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("🎭 Iniciando seed de dados demo...\n");

  // ── Buscar referências já existentes ─────────────────────────────────────
  const condo = await prisma.condominium.findFirst({
    where: { cnpj: "12345678000195" },
  });
  if (!condo) {
    console.error(
      "❌ Condomínio não encontrado. Execute o seed principal primeiro.",
    );
    process.exit(1);
  }

  const syndic = await prisma.user.findUnique({
    where: { email: "sindico@parqueverde.com.br" },
  });
  const doorman = await prisma.user.findUnique({
    where: { email: "porteiro@parqueverde.com.br" },
  });
  const residents = await prisma.user.findMany({
    where: { email: { contains: "@parqueverde.com.br" }, role: "RESIDENT" },
  });

  const units = await prisma.unit.findMany({
    where: { condominiumId: condo.id },
  });
  const account = await prisma.financialAccount.findFirst({
    where: { condominiumId: condo.id },
  });

  console.log(`✅ Condomínio: ${condo.name}`);
  console.log(`✅ ${units.length} unidades | ${residents.length} moradores\n`);

  // ── 1. VISITANTES ─────────────────────────────────────────────────────────
  console.log("🚪 Criando visitantes...");
  const visitors = [
    {
      name: "Marcos Pereira",
      document: "111.222.333-44",
      documentType: "CPF",
      reason: "Visita familiar",
      status: "LEFT",
      entryAt: daysAgo(2, 14),
      exitAt: daysAgo(2, 17),
    },
    {
      name: "Fernanda Lima",
      document: "MG-1234567",
      documentType: "RG",
      reason: "Entrega de documentos",
      status: "LEFT",
      entryAt: daysAgo(1, 10),
      exitAt: daysAgo(1, 11),
    },
    {
      name: "Ricardo Souza",
      document: "555.666.777-88",
      documentType: "CPF",
      reason: "Reunião de negócios",
      status: "LEFT",
      entryAt: daysAgo(1, 15),
      exitAt: daysAgo(1, 16),
    },
    {
      name: "Juliana Travolta",
      document: "SP-9876543",
      documentType: "RG",
      reason: "Visita social",
      status: "INSIDE",
      entryAt: hoursAgo(1),
    },
    {
      name: "Pedro Almeida",
      document: "999.888.777-66",
      documentType: "CPF",
      reason: "Entrega de presente",
      status: "AUTHORIZED",
    },
    {
      name: "Camila Rodrigues",
      document: "321.654.987-01",
      documentType: "CPF",
      reason: "Serviço de internet",
      status: "PENDING",
      scheduledAt: tomorrow(9),
    },
  ];

  for (let i = 0; i < visitors.length; i++) {
    const v = visitors[i];
    const unit = units[i % units.length];
    await prisma.visitor.create({
      data: {
        unitId: unit.id,
        name: v.name,
        document: v.document,
        documentType: v.documentType,
        reason: v.reason,
        status: v.status,
        entryAt: v.entryAt ?? null,
        exitAt: v.exitAt ?? null,
        scheduledAt: v.scheduledAt ?? null,
        registeredBy: doorman?.id ?? null,
        preAuthorizedBy: residents[i % residents.length]?.id ?? null,
      },
    });
  }
  console.log(`  ✅ ${visitors.length} visitantes criados`);

  // ── 2. ENCOMENDAS ─────────────────────────────────────────────────────────
  console.log("📦 Criando encomendas...");
  const parcels = [
    {
      sender: "Amazon Brasil",
      carrier: "Correios",
      tracking: "BR123456789BR",
      status: "PICKED_UP",
      receivedAt: daysAgo(5),
      pickedUpAt: daysAgo(4),
      pickedUpBy: "Ana Costa",
    },
    {
      sender: "Mercado Livre",
      carrier: "Total Express",
      tracking: "ML987654321",
      status: "PICKED_UP",
      receivedAt: daysAgo(3),
      pickedUpAt: daysAgo(2),
      pickedUpBy: "Bruno Oliveira",
    },
    {
      sender: "Shopee",
      carrier: "J&T Express",
      tracking: "SH111222333",
      status: "NOTIFIED",
      receivedAt: daysAgo(2),
    },
    {
      sender: "Riachuelo",
      carrier: "Jadlog",
      tracking: "RI444555666",
      status: "NOTIFIED",
      receivedAt: daysAgo(1),
    },
    {
      sender: "Americanas",
      carrier: "Correios",
      tracking: "AM777888999",
      status: "RECEIVED",
      receivedAt: hoursAgo(3),
    },
    {
      sender: "Kabum",
      carrier: "Transportadora Silva",
      tracking: null,
      status: "RECEIVED",
      receivedAt: hoursAgo(1),
    },
  ];

  for (let i = 0; i < parcels.length; i++) {
    const p = parcels[i];
    const unit = units[i % units.length];
    await prisma.parcel.create({
      data: {
        unitId: unit.id,
        senderName: p.sender,
        carrier: p.carrier,
        trackingCode: p.tracking,
        storageLocation: `Prateleira ${String.fromCharCode(65 + (i % 4))}-${i + 1}`,
        status: p.status,
        receivedAt: p.receivedAt,
        notifiedAt: p.status !== "RECEIVED" ? p.receivedAt : null,
        pickedUpAt: p.pickedUpAt ?? null,
        pickedUpBy: p.pickedUpBy ?? null,
        registeredBy: doorman?.id ?? null,
      },
    });
  }
  console.log(`  ✅ ${parcels.length} encomendas criadas`);

  // ── 3. VEÍCULOS ───────────────────────────────────────────────────────────
  console.log("🚗 Criando veículos...");
  const vehicles = [
    {
      plate: "ABC1D23",
      brand: "Toyota",
      model: "Corolla",
      color: "Prata",
      year: 2022,
      type: "CAR",
    },
    {
      plate: "DEF4E56",
      brand: "Honda",
      model: "Civic",
      color: "Preto",
      year: 2021,
      type: "CAR",
    },
    {
      plate: "GHI7F89",
      brand: "Volkswagen",
      model: "Gol",
      color: "Branco",
      year: 2020,
      type: "CAR",
    },
    {
      plate: "JKL2G34",
      brand: "Fiat",
      model: "Uno",
      color: "Vermelho",
      year: 2019,
      type: "CAR",
    },
    {
      plate: "MNO5H67",
      brand: "Honda",
      model: "CG 160",
      color: "Preta",
      year: 2023,
      type: "MOTORCYCLE",
    },
    {
      plate: "PQR8I90",
      brand: "Yamaha",
      model: "Factor",
      color: "Azul",
      year: 2022,
      type: "MOTORCYCLE",
    },
  ];

  for (let i = 0; i < vehicles.length; i++) {
    const v = vehicles[i];
    const unit = units[i % units.length];
    try {
      await prisma.vehicle.create({
        data: {
          unitId: unit.id,
          plate: v.plate,
          brand: v.brand,
          model: v.model,
          color: v.color,
          year: v.year,
          type: v.type,
        },
      });
    } catch {
      /* placa já existe */
    }
  }
  console.log(`  ✅ ${vehicles.length} veículos criados`);

  // ── 4. ORDENS DE SERVIÇO ──────────────────────────────────────────────────
  console.log("🔧 Criando ordens de serviço...");
  const serviceOrders = [
    {
      title: "Vazamento na cozinha",
      category: "hidráulica",
      priority: "HIGH",
      status: "COMPLETED",
      desc: "Cano sob a pia com vazamento constante",
      createdAt: daysAgo(10),
      completedAt: daysAgo(8),
      resolution: "Troca do sifão e vedação com silicone",
    },
    {
      title: "Torneira do banheiro pingando",
      category: "hidráulica",
      priority: "LOW",
      status: "COMPLETED",
      desc: "Torneira com desgaste no vedante",
      createdAt: daysAgo(7),
      completedAt: daysAgo(6),
      resolution: "Substituição do reparo interno",
    },
    {
      title: "Tomada queimada na sala",
      category: "elétrica",
      priority: "MEDIUM",
      status: "IN_PROGRESS",
      desc: "Tomada com faísca e sem funcionamento",
      createdAt: daysAgo(3),
      scheduledAt: tomorrow(8),
      assignedTo: syndic?.id,
    },
    {
      title: "Portão eletrônico com falha",
      category: "elétrica",
      priority: "URGENT",
      status: "OPEN",
      desc: "Portão abre mas não fecha corretamente",
      createdAt: daysAgo(1),
    },
    {
      title: "Lâmpada queimada corredor Bl A",
      category: "elétrica",
      priority: "LOW",
      status: "OPEN",
      desc: "Luminária do corredor bloco A piso 2 apagada",
      createdAt: hoursAgo(5),
    },
    {
      title: "Infiltração no teto da garagem",
      category: "civil",
      priority: "HIGH",
      status: "IN_PROGRESS",
      desc: "Água escorrendo pelo teto próximo à vaga 08",
      createdAt: daysAgo(5),
      scheduledAt: tomorrow(10),
    },
    {
      title: "Pintura da área de lazer",
      category: "pintura",
      priority: "LOW",
      status: "OPEN",
      desc: "Paredes desgastadas na área de lazer",
      createdAt: daysAgo(2),
    },
  ];

  for (let i = 0; i < serviceOrders.length; i++) {
    const so = serviceOrders[i];
    const unit = units[i % units.length];
    const reporter = residents[i % residents.length];
    await prisma.serviceOrder.create({
      data: {
        condominiumId: condo.id,
        unitId: unit.id,
        requestedBy: reporter?.id ?? syndic?.id,
        assignedTo: so.assignedTo ?? null,
        title: so.title,
        description: so.desc,
        category: so.category,
        priority: so.priority,
        status: so.status,
        scheduledAt: so.scheduledAt ?? null,
        completedAt: so.completedAt ?? null,
        resolution: so.resolution ?? null,
        estimatedCost:
          so.status === "COMPLETED"
            ? (Math.random() * 400 + 100).toFixed(2)
            : null,
        finalCost: so.completedAt
          ? (Math.random() * 400 + 100).toFixed(2)
          : null,
        createdAt: so.createdAt,
      },
    });
  }
  console.log(`  ✅ ${serviceOrders.length} ordens de serviço criadas`);

  // ── 5. OCORRÊNCIAS ────────────────────────────────────────────────────────
  console.log("⚠️  Criando ocorrências...");
  const occurrences = [
    {
      title: "Barulho excessivo na madrugada",
      category: "barulho",
      priority: "HIGH",
      status: "RESOLVED",
      desc: "Som alto após 23h no bloco A, unidade 03",
      createdAt: daysAgo(8),
      resolvedAt: daysAgo(7),
      resolution: "Morador notificado e situação regularizada",
    },
    {
      title: "Lixo descartado incorretamente",
      category: "limpeza",
      priority: "MEDIUM",
      status: "RESOLVED",
      desc: "Sacolas de lixo deixadas fora dos contêineres",
      createdAt: daysAgo(5),
      resolvedAt: daysAgo(4),
      resolution: "Advertência enviada e lixo recolhido",
    },
    {
      title: "Veículo ocupando vaga de outro",
      category: "segurança",
      priority: "MEDIUM",
      status: "IN_ANALYSIS",
      desc: "Carro branco sem identificação na vaga 15",
      createdAt: daysAgo(2),
    },
    {
      title: "Camera de segurança com defeito",
      category: "segurança",
      priority: "HIGH",
      status: "OPEN",
      desc: "Câmera 03 da entrada principal sem imagem",
      createdAt: daysAgo(1),
    },
    {
      title: "Pichação no muro lateral",
      category: "vandalismo",
      priority: "MEDIUM",
      status: "OPEN",
      desc: "Grafite no muro norte descoberto durante a ronda",
      createdAt: hoursAgo(6),
    },
  ];

  for (let i = 0; i < occurrences.length; i++) {
    const o = occurrences[i];
    const reporter = residents[i % residents.length];
    await prisma.occurrence.create({
      data: {
        condominiumId: condo.id,
        reportedBy: reporter?.id ?? syndic?.id,
        title: o.title,
        description: o.desc,
        category: o.category,
        priority: o.priority,
        status: o.status,
        resolvedAt: o.resolvedAt ?? null,
        resolvedBy: o.resolvedAt ? syndic?.id : null,
        resolution: o.resolution ?? null,
        createdAt: o.createdAt,
      },
    });
  }
  console.log(`  ✅ ${occurrences.length} ocorrências criadas`);

  // ── 6. CATEGORIA FINANCEIRA + COBRANÇAS ───────────────────────────────────
  console.log("💰 Criando cobranças...");

  let catCondo = await prisma.financialCategory.findFirst({
    where: { condominiumId: condo.id, name: "Condomínio Mensal" },
  });
  if (!catCondo) {
    catCondo = await prisma.financialCategory.create({
      data: {
        condominiumId: condo.id,
        name: "Condomínio Mensal",
        type: "INCOME",
      },
    });
  }

  let catFundo = await prisma.financialCategory.findFirst({
    where: { condominiumId: condo.id, name: "Fundo de Reserva" },
  });
  if (!catFundo) {
    catFundo = await prisma.financialCategory.create({
      data: {
        condominiumId: condo.id,
        name: "Fundo de Reserva",
        type: "INCOME",
      },
    });
  }

  const meses = ["2026-01", "2026-02", "2026-03"];
  let totalCharges = 0;

  for (const unit of units.slice(0, 5)) {
    for (const mes of meses) {
      const [ano, m] = mes.split("-").map(Number);
      const venc = new Date(ano, m - 1, 10); // todo mês vence dia 10
      const isPast = venc < new Date();
      const paid = isPast && Math.random() > 0.2; // 80% pagos para meses passados

      await prisma.charge.create({
        data: {
          unitId: unit.id,
          accountId: account.id,
          categoryId: catCondo.id,
          description: `Cond. Mensal ${mes}`,
          amount: 850.0,
          dueDate: venc,
          status: paid ? "PAID" : isPast ? "OVERDUE" : "PENDING",
          paidAt: paid
            ? new Date(venc.getTime() + Math.random() * 5 * 86400000)
            : null,
          paidAmount: paid ? 850.0 : null,
          referenceMonth: mes,
          createdBy: syndic?.id ?? "system",
        },
      });
      totalCharges++;
    }
  }
  console.log(`  ✅ ${totalCharges} cobranças criadas (3 meses × 5 unidades)`);

  // ── 7. TRANSAÇÕES FINANCEIRAS ─────────────────────────────────────────────
  console.log("📊 Criando transações financeiras...");
  const transactions = [
    {
      type: "INCOME",
      amount: 4250,
      desc: "Condomínio Janeiro 2026 - 5 unidades",
      dueDate: daysAgo(60),
      paidAt: daysAgo(58),
    },
    {
      type: "INCOME",
      amount: 4250,
      desc: "Condomínio Fevereiro 2026 - 5 unidades",
      dueDate: daysAgo(30),
      paidAt: daysAgo(28),
    },
    {
      type: "EXPENSE",
      amount: 1200,
      desc: "Conta de água — fevereiro",
      dueDate: daysAgo(25),
      paidAt: daysAgo(24),
    },
    {
      type: "EXPENSE",
      amount: 980,
      desc: "Conta de energia — fevereiro",
      dueDate: daysAgo(20),
      paidAt: daysAgo(19),
    },
    {
      type: "EXPENSE",
      amount: 2500,
      desc: "Folha de pagamento — fevereiro",
      dueDate: daysAgo(15),
      paidAt: daysAgo(15),
    },
    {
      type: "EXPENSE",
      amount: 350,
      desc: "Material de limpeza",
      dueDate: daysAgo(10),
      paidAt: daysAgo(9),
    },
    {
      type: "EXPENSE",
      amount: 480,
      desc: "Manutenção bomba d'água",
      dueDate: daysAgo(5),
      paidAt: daysAgo(5),
    },
    {
      type: "INCOME",
      amount: 300,
      desc: "Aluguel do salão de festas — fevereiro",
      dueDate: daysAgo(28),
      paidAt: daysAgo(27),
    },
    {
      type: "EXPENSE",
      amount: 1800,
      desc: "Seguro do condomínio — parcela 3/12",
      dueDate: daysAgo(2),
      paidAt: daysAgo(2),
    },
  ];

  for (const t of transactions) {
    await prisma.financialTransaction.create({
      data: {
        accountId: account.id,
        type: t.type,
        amount: t.amount,
        description: t.desc,
        dueDate: t.dueDate,
        paidAt: t.paidAt,
        referenceMonth: "2026-02",
        createdBy: syndic?.id ?? "system",
      },
    });
  }
  console.log(`  ✅ ${transactions.length} transações criadas`);

  // ── 8. RESERVAS DE ÁREA COMUM ─────────────────────────────────────────────
  console.log("🏊 Criando reservas de área comum...");
  const salao = await prisma.commonArea.findFirst({
    where: { condominiumId: condo.id, name: "Salão de Festas" },
  });
  const quadra = await prisma.commonArea.findFirst({
    where: { condominiumId: condo.id, name: "Quadra Poliesportiva" },
  });

  if (salao && quadra) {
    const reservations = [
      {
        areaId: salao.id,
        userId: residents[0]?.id,
        start: daysAgo(7, 18),
        end: daysAgo(7, 23),
        status: "COMPLETED",
        notes: "Aniversário da filha",
      },
      {
        areaId: salao.id,
        userId: residents[1]?.id,
        start: daysAgo(3, 16),
        end: daysAgo(3, 22),
        status: "COMPLETED",
        notes: "Confraternização",
      },
      {
        areaId: quadra.id,
        userId: residents[2]?.id,
        start: daysAgo(1, 8),
        end: daysAgo(1, 10),
        status: "COMPLETED",
        notes: "Treino de futebol",
      },
      {
        areaId: quadra.id,
        userId: residents[3]?.id,
        start: tomorrow(7),
        end: tomorrow(9),
        status: "CONFIRMED",
        notes: "Jogo com vizinhos",
      },
      {
        areaId: salao.id,
        userId: residents[4]?.id,
        start: daysFromNow(3, 17),
        end: daysFromNow(3, 22),
        status: "PENDING",
        notes: "Festa de formatura",
      },
      {
        areaId: quadra.id,
        userId: residents[0]?.id,
        start: daysFromNow(5, 8),
        end: daysFromNow(5, 10),
        status: "CONFIRMED",
        notes: "",
      },
    ];

    const unitForResident = async (userId) => {
      const cu = await prisma.condominiumUser.findFirst({
        where: { userId, condominiumId: condo.id },
      });
      return cu?.unitId ?? units[0].id;
    };

    for (const r of reservations) {
      if (!r.userId) continue;
      const unitId = await unitForResident(r.userId);
      await prisma.reservation.create({
        data: {
          commonAreaId: r.areaId,
          unitId,
          requestedBy: r.userId,
          startDate: r.start,
          endDate: r.end,
          status: r.status,
          notes: r.notes,
          approvedBy:
            r.status === "CONFIRMED" || r.status === "COMPLETED"
              ? syndic?.id
              : null,
        },
      });
    }
    console.log(`  ✅ ${reservations.length} reservas criadas`);
  } else {
    console.log("  ⚠️  Áreas comuns não encontradas, reservas puladas");
  }

  // ── 9. COMUNICADOS ───────────────────────────────────────────────────────
  console.log("📢 Criando comunicados...");
  const announcements = [
    {
      title: "Manutenção da bomba d'água — 15/03",
      content:
        "Informamos que na próxima segunda-feira, 15/03, será realizada manutenção preventiva na bomba d'água. O fornecimento poderá ser interrompido das 8h às 12h. Providenciem armazenamento prévio.",
      pinned: true,
      official: true,
    },
    {
      title: "Eleição de conselho fiscal — 20/03",
      content:
        "Convocamos todos os condôminos para a eleição dos membros do conselho fiscal no dia 20/03 às 19h no salão de festas. Sua participação é fundamental!",
      pinned: true,
      official: true,
    },
    {
      title: "Novas regras para pet no espaço comum",
      content:
        "A partir de abril, animais de estimação poderão circular nas áreas comuns somente com coleira e guia. Excrementos devem ser recolhidos pelo responsável.",
      pinned: false,
      official: true,
    },
    {
      title: "Monitoramento 24h ativado",
      content:
        "Comunicamos que o sistema de CFTV foi atualizado e o monitoramento 24 horas está ativo em todas as áreas externas do condomínio.",
      pinned: false,
      official: false,
    },
    {
      title: "Torneio de futsal — quem topa?",
      content:
        "Moradores interessados em participar de um torneio amistoso de futsal, entrem em contato pelo chat. Precisamos de no mínimo 3 times!",
      pinned: false,
      official: false,
    },
  ];

  for (const a of announcements) {
    await prisma.announcement.create({
      data: {
        condominiumId: condo.id,
        title: a.title,
        content: a.content,
        authorId: syndic?.id,
        isPinned: a.pinned,
        isOfficial: a.official,
      },
    });
  }
  console.log(`  ✅ ${announcements.length} comunicados criados`);

  // ── 10. ENQUETE ───────────────────────────────────────────────────────────
  console.log("🗳️  Criando enquete...");
  await prisma.poll.create({
    data: {
      condominiumId: condo.id,
      title: "Horário de funcionamento da quadra",
      description:
        "Queremos adequar o horário da quadra à preferência dos moradores. Vote na opção que melhor atende você!",
      options: JSON.stringify([
        { id: "1", text: "6h às 22h (horário atual)", votes: 3 },
        { id: "2", text: "6h às 23h (1h a mais à noite)", votes: 7 },
        { id: "3", text: "5h30 às 22h (30min a mais pela manhã)", votes: 2 },
      ]),
      allowMultiple: false,
      isAnonymous: true,
      endsAt: daysFromNow(7),
      createdBy: syndic?.id ?? "system",
    },
  });
  console.log("  ✅ Enquete criada");

  // ── MARKETPLACE ───────────────────────────────────────────────────────────
  const partners = [
    {
      name: "Farmácia Saúde Viva",
      description: "Farmácia com atendimento especializado e delivery",
      category: "saude",
      website: "https://saudeviva.com.br",
      phone: "(11) 98765-0001",
    },
    {
      name: "Restaurante Sabor & Arte",
      description: "Culinária caseira com opções vegetarianas",
      category: "alimentacao",
      phone: "(11) 98765-0002",
    },
    {
      name: "Academia FitLife",
      description: "Academia completa com personal trainer",
      category: "saude",
      website: "https://fitlife.com.br",
      phone: "(11) 98765-0003",
    },
  ];

  for (const p of partners) {
    const partner = await prisma.marketplacePartner.upsert({
      where: {
        id: `demo-partner-${p.category}-${p.name.substring(0, 5).toLowerCase().replace(/\s/g, "")}`,
      },
      update: {},
      create: {
        id: `demo-partner-${p.category}-${p.name.substring(0, 5).toLowerCase().replace(/\s/g, "")}`,
        ...p,
        isActive: true,
      },
    });

    await prisma.marketplaceOffer.createMany({
      data: [
        {
          partnerId: partner.id,
          condominiumId: condo.id,
          title: `10% de desconto para moradores`,
          description: `Desconto especial para moradores do condomínio ${condo.name}`,
          discount: "10%",
          couponCode: "CONDO10",
          status: "ACTIVE",
        },
      ],
      skipDuplicates: true,
    });
  }
  console.log("  ✅ Parceiros e ofertas do Marketplace criados");

  // ── 12. PETS ──────────────────────────────────────────────────────────────
  console.log("🐾 Criando pets...");
  const petData = [
    { name: "Thor", type: "Cachorro", breed: "Golden Retriever", size: "Grande", gender: "Macho", color: "Dourado", weight: 32 },
    { name: "Luna", type: "Gato", breed: "Siamês", size: "Pequeno", gender: "Fêmea", color: "Branco e cinza", weight: 4 },
    { name: "Rex", type: "Cachorro", breed: "Pastor Alemão", size: "Grande", gender: "Macho", color: "Preto e marrom", weight: 35 },
    { name: "Mimi", type: "Gato", breed: "Persa", size: "Pequeno", gender: "Fêmea", color: "Branco", weight: 3.5 },
    { name: "Pipoca", type: "Cachorro", breed: "Poodle", size: "Pequeno", gender: "Fêmea", color: "Branco", weight: 5 },
    { name: "Bob", type: "Cachorro", breed: "Bulldog Francês", size: "Médio", gender: "Macho", color: "Tigrado", weight: 12 },
    { name: "Nina", type: "Cachorro", breed: "Shih Tzu", size: "Pequeno", gender: "Fêmea", color: "Caramelo e branco", weight: 6 },
    { name: "Zé", type: "Pássaro", breed: "Calopsita", size: "Pequeno", gender: "Macho", color: "Cinza e amarelo", weight: 0.1 },
    { name: "Amora", type: "Gato", breed: "Vira-lata", size: "Médio", gender: "Fêmea", color: "Rajado", weight: 4.5 },
    { name: "Max", type: "Cachorro", breed: "Labrador", size: "Grande", gender: "Macho", color: "Chocolate", weight: 30 },
  ];
  for (let i = 0; i < petData.length; i++) {
    const unit = units[i % units.length];
    await prisma.pet.create({
      data: {
        unitId: unit.id,
        ...petData[i],
        isActive: true,
      },
    });
  }
  console.log("  ✅ 10 pets criados");

  // ── 13. ASSEMBLEIAS ───────────────────────────────────────────────────────
  console.log("🏛️  Criando assembleias...");
  const assemblyPast = await prisma.assembly.create({
    data: {
      condominiumId: condo.id,
      title: "Assembleia Geral Ordinária - 2026/1",
      description: "Aprovação de contas do 1º semestre e eleição do conselho fiscal. Local: Salão de Festas. Quórum: 50%.",
      scheduledAt: daysAgo(30, 19),
      startedAt: daysAgo(30, 19),
      finishedAt: daysAgo(30, 21),
      status: "FINISHED",
      createdBy: syndic?.id ?? "system",
    },
  });

  const assemblyFuture = await prisma.assembly.create({
    data: {
      condominiumId: condo.id,
      title: "Assembleia Extraordinária - Reforma Piscina",
      description: "Deliberação sobre proposta de reforma da piscina e vestiários. Orçamentos em anexo. Local: Salão de Festas. Quórum: 67%.",
      scheduledAt: daysFromNow(15, 19),
      status: "SCHEDULED",
      createdBy: syndic?.id ?? "system",
    },
  });

  // Itens de votação para a assembleia passada
  const votingItem1 = await prisma.assemblyVotingItem.create({
    data: {
      assemblyId: assemblyPast.id,
      title: "Aprovação de contas do 1º semestre",
      description: "Receitas R$ 245.000 | Despesas R$ 198.000 | Saldo R$ 47.000",
      options: [
        { id: "approve", text: "Aprovar" },
        { id: "reject", text: "Rejeitar" },
        { id: "abstain", text: "Abstenção" },
      ],
    },
  });
  const votingItem2 = await prisma.assemblyVotingItem.create({
    data: {
      assemblyId: assemblyPast.id,
      title: "Reajuste de 5% na taxa condominial",
      description: "Proposta de reajuste para cobrir aumento nos custos de manutenção",
      options: [
        { id: "approve", text: "Aprovar" },
        { id: "reject", text: "Rejeitar" },
        { id: "abstain", text: "Abstenção" },
      ],
    },
  });

  // Votos dos moradores
  if (residents.length > 0) {
    for (let i = 0; i < Math.min(residents.length, 5); i++) {
      await prisma.assemblyVote.createMany({
        data: [
          { votingItemId: votingItem1.id, userId: residents[i].id, optionId: "approve" },
          { votingItemId: votingItem2.id, userId: residents[i].id, optionId: i < 3 ? "approve" : "reject" },
        ],
        skipDuplicates: true,
      });
      await prisma.assemblyAttendee.create({
        data: { assemblyId: assemblyPast.id, userId: residents[i].id },
      }).catch(() => {});
    }
  }

  // Itens para assembleia futura
  await prisma.assemblyVotingItem.create({
    data: {
      assemblyId: assemblyFuture.id,
      title: "Aprovação da reforma da piscina - Orçamento A (R$ 85.000)",
      description: "Empresa AquaReforma - prazo 45 dias",
      options: [
        { id: "approve", text: "Aprovar" },
        { id: "reject", text: "Rejeitar" },
        { id: "abstain", text: "Abstenção" },
      ],
    },
  });
  await prisma.assemblyVotingItem.create({
    data: {
      assemblyId: assemblyFuture.id,
      title: "Aprovação da reforma da piscina - Orçamento B (R$ 72.000)",
      description: "Empresa PiscinaPro - prazo 60 dias",
      options: [
        { id: "approve", text: "Aprovar" },
        { id: "reject", text: "Rejeitar" },
        { id: "abstain", text: "Abstenção" },
      ],
    },
  });
  console.log("  ✅ 2 assembleias com itens de votação criadas");

  // ── 14. AGENDA DE MUDANÇAS ────────────────────────────────────────────────
  console.log("🚚 Criando agendamentos de mudança...");
  const movingData = [
    { type: "MOVE_IN", startTime: "08:00", endTime: "12:00", elevator: "Serviço", responsibleName: "João Silva", companyName: "Mudanças Rápidas", status: "COMPLETED", scheduledDate: daysAgo(10, 8) },
    { type: "MOVE_OUT", startTime: "14:00", endTime: "18:00", elevator: "Serviço", responsibleName: "Maria Santos", companyName: "TransMudanças", status: "COMPLETED", scheduledDate: daysAgo(5, 14) },
    { type: "MOVE_IN", startTime: "07:00", endTime: "11:00", elevator: "Serviço", responsibleName: "Carlos Oliveira", status: "APPROVED", scheduledDate: daysFromNow(3, 7) },
    { type: "LARGE_DELIVERY", startTime: "09:00", endTime: "10:00", elevator: "Social", responsibleName: "Ana Costa", notes: "Entrega de geladeira e máquina de lavar", status: "PENDING", scheduledDate: daysFromNow(5, 9) },
    { type: "MOVE_OUT", startTime: "08:00", endTime: "14:00", elevator: "Serviço", responsibleName: "Pedro Almeida", companyName: "MudaBem", status: "PENDING", scheduledDate: daysFromNow(7, 8) },
  ];
  for (let i = 0; i < movingData.length; i++) {
    const unit = units[i % units.length];
    await prisma.movingSchedule.create({
      data: {
        condominiumId: condo.id,
        unitId: unit.id,
        ...movingData[i],
        createdBy: syndic?.id ?? "system",
      },
    });
  }
  console.log("  ✅ 5 agendamentos de mudança criados");

  // ── 15. CONTROLE DE CHAVES ────────────────────────────────────────────────
  console.log("🔑 Criando controle de chaves...");
  const keysData = [
    { keyIdentifier: "Salão de Festas - Chave 01", description: "Chave principal do salão", location: "Portaria 1 - Quadro A", status: "AVAILABLE" },
    { keyIdentifier: "Salão de Festas - Chave 02", description: "Chave reserva do salão", location: "Portaria 1 - Quadro A", status: "BORROWED" },
    { keyIdentifier: "Piscina - Portão", description: "Chave do portão da piscina", location: "Portaria 1 - Quadro B", status: "AVAILABLE" },
    { keyIdentifier: "Academia - Principal", description: "Chave da academia", location: "Portaria 1 - Quadro B", status: "AVAILABLE" },
    { keyIdentifier: "Churrasqueira 01", description: "Chave da churrasqueira 1", location: "Portaria 1 - Quadro C", status: "BORROWED" },
    { keyIdentifier: "Churrasqueira 02", description: "Chave da churrasqueira 2", location: "Portaria 1 - Quadro C", status: "AVAILABLE" },
    { keyIdentifier: "Depósito - Manutenção", description: "Chave do depósito de materiais", location: "Portaria 2", status: "AVAILABLE" },
    { keyIdentifier: "Portão Garagem B", description: "Chave manual do portão B", location: "Portaria 2", status: "AVAILABLE" },
  ];
  for (const keyItem of keysData) {
    const key = await prisma.keyControl.create({
      data: {
        condominiumId: condo.id,
        ...keyItem,
      },
    });
    // Criar logs para chaves emprestadas
    if (keyItem.status === "BORROWED") {
      await prisma.keyControlLog.create({
        data: {
          keyId: key.id,
          action: "BORROW",
          borrowedBy: keyItem.keyIdentifier.includes("Salão") ? "Carlos - Casa 05" : "Maria - Casa 12",
          borrowedByUnit: keyItem.keyIdentifier.includes("Salão") ? "Casa 05" : "Casa 12",
          receivedBy: doorman?.id ?? "system",
          notes: "Reserva para evento no fim de semana",
        },
      });
    }
  }
  console.log("  ✅ 8 chaves cadastradas com histórico");

  // ── CÂMERAS ─────────────────────────────────────────────────────────────
  const camerasData = [
    {
      name: "Câmera Entrada Principal",
      location: "Portaria",
      brand: "Intelbras",
      model: "VIP 3230 D",
      streamUrl: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8",
      snapshotUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=250&fit=crop",
      isActive: true,
      isRecording: true,
      resolution: "1080p",
    },
    {
      name: "Câmera Garagem B1",
      location: "Garagem B1",
      brand: "Hikvision",
      model: "DS-2CD2143G2-I",
      streamUrl: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8",
      isActive: true,
      isRecording: true,
      resolution: "4K",
    },
    {
      name: "Câmera Área de Lazer",
      location: "Área de Lazer",
      brand: "Intelbras",
      model: "VIP 1230 B",
      streamUrl: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8",
      snapshotUrl: "https://images.unsplash.com/photo-1564429238961-bf8bf14bf24a?w=400&h=250&fit=crop",
      isActive: true,
      isRecording: false,
      resolution: "720p",
    },
    {
      name: "Câmera Corredor Bloco A",
      location: "Bloco A - Corredor",
      brand: "Hikvision",
      model: "DS-2CE16H0T",
      streamUrl: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8",
      isActive: true,
      isRecording: true,
      resolution: "1080p",
    },
    {
      name: "Câmera Elevador Social",
      location: "Elevador Social",
      brand: "Intelbras",
      model: "VIP 1020 B",
      streamUrl: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8",
      isActive: false,
      isRecording: false,
      resolution: "720p",
      notes: "Manutenção preventiva agendada",
    },
    {
      name: "Câmera Playground",
      location: "Playground",
      brand: "Intelbras",
      model: "VIP 3230 B",
      streamUrl: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8",
      snapshotUrl: "https://images.unsplash.com/photo-1564429238961-bf8bf14bf24a?w=400&h=250&fit=crop",
      isActive: true,
      isRecording: false,
      resolution: "1080p",
    },
  ];
  for (const camData of camerasData) {
    await prisma.camera.create({
      data: {
        condominiumId: condo.id,
        ...camData,
      },
    });
  }
  console.log("  ✅ 6 câmeras cadastradas");

  // ── RESUMO ────────────────────────────────────────────────────────────────
  console.log("\n🎉 Seed demo concluído com sucesso!\n");
  console.log("📋 Dados inseridos:");
  console.log("  🚪  6 visitantes (estados variados)");
  console.log("  📦  6 encomendas (recebidas, notificadas, retiradas)");
  console.log("  🚗  6 veículos (carros e motos)");
  console.log("  🔧  7 ordens de serviço (aberta, em andamento, concluída)");
  console.log("  ⚠️   5 ocorrências (abertas e resolvidas)");
  console.log("  💰  15 cobranças de condomínio (3 meses × 5 unidades)");
  console.log("  📊  9 transações financeiras");
  console.log("  🏊  6 reservas de área comum");
  console.log("  🛒  3 parceiros marketplace com ofertas");
  console.log("  📢  5 comunicados");
  console.log("  🗳️   1 enquete ativa");
  console.log("  🐾  10 pets (cachorros, gatos, pássaro)");
  console.log("  🏛️   2 assembleias (1 encerrada c/ votos, 1 agendada)");
  console.log("  🚚  5 agendamentos de mudança");
  console.log("  🔑  8 chaves cadastradas com histórico");
  console.log("  📹  6 câmeras de monitoramento");
}

// ── Helpers de data ───────────────────────────────────────────────────────────
function daysAgo(days, hours = 12) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hours, 0, 0, 0);
  return d;
}
function hoursAgo(h) {
  return new Date(Date.now() - h * 3600 * 1000);
}
function tomorrow(hours = 10) {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hours, 0, 0, 0);
  return d;
}
function daysFromNow(days, hours = 12) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hours, 0, 0, 0);
  return d;
}

main()
  .catch((e) => {
    console.error("\n❌ Erro no seed demo:", e.message);
    if (e.meta) console.error("   Meta:", JSON.stringify(e.meta));
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
