// Socket.io Server Exports
export {
  initSocketServer,
  getSocketServer,
  getOnlineUserIds,
  isUserOnline,
  getOnlineUserCount,
} from './server';

// Socket Emit Helpers
export {
  emitToUser,
  emitToThread,
  emitToRoom,
  emitToAll,
  broadcastNewMessage,
  broadcastMessageUpdate,
  broadcastMessageDelete,
  broadcastNotification,
  broadcastEntityUpdate,
} from './emit';

// Types
export type {
  ServerToClientEvents,
  ClientToServerEvents,
  MessagePayload,
  NotificationPayload,
  TypingPayload,
  EntityUpdatePayload,
} from './types';
