import { ChargeStatus, FinancialTransactionType, UserRole } from "@prisma/client";
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
    method: "equal" | "fraction";
}
type FinanceActor = {
    userId: string;
    role: UserRole;
};
export declare class FinanceService {
    private ensureChargeAccess;
    listAccounts(condominiumId: string): Promise<({
        _count: {
            charges: number;
            transactions: number;
        };
    } & {
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
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
    getAccountBalance(accountId: string, actor: FinanceActor): Promise<{
        account: {
            id: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
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
            amount: import("@prisma/client/runtime/library").Decimal;
            dueDate: Date;
            paidAt: Date | null;
            paidAmount: import("@prisma/client/runtime/library").Decimal | null;
            referenceMonth: string | null;
            gatewayId: string | null;
            gatewayStatus: string | null;
            pixQrCode: string | null;
            pixCopyPaste: string | null;
            paymentLink: string | null;
            boletoUrl: string | null;
            boletoCode: string | null;
            penaltyAmount: import("@prisma/client/runtime/library").Decimal;
            interestRate: import("@prisma/client/runtime/library").Decimal;
            createdBy: string;
            accountId: string;
            categoryId: string | null;
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
        amount: import("@prisma/client/runtime/library").Decimal;
        dueDate: Date;
        paidAt: Date | null;
        paidAmount: import("@prisma/client/runtime/library").Decimal | null;
        referenceMonth: string | null;
        gatewayId: string | null;
        gatewayStatus: string | null;
        pixQrCode: string | null;
        pixCopyPaste: string | null;
        paymentLink: string | null;
        boletoUrl: string | null;
        boletoCode: string | null;
        penaltyAmount: import("@prisma/client/runtime/library").Decimal;
        interestRate: import("@prisma/client/runtime/library").Decimal;
        createdBy: string;
        accountId: string;
        categoryId: string | null;
    }>;
    updateCharge(chargeId: string, actor: FinanceActor, data: Partial<CreateChargeDTO>): Promise<{
        status: import(".prisma/client").$Enums.ChargeStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        unitId: string;
        description: string;
        amount: import("@prisma/client/runtime/library").Decimal;
        dueDate: Date;
        paidAt: Date | null;
        paidAmount: import("@prisma/client/runtime/library").Decimal | null;
        referenceMonth: string | null;
        gatewayId: string | null;
        gatewayStatus: string | null;
        pixQrCode: string | null;
        pixCopyPaste: string | null;
        paymentLink: string | null;
        boletoUrl: string | null;
        boletoCode: string | null;
        penaltyAmount: import("@prisma/client/runtime/library").Decimal;
        interestRate: import("@prisma/client/runtime/library").Decimal;
        createdBy: string;
        accountId: string;
        categoryId: string | null;
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
        amount: import("@prisma/client/runtime/library").Decimal;
        dueDate: Date;
        paidAt: Date | null;
        paidAmount: import("@prisma/client/runtime/library").Decimal | null;
        referenceMonth: string | null;
        gatewayId: string | null;
        gatewayStatus: string | null;
        pixQrCode: string | null;
        pixCopyPaste: string | null;
        paymentLink: string | null;
        boletoUrl: string | null;
        boletoCode: string | null;
        penaltyAmount: import("@prisma/client/runtime/library").Decimal;
        interestRate: import("@prisma/client/runtime/library").Decimal;
        createdBy: string;
        accountId: string;
        categoryId: string | null;
    } | undefined>;
    getChargeById(chargeId: string): Promise<({
        unit: {
            identifier: string;
            condominiumId: string;
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
        amount: import("@prisma/client/runtime/library").Decimal;
        dueDate: Date;
        paidAt: Date | null;
        paidAmount: import("@prisma/client/runtime/library").Decimal | null;
        referenceMonth: string | null;
        gatewayId: string | null;
        gatewayStatus: string | null;
        pixQrCode: string | null;
        pixCopyPaste: string | null;
        paymentLink: string | null;
        boletoUrl: string | null;
        boletoCode: string | null;
        penaltyAmount: import("@prisma/client/runtime/library").Decimal;
        interestRate: import("@prisma/client/runtime/library").Decimal;
        createdBy: string;
        accountId: string;
        categoryId: string | null;
    }) | null>;
    forceSyncWithGateway(chargeId: string): Promise<{
        status: import(".prisma/client").$Enums.ChargeStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        unitId: string;
        description: string;
        amount: import("@prisma/client/runtime/library").Decimal;
        dueDate: Date;
        paidAt: Date | null;
        paidAmount: import("@prisma/client/runtime/library").Decimal | null;
        referenceMonth: string | null;
        gatewayId: string | null;
        gatewayStatus: string | null;
        pixQrCode: string | null;
        pixCopyPaste: string | null;
        paymentLink: string | null;
        boletoUrl: string | null;
        boletoCode: string | null;
        penaltyAmount: import("@prisma/client/runtime/library").Decimal;
        interestRate: import("@prisma/client/runtime/library").Decimal;
        createdBy: string;
        accountId: string;
        categoryId: string | null;
    }>;
    configureGateway(accountId: string, config: {
        gatewayType: string;
        gatewayKey: string;
        gatewayConfig?: any;
    }): Promise<{
        id: string;
        name: string;
        gatewayType: import(".prisma/client").$Enums.GatewayType;
    }>;
    markAsPaid(chargeId: string, actor: FinanceActor, paidAmount: number, paidAt?: Date): Promise<{
        status: import(".prisma/client").$Enums.ChargeStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        unitId: string;
        description: string;
        amount: import("@prisma/client/runtime/library").Decimal;
        dueDate: Date;
        paidAt: Date | null;
        paidAmount: import("@prisma/client/runtime/library").Decimal | null;
        referenceMonth: string | null;
        gatewayId: string | null;
        gatewayStatus: string | null;
        pixQrCode: string | null;
        pixCopyPaste: string | null;
        paymentLink: string | null;
        boletoUrl: string | null;
        boletoCode: string | null;
        penaltyAmount: import("@prisma/client/runtime/library").Decimal;
        interestRate: import("@prisma/client/runtime/library").Decimal;
        createdBy: string;
        accountId: string;
        categoryId: string | null;
    }>;
    cancelCharge(chargeId: string, actor: FinanceActor): Promise<{
        status: import(".prisma/client").$Enums.ChargeStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        unitId: string;
        description: string;
        amount: import("@prisma/client/runtime/library").Decimal;
        dueDate: Date;
        paidAt: Date | null;
        paidAmount: import("@prisma/client/runtime/library").Decimal | null;
        referenceMonth: string | null;
        gatewayId: string | null;
        gatewayStatus: string | null;
        pixQrCode: string | null;
        pixCopyPaste: string | null;
        paymentLink: string | null;
        boletoUrl: string | null;
        boletoCode: string | null;
        penaltyAmount: import("@prisma/client/runtime/library").Decimal;
        interestRate: import("@prisma/client/runtime/library").Decimal;
        createdBy: string;
        accountId: string;
        categoryId: string | null;
    }>;
    listTransactions(accountId: string, actor: FinanceActor, filters: {
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
            description: string;
            notes: string | null;
            amount: import("@prisma/client/runtime/library").Decimal;
            dueDate: Date;
            paidAt: Date | null;
            referenceMonth: string | null;
            createdBy: string;
            accountId: string;
            categoryId: string | null;
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
        description: string;
        notes: string | null;
        amount: import("@prisma/client/runtime/library").Decimal;
        dueDate: Date;
        paidAt: Date | null;
        referenceMonth: string | null;
        createdBy: string;
        accountId: string;
        categoryId: string | null;
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
        amount: import("@prisma/client/runtime/library").Decimal;
        dueDate: Date;
        paidAt: Date | null;
        paidAmount: import("@prisma/client/runtime/library").Decimal | null;
        referenceMonth: string | null;
        gatewayId: string | null;
        gatewayStatus: string | null;
        pixQrCode: string | null;
        pixCopyPaste: string | null;
        paymentLink: string | null;
        boletoUrl: string | null;
        boletoCode: string | null;
        penaltyAmount: import("@prisma/client/runtime/library").Decimal;
        interestRate: import("@prisma/client/runtime/library").Decimal;
        createdBy: string;
        accountId: string;
        categoryId: string | null;
    })[]>;
    getChargesByUnit(unitId: string, actor: FinanceActor): Promise<{
        pending: {
            status: import(".prisma/client").$Enums.ChargeStatus;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            unitId: string;
            description: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            dueDate: Date;
            paidAt: Date | null;
            paidAmount: import("@prisma/client/runtime/library").Decimal | null;
            referenceMonth: string | null;
            gatewayId: string | null;
            gatewayStatus: string | null;
            pixQrCode: string | null;
            pixCopyPaste: string | null;
            paymentLink: string | null;
            boletoUrl: string | null;
            boletoCode: string | null;
            penaltyAmount: import("@prisma/client/runtime/library").Decimal;
            interestRate: import("@prisma/client/runtime/library").Decimal;
            createdBy: string;
            accountId: string;
            categoryId: string | null;
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
    ratioChargesInstallments(data: Omit<RatioChargesDTO, "dueDate" | "referenceMonth"> & {
        firstDueDate: Date;
        installments: number;
        intervalDays: number;
    }, createdBy: string): Promise<{
        installments: number;
        totalCharges: number;
        results: {
            installment: number;
            dueDate: Date;
            count: number;
            totalAmount: number;
        }[];
    }>;
    createChargeInstallments(data: Omit<CreateChargeDTO, "dueDate"> & {
        firstDueDate: Date;
        installments: number;
        intervalDays: number;
    }, createdBy: string): Promise<{
        installments: number;
        count: number;
    }>;
    previewRatio(condominiumId: string, totalAmount: number, method: "equal" | "fraction"): Promise<{
        unitId: string;
        identifier: string;
        block: string | null;
        amount: number;
    }[]>;
}
export declare const financeService: FinanceService;
export {};
//# sourceMappingURL=finance.service.d.ts.map