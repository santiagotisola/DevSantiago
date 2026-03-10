import { Router } from 'express';
import { parcelController } from './parcel.controller';
import { authenticate, authorize, authorizeCondominium } from '../../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/condominium/:condominiumId', authorizeCondominium, parcelController.list.bind(parcelController));
router.post('/', authorize('DOORMAN', 'CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), parcelController.register.bind(parcelController));
router.get('/:id', parcelController.findById.bind(parcelController));
router.patch('/:id', authorize('DOORMAN', 'CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), parcelController.update.bind(parcelController));
router.patch('/:id/pickup', authorize('DOORMAN', 'CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), parcelController.confirmPickup.bind(parcelController));
router.patch('/:id/cancel', authorize('DOORMAN', 'CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), parcelController.cancel.bind(parcelController));
router.get('/unit/:unitId/pending', parcelController.pendingByUnit.bind(parcelController));

export default router;
