import {
  getSocketServer,
  MessagePayload,
  NotificationPayload,
  EntityUpdatePayload,
} from './server';

/**
 * Emit event to a specific user's personal room
 */
export function emitToUser(
  userId: string,
  event: 'notification:new' | 'notification:read',
  data: NotificationPayload | string
): void {
  const io = getSocketServer();
  if (io) {
    io.to(`user:${userId}`).emit(event, data as any);
  }
}

/**
 * Emit event to all users in a thread
 */
export function emitToThread(
  threadId: string,
  event: 'message:new' | 'message:updated' | 'message:deleted',
  data: MessagePayload | string
): void {
  const io = getSocketServer();
  if (io) {
    io.to(`thread:${threadId}`).emit(event, data as any);
  }
}

/**
 * Emit event to a custom room
 */
export function emitToRoom(
  roomId: string,
  event: string,
  data: unknown
): void {
  const io = getSocketServer();
  if (io) {
    io.to(roomId).emit(event as any, data);
  }
}

/**
 * Emit event to all connected clients
 */
export function emitToAll(
  event: 'entity:updated' | 'user:online' | 'user:offline',
  data: EntityUpdatePayload | string
): void {
  const io = getSocketServer();
  if (io) {
    io.emit(event, data as any);
  }
}

/**
 * Emit new message to thread
 */
export function broadcastNewMessage(threadId: string, message: MessagePayload): void {
  emitToThread(threadId, 'message:new', message);
}

/**
 * Emit updated message to thread
 */
export function broadcastMessageUpdate(threadId: string, message: MessagePayload): void {
  emitToThread(threadId, 'message:updated', message);
}

/**
 * Emit deleted message to thread
 */
export function broadcastMessageDelete(threadId: string, messageId: string): void {
  emitToThread(threadId, 'message:deleted', messageId);
}

/**
 * Emit new notification to user
 */
export function broadcastNotification(userId: string, notification: NotificationPayload): void {
  emitToUser(userId, 'notification:new', notification);
}

/**
 * Emit entity update to all users (for data sync)
 */
export function broadcastEntityUpdate(
  type: string,
  id: string,
  action: 'created' | 'updated' | 'deleted',
  data?: unknown
): void {
  emitToAll('entity:updated', { type, id, action, data });
}
