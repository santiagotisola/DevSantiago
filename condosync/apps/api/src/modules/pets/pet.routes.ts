import { Router } from 'express';
import { petController } from './pet.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

// Listar todos os pets do condomínio
router.get('/condominium/:condominiumId', petController.list);

// Listar pets de uma unidade específica
router.get('/unit/:unitId', petController.listByUnit);

// Detalhes de um pet
router.get('/:id', petController.getById);

// Criar novo pet
router.post('/', petController.create);

// Atualizar pet
router.patch('/:id', petController.update);

// Deletar pet (soft delete)
router.delete('/:id', petController.delete);

export default router;
