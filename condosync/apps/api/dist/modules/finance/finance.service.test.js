"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const finance_service_1 = require("./finance.service");
const setup_1 = require("../../test/setup");
const client_1 = require("@prisma/client");
const library_1 = require("@prisma/client/runtime/library");
(0, vitest_1.describe)('FinanceService', () => {
    console.log('DEBUG: ChargeStatus =', client_1.ChargeStatus);
    (0, vitest_1.describe)('listAccounts', () => {
        (0, vitest_1.it)('should return a list of active accounts for a condominium', async () => {
            const mockAccounts = [
                { id: '1', name: 'Conta Corrente', condominiumId: 'condo-1', isActive: true },
                { id: '2', name: 'Fundo de Reserva', condominiumId: 'condo-1', isActive: true },
            ];
            // @ts-ignore - simplificação do mock
            setup_1.prismaMock.financialAccount.findMany.mockResolvedValue(mockAccounts);
            const result = await finance_service_1.financeService.listAccounts('condo-1');
            (0, vitest_1.expect)(result).toEqual(mockAccounts);
            (0, vitest_1.expect)(setup_1.prismaMock.financialAccount.findMany).toHaveBeenCalledWith({
                where: { condominiumId: 'condo-1', isActive: true },
                include: { _count: { select: { transactions: true, charges: true } } },
            });
        });
    });
    (0, vitest_1.describe)('ratioCharges', () => {
        (0, vitest_1.it)('should create equal charges for all occupied units', async () => {
            const mockUnits = [
                { id: 'u1', identifier: '101', fraction: new library_1.Decimal(1.0), status: 'OCCUPIED' },
                { id: 'u2', identifier: '102', fraction: new library_1.Decimal(1.0), status: 'OCCUPIED' },
            ];
            // @ts-ignore
            setup_1.prismaMock.unit.findMany.mockResolvedValue(mockUnits);
            setup_1.prismaMock.charge.createMany.mockResolvedValue({ count: 2 });
            const dto = {
                condominiumId: 'condo-1',
                accountId: 'acc-1',
                description: 'Taxa Condominial',
                totalAmount: 1000,
                dueDate: new Date(),
                referenceMonth: '2024-03',
                method: 'equal',
            };
            const result = await finance_service_1.financeService.ratioCharges(dto, 'user-1');
            (0, vitest_1.expect)(result.count).toBe(2);
            (0, vitest_1.expect)(result.totalAmount).toBe(1000);
            (0, vitest_1.expect)(setup_1.prismaMock.charge.createMany).toHaveBeenCalledWith({
                data: vitest_1.expect.arrayContaining([
                    vitest_1.expect.objectContaining({ unitId: 'u1', amount: 500 }),
                    vitest_1.expect.objectContaining({ unitId: 'u2', amount: 500 }),
                ]),
            });
        });
        (0, vitest_1.it)('should create proportional charges based on unit fraction', async () => {
            const mockUnits = [
                { id: 'u1', identifier: '101', fraction: new library_1.Decimal(0.6), status: 'OCCUPIED' },
                { id: 'u2', identifier: '102', fraction: new library_1.Decimal(0.4), status: 'OCCUPIED' },
            ];
            // @ts-ignore
            setup_1.prismaMock.unit.findMany.mockResolvedValue(mockUnits);
            setup_1.prismaMock.charge.createMany.mockResolvedValue({ count: 2 });
            const dto = {
                condominiumId: 'condo-1',
                accountId: 'acc-1',
                description: 'Taxa Condominial',
                totalAmount: 1000,
                dueDate: new Date(),
                referenceMonth: '2024-03',
                method: 'fraction',
            };
            const result = await finance_service_1.financeService.ratioCharges(dto, 'user-1');
            (0, vitest_1.expect)(result.count).toBe(2);
            (0, vitest_1.expect)(setup_1.prismaMock.charge.createMany).toHaveBeenCalledWith({
                data: vitest_1.expect.arrayContaining([
                    vitest_1.expect.objectContaining({ unitId: 'u1', amount: 600 }),
                    vitest_1.expect.objectContaining({ unitId: 'u2', amount: 400 }),
                ]),
            });
        });
        (0, vitest_1.it)('should throw error if no occupied units found', async () => {
            setup_1.prismaMock.unit.findMany.mockResolvedValue([]);
            const dto = {
                condominiumId: 'condo-1',
                accountId: 'acc-1',
                description: 'Taxa Condominial',
                totalAmount: 1000,
                dueDate: new Date(),
                referenceMonth: '2024-03',
                method: 'equal',
            };
            await (0, vitest_1.expect)(finance_service_1.financeService.ratioCharges(dto, 'user-1')).rejects.toThrow('Nenhuma unidade ocupada encontrada');
        });
    });
});
//# sourceMappingURL=finance.service.test.js.map