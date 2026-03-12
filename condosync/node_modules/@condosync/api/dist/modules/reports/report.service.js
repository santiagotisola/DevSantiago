"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportService = exports.ReportService = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
const prisma_1 = require("../../config/prisma");
const decimal_1 = require("../../utils/decimal");
class ReportService {
    async generateFinancialPdf(condominiumId, referenceMonth) {
        const condominium = await prisma_1.prisma.condominium.findUniqueOrThrow({
            where: { id: condominiumId }
        });
        const [incomeItems, expenseItems] = await Promise.all([
            prisma_1.prisma.financialTransaction.findMany({
                where: {
                    account: { condominiumId },
                    type: 'INCOME',
                    referenceMonth,
                    paidAt: { not: null },
                },
                orderBy: { paidAt: 'asc' }
            }),
            prisma_1.prisma.financialTransaction.findMany({
                where: {
                    account: { condominiumId },
                    type: 'EXPENSE',
                    referenceMonth,
                    paidAt: { not: null },
                },
                orderBy: { paidAt: 'asc' }
            })
        ]);
        const totalIncome = incomeItems.reduce((acc, item) => acc + (0, decimal_1.toNumber)(item.amount), 0);
        const totalExpense = expenseItems.reduce((acc, item) => acc + (0, decimal_1.toNumber)(item.amount), 0);
        const balance = totalIncome - totalExpense;
        return new Promise((resolve, reject) => {
            const doc = new pdfkit_1.default({ margin: 50 });
            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', (err) => reject(err));
            // Header
            doc.fontSize(20).text('Prestação de Contas', { align: 'center' });
            doc.fontSize(14).text(condominium.name, { align: 'center' });
            doc.fontSize(10).text(`Período: ${referenceMonth}`, { align: 'center' });
            if (condominium.cnpj)
                doc.text(`CNPJ: ${condominium.cnpj}`, { align: 'center' });
            doc.moveDown(2);
            // Income Section
            doc.fontSize(14).fillColor('#10b981').text('RECEITAS', { underline: true });
            doc.moveDown();
            doc.fontSize(10).fillColor('#000000');
            incomeItems.forEach(item => {
                const date = item.paidAt?.toLocaleDateString('pt-BR') || '';
                doc.text(`${date} - ${item.description}`, { continued: true });
                doc.text(`R$ ${(0, decimal_1.toNumber)(item.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, { align: 'right' });
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
                doc.text(`R$ ${(0, decimal_1.toNumber)(item.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, { align: 'right' });
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
            doc.fontSize(8).fillColor('#94a3b8').text(`Documento gerado em ${new Date().toLocaleString('pt-BR')} por CondoSync.`, 50, doc.page.height - 50, { align: 'center' });
            doc.end();
        });
    }
}
exports.ReportService = ReportService;
exports.reportService = new ReportService();
//# sourceMappingURL=report.service.js.map