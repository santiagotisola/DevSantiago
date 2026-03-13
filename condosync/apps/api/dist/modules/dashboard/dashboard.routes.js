"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const dashboard_service_1 = require("./dashboard.service");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/:condominiumId', async (req, res) => {
    const { condominiumId } = req.params;
    const data = await dashboard_service_1.dashboardService.getDashboardData(condominiumId);
    res.json({
        success: true,
        data,
    });
});
exports.default = router;
//# sourceMappingURL=dashboard.routes.js.map