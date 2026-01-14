/**
 * Socket.io Type Definitions
 * Shared between client and server
 */

// Payload types
export interface MessagePayload {
  id: string;
  threadId: string;
  content: string;
  senderId: string;
  sender?: {
    id: string;
    name: string | null;
    email: string;
  };
  attachments?: unknown[];
  mentions?: unknown[];
  entityLinks?: unknown[];
  createdAt: string;
  isEdited?: boolean;
  editedAt?: string;
}

export interface NotificationPayload {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: string;
  link?: string | null;
  mentionedBy?: string | null;
  mentionedByName?: string | null;
  threadId?: string | null;
  messageId?: string | null;
  createdAt: string;
}

export interface TypingPayload {
  threadId: string;
  userId: string;
  userName: string;
}

export interface EntityUpdatePayload {
  type: string;
  id: string;
  action: 'created' | 'updated' | 'deleted';
  data?: unknown;
}

// Event types for type safety
export interface ServerToClientEvents {
  // Messages
  'message:new': (message: MessagePayload) => void;
  'message:updated': (message: MessagePayload) => void;
  'message:deleted': (messageId: string) => void;

  // Notifications
  'notification:new': (notification: NotificationPayload) => void;
  'notification:read': (notificationId: string) => void;

  // Presence
  'user:online': (userId: string) => void;
  'user:offline': (userId: string) => void;
  'users:online': (userIds: string[]) => void;

  // Typing
  'typing:start': (data: TypingPayload) => void;
  'typing:stop': (data: { threadId: string; userId: string }) => void;

  // Entity sync
  'entity:updated': (data: EntityUpdatePayload) => void;
}

export interface ClientToServerEvents {
  // Room management
  'room:join': (roomId: string) => void;
  'room:leave': (roomId: string) => void;

  // Thread specific
  'thread:join': (threadId: string) => void;
  'thread:leave': (threadId: string) => void;

  // Typing
  'typing:start': (threadId: string) => void;
  'typing:stop': (threadId: string) => void;

  // Presence
  'presence:ping': () => void;
}
