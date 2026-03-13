"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const notification_queue_1 = require("./notification.queue");
const logger_1 = require("../config/logger");
const log = logger_1.logger.child({ module: 'notification.service' });
class NotificationService {
    /**
     * Enqueues a notification to be processed by background workers (BullMQ).
     */
    static async enqueue(payload) {
        log.info(`Enqueuing notification for user ${payload.userId} with type ${payload.type}`);
        await notification_queue_1.notificationQueue.add('notification:send', payload, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 5000,
            },
            removeOnComplete: true,
            removeOnFail: 100, // Keep last 100 failures
        });
    }
}
exports.NotificationService = NotificationService;
//# sourceMappingURL=notification.service.js.map