import { ChargeStatus, FinancialTransactionType } from '@prisma/client';
export interface CreateChargeDTO {
    unitId: string;
    accountId: string;
    categoryId?: string;
    description: string;
    amount: number;
    dueDate: Date;
    referenceMonth?: string;
    interestRate?: number;
    penaltyAmount?: number;
}
export interface CreateTransactionDTO {
    accountId: string;
    categoryId?: string;
    type: FinancialTransactionType;
    amount: number;
    description: string;
    dueDate: Date;
    paidAt?: Date;
    referenceMonth?: string;
    receiptUrl?: string;
    notes?: string;
}
export interface RatioChargesDTO {
    condominiumId: string;
    accountId: string;
    categoryId?: string;
    description: string;
    totalAmount: number;
    dueDate: Date;
    referenceMonth: string;
    method: 'equal' | 'fraction';
}
export declare class FinanceService {
    listAccounts(condominiumId: string): Promise<({
        _count: {
            charges: number;
            transactions: number;
        };
    } & {
        id: string;
        createdAt: Date;
        name: string;
        isActive: boolean;
        updatedAt: Date;
        condominiumId: string;
        bankName: string | null;
        agency: string | null;
        accountNumber: string | null;
        balance: import("@prisma/client/runtime/library").Decimal;
        gatewayType: import(".prisma/client").$Enums.GatewayType;
        gatewayKey: string | null;
        gatewayConfig: import("@prisma/client/runtime/library").JsonValue | null;
    })[]>;
    getAccountBalance(accountId: string): Promise<{
        account: {
            id: string;
            createdAt: Date;
            name: string;
            isActive: boolean;
            updatedAt: Date;
            condominiumId: string;
            bankName: string | null;
            agency: string | null;
            accountNumber: string | null;
            balance: import("@prisma/client/runtime/library").Decimal;
            gatewayType: import(".prisma/client").$Enums.GatewayType;
            gatewayKey: string | null;
            gatewayConfig: import("@prisma/client/runtime/library").JsonValue | null;
        };
        balance: number;
        totalIncome: number;
        totalExpense: number;
    }>;
    listCharges(condominiumId: string, filters: {
        unitId?: string;
        status?: ChargeStatus;
        referenceMonth?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        charges: ({
            unit: {
                identifier: string;
                block: string | null;
            };
            category: {
                name: string;
            } | null;
        } & {
            status: import(".prisma/client").$Enums.ChargeStatus;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            unitId: string;
            description: string;
            createdBy: string;
            dueDate: Date;
            gatewayId: string | null;
            gatewayStatus: string | null;
            paymentLink: string | null;
            boletoUrl: string | null;
            boletoCode: string | null;
            pixQrCode: string | null;
            pixCopyPaste: string | null;
            accountId: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            referenceMonth: string | null;
            categoryId: string | null;
            paidAt: Date | null;
            paidAmount: import("@prisma/client/runtime/library").Decimal | null;
            penaltyAmount: import("@prisma/client/runtime/library").Decimal;
            interestRate: import("@prisma/client/runtime/library").Decimal;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    createCharge(data: CreateChargeDTO, createdBy: string): Promise<{
        unit: {
            identifier: string;
            block: string | null;
        };
    } & {
        status: import(".prisma/client").$Enums.ChargeStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        unitId: string;
        description: string;
        createdBy: string;
        dueDate: Date;
        gatewayId: string | null;
        gatewayStatus: string | null;
        paymentLink: string | null;
        boletoUrl: string | null;
        boletoCode: string | null;
        pixQrCode: string | null;
        pixCopyPaste: string | null;
        accountId: string;
        amount: import("@prisma/client/runtime/library").Decimal;
        referenceMonth: string | null;
        categoryId: string | null;
        paidAt: Date | null;
        paidAmount: import("@prisma/client/runtime/library").Decimal | null;
        penaltyAmount: import("@prisma/client/runtime/library").Decimal;
        interestRate: import("@prisma/client/runtime/library").Decimal;
    }>;
    updateCharge(chargeId: string, data: Partial<CreateChargeDTO>): Promise<{
        status: import(".prisma/client").$Enums.ChargeStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        unitId: string;
        description: string;
        createdBy: string;
        dueDate: Date;
        gatewayId: string | null;
        gatewayStatus: string | null;
        paymentLink: string | null;
        boletoUrl: string | null;
        boletoCode: string | null;
        pixQrCode: string | null;
        pixCopyPaste: string | null;
        accountId: string;
        amount: import("@prisma/client/runtime/library").Decimal;
        referenceMonth: string | null;
        categoryId: string | null;
        paidAt: Date | null;
        paidAmount: import("@prisma/client/runtime/library").Decimal | null;
        penaltyAmount: import("@prisma/client/runtime/library").Decimal;
        interestRate: import("@prisma/client/runtime/library").Decimal;
    }>;
    ratioCharges(data: RatioChargesDTO, createdBy: string): Promise<{
        count: number;
        totalAmount: number;
    }>;
    syncChargeWithGateway(chargeId: string): Promise<{
        status: import(".prisma/client").$Enums.ChargeStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        unitId: string;
        description: string;
        createdBy: string;
        dueDate: Date;
        gatewayId: string | null;
        gatewayStatus: string | null;
        paymentLink: string | null;
        boletoUrl: string | null;
        boletoCode: string | null;
        pixQrCode: string | null;
        pixCopyPaste: string | null;
        accountId: string;
        amount: import("@prisma/client/runtime/library").Decimal;
        referenceMonth: string | null;
        categoryId: string | null;
        paidAt: Date | null;
        paidAmount: import("@prisma/client/runtime/library").Decimal | null;
        penaltyAmount: import("@prisma/client/runtime/library").Decimal;
        interestRate: import("@prisma/client/runtime/library").Decimal;
    } | undefined>;
    markAsPaid(chargeId: string, paidAmount: number, paidAt?: Date): Promise<{
        status: import(".prisma/client").$Enums.ChargeStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        unitId: string;
        description: string;
        createdBy: string;
        dueDate: Date;
        gatewayId: string | null;
        gatewayStatus: string | null;
        paymentLink: string | null;
        boletoUrl: string | null;
        boletoCode: string | null;
        pixQrCode: string | null;
        pixCopyPaste: string | null;
        accountId: string;
        amount: import("@prisma/client/runtime/library").Decimal;
        referenceMonth: string | null;
        categoryId: string | null;
        paidAt: Date | null;
        paidAmount: import("@prisma/client/runtime/library").Decimal | null;
        penaltyAmount: import("@prisma/client/runtime/library").Decimal;
        interestRate: import("@prisma/client/runtime/library").Decimal;
    }>;
    cancelCharge(chargeId: string): Promise<{
        status: import(".prisma/client").$Enums.ChargeStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        unitId: string;
        description: string;
        createdBy: string;
        dueDate: Date;
        gatewayId: string | null;
        gatewayStatus: string | null;
        paymentLink: string | null;
        boletoUrl: string | null;
        boletoCode: string | null;
        pixQrCode: string | null;
        pixCopyPaste: string | null;
        accountId: string;
        amount: import("@prisma/client/runtime/library").Decimal;
        referenceMonth: string | null;
        categoryId: string | null;
        paidAt: Date | null;
        paidAmount: import("@prisma/client/runtime/library").Decimal | null;
        penaltyAmount: import("@prisma/client/runtime/library").Decimal;
        interestRate: import("@prisma/client/runtime/library").Decimal;
    }>;
    listTransactions(accountId: string, filters: {
        type?: FinancialTransactionType;
        referenceMonth?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        transactions: ({
            category: {
                name: string;
            } | null;
        } & {
            type: import(".prisma/client").$Enums.FinancialTransactionType;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            notes: string | null;
            description: string;
            createdBy: string;
            dueDate: Date;
            accountId: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            referenceMonth: string | null;
            categoryId: string | null;
            paidAt: Date | null;
            receiptUrl: string | null;
            chargeId: string | null;
        })[];
        total: number;
        page: number;
        limit: number;
    }>;
    createTransaction(data: CreateTransactionDTO, createdBy: string): Promise<{
        type: import(".prisma/client").$Enums.FinancialTransactionType;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        notes: string | null;
        description: string;
        createdBy: string;
        dueDate: Date;
        accountId: string;
        amount: import("@prisma/client/runtime/library").Decimal;
        referenceMonth: string | null;
        categoryId: string | null;
        paidAt: Date | null;
        receiptUrl: string | null;
        chargeId: string | null;
    }>;
    getMonthlyBalance(condominiumId: string, year: number): Promise<{
        month: string;
        income: number;
        expense: number;
        charged: number;
        paid: number;
        overdueCount: number;
        balance: number;
    }[]>;
    getDefaulters(condominiumId: string): Promise<({
        unit: {
            identifier: string;
            block: string | null;
        };
    } & {
        status: import(".prisma/client").$Enums.ChargeStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        unitId: string;
        description: string;
        createdBy: string;
        dueDate: Date;
        gatewayId: string | null;
        gatewayStatus: string | null;
        paymentLink: string | null;
        boletoUrl: string | null;
        boletoCode: string | null;
        pixQrCode: string | null;
        pixCopyPaste: string | null;
        accountId: string;
        amount: import("@prisma/client/runtime/library").Decimal;
        referenceMonth: string | null;
        categoryId: string | null;
        paidAt: Date | null;
        paidAmount: import("@prisma/client/runtime/library").Decimal | null;
        penaltyAmount: import("@prisma/client/runtime/library").Decimal;
        interestRate: import("@prisma/client/runtime/library").Decimal;
    })[]>;
    getChargesByUnit(unitId: string): Promise<{
        pending: {
            status: import(".prisma/client").$Enums.ChargeStatus;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            unitId: string;
            description: string;
            createdBy: string;
            dueDate: Date;
            gatewayId: string | null;
            gatewayStatus: string | null;
            paymentLink: string | null;
            boletoUrl: string | null;
            boletoCode: string | null;
            pixQrCode: string | null;
            pixCopyPaste: string | null;
            accountId: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            referenceMonth: string | null;
            categoryId: string | null;
            paidAt: Date | null;
            paidAmount: import("@prisma/client/runtime/library").Decimal | null;
            penaltyAmount: import("@prisma/client/runtime/library").Decimal;
            interestRate: import("@prisma/client/runtime/library").Decimal;
        }[];
        total: number;
    }>;
    getFinancialForecast(condominiumId: string): Promise<{
        averageExpense: number;
        expectedRevenue: number;
        suggestedReserve: number;
        forecastBalance: number;
        safetyMargin: number;
    }>;
}
export declare const financeService: FinanceService;
//# sourceMappingURL=finance.service.d.ts.map