import { Router } from 'express';
import { lostAndFoundController } from './lost-and-found.controller';
import { authenticate, authorizeCondominium } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

// Listar todos os itens do condomínio
router.get('/condominium/:condominiumId', authorizeCondominium, lostAndFoundController.list);

// Detalhes de um item
router.get('/:id', lostAndFoundController.getById);

// Registrar novo item
router.post('/condominium/:condominiumId', authorizeCondominium, lostAndFoundController.create);

// Atualizar item
router.patch('/:id', lostAndFoundController.update);

// Deletar item
router.delete('/:id', lostAndFoundController.delete);

export default router;
