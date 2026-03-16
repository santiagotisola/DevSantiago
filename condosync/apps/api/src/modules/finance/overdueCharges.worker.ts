/**
 * Overdue Charges Worker
 *
 * NOTE: The actual BullMQ cron job is registered inside `finance.scheduler.ts`
 * (job "mark-overdue" runs daily at 01:00 UTC, "payment-reminders" at 09:00 UTC).
 *
 * This file provides a standalone utility to trigger overdue marking on-demand
 * (e.g. called from admin endpoints or tests) without spinning up a new queue.
 */
import { logger } from '../../config/logger';
import { prisma } from '../../config/prisma';

const log = logger.child({ module: 'overdueCharges' });

/**
 * Mark all PENDING charges with dueDate < now as OVERDUE.
 * Returns the number of charges updated.
 */
export async function markOverdueChargesNow(): Promise<number> {
  const result = await prisma.charge.updateMany({
    where: { status: 'PENDING', dueDate: { lt: new Date() } },
    data: { status: 'OVERDUE' },
  });
  log.info(`markOverdueChargesNow: updated ${result.count} charge(s)`);
  return result.count;
}


const log = logger.child({ module: 'overdueCharges.worker' });

const QUEUE_NAME = 'overdue-charges';

// ── Queue ──────────────────────────────────────────────────────────
export const overdueChargesQueue = new Queue(QUEUE_NAME, {
  connection: redis as any,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: 50,
  },
});

// ── Register daily repeatable job on startup ───────────────────────
export async function registerOverdueChargesSchedule() {
  await overdueChargesQueue.add(
    'mark-overdue',
    {},
    {
      repeat: { pattern: '0 6 * * *' }, // every day at 06:00
      jobId: 'overdue-charges-daily',
    },
  );
  log.info('Overdue charges daily job registered (cron: 0 6 * * *)');
}

// ── Worker ─────────────────────────────────────────────────────────
export const overdueChargesWorker = new Worker(
  QUEUE_NAME,
  async (_job: Job) => {
    const now = new Date();
    log.info('Running overdue charges check');

    // 1. Find all PENDING charges with dueDate < today
    const pendingOverdue = await prisma.charge.findMany({
      where: {
        status: 'PENDING',
        dueDate: { lt: now },
      },
      include: {
        unit: {
          select: {
            id: true,
            identifier: true,
            condominiumId: true,
            residents: {
              where: { isActive: true },
              select: { userId: true, user: { select: { name: true, email: true } } },
            },
          },
        },
      },
    });

    if (pendingOverdue.length === 0) {
      log.info('No charges to mark as overdue');
      return;
    }

    log.info(`Marking ${pendingOverdue.length} charge(s) as OVERDUE`);

    // 2. Bulk update to OVERDUE
    const ids = pendingOverdue.map((c) => c.id);
    await prisma.charge.updateMany({
      where: { id: { in: ids } },
      data: { status: 'OVERDUE' },
    });

    // 3. Send notification to each resident
    for (const charge of pendingOverdue) {
      const condominiumId = charge.unit?.condominiumId;
      if (!condominiumId) continue;

      const residents = charge.unit?.residents ?? [];
      for (const resident of residents) {
        try {
          await NotificationService.send({
            condominiumId,
            userId: resident.userId,
            type: 'FINANCIAL',
            title: 'Cobrança vencida',
            body: `Sua cobrança "${charge.description}" venceu em ${charge.dueDate.toLocaleDateString('pt-BR')} e está em atraso. Regularize o quanto antes.`,
            channels: ['inapp', 'email'],
            metadata: { chargeId: charge.id },
          });
        } catch (err) {
          log.error(`Failed to notify resident ${resident.userId} for charge ${charge.id}`, err);
        }
      }
    }

    log.info(`Overdue charges job completed — ${pendingOverdue.length} charge(s) updated`);
  },
  { connection: redis as any },
);

overdueChargesWorker.on('failed', (job, err) => {
  log.error(`Overdue charges job ${job?.id} failed`, { error: err.message });
});
