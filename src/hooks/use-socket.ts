'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';
import { clientLogger } from '@/lib/client-logger';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  MessagePayload,
  NotificationPayload,
  TypingPayload,
} from '@/lib/socket/types';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface UseSocketOptions {
  autoConnect?: boolean;
}

interface UseSocketReturn {
  socket: TypedSocket | null;
  isConnected: boolean;
  onlineUsers: string[];
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  joinThread: (threadId: string) => void;
  leaveThread: (threadId: string) => void;
  startTyping: (threadId: string) => void;
  stopTyping: (threadId: string) => void;
  isUserOnline: (userId: string) => boolean;
  // Event listeners
  onNewMessage: (callback: (message: MessagePayload) => void) => () => void;
  onMessageUpdated: (callback: (message: MessagePayload) => void) => () => void;
  onMessageDeleted: (callback: (messageId: string) => void) => () => void;
  onNewNotification: (callback: (notification: NotificationPayload) => void) => () => void;
  onTypingStart: (callback: (data: TypingPayload) => void) => () => void;
  onTypingStop: (callback: (data: { threadId: string; userId: string }) => void) => () => void;
}

export function useSocket(options: UseSocketOptions = {}): UseSocketReturn {
  const { autoConnect = false } = options;
  const { data: session } = useSession();
  const socketRef = useRef<TypedSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  // Initialize socket connection
  useEffect(() => {
    if (!autoConnect || !session?.user) return;

    let isMounted = true;
    let socket: TypedSocket | null = null;
    let connectTimer: NodeJS.Timeout | null = null;

    // Delay connection to avoid "closed before established" warning during Fast Refresh
    connectTimer = setTimeout(() => {
      if (!isMounted) return;

      socket = io({
        path: '/api/socket',
        auth: {
          userId: session.user.id,
          userName: session.user.name || session.user.email,
        },
        transports: ['polling', 'websocket'], // Start with polling, upgrade to websocket
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 10000,
        timeout: 10000,
      });

      socket.on('connect', () => {
        if (isMounted) {
          clientLogger.info('[Socket] Connected', socket?.id);
          setIsConnected(true);
        }
      });

      socket.on('disconnect', (reason) => {
        if (isMounted && reason !== 'io client disconnect') {
          clientLogger.info('[Socket] Disconnected', reason);
        }
        if (isMounted) {
          setIsConnected(false);
        }
      });

      socket.on('connect_error', (error) => {
        if (isMounted) {
          clientLogger.error('[Socket] Connection error', error);
        }
      });

      // Online presence handlers
      socket.on('user:online', (userId) => {
        if (isMounted) {
          setOnlineUsers((prev) => [...new Set([...prev, userId])]);
        }
      });

      socket.on('user:offline', (userId) => {
        if (isMounted) {
          setOnlineUsers((prev) => prev.filter((id) => id !== userId));
        }
      });

      socket.on('users:online', (userIds) => {
        if (isMounted) {
          setOnlineUsers(userIds);
        }
      });

      socketRef.current = socket;
    }, 200);

    return () => {
      isMounted = false;
      if (connectTimer) {
        clearTimeout(connectTimer);
      }
      if (socket) {
        socket.disconnect();
      }
      socketRef.current = null;
    };
  }, [autoConnect, session?.user]);

  // Room management
  const joinRoom = useCallback((roomId: string) => {
    socketRef.current?.emit('room:join', roomId);
  }, []);

  const leaveRoom = useCallback((roomId: string) => {
    socketRef.current?.emit('room:leave', roomId);
  }, []);

  // Thread management
  const joinThread = useCallback((threadId: string) => {
    socketRef.current?.emit('thread:join', threadId);
  }, []);

  const leaveThread = useCallback((threadId: string) => {
    socketRef.current?.emit('thread:leave', threadId);
  }, []);

  // Typing indicators
  const startTyping = useCallback((threadId: string) => {
    socketRef.current?.emit('typing:start', threadId);
  }, []);

  const stopTyping = useCallback((threadId: string) => {
    socketRef.current?.emit('typing:stop', threadId);
  }, []);

  // Check if user is online
  const isUserOnline = useCallback(
    (userId: string) => {
      return onlineUsers.includes(userId);
    },
    [onlineUsers]
  );

  // Event listener helpers
  const onNewMessage = useCallback((callback: (message: MessagePayload) => void) => {
    const socket = socketRef.current;
    if (!socket) return () => {};

    socket.on('message:new', callback);
    return () => {
      socket.off('message:new', callback);
    };
  }, []);

  const onMessageUpdated = useCallback((callback: (message: MessagePayload) => void) => {
    const socket = socketRef.current;
    if (!socket) return () => {};

    socket.on('message:updated', callback);
    return () => {
      socket.off('message:updated', callback);
    };
  }, []);

  const onMessageDeleted = useCallback((callback: (messageId: string) => void) => {
    const socket = socketRef.current;
    if (!socket) return () => {};

    socket.on('message:deleted', callback);
    return () => {
      socket.off('message:deleted', callback);
    };
  }, []);

  const onNewNotification = useCallback((callback: (notification: NotificationPayload) => void) => {
    const socket = socketRef.current;
    if (!socket) return () => {};

    socket.on('notification:new', callback);
    return () => {
      socket.off('notification:new', callback);
    };
  }, []);

  const onTypingStart = useCallback((callback: (data: TypingPayload) => void) => {
    const socket = socketRef.current;
    if (!socket) return () => {};

    socket.on('typing:start', callback);
    return () => {
      socket.off('typing:start', callback);
    };
  }, []);

  const onTypingStop = useCallback(
    (callback: (data: { threadId: string; userId: string }) => void) => {
      const socket = socketRef.current;
      if (!socket) return () => {};

      socket.on('typing:stop', callback);
      return () => {
        socket.off('typing:stop', callback);
      };
    },
    []
  );

  return {
    socket: socketRef.current,
    isConnected,
    onlineUsers,
    joinRoom,
    leaveRoom,
    joinThread,
    leaveThread,
    startTyping,
    stopTyping,
    isUserOnline,
    onNewMessage,
    onMessageUpdated,
    onMessageDeleted,
    onNewNotification,
    onTypingStart,
    onTypingStop,
  };
}
