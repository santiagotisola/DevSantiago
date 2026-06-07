import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { prisma } from '../../config/prisma';
import { toNumber } from '../../utils/decimal';

export class ReportService {
  async generateFinancialPdf(condominiumId: string, referenceMonth: string) {
    const condominium = await prisma.condominium.findUniqueOrThrow({
      where: { id: condominiumId }
    });

    const [incomeItems, expenseItems] = await Promise.all([
      prisma.financialTransaction.findMany({
        where: {
          account: { condominiumId },
          type: 'INCOME',
          referenceMonth,
          paidAt: { not: null },
        },
        orderBy: { paidAt: 'asc' }
      }),
      prisma.financialTransaction.findMany({
        where: {
          account: { condominiumId },
          type: 'EXPENSE',
          referenceMonth,
          paidAt: { not: null },
        },
        orderBy: { paidAt: 'asc' }
      })
    ]);

    const totalIncome = incomeItems.reduce((acc, item) => acc + toNumber(item.amount), 0);
    const totalExpense = expenseItems.reduce((acc, item) => acc + toNumber(item.amount), 0);
    const balance = totalIncome - totalExpense;

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: any[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      // Header
      doc.fontSize(20).text('Prestação de Contas', { align: 'center' });
      doc.fontSize(14).text(condominium.name, { align: 'center' });
      doc.fontSize(10).text(`Período: ${referenceMonth}`, { align: 'center' });
      if (condominium.cnpj) doc.text(`CNPJ: ${condominium.cnpj}`, { align: 'center' });
      doc.moveDown(2);

      // Income Section
      doc.fontSize(14).fillColor('#10b981').text('RECEITAS', { underline: true });
      doc.moveDown();
      doc.fontSize(10).fillColor('#000000');
      
      incomeItems.forEach(item => {
        const date = item.paidAt?.toLocaleDateString('pt-BR') || '';
        doc.text(`${date} - ${item.description}`, { continued: true });
        doc.text(`R$ ${toNumber(item.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, { align: 'right' });
      });
      
      doc.moveDown();
      doc.fontSize(11).font('Helvetica-Bold').text(`TOTAL RECEITAS:`, { continued: true });
      doc.text(`R$ ${totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, { align: 'right' });
      doc.font('Helvetica');
      doc.moveDown(2);

      // Expense Section
      doc.fontSize(14).fillColor('#ef4444').text('DESPESAS', { underline: true });
      doc.moveDown();
      doc.fontSize(10).fillColor('#000000');
      
      expenseItems.forEach(item => {
        const date = item.paidAt?.toLocaleDateString('pt-BR') || '';
        doc.text(`${date} - ${item.description}`, { continued: true });
        doc.text(`R$ ${toNumber(item.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, { align: 'right' });
      });

      doc.moveDown();
      doc.fontSize(11).font('Helvetica-Bold').text(`TOTAL DESPESAS:`, { continued: true });
      doc.text(`R$ ${totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, { align: 'right' });
      doc.font('Helvetica');
      doc.moveDown(2);

      // Summary
      doc.rect(doc.x, doc.y, 500, 40).stroke();
      doc.fontSize(14).text('SALDO DO PERÍODO:', doc.x + 10, doc.y + 12, { continued: true });
      doc.fillColor(balance >= 0 ? '#10b981' : '#ef4444').text(`R$ ${balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, { align: 'right' });

      // Footer
      doc.fontSize(8).fillColor('#94a3b8').text(
        `Documento gerado em ${new Date().toLocaleString('pt-BR')} por CondoSync.`,
        50, 
        doc.page.height - 50,
        { align: 'center' }
      );

      doc.end();
    });
  }

  // ─── Excel Exports ──────────────────────────────────────────────

  async generateFinancialExcel(condominiumId: string, startDate: Date, endDate: Date): Promise<Buffer> {
    const transactions = await prisma.financialTransaction.findMany({
      where: {
        account: { condominiumId },
        createdAt: { gte: startDate, lte: endDate },
      },
      orderBy: { createdAt: 'desc' },
      include: { category: true },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'CondoSync';
    workbook.created = new Date();

    // Sheet 1: Transações
    const sheet = workbook.addWorksheet('Transações');
    sheet.columns = [
      { header: 'Data', key: 'date', width: 15 },
      { header: 'Tipo', key: 'type', width: 12 },
      { header: 'Categoria', key: 'category', width: 20 },
      { header: 'Descrição', key: 'description', width: 40 },
      { header: 'Valor (R$)', key: 'amount', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
    ];

    // Style header row
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    transactions.forEach(t => {
      sheet.addRow({
        date: t.paidAt?.toLocaleDateString('pt-BR') || t.createdAt.toLocaleDateString('pt-BR'),
        type: t.type === 'INCOME' ? 'Receita' : 'Despesa',
        category: t.category?.name || '-',
        description: t.description,
        amount: toNumber(t.amount),
        status: t.paidAt ? 'Pago' : 'Pendente',
      });
    });

    // Sheet 2: Resumo
    const summarySheet = workbook.addWorksheet('Resumo');
    const incomeTotal = transactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + toNumber(t.amount), 0);
    const expenseTotal = transactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + toNumber(t.amount), 0);

    summarySheet.columns = [
      { header: 'Indicador', key: 'label', width: 30 },
      { header: 'Valor (R$)', key: 'value', width: 20 },
    ];
    summarySheet.getRow(1).font = { bold: true };
    summarySheet.addRow({ label: 'Total de Receitas', value: incomeTotal });
    summarySheet.addRow({ label: 'Total de Despesas', value: expenseTotal });
    summarySheet.addRow({ label: 'Saldo', value: incomeTotal - expenseTotal });
    summarySheet.addRow({ label: 'Total de Transações', value: transactions.length });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async generateResidentsExcel(condominiumId: string): Promise<Buffer> {
    const residents = await prisma.condominiumUser.findMany({
      where: { condominiumId, isActive: true },
      include: {
        user: { select: { name: true, email: true, phone: true, cpf: true } },
        unit: { select: { identifier: true, block: true } },
      },
      orderBy: { joinedAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'CondoSync';
    const sheet = workbook.addWorksheet('Moradores');
    sheet.columns = [
      { header: 'Nome', key: 'name', width: 30 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Telefone', key: 'phone', width: 18 },
      { header: 'CPF', key: 'cpf', width: 16 },
      { header: 'Unidade', key: 'unit', width: 15 },
      { header: 'Bloco', key: 'block', width: 10 },
      { header: 'Perfil', key: 'role', width: 15 },
      { header: 'Desde', key: 'joinedAt', width: 12 },
    ];
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    residents.forEach(r => {
      sheet.addRow({
        name: r.user.name,
        email: r.user.email,
        phone: r.user.phone || '-',
        cpf: r.user.cpf || '-',
        unit: r.unit?.identifier || '-',
        block: r.unit?.block || '-',
        role: r.role,
        joinedAt: r.joinedAt.toLocaleDateString('pt-BR'),
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async generateVisitorsExcel(condominiumId: string, startDate: Date, endDate: Date): Promise<Buffer> {
    const visitors = await prisma.visitor.findMany({
      where: {
        unit: { condominiumId },
        createdAt: { gte: startDate, lte: endDate },
      },
      include: { unit: { select: { identifier: true, block: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'CondoSync';
    const sheet = workbook.addWorksheet('Visitantes');
    sheet.columns = [
      { header: 'Nome', key: 'name', width: 25 },
      { header: 'Documento', key: 'document', width: 18 },
      { header: 'Unidade', key: 'unit', width: 12 },
      { header: 'Bloco', key: 'block', width: 10 },
      { header: 'Motivo', key: 'reason', width: 25 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Entrada', key: 'entryAt', width: 18 },
      { header: 'Saída', key: 'exitAt', width: 18 },
      { header: 'Data Registro', key: 'createdAt', width: 15 },
    ];
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    visitors.forEach(v => {
      sheet.addRow({
        name: v.name,
        document: v.document || '-',
        unit: v.unit.identifier,
        block: v.unit.block || '-',
        reason: v.reason || '-',
        status: v.status,
        entryAt: v.entryAt?.toLocaleString('pt-BR') || '-',
        exitAt: v.exitAt?.toLocaleString('pt-BR') || '-',
        createdAt: v.createdAt.toLocaleDateString('pt-BR'),
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async generateMaintenanceExcel(condominiumId: string, startDate: Date, endDate: Date): Promise<Buffer> {
    const orders = await prisma.serviceOrder.findMany({
      where: {
        condominiumId,
        createdAt: { gte: startDate, lte: endDate },
      },
      include: { unit: { select: { identifier: true, block: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'CondoSync';
    const sheet = workbook.addWorksheet('Manutenção');
    sheet.columns = [
      { header: 'Título', key: 'title', width: 30 },
      { header: 'Categoria', key: 'category', width: 18 },
      { header: 'Prioridade', key: 'priority', width: 12 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Unidade', key: 'unit', width: 12 },
      { header: 'Local', key: 'location', width: 20 },
      { header: 'Custo Final (R$)', key: 'finalCost', width: 16 },
      { header: 'Aberta em', key: 'createdAt', width: 15 },
      { header: 'Concluída em', key: 'completedAt', width: 15 },
    ];
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    orders.forEach(o => {
      sheet.addRow({
        title: o.title,
        category: o.category,
        priority: o.priority,
        status: o.status,
        unit: o.unit?.identifier || 'Área comum',
        location: o.location || '-',
        finalCost: o.finalCost ? toNumber(o.finalCost) : '-',
        createdAt: o.createdAt.toLocaleDateString('pt-BR'),
        completedAt: o.completedAt?.toLocaleDateString('pt-BR') || '-',
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async generateDelinquencyExcel(condominiumId: string): Promise<Buffer> {
    const overdueCharges = await prisma.charge.findMany({
      where: {
        unit: { condominiumId },
        status: { in: ['PENDING', 'OVERDUE'] },
        dueDate: { lt: new Date() },
      },
      include: {
        unit: {
          select: {
            identifier: true,
            block: true,
            residents: {
              where: { isActive: true },
              include: { user: { select: { name: true, email: true, phone: true } } },
              take: 1,
            },
          },
        },
        category: true,
      },
      orderBy: { dueDate: 'asc' },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'CondoSync';
    const sheet = workbook.addWorksheet('Inadimplência');
    sheet.columns = [
      { header: 'Unidade', key: 'unit', width: 12 },
      { header: 'Bloco', key: 'block', width: 10 },
      { header: 'Morador', key: 'resident', width: 25 },
      { header: 'Contato', key: 'contact', width: 20 },
      { header: 'Descrição', key: 'description', width: 30 },
      { header: 'Valor (R$)', key: 'amount', width: 15 },
      { header: 'Vencimento', key: 'dueDate', width: 13 },
      { header: 'Dias em Atraso', key: 'daysOverdue', width: 15 },
      { header: 'Status', key: 'status', width: 12 },
    ];
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    overdueCharges.forEach(c => {
      const resident = c.unit.residents[0]?.user;
      const daysOverdue = Math.floor((Date.now() - c.dueDate.getTime()) / (1000 * 60 * 60 * 24));
      sheet.addRow({
        unit: c.unit.identifier,
        block: c.unit.block || '-',
        resident: resident?.name || '-',
        contact: resident?.phone || resident?.email || '-',
        description: c.description,
        amount: toNumber(c.amount),
        dueDate: c.dueDate.toLocaleDateString('pt-BR'),
        daysOverdue,
        status: c.status,
      });
    });

    // Summary at the bottom
    const totalOverdue = overdueCharges.reduce((sum, c) => sum + toNumber(c.amount), 0);
    sheet.addRow({});
    sheet.addRow({ unit: 'TOTAL', amount: totalOverdue, daysOverdue: `${overdueCharges.length} cobranças` });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}

export const reportService = new ReportService();
