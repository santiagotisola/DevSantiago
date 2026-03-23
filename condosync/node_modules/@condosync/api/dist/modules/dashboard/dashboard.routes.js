"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const dashboard_service_1 = require("./dashboard.service");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// O1 — adiciona role guard e authorizeCondominium
router.get('/:condominiumId', (0, auth_1.authorize)('CONDOMINIUM_ADMIN', 'SYNDIC', 'COUNCIL_MEMBER', 'SUPER_ADMIN'), auth_1.authorizeCondominium, async (req, res) => {
    const { condominiumId } = req.params;
    const data = await dashboard_service_1.dashboardService.getDashboardData(condominiumId);
    res.json({
        success: true,
        data,
    });
});
exports.default = router;
//# sourceMappingURL=dashboard.routes.js.map