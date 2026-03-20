"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InAppChannel = void 0;
const prisma_1 = require("../../config/prisma");
const logger_1 = require("../../config/logger");
const server_1 = require("../../server");
const log = logger_1.logger.child({ module: 'inapp.channel' });
class InAppChannel {
    static async send(payload) {
        log.info(`Sending in-app notification to user ${payload.userId}`);
        try {
            const notification = await prisma_1.prisma.notification.create({
                data: {
                    userId: payload.userId,
                    type: payload.type,
                    title: payload.title,
                    message: payload.message,
                    data: payload.data ? payload.data : undefined,
                },
            });
            // Emitir evento em tempo real via Socket.IO
            server_1.io.to(`user:${payload.userId}`).emit('notification:new', {
                id: notification.id,
                type: notification.type,
                title: notification.title,
                message: notification.message,
                data: notification.data,
                createdAt: notification.createdAt,
            });
            log.info(`In-app notification created and emitted for ${payload.userId}`);
        }
        catch (error) {
            log.error(`Failed to create in-app notification`, { userId: payload.userId, error });
            throw error;
        }
    }
}
exports.InAppChannel = InAppChannel;
//# sourceMappingURL=inapp.channel.js.map