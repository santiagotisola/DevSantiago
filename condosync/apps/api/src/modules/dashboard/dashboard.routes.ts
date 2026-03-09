import { Router, Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { authenticate } from '../../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/:condominiumId', async (req: Request, res: Response) => {
  const { condominiumId } = req.params;
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));
  const thisMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  const [
    totalUnits,
    occupiedUnits,
    visitorsToday,
    visitorsInside,
    parcelsAwaiting,
    openOrders,
    urgentOrders,
    pendingCharges,
    overdueCharges,
    unreadOccurrences,
    upcomingReservations,
    recentAnnouncements,
  ] = await prisma.$transaction([
    prisma.unit.count({ where: { condominiumId } }),
    prisma.unit.count({ where: { condominiumId, status: 'OCCUPIED' } }),
    prisma.visitor.count({
      where: {
        unit: { condominiumId },
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
    }),
    prisma.visitor.count({ where: { unit: { condominiumId }, status: 'INSIDE' } }),
    prisma.parcel.count({
      where: {
        unit: { condominiumId },
        status: { in: ['RECEIVED', 'NOTIFIED'] },
      },
    }),
    prisma.serviceOrder.count({ where: { condominiumId, status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_PARTS'] } } }),
    prisma.serviceOrder.count({ where: { condominiumId, priority: 'URGENT', status: { notIn: ['COMPLETED', 'CANCELED'] } } }),
    prisma.charge.count({
      where: { unit: { condominiumId }, status: 'PENDING', referenceMonth: thisMonth },
    }),
    prisma.charge.count({
      where: {
        unit: { condominiumId },
        status: 'PENDING',
        dueDate: { lt: new Date() },
      },
    }),
    prisma.occurrence.count({ where: { condominiumId, status: { in: ['OPEN', 'IN_ANALYSIS'] } } }),
    prisma.reservation.count({
      where: {
        commonArea: { condominiumId },
        status: 'CONFIRMED',
        startDate: { gte: new Date() },
      },
    }),
    prisma.announcement.findMany({
      where: {
        condominiumId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
      take: 5,
    }),
  ]);

  const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

  res.json({
    success: true,
    data: {
      summary: {
        totalUnits,
        occupiedUnits,
        occupancyRate: Math.round(occupancyRate * 10) / 10,
      },
      portaria: { visitorsToday, visitorsInside, parcelsAwaiting },
      maintenance: { openOrders, urgentOrders },
      financial: { pendingCharges, overdueCharges },
      communication: { unreadOccurrences, upcomingReservations },
      recentAnnouncements,
    },
  });
});

export default router;
