import { Server as HTTPServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { logger } from '../logger';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from './types';

// Re-export types for convenience
export * from './types';

let io: SocketServer | null = null;

interface SocketData {
  userId: string;
  userName: string;
}

// Track online users: userId -> Set of socketIds
const onlineUsers = new Map<string, Set<string>>();

/**
 * Initialize Socket.io server
 */
export function initSocketServer(httpServer: HTTPServer): SocketServer {
  if (io) return io;

  io = new SocketServer<ClientToServerEvents, ServerToClientEvents, object, SocketData>(
    httpServer,
    {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
    }
  );

  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents, object, SocketData>) => {
    logger.info('[Socket] Client connected', { socketId: socket.id });

    // Get user info from auth handshake
    const userId = socket.handshake.auth.userId as string;
    const userName = socket.handshake.auth.userName as string;

    if (userId) {
      socket.data.userId = userId;
      socket.data.userName = userName || 'Unknown';

      // Track online status
      if (!onlineUsers.has(userId)) {
        onlineUsers.set(userId, new Set());
      }
      onlineUsers.get(userId)!.add(socket.id);

      // Broadcast user online to all except this socket
      socket.broadcast.emit('user:online', userId);

      // Join user's personal room for notifications
      socket.join(`user:${userId}`);

      // Send current online users to this socket
      socket.emit('users:online', getOnlineUserIds());

      logger.info(`[Socket] User ${userId} is now online`, { connections: onlineUsers.get(userId)!.size });
    }

    // Room management
    socket.on('room:join', (roomId) => {
      socket.join(roomId);
      logger.info(`[Socket] ${socket.id} joined room: ${roomId}`);
    });

    socket.on('room:leave', (roomId) => {
      socket.leave(roomId);
      logger.info(`[Socket] ${socket.id} left room: ${roomId}`);
    });

    // Thread management
    socket.on('thread:join', (threadId) => {
      const roomName = `thread:${threadId}`;
      socket.join(roomName);
      logger.info(`[Socket] ${socket.id} joined thread: ${threadId}`);
    });

    socket.on('thread:leave', (threadId) => {
      const roomName = `thread:${threadId}`;
      socket.leave(roomName);
      logger.info(`[Socket] ${socket.id} left thread: ${threadId}`);
    });

    // Typing indicators
    socket.on('typing:start', (threadId) => {
      if (!socket.data.userId) return;

      socket.to(`thread:${threadId}`).emit('typing:start', {
        threadId,
        userId: socket.data.userId,
        userName: socket.data.userName,
      });
    });

    socket.on('typing:stop', (threadId) => {
      if (!socket.data.userId) return;

      socket.to(`thread:${threadId}`).emit('typing:stop', {
        threadId,
        userId: socket.data.userId,
      });
    });

    // Presence ping
    socket.on('presence:ping', () => {
      // Just acknowledge presence, user is still connected
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      logger.info(`[Socket] Client disconnected: ${socket.id}, reason: ${reason}`);

      if (socket.data.userId) {
        const userSockets = onlineUsers.get(socket.data.userId);
        if (userSockets) {
          userSockets.delete(socket.id);

          // If no more sockets, user is offline
          if (userSockets.size === 0) {
            onlineUsers.delete(socket.data.userId);
            socket.broadcast.emit('user:offline', socket.data.userId);
            logger.info(`[Socket] User ${socket.data.userId} is now offline`);
          }
        }
      }
    });
  });

  logger.info('[Socket] Socket.io server initialized');
  return io;
}

/**
 * Get the Socket.io server instance
 */
export function getSocketServer(): SocketServer | null {
  return io;
}

/**
 * Get list of online user IDs
 */
export function getOnlineUserIds(): string[] {
  return Array.from(onlineUsers.keys());
}

/**
 * Check if a user is online
 */
export function isUserOnline(userId: string): boolean {
  return onlineUsers.has(userId) && onlineUsers.get(userId)!.size > 0;
}

/**
 * Get online user count
 */
export function getOnlineUserCount(): number {
  return onlineUsers.size;
}
