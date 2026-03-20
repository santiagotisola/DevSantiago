"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const finance_service_1 = require("./finance.service");
const auth_1 = require("../../middleware/auth");
const validateRequest_1 = require("../../utils/validateRequest");
const finance_validation_1 = require("./finance.validation");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.use((0, auth_1.authorize)("CONDOMINIUM_ADMIN", "SYNDIC", "COUNCIL_MEMBER", "SUPER_ADMIN", "RESIDENT"));
// ─── Contas
router.get("/accounts/:condominiumId", async (req, res) => {
    const accounts = await finance_service_1.financeService.listAccounts(req.params.condominiumId);
    res.json({ success: true, data: { accounts } });
});
router.get("/accounts/:accountId/balance", async (req, res) => {
    const data = await finance_service_1.financeService.getAccountBalance(req.params.accountId);
    res.json({ success: true, data });
});
// Cobranças
router.get("/charges/:condominiumId", async (req, res) => {
    const data = await finance_service_1.financeService.listCharges(req.params.condominiumId, {
        unitId: req.query.unitId,
        referenceMonth: req.query.referenceMonth,
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
    });
    res.json({ success: true, data });
});
router.post("/charges", (0, auth_1.authorize)("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"), async (req, res) => {
    const data = (0, validateRequest_1.validateRequest)(finance_validation_1.createChargeSchema, req.body);
    const charge = await finance_service_1.financeService.createCharge({ ...data, dueDate: new Date(data.dueDate) }, req.user.userId);
    res.status(201).json({ success: true, data: { charge } });
});
router.patch("/charges/:id", (0, auth_1.authorize)("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"), async (req, res) => {
    const data = (0, validateRequest_1.validateRequest)(finance_validation_1.updateChargeSchema, req.body);
    const charge = await finance_service_1.financeService.updateCharge(req.params.id, {
        ...data,
        ...(data.dueDate && { dueDate: new Date(data.dueDate) }),
    });
    res.json({ success: true, data: { charge } });
});
router.post("/charges/ratio", (0, auth_1.authorize)("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"), async (req, res) => {
    const data = (0, validateRequest_1.validateRequest)(finance_validation_1.ratioSchema, req.body);
    const result = await finance_service_1.financeService.ratioCharges({ ...data, dueDate: new Date(data.dueDate) }, req.user.userId);
    res.json({ success: true, data: result });
});
router.patch("/charges/:id/pay", (0, auth_1.authorize)("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"), async (req, res) => {
    const { paidAmount, paidAt } = (0, validateRequest_1.validateRequest)(finance_validation_1.paySchema, req.body);
    const charge = await finance_service_1.financeService.markAsPaid(req.params.id, paidAmount, paidAt ? new Date(paidAt) : undefined);
    res.json({ success: true, data: { charge } });
});
router.post("/charges/ratio/installments", (0, auth_1.authorize)("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"), async (req, res) => {
    const data = (0, validateRequest_1.validateRequest)(finance_validation_1.ratioInstallmentsSchema, req.body);
    const result = await finance_service_1.financeService.ratioChargesInstallments({ ...data, firstDueDate: new Date(data.firstDueDate) }, req.user.userId);
    res.json({ success: true, data: result });
});
router.post("/charges/installments", (0, auth_1.authorize)("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"), async (req, res) => {
    const data = (0, validateRequest_1.validateRequest)(finance_validation_1.chargeInstallmentsSchema, req.body);
    const result = await finance_service_1.financeService.createChargeInstallments({ ...data, firstDueDate: new Date(data.firstDueDate) }, req.user.userId);
    res.status(201).json({ success: true, data: result });
});
router.get("/charges/ratio/preview", (0, auth_1.authorize)("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"), async (req, res) => {
    const { condominiumId, totalAmount, method } = req.query;
    const preview = await finance_service_1.financeService.previewRatio(condominiumId, parseFloat(totalAmount), method || "equal");
    res.json({ success: true, data: { preview } });
});
router.delete("/charges/:id", (0, auth_1.authorize)("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"), async (req, res) => {
    const charge = await finance_service_1.financeService.cancelCharge(req.params.id);
    res.json({ success: true, data: { charge } });
});
router.get("/charges/unit/:unitId", async (req, res) => {
    const data = await finance_service_1.financeService.getChargesByUnit(req.params.unitId);
    res.json({ success: true, data });
});
router.get("/defaulters/:condominiumId", async (req, res) => {
    const defaulters = await finance_service_1.financeService.getDefaulters(req.params.condominiumId);
    res.json({ success: true, data: { defaulters } });
});
// Transações
router.get("/transactions/:accountId", async (req, res) => {
    const data = await finance_service_1.financeService.listTransactions(req.params.accountId, {
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
    });
    res.json({ success: true, data });
});
router.post("/transactions", (0, auth_1.authorize)("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"), async (req, res) => {
    const data = (0, validateRequest_1.validateRequest)(finance_validation_1.createTransactionSchema, req.body);
    const transaction = await finance_service_1.financeService.createTransaction({
        ...data,
        dueDate: new Date(data.dueDate),
        paidAt: data.paidAt ? new Date(data.paidAt) : undefined,
    }, req.user.userId);
    res.status(201).json({ success: true, data: { transaction } });
});
// Cobrança individual (com campos de pagamento)
router.get("/charges/:id/detail", async (req, res) => {
    const charge = await finance_service_1.financeService.getChargeById(req.params.id);
    if (!charge)
        return res
            .status(404)
            .json({ success: false, message: "Cobrança não encontrada" });
    res.json({ success: true, data: { charge } });
});
// Sincronização manual com gateway
router.post("/charges/:id/sync", (0, auth_1.authorize)("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"), async (req, res) => {
    const charge = await finance_service_1.financeService.forceSyncWithGateway(req.params.id);
    res.json({ success: true, data: { charge } });
});
// Configurar gateway na conta financeira
router.patch("/accounts/:accountId/gateway", (0, auth_1.authorize)("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"), async (req, res) => {
    const { gatewayType, gatewayKey, gatewayConfig } = req.body;
    const account = await finance_service_1.financeService.configureGateway(req.params.accountId, { gatewayType, gatewayKey, gatewayConfig });
    res.json({ success: true, data: { account } });
});
// Relatórios
router.get("/balance/:condominiumId/yearly/:year", async (req, res) => {
    const data = await finance_service_1.financeService.getMonthlyBalance(req.params.condominiumId, Number(req.params.year));
    res.json({ success: true, data });
});
router.get("/forecast/:condominiumId", (0, auth_1.authorize)("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"), async (req, res) => {
    const data = await finance_service_1.financeService.getFinancialForecast(req.params.condominiumId);
    res.json({ success: true, data });
});
exports.default = router;
//# sourceMappingURL=finance.routes.js.map