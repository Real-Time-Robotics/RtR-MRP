import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockRoom, mockIoInstance } = vi.hoisted(() => {
  const room = { emit: vi.fn() };
  const io = {
    to: vi.fn(() => room),
    emit: vi.fn(),
  };
  return { mockRoom: room, mockIoInstance: io };
});

vi.mock('../server', () => ({
  getSocketServer: vi.fn(() => mockIoInstance),
}));

import {
  emitToUser,
  emitToThread,
  emitToRoom,
  emitToAll,
  broadcastNewMessage,
  broadcastMessageUpdate,
  broadcastMessageDelete,
  broadcastNotification,
  broadcastEntityUpdate,
} from '../emit';

const mockNotification = {
  id: 'n-1',
  type: 'INFO',
  title: 'Test',
  message: 'Test notification',
  priority: 'normal',
  createdAt: new Date().toISOString(),
};

const mockMessage = {
  id: 'm-1',
  threadId: 't-1',
  content: 'Hello',
  senderId: 'u-1',
  createdAt: new Date().toISOString(),
};

describe('emitToUser', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should emit notification:new to user room', () => {
    emitToUser('u-1', 'notification:new', mockNotification);

    expect(mockIoInstance.to).toHaveBeenCalledWith('user:u-1');
    expect(mockRoom.emit).toHaveBeenCalledWith('notification:new', mockNotification);
  });

  it('should emit notification:read to user room', () => {
    emitToUser('u-1', 'notification:read', 'n-1');

    expect(mockIoInstance.to).toHaveBeenCalledWith('user:u-1');
    expect(mockRoom.emit).toHaveBeenCalledWith('notification:read', 'n-1');
  });
});

describe('emitToThread', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should emit message:new to thread room', () => {
    emitToThread('t-1', 'message:new', mockMessage);

    expect(mockIoInstance.to).toHaveBeenCalledWith('thread:t-1');
    expect(mockRoom.emit).toHaveBeenCalledWith('message:new', mockMessage);
  });

  it('should emit message:updated to thread room', () => {
    emitToThread('t-1', 'message:updated', mockMessage);

    expect(mockRoom.emit).toHaveBeenCalledWith('message:updated', mockMessage);
  });

  it('should emit message:deleted to thread room', () => {
    emitToThread('t-1', 'message:deleted', 'm-1');

    expect(mockRoom.emit).toHaveBeenCalledWith('message:deleted', 'm-1');
  });
});

describe('emitToRoom', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should emit to a custom room', () => {
    emitToRoom('custom-room', 'entity:updated', {
      type: 'PART',
      id: 'p-1',
      action: 'updated',
    });

    expect(mockIoInstance.to).toHaveBeenCalledWith('custom-room');
    expect(mockRoom.emit).toHaveBeenCalled();
  });
});

describe('emitToAll', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should emit entity:updated to all clients', () => {
    const payload = { type: 'PART', id: 'p-1', action: 'created' as const };
    emitToAll('entity:updated', payload);

    expect(mockIoInstance.emit).toHaveBeenCalledWith('entity:updated', payload);
  });

  it('should emit user:online to all clients', () => {
    emitToAll('user:online', 'u-1');

    expect(mockIoInstance.emit).toHaveBeenCalledWith('user:online', 'u-1');
  });

  it('should emit user:offline to all clients', () => {
    emitToAll('user:offline', 'u-1');

    expect(mockIoInstance.emit).toHaveBeenCalledWith('user:offline', 'u-1');
  });
});

describe('broadcast helpers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('broadcastNewMessage should emit to thread', () => {
    broadcastNewMessage('t-1', mockMessage);

    expect(mockIoInstance.to).toHaveBeenCalledWith('thread:t-1');
    expect(mockRoom.emit).toHaveBeenCalledWith('message:new', mockMessage);
  });

  it('broadcastMessageUpdate should emit to thread', () => {
    broadcastMessageUpdate('t-1', mockMessage);

    expect(mockRoom.emit).toHaveBeenCalledWith('message:updated', mockMessage);
  });

  it('broadcastMessageDelete should emit to thread', () => {
    broadcastMessageDelete('t-1', 'm-1');

    expect(mockRoom.emit).toHaveBeenCalledWith('message:deleted', 'm-1');
  });

  it('broadcastNotification should emit to user', () => {
    broadcastNotification('u-1', mockNotification);

    expect(mockIoInstance.to).toHaveBeenCalledWith('user:u-1');
    expect(mockRoom.emit).toHaveBeenCalledWith('notification:new', mockNotification);
  });

  it('broadcastEntityUpdate should emit to all', () => {
    broadcastEntityUpdate('PART', 'p-1', 'created', { name: 'Bolt' });

    expect(mockIoInstance.emit).toHaveBeenCalledWith('entity:updated', {
      type: 'PART',
      id: 'p-1',
      action: 'created',
      data: { name: 'Bolt' },
    });
  });
});
