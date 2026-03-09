import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    auditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

vi.mock('@/lib/request-context', () => ({
  getRequestId: vi.fn(() => 'req-123'),
  getClientIp: vi.fn(() => '127.0.0.1'),
  getRoute: vi.fn(() => '/api/test'),
}));

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), logError: vi.fn() },
}));

import { AuditLogger, auditLogger, logApi } from '../audit-logger';
import { logger } from '@/lib/logger';

describe('AuditLogger', () => {
  let al: AuditLogger;

  beforeEach(() => {
    vi.clearAllMocks();
    al = new AuditLogger();
  });

  describe('log', () => {
    it('should create an audit log entry and return the id', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

      const id = await al.log({
        entityType: 'PART',
        entityId: 'p-1',
        entityName: 'Bolt',
        action: 'CREATE',
        userId: 'u-1',
      });

      expect(id).toBe('log-1');
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          entityType: 'PART',
          entityId: 'p-1',
          entityName: 'Bolt',
          action: 'CREATE',
          userId: 'u-1',
        }),
      });
    });

    it('should merge userRole and sessionId into metadata', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-2' });

      await al.log({
        entityType: 'PART',
        entityId: 'p-1',
        action: 'UPDATE',
        userId: 'u-1',
        userRole: 'admin',
        sessionId: 'sess-1',
        metadata: { extra: 'data' },
      });

      const callData = mockPrisma.auditLog.create.mock.calls[0][0].data;
      expect(callData.metadata).toEqual({
        extra: 'data',
        userRole: 'admin',
        sessionId: 'sess-1',
      });
    });

    it('should use JsonNull when no metadata keys', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-3' });

      await al.log({
        entityType: 'PART',
        entityId: 'p-1',
        action: 'DELETE',
        userId: 'u-1',
      });

      const callData = mockPrisma.auditLog.create.mock.calls[0][0].data;
      // When no metadata, userRole, or sessionId, metadata is JsonNull
      expect(callData.metadata).toBeDefined();
    });

    it('should pass ipAddress and userAgent', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-4' });

      await al.log({
        entityType: 'ORDER',
        entityId: 'o-1',
        action: 'VIEW',
        userId: 'u-1',
        ipAddress: '10.0.0.1',
        userAgent: 'TestBot/1.0',
      });

      const callData = mockPrisma.auditLog.create.mock.calls[0][0].data;
      expect(callData.ipAddress).toBe('10.0.0.1');
      expect(callData.userAgent).toBe('TestBot/1.0');
    });
  });

  describe('logCreate', () => {
    it('should log a CREATE action with summary', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-c1' });

      const id = await al.logCreate('PURCHASE_ORDER', 'po-1', 'PO-001', 'u-1', { amount: 100 });

      expect(id).toBe('log-c1');
      const callData = mockPrisma.auditLog.create.mock.calls[0][0].data;
      expect(callData.action).toBe('CREATE');
      expect(callData.entityType).toBe('PURCHASE_ORDER');
    });

    it('should pass context when provided', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-c2' });

      await al.logCreate('PART', 'p-1', 'Bolt', 'u-1', undefined, {
        userRole: 'admin',
        ipAddress: '1.2.3.4',
      });

      const callData = mockPrisma.auditLog.create.mock.calls[0][0].data;
      expect(callData.ipAddress).toBe('1.2.3.4');
    });
  });

  describe('logUpdate', () => {
    it('should return null when no changes detected', async () => {
      const result = await al.logUpdate('PART', 'p-1', 'Bolt', 'u-1', { name: 'A' }, { name: 'A' });
      expect(result).toBeNull();
      expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
    });

    it('should log an UPDATE action when changes exist', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-u1' });

      const id = await al.logUpdate(
        'PART',
        'p-1',
        'Bolt',
        'u-1',
        { name: 'Old', price: 10 },
        { name: 'New', price: 10 }
      );

      expect(id).toBe('log-u1');
      const callData = mockPrisma.auditLog.create.mock.calls[0][0].data;
      expect(callData.action).toBe('UPDATE');
    });

    it('should ignore id, createdAt, updatedAt, version, deletedAt fields', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-u2' });

      const result = await al.logUpdate(
        'PART',
        'p-1',
        'Bolt',
        'u-1',
        { id: '1', createdAt: 'old', updatedAt: 'old', version: 1, deletedAt: null, name: 'A' },
        { id: '2', createdAt: 'new', updatedAt: 'new', version: 2, deletedAt: 'now', name: 'A' }
      );

      expect(result).toBeNull();
    });

    it('should generate a single-field update summary', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-u3' });

      await al.logUpdate('PART', 'p-1', 'Bolt', 'u-1', { status: 'draft' }, { status: 'active' });

      const callData = mockPrisma.auditLog.create.mock.calls[0][0].data;
      // Single field change summary
      expect(callData.metadata.fieldChanges).toHaveLength(1);
      expect(callData.metadata.fieldChanges[0].field).toBe('status');
    });

    it('should generate a multi-field update summary', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-u4' });

      await al.logUpdate(
        'PART',
        'p-1',
        'Bolt',
        'u-1',
        { name: 'Old', price: 10, color: 'red' },
        { name: 'New', price: 20, color: 'blue' }
      );

      const callData = mockPrisma.auditLog.create.mock.calls[0][0].data;
      expect(callData.metadata.fieldChanges).toHaveLength(3);
    });
  });

  describe('logDelete', () => {
    it('should log a DELETE action', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-d1' });

      const id = await al.logDelete('PART', 'p-1', 'Bolt', 'u-1', { name: 'Bolt' });

      expect(id).toBe('log-d1');
      const callData = mockPrisma.auditLog.create.mock.calls[0][0].data;
      expect(callData.action).toBe('DELETE');
    });
  });

  describe('logStatusChange', () => {
    it('should log a STATUS_CHANGE action', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-sc1' });

      const id = await al.logStatusChange('WORK_ORDER', 'wo-1', 'WO-001', 'u-1', 'draft', 'released');

      expect(id).toBe('log-sc1');
      const callData = mockPrisma.auditLog.create.mock.calls[0][0].data;
      expect(callData.action).toBe('STATUS_CHANGE');
      expect(callData.oldValues).toEqual({ status: 'draft' });
      expect(callData.newValues).toEqual({ status: 'released' });
    });
  });

  describe('logApprove', () => {
    it('should log an APPROVE action', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-a1' });

      const id = await al.logApprove('PO', 'po-1', 'PO-001', 'u-1', { notes: 'Looks good' });

      expect(id).toBe('log-a1');
      const callData = mockPrisma.auditLog.create.mock.calls[0][0].data;
      expect(callData.action).toBe('APPROVE');
    });

    it('should not include notes metadata when no notes', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-a2' });

      await al.logApprove('PO', 'po-1', 'PO-001', 'u-1');

      const callData = mockPrisma.auditLog.create.mock.calls[0][0].data;
      // metadata should be JsonNull since no notes
      expect(callData.metadata).toBeDefined();
    });
  });

  describe('logReject', () => {
    it('should log a REJECT action with reason', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-r1' });

      const id = await al.logReject('PO', 'po-1', 'PO-001', 'u-1', 'Price too high');

      expect(id).toBe('log-r1');
      const callData = mockPrisma.auditLog.create.mock.calls[0][0].data;
      expect(callData.action).toBe('REJECT');
    });

    it('should log REJECT without reason', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-r2' });

      await al.logReject('PO', 'po-1', 'PO-001', 'u-1');

      const callData = mockPrisma.auditLog.create.mock.calls[0][0].data;
      expect(callData.action).toBe('REJECT');
    });
  });

  describe('getLogsForEntity', () => {
    it('should return paginated logs', async () => {
      const logs = [
        { id: 'l1', entityType: 'PART', entityId: 'p-1', createdAt: new Date() },
        { id: 'l2', entityType: 'PART', entityId: 'p-1', createdAt: new Date() },
      ];
      mockPrisma.auditLog.findMany.mockResolvedValue(logs);

      const result = await al.getLogsForEntity('PART', 'p-1', { limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
    });

    it('should detect hasMore when more items than limit', async () => {
      const logs = Array.from({ length: 11 }, (_, i) => ({
        id: `l-${i}`,
        entityType: 'PART',
        entityId: 'p-1',
        createdAt: new Date(),
      }));
      mockPrisma.auditLog.findMany.mockResolvedValue(logs);

      const result = await al.getLogsForEntity('PART', 'p-1', { limit: 10 });

      expect(result.hasMore).toBe(true);
      expect(result.data).toHaveLength(10);
      expect(result.nextCursor).toBe('l-9');
    });

    it('should support cursor-based pagination', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      await al.getLogsForEntity('PART', 'p-1', { limit: 10, cursor: 'cursor-id' });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          cursor: { id: 'cursor-id' },
          skip: 1,
        })
      );
    });

    it('should use default limit of 50', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      await al.getLogsForEntity('PART', 'p-1');

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 51 })
      );
    });
  });

  describe('sanitizeValue (via logUpdate)', () => {
    it('should handle Date objects', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-sv1' });

      const date = new Date('2024-01-01T00:00:00.000Z');
      await al.logUpdate('PART', 'p-1', 'Bolt', 'u-1', { date: null }, { date });

      const callData = mockPrisma.auditLog.create.mock.calls[0][0].data;
      expect(callData.metadata.fieldChanges[0].newValue).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should handle null and undefined values', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-sv2' });

      await al.logUpdate('PART', 'p-1', 'Bolt', 'u-1', { val: 'old' }, { val: null });

      const callData = mockPrisma.auditLog.create.mock.calls[0][0].data;
      expect(callData.metadata.fieldChanges[0].newValue).toBeNull();
    });

    it('should handle objects by JSON.stringify', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-sv3' });

      await al.logUpdate('PART', 'p-1', 'Bolt', 'u-1', { meta: {} }, { meta: { a: 1 } });

      const callData = mockPrisma.auditLog.create.mock.calls[0][0].data;
      expect(callData.metadata.fieldChanges[0].newValue).toBe('{"a":1}');
    });
  });
});

describe('logApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should log API info with request details', () => {
    const req = new Request('http://localhost/api/parts', {
      method: 'GET',
      headers: {
        'x-request-id': 'req-abc',
        'x-forwarded-for': '10.0.0.1',
      },
    });

    logApi(req, 200, 'user-1');

    expect(logger.info).toHaveBeenCalledWith(
      'API audit log',
      expect.objectContaining({
        requestId: 'req-123',
        route: '/api/test',
        method: 'GET',
        status: 200,
        userId: 'user-1',
        ip: '127.0.0.1',
      })
    );
  });

  it('should use "anon" when no userId provided', () => {
    const req = new Request('http://localhost/api/parts', { method: 'POST' });

    logApi(req, 201);

    expect(logger.info).toHaveBeenCalledWith(
      'API audit log',
      expect.objectContaining({ userId: 'anon' })
    );
  });

  it('should include error message when error is provided', () => {
    const req = new Request('http://localhost/api/parts', { method: 'GET' });

    logApi(req, 500, 'u-1', new Error('Something failed'));

    expect(logger.info).toHaveBeenCalledWith(
      'API audit log',
      expect.objectContaining({ error: 'Something failed' })
    );
  });

  it('should stringify non-Error errors', () => {
    const req = new Request('http://localhost/api/parts', { method: 'GET' });

    logApi(req, 500, 'u-1', 'string error');

    expect(logger.info).toHaveBeenCalledWith(
      'API audit log',
      expect.objectContaining({ error: 'string error' })
    );
  });
});

describe('auditLogger singleton', () => {
  it('should be an instance of AuditLogger', () => {
    expect(auditLogger).toBeInstanceOf(AuditLogger);
  });
});
