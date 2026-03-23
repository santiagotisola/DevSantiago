import { Request, Response } from "express";
import { assemblyService } from "./assembly.service";
import { AssemblyStatus } from "@prisma/client";
import { validateRequest } from "../../utils/validateRequest";
import {
  createAssemblySchema,
  updateAssemblyStatusSchema,
  voteAssemblySchema,
} from "./assembly.validation";

export class AssemblyController {
  async list(req: Request, res: Response) {
    const { condominiumId } = req.params;
    const { page, limit } = req.query;

    const result = await assemblyService.list(
      condominiumId,
      Number(page) || 1,
      Number(limit) || 20,
    );

    return res.json(result);
  }

  async getById(req: Request, res: Response) {
    const { id } = req.params;
    const assembly = await assemblyService.getById(id, req.user!);
    return res.json(assembly);
  }

  async create(req: Request, res: Response) {
    const { condominiumId } = req.params;
    const actor = req.user!;

    const validData = validateRequest(createAssemblySchema, { body: req.body });
    const { body } = validData;

    const assembly = await assemblyService.create(
      {
        ...body,
        condominiumId,
        createdBy: actor.userId,
        scheduledAt: new Date(body.scheduledAt),
      },
      actor,
    );

    return res.status(201).json(assembly);
  }

  async updateStatus(req: Request, res: Response) {
    const { id } = req.params;
    const actor = req.user!;
    const validData = validateRequest(updateAssemblyStatusSchema, {
      body: req.body,
    });
    const { status } = validData.body;

    const assembly = await assemblyService.updateStatus(
      id,
      status as AssemblyStatus,
      actor,
    );
    return res.json(assembly);
  }

  async vote(req: Request, res: Response) {
    const { itemId } = req.params;
    const actor = req.user!;
    const validData = validateRequest(voteAssemblySchema, { body: req.body });
    const { optionId } = validData.body;

    const vote = await assemblyService.vote(
      itemId,
      actor.userId,
      optionId,
      actor,
    );
    return res.json(vote);
  }

  async registerAttendance(req: Request, res: Response) {
    const { id } = req.params;
    const actor = req.user!;

    const entry = await assemblyService.registerAttendance(
      id,
      actor.userId,
      actor,
    );
    return res.json(entry);
  }

  async getResults(req: Request, res: Response) {
    const { id } = req.params;
    const results = await assemblyService.getVotingResults(id, req.user!);
    return res.json(results);
  }
}

export const assemblyController = new AssemblyController();
