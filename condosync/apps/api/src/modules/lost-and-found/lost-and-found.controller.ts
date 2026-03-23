import { Request, Response } from "express";
import { lostAndFoundService } from "./lost-and-found.service";
import { validateRequest } from "../../utils/validateRequest";
import {
  createLostAndFoundSchema,
  updateLostAndFoundSchema,
} from "./lost-and-found.validation";

export class LostAndFoundController {
  async list(req: Request, res: Response) {
    const { condominiumId } = req.params;
    const { page, limit } = req.query;

    const result = await lostAndFoundService.list(
      condominiumId,
      req.user!,
      Number(page) || 1,
      Number(limit) || 20,
    );

    return res.json(result);
  }

  // F1 — passa actor para verificação IDOR
  async getById(req: Request, res: Response) {
    const { id } = req.params;
    const item = await lostAndFoundService.getById(id, req.user!);
    return res.json(item);
  }

  async create(req: Request, res: Response) {
    const { condominiumId } = req.params;
    const actor = req.user!;

    const validData = validateRequest(createLostAndFoundSchema, {
      body: req.body,
    });
    const item = await lostAndFoundService.create(
      validData.body,
      actor.userId,
      condominiumId,
    );

    return res.status(201).json(item);
  }

  // F2 — passa actor para verificação IDOR
  async update(req: Request, res: Response) {
    const { id } = req.params;
    const validData = validateRequest(updateLostAndFoundSchema, {
      body: req.body,
    });

    const item = await lostAndFoundService.update(
      id,
      validData.body,
      req.user!,
    );
    return res.json(item);
  }

  // F3 — passa actor para verificação IDOR
  async delete(req: Request, res: Response) {
    const { id } = req.params;
    await lostAndFoundService.delete(id, req.user!);
    return res.status(204).send();
  }
}

export const lostAndFoundController = new LostAndFoundController();
