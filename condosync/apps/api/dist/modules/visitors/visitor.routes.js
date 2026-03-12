"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const visitor_controller_1 = require("./visitor.controller");
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/condominium/:condominiumId', auth_1.authorizeCondominium, visitor_controller_1.visitorController.list.bind(visitor_controller_1.visitorController));
router.post('/', visitor_controller_1.visitorController.create.bind(visitor_controller_1.visitorController));
router.get('/:id', visitor_controller_1.visitorController.findById.bind(visitor_controller_1.visitorController));
router.post('/:id/entry', (0, auth_1.authorize)('DOORMAN', 'CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), visitor_controller_1.visitorController.registerEntry.bind(visitor_controller_1.visitorController));
router.post('/:id/exit', (0, auth_1.authorize)('DOORMAN', 'CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), visitor_controller_1.visitorController.registerExit.bind(visitor_controller_1.visitorController));
router.patch('/:id/authorize', visitor_controller_1.visitorController.authorize.bind(visitor_controller_1.visitorController));
router.get('/unit/:unitId/history', visitor_controller_1.visitorController.historyByUnit.bind(visitor_controller_1.visitorController));
exports.default = router;
//# sourceMappingURL=visitor.routes.js.map