import { NotificationPayload } from './types';
export declare class NotificationService {
    /**
     * Enqueues a notification to be processed by background workers (BullMQ).
     */
    static enqueue(payload: NotificationPayload): Promise<void>;
}
//# sourceMappingURL=notification.service.d.ts.map