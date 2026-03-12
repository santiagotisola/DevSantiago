import { Router } from 'express';
import { visitorController } from './visitor.controller';
import { authenticate, authorize, authorizeCondominium } from '../../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/condominium/:condominiumId', authorizeCondominium, visitorController.list.bind(visitorController));
router.post('/', visitorController.create.bind(visitorController));
router.get('/:id', visitorController.findById.bind(visitorController));
router.post('/:id/entry', authorize('DOORMAN', 'CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), visitorController.registerEntry.bind(visitorController));
router.post('/:id/exit', authorize('DOORMAN', 'CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), visitorController.registerExit.bind(visitorController));
router.patch('/:id', authorize('DOORMAN', 'CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), visitorController.update.bind(visitorController));
router.patch('/:id/authorize', visitorController.authorize.bind(visitorController));
router.get('/unit/:unitId/history', visitorController.historyByUnit.bind(visitorController));

export default router;
