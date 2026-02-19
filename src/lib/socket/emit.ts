import {
  getSocketServer,
  MessagePayload,
  NotificationPayload,
  EntityUpdatePayload,
} from './server';
import type { ServerToClientEvents } from './types';

/**
 * Type-safe emit helper that matches Socket.IO's typed event system.
 * Uses a generic approach to correctly pair event names with their data types.
 */
function typedEmit<K extends keyof ServerToClientEvents>(
  target: { emit: (event: K, ...args: Parameters<ServerToClientEvents[K]>) => void },
  event: K,
  ...args: Parameters<ServerToClientEvents[K]>
): void {
  target.emit(event, ...args);
}

/**
 * Emit event to a specific user's personal room
 */
export function emitToUser(
  userId: string,
  event: 'notification:new',
  data: NotificationPayload
): void;
export function emitToUser(
  userId: string,
  event: 'notification:read',
  data: string
): void;
export function emitToUser(
  userId: string,
  event: 'notification:new' | 'notification:read',
  data: NotificationPayload | string
): void {
  const io = getSocketServer();
  if (io) {
    const room = io.to(`user:${userId}`);
    if (event === 'notification:new') {
      typedEmit(room, 'notification:new', data as NotificationPayload);
    } else {
      typedEmit(room, 'notification:read', data as string);
    }
  }
}

/**
 * Emit event to all users in a thread
 */
export function emitToThread(
  threadId: string,
  event: 'message:new',
  data: MessagePayload
): void;
export function emitToThread(
  threadId: string,
  event: 'message:updated',
  data: MessagePayload
): void;
export function emitToThread(
  threadId: string,
  event: 'message:deleted',
  data: string
): void;
export function emitToThread(
  threadId: string,
  event: 'message:new' | 'message:updated' | 'message:deleted',
  data: MessagePayload | string
): void {
  const io = getSocketServer();
  if (io) {
    const room = io.to(`thread:${threadId}`);
    if (event === 'message:new') {
      typedEmit(room, 'message:new', data as MessagePayload);
    } else if (event === 'message:updated') {
      typedEmit(room, 'message:updated', data as MessagePayload);
    } else {
      typedEmit(room, 'message:deleted', data as string);
    }
  }
}

/**
 * Emit event to a custom room using a known ServerToClientEvents key
 */
export function emitToRoom<K extends keyof ServerToClientEvents>(
  roomId: string,
  event: K,
  ...args: Parameters<ServerToClientEvents[K]>
): void {
  const io = getSocketServer();
  if (io) {
    typedEmit(io.to(roomId), event, ...args);
  }
}

/**
 * Emit event to all connected clients
 */
export function emitToAll(
  event: 'entity:updated',
  data: EntityUpdatePayload
): void;
export function emitToAll(
  event: 'user:online',
  data: string
): void;
export function emitToAll(
  event: 'user:offline',
  data: string
): void;
export function emitToAll(
  event: 'entity:updated' | 'user:online' | 'user:offline',
  data: EntityUpdatePayload | string
): void {
  const io = getSocketServer();
  if (io) {
    if (event === 'entity:updated') {
      typedEmit(io, 'entity:updated', data as EntityUpdatePayload);
    } else if (event === 'user:online') {
      typedEmit(io, 'user:online', data as string);
    } else {
      typedEmit(io, 'user:offline', data as string);
    }
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
