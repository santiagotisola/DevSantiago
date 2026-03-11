import { Router, Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { authenticate, authorize } from '../../middleware/auth';
import { validateRequest } from '../../utils/validateRequest';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

const vehicleSchema = z.object({
  unitId: z.string().uuid(),
  plate: z.string().min(7).max(8).toUpperCase(),
  brand: z.string().min(2),
  model: z.string().min(2),
  color: z.string().min(2),
  year: z.number().int().min(1980).max(new Date().getFullYear() + 1).optional(),
  type: z.enum(['CAR', 'MOTORCYCLE', 'TRUCK', 'BICYCLE', 'OTHER']).optional(),
});

router.get('/unit/:unitId', async (req: Request, res: Response) => {
  const vehicles = await prisma.vehicle.findMany({
    where: { unitId: req.params.unitId, isActive: true },
  });
  res.json({ success: true, data: { vehicles } });
});

router.post('/', async (req: Request, res: Response) => {
  const data = validateRequest(vehicleSchema, req.body);
  const vehicle = await prisma.vehicle.create({ data });
  res.status(201).json({ success: true, data: { vehicle } });
});

router.put('/:id', async (req: Request, res: Response) => {
  const data = validateRequest(vehicleSchema.partial(), req.body);
  const vehicle = await prisma.vehicle.update({ where: { id: req.params.id }, data });
  res.json({ success: true, data: { vehicle } });
});

router.delete('/:id', async (req: Request, res: Response) => {
  await prisma.vehicle.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.json({ success: true });
});

// Registro de acesso de veículos
router.get('/access-logs/:condominiumId', authorize('DOORMAN', 'CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), async (req: Request, res: Response) => {
  const logs = await prisma.vehicleAccessLog.findMany({
    where: {
      vehicle: { unit: { condominiumId: req.params.condominiumId } },
    },
    include: {
      vehicle: { include: { unit: { select: { identifier: true, block: true } } } },
    },
    orderBy: { entryAt: 'desc' },
    take: 50,
  });
  res.json({ success: true, data: { logs } });
});

router.post('/access-logs', authorize('DOORMAN', 'CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), async (req: Request, res: Response) => {
  const schema = z.object({
    plate: z.string(),
    vehicleId: z.string().uuid().optional(),
    unitId: z.string().uuid().optional(),
    isResident: z.boolean().optional(),
    notes: z.string().optional(),
  });
  const data = validateRequest(schema, req.body);
  const log = await prisma.vehicleAccessLog.create({ data: { ...data, registeredBy: req.user!.userId } });
  res.status(201).json({ success: true, data: { log } });
});

router.patch('/access-logs/:id/exit', authorize('DOORMAN', 'CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), async (req: Request, res: Response) => {
  const log = await prisma.vehicleAccessLog.update({
    where: { id: req.params.id },
    data: { exitAt: new Date() },
  });
  res.json({ success: true, data: { log } });
});

export default router;
