"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationWorker = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("../config/redis");
const logger_1 = require("../config/logger");
const inapp_channel_1 = require("./channels/inapp.channel");
const email_channel_1 = require("./channels/email.channel");
const log = logger_1.logger.child({ module: 'notification.worker' });
exports.notificationWorker = new bullmq_1.Worker('notifications', async (job) => {
    log.info(`Processing notification job ${job.id}`, { data: job.data });
    const payload = job.data;
    if (payload.channels.includes('inapp')) {
        await inapp_channel_1.InAppChannel.send(payload).catch(err => {
            log.error('InApp Channel failed', err);
        });
    }
    if (payload.channels.includes('email')) {
        await email_channel_1.EmailChannel.send(payload).catch(err => {
            log.error('Email Channel failed', err);
        });
    }
    // if (payload.channels.includes('push')) {
    //   await PushChannel.send(payload); // Not implemented yet
    // }
    log.info(`Notification job ${job.id} processed successfully`);
}, { connection: redis_1.redis });
exports.notificationWorker.on('failed', (job, err) => {
    log.error(`Notification job ${job?.id} failed`, { error: err.message, stack: err.stack });
});
//# sourceMappingURL=notification.worker.js.map