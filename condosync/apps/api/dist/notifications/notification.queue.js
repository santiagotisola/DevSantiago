"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationQueue = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("../config/redis");
exports.notificationQueue = new bullmq_1.Queue('notifications', {
    connection: redis_1.redis,
});
//# sourceMappingURL=notification.queue.js.map