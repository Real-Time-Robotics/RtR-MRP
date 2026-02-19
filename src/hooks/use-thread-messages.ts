'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocketContext } from '@/providers/socket-provider';
import { Message } from '@/types/discussions';
import { clientLogger } from '@/lib/client-logger';

interface TypingUser {
  userId: string;
  userName: string;
}

interface UseThreadMessagesReturn {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  typingUsers: TypingUser[];
  sendMessage: (data: {
    content: string;
    attachments?: unknown[];
    entityLinks?: unknown[];
    mentions?: unknown[];
  }) => Promise<Message | null>;
  updateMessage: (messageId: string, content: string, reason?: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useThreadMessages(threadId: string | null): UseThreadMessagesReturn {
  const {
    socket,
    joinThread,
    leaveThread,
    onNewMessage,
    onMessageUpdated,
    onMessageDeleted,
    onTypingStart,
    onTypingStop,
  } = useSocketContext();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const typingTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Fetch initial messages
  const fetchMessages = useCallback(async () => {
    if (!threadId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/discussions/threads/${threadId}/messages`);
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (err) {
      clientLogger.error('Failed to fetch messages', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch messages');
    } finally {
      setIsLoading(false);
    }
  }, [threadId]);

  // Join thread room and fetch messages on mount
  useEffect(() => {
    if (!threadId) return;

    // Join the thread room for real-time updates
    joinThread(threadId);
    fetchMessages();

    return () => {
      leaveThread(threadId);
      // Clear typing timeouts
      typingTimeouts.current.forEach((timeout) => clearTimeout(timeout));
      typingTimeouts.current.clear();
    };
  }, [threadId, joinThread, leaveThread, fetchMessages]);

  // Listen for real-time message events
  useEffect(() => {
    if (!socket || !threadId) return;

    // Handle new message
    const unsubNew = onNewMessage((message) => {
      if (message.threadId === threadId) {
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message as unknown as Message];
        });
      }
    });

    // Handle updated message
    const unsubUpdated = onMessageUpdated((message) => {
      if (message.threadId === threadId) {
        setMessages((prev) =>
          prev.map((m) => (m.id === message.id ? (message as unknown as Message) : m))
        );
      }
    });

    // Handle deleted message
    const unsubDeleted = onMessageDeleted((messageId) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    });

    // Handle typing start
    const unsubTypingStart = onTypingStart((data) => {
      if (data.threadId !== threadId) return;

      // Clear existing timeout for this user
      const existingTimeout = typingTimeouts.current.get(data.userId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Add user to typing list
      setTypingUsers((prev) => {
        if (prev.some((u) => u.userId === data.userId)) return prev;
        return [...prev, { userId: data.userId, userName: data.userName }];
      });

      // Auto-remove after 3 seconds
      const timeout = setTimeout(() => {
        setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
        typingTimeouts.current.delete(data.userId);
      }, 3000);

      typingTimeouts.current.set(data.userId, timeout);
    });

    // Handle typing stop
    const unsubTypingStop = onTypingStop((data) => {
      if (data.threadId !== threadId) return;

      const existingTimeout = typingTimeouts.current.get(data.userId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        typingTimeouts.current.delete(data.userId);
      }

      setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
    });

    return () => {
      unsubNew();
      unsubUpdated();
      unsubDeleted();
      unsubTypingStart();
      unsubTypingStop();
    };
  }, [socket, threadId, onNewMessage, onMessageUpdated, onMessageDeleted, onTypingStart, onTypingStop]);

  // Send message
  const sendMessage = useCallback(
    async (data: {
      content: string;
      attachments?: unknown[];
      entityLinks?: unknown[];
      mentions?: unknown[];
    }) => {
      if (!threadId) return null;

      try {
        const response = await fetch(`/api/discussions/threads/${threadId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error('Failed to send message');
        }

        const result = await response.json();
        // Message will be added via socket event, but return for immediate feedback
        return result.message;
      } catch (err) {
        clientLogger.error('Failed to send message', err);
        throw err;
      }
    },
    [threadId]
  );

  // Update message
  const updateMessage = useCallback(
    async (messageId: string, content: string, reason?: string) => {
      try {
        const response = await fetch(`/api/discussions/messages/${messageId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, reason }),
        });

        if (!response.ok) {
          throw new Error('Failed to update message');
        }
        // Message update will come via socket
      } catch (err) {
        clientLogger.error('Failed to update message', err);
        throw err;
      }
    },
    []
  );

  // Delete message
  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      const response = await fetch(`/api/discussions/messages/${messageId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete message');
      }
      // Message deletion will come via socket
    } catch (err) {
      clientLogger.error('Failed to delete message', err);
      throw err;
    }
  }, []);

  return {
    messages,
    isLoading,
    error,
    typingUsers,
    sendMessage,
    updateMessage,
    deleteMessage,
    refresh: fetchMessages,
  };
}
