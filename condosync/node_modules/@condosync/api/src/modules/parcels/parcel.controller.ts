import { Request, Response } from 'express';
import { parcelService } from './parcel.service';
import { validateRequest } from '../../utils/validateRequest';
import { z } from 'zod';

const registerSchema = z.object({
  unitId: z.string().uuid(),
  senderName: z.string().optional(),
  carrier: z.string().optional(),
  trackingCode: z.string().optional(),
  photoUrl: z.string().url().optional(),
  storageLocation: z.string().optional(),
  deliveryPersonName: z.string().optional(),
  deliveryPersonDoc: z.string().optional(),
  vehiclePlate: z.string().optional(),
  hasPackageDamage: z.boolean().optional(),
  notes: z.string().optional(),
});

const pickupSchema = z.object({
  pickedUpBy: z.string().min(2),
  signature: z.string().optional(),
});

const cancelSchema = z.object({
  reason: z.string().optional(),
});

const updateSchema = z.object({
  senderName: z.string().optional(),
  carrier: z.string().optional(),
  trackingCode: z.string().optional(),
  photoUrl: z.string().url().optional(),
  storageLocation: z.string().optional(),
  deliveryPersonName: z.string().optional(),
  deliveryPersonDoc: z.string().optional(),
  vehiclePlate: z.string().optional(),
  hasPackageDamage: z.boolean().optional(),
  notes: z.string().optional(),
});

export class ParcelController {
  async list(req: Request, res: Response) {
    const condominiumId = req.params.condominiumId || req.user!.condominiumId!;
    const data = await parcelService.list(condominiumId, {
      unitId: req.query.unitId as string,
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
    });
    res.json({ success: true, data });
  }

  async register(req: Request, res: Response) {
    const data = validateRequest(registerSchema, req.body);
    const parcel = await parcelService.register(data, req.user!.userId, req.user!);
    res.status(201).json({ success: true, data: { parcel } });
  }

  async confirmPickup(req: Request, res: Response) {
    const { pickedUpBy, signature } = validateRequest(pickupSchema, req.body);
    const parcel = await parcelService.confirmPickup(req.params.id, pickedUpBy, req.user!, signature);
    res.json({ success: true, data: { parcel } });
  }

  async update(req: Request, res: Response) {
    const data = validateRequest(updateSchema, req.body);
    const parcel = await parcelService.update(req.params.id, req.user!, data);
    res.json({ success: true, data: { parcel } });
  }

  async cancel(req: Request, res: Response) {
    const { reason } = validateRequest(cancelSchema, req.body);
    const parcel = await parcelService.cancel(req.params.id, req.user!, reason);
    res.json({ success: true, data: { parcel } });
  }

  async findById(req: Request, res: Response) {
    const parcel = await parcelService.findById(req.params.id, req.user!);
    res.json({ success: true, data: { parcel } });
  }

  async pendingByUnit(req: Request, res: Response) {
    const parcels = await parcelService.pendingByUnit(req.params.unitId, req.user!);
    res.json({ success: true, data: { parcels } });
  }
}

export const parcelController = new ParcelController();
