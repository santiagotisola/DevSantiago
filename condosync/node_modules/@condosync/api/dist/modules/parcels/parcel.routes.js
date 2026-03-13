"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const parcel_controller_1 = require("./parcel.controller");
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/condominium/:condominiumId', auth_1.authorizeCondominium, parcel_controller_1.parcelController.list.bind(parcel_controller_1.parcelController));
router.post('/', (0, auth_1.authorize)('DOORMAN', 'CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), parcel_controller_1.parcelController.register.bind(parcel_controller_1.parcelController));
router.get('/:id', parcel_controller_1.parcelController.findById.bind(parcel_controller_1.parcelController));
router.patch('/:id', (0, auth_1.authorize)('DOORMAN', 'CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), parcel_controller_1.parcelController.update.bind(parcel_controller_1.parcelController));
router.patch('/:id/pickup', (0, auth_1.authorize)('DOORMAN', 'CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), parcel_controller_1.parcelController.confirmPickup.bind(parcel_controller_1.parcelController));
router.patch('/:id/cancel', (0, auth_1.authorize)('DOORMAN', 'CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), parcel_controller_1.parcelController.cancel.bind(parcel_controller_1.parcelController));
router.get('/unit/:unitId/pending', parcel_controller_1.parcelController.pendingByUnit.bind(parcel_controller_1.parcelController));
exports.default = router;
//# sourceMappingURL=parcel.routes.js.map