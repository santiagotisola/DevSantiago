import { Request, Response } from "express";
import { visitorService } from "./visitor.service";
import { validateRequest } from "../../utils/validateRequest";
import { z } from "zod";
import type { VisitorStatus } from "@prisma/client";

const createSchema = z.object({
  unitId: z.string().uuid(),
  name: z.string().min(2),
  document: z.string().optional(),
  documentType: z.enum(["CPF", "RG", "CNH", "PASSPORT"]).optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  reason: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
  notes: z.string().optional(),
});

const entrySchema = z.object({ photoUrl: z.string().url().optional() });
const authorizeSchema = z.object({ authorized: z.boolean() });

export class VisitorController {
  async list(req: Request, res: Response) {
    const condominiumId = req.params.condominiumId || req.user!.condominiumId!;
    const data = await visitorService.list(condominiumId, {
      unitId: req.query.unitId as string,
      status: req.query.status as VisitorStatus,
      date: req.query.date as string,
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
    });
    res.json({ success: true, data });
  }

  async create(req: Request, res: Response) {
    const data = validateRequest(createSchema, req.body);
    const visitor = await visitorService.create(
      {
        ...data,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
      },
      req.user?.userId,
    );
    res.status(201).json({ success: true, data: { visitor } });
  }

  async registerEntry(req: Request, res: Response) {
    const { photoUrl } = validateRequest(entrySchema, req.body);
    const visitor = await visitorService.registerEntry(
      req.params.id,
      req.user!.userId,
      photoUrl,
    );
    res.json({ success: true, data: { visitor } });
  }

  async registerExit(req: Request, res: Response) {
    const visitor = await visitorService.registerExit(
      req.params.id,
      req.user!.userId,
    );
    res.json({ success: true, data: { visitor } });
  }

  async authorize(req: Request, res: Response) {
    const { authorized } = validateRequest(authorizeSchema, req.body);
    const visitor = await visitorService.authorize(
      req.params.id,
      req.user!.userId,
      authorized,
    );
    res.json({ success: true, data: { visitor } });
  }

  async findById(req: Request, res: Response) {
    const visitor = await visitorService.findById(req.params.id);
    res.json({ success: true, data: { visitor } });
  }

  async historyByUnit(req: Request, res: Response) {
    const data = await visitorService.historyByUnit(
      req.params.unitId,
      Number(req.query.page) || 1,
      Number(req.query.limit) || 20,
    );
    res.json({ success: true, data });
  }
}

export const visitorController = new VisitorController();
