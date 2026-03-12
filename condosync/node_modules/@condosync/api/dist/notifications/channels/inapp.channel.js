"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InAppChannel = void 0;
const prisma_1 = require("../../config/prisma");
const logger_1 = require("../../config/logger");
const log = logger_1.logger.child({ module: 'inapp.channel' });
class InAppChannel {
    static async send(payload) {
        log.info(`Sending in-app notification to user ${payload.userId}`);
        try {
            await prisma_1.prisma.notification.create({
                data: {
                    userId: payload.userId,
                    type: payload.type,
                    title: payload.title,
                    message: payload.message,
                    data: payload.data ? payload.data : undefined,
                },
            });
            // TODO: Emit Socket.IO event here
            log.info(`In-app notification created for ${payload.userId}`);
        }
        catch (error) {
            log.error(`Failed to create in-app notification`, { userId: payload.userId, error });
            throw error;
        }
    }
}
exports.InAppChannel = InAppChannel;
//# sourceMappingURL=inapp.channel.js.map