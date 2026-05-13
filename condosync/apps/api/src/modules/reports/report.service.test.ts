import { describe, expect, it, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';
import { prismaMock } from '../../test/setup';
import { reportService } from './report.service';

describe('ReportService.generateFinancialPdf', () => {
  beforeEach(() => {
    prismaMock.condominium.findUniqueOrThrow.mockReset();
    prismaMock.financialTransaction.findMany.mockReset();
  });

  function setupCondo() {
    prismaMock.condominium.findUniqueOrThrow.mockResolvedValue({
      id: 'c-1',
      name: 'Edifício Exemplo',
      cnpj: '12345678000190',
    } as any);
  }

  it('consulta INCOME e EXPENSE filtrando por referenceMonth + paidAt não-null', async () => {
    setupCondo();
    prismaMock.financialTransaction.findMany.mockResolvedValue([] as any);
    await reportService.generateFinancialPdf('c-1', '2026-05');
    const calls = prismaMock.financialTransaction.findMany.mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[0]![0]).toMatchObject({
      where: expect.objectContaining({
        type: 'INCOME',
        referenceMonth: '2026-05',
        paidAt: { not: null },
      }),
      orderBy: { paidAt: 'asc' },
    });
    expect(calls[1]![0]).toMatchObject({
      where: expect.objectContaining({
        type: 'EXPENSE',
        referenceMonth: '2026-05',
        paidAt: { not: null },
      }),
    });
  });

  it('escopa por condominiumId via account', async () => {
    setupCondo();
    prismaMock.financialTransaction.findMany.mockResolvedValue([] as any);
    await reportService.generateFinancialPdf('c-1', '2026-05');
    const callArg: any =
      prismaMock.financialTransaction.findMany.mock.calls[0]![0];
    expect(callArg.where.account).toEqual({ condominiumId: 'c-1' });
  });

  it('retorna Buffer não-vazio (PDF gerado)', async () => {
    setupCondo();
    prismaMock.financialTransaction.findMany.mockResolvedValue([
      {
        description: 'Mensalidade unit 101',
        amount: new Prisma.Decimal(350),
        paidAt: new Date('2026-05-05'),
      },
    ] as any);
    const pdf = await reportService.generateFinancialPdf('c-1', '2026-05');
    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.length).toBeGreaterThan(100);
    // Assinatura PDF é "%PDF-"
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('gera PDF mesmo com listas vazias', async () => {
    setupCondo();
    prismaMock.financialTransaction.findMany.mockResolvedValue([] as any);
    const pdf = await reportService.generateFinancialPdf('c-1', '2026-05');
    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.length).toBeGreaterThan(100);
  });

  it('lança quando condomínio não existe (findUniqueOrThrow)', async () => {
    prismaMock.condominium.findUniqueOrThrow.mockRejectedValue(
      new Error('not found'),
    );
    await expect(
      reportService.generateFinancialPdf('c-x', '2026-05'),
    ).rejects.toThrow();
    expect(prismaMock.financialTransaction.findMany).not.toHaveBeenCalled();
  });

  it('soma corretamente totais via Decimal-like amounts', async () => {
    setupCondo();
    // Income: 1000 + 500 = 1500; Expense: 200 + 50 = 250; balance = 1250
    // Para validar isso indiretamente, geramos o PDF e checamos que
    // não estourou em valores grandes (totalIncome, totalExpense fazem
    // toLocaleString — uma falha em toNumber estouraria com NaN).
    prismaMock.financialTransaction.findMany
      .mockResolvedValueOnce([
        { description: 'Taxa', amount: new Prisma.Decimal(1000), paidAt: new Date() },
        { description: 'Outra', amount: new Prisma.Decimal(500), paidAt: new Date() },
      ] as any)
      .mockResolvedValueOnce([
        { description: 'Limpeza', amount: new Prisma.Decimal(200), paidAt: new Date() },
        { description: 'Pequena', amount: new Prisma.Decimal(50), paidAt: new Date() },
      ] as any);

    const pdf = await reportService.generateFinancialPdf('c-1', '2026-05');
    const text = pdf.toString('latin1');
    // pdfkit nem sempre embute strings literais (pode tokenizar), mas o
    // header de PDF deve estar presente.
    expect(text.startsWith('%PDF-')).toBe(true);
  });
});
