import 'express-async-errors';
import { Server as SocketIOServer } from 'socket.io';
import './notifications/notification.worker';
declare const app: import("express-serve-static-core").Express;
export declare const io: SocketIOServer<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
export default app;
//# sourceMappingURL=server.d.ts.map