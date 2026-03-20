/**
 * Overdue Charges Worker
 *
 * NOTE: The actual BullMQ cron job is registered inside `finance.scheduler.ts`
 * (job "mark-overdue" runs daily at 01:00 UTC, "payment-reminders" at 09:00 UTC).
 *
 * This file provides a standalone utility to trigger overdue marking on-demand
 * (e.g. called from admin endpoints or tests) without spinning up a new queue.
 */
import { logger } from "../../config/logger";
import { prisma } from "../../config/prisma";

const log = logger.child({ module: "overdueCharges" });

/**
 * Mark all PENDING charges with dueDate < now as OVERDUE.
 * Returns the number of charges updated.
 */
export async function markOverdueChargesNow(): Promise<number> {
  const result = await prisma.charge.updateMany({
    where: { status: "PENDING", dueDate: { lt: new Date() } },
    data: { status: "OVERDUE" },
  });
  log.info(`markOverdueChargesNow: updated ${result.count} charge(s)`);
  return result.count;
}
