import { Router, Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { authenticate, authorize } from '../../middleware/auth';
import { validateRequest } from '../../utils/validateRequest';
import { z } from 'zod';

const router = Router();
router.use(authenticate, authorize('CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'));

const employeeSchema = z.object({
  condominiumId: z.string().uuid(),
  name: z.string().min(2),
  cpf: z.string().length(11),
  role: z.string().min(2),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  shift: z.enum(['MORNING', 'AFTERNOON', 'NIGHT', 'FULL_DAY']),
  admissionDate: z.string().datetime(),
  salaryAmount: z.number().positive().optional(),
  notes: z.string().optional(),
});

router.get('/condominium/:condominiumId', async (req: Request, res: Response) => {
  const employees = await prisma.employee.findMany({
    where: { condominiumId: req.params.condominiumId, isActive: true },
    orderBy: { name: 'asc' },
  });
  res.json({ success: true, data: { employees } });
});

router.post('/', async (req: Request, res: Response) => {
  const data = validateRequest(employeeSchema, req.body);
  const employee = await prisma.employee.create({ data: { ...data, admissionDate: new Date(data.admissionDate) } });
  res.status(201).json({ success: true, data: { employee } });
});

router.put('/:id', async (req: Request, res: Response) => {
  const data = validateRequest(employeeSchema.partial(), req.body);
  const employee = await prisma.employee.update({
    where: { id: req.params.id },
    data: { ...data, admissionDate: data.admissionDate ? new Date(data.admissionDate) : undefined },
  });
  res.json({ success: true, data: { employee } });
});

router.delete('/:id', async (req: Request, res: Response) => {
  await prisma.employee.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.json({ success: true });
});

export default router;
