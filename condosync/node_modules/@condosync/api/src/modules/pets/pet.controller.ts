import { Request, Response } from 'express';
import { petService } from './pet.service';
import { validateRequest } from '../../utils/validateRequest';
import { createPetSchema, updatePetSchema } from './pet.validation';

export class PetController {
  async list(req: Request, res: Response) {
    const { condominiumId } = req.params;
    const { page, limit } = req.query;
    
    const result = await petService.listByCondominium(
      condominiumId,
      Number(page) || 1,
      Number(limit) || 20
    );
    
    return res.json(result);
  }

  async listByUnit(req: Request, res: Response) {
    const { unitId } = req.params;
    const pets = await petService.listByUnit(unitId);
    return res.json(pets);
  }

  async getById(req: Request, res: Response) {
    const { id } = req.params;
    const pet = await petService.getById(id);
    return res.json(pet);
  }

  async create(req: Request, res: Response) {
    const validData = validateRequest(createPetSchema, { body: req.body });
    const pet = await petService.create(validData.body);
    return res.status(201).json(pet);
  }

  async update(req: Request, res: Response) {
    const { id } = req.params;
    const validData = validateRequest(updatePetSchema, { body: req.body });
    const pet = await petService.update(id, validData.body);
    return res.json(pet);
  }

  async delete(req: Request, res: Response) {
    const { id } = req.params;
    await petService.delete(id);
    return res.status(204).send();
  }
}

export const petController = new PetController();
