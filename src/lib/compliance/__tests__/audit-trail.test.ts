import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createAuditEntry,
  createBatchAuditEntries,
  verifyAuditTrailIntegrity,
  searchAuditTrail,
  getEntityHistory,
  getSecurityEvents,
  getComplianceEvents,
  generateAuditReport,
  createAuditMiddleware,
} from '../audit-trail';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    auditTrailEntry: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';

const mp = prisma as unknown as {
  auditTrailEntry: {
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
};

describe('Audit Trail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createAuditEntry', () => {
    it('should create an audit entry with SHA-256 hashes', async () => {
      mp.auditTrailEntry.findFirst.mockResolvedValue(null);
      mp.auditTrailEntry.create.mockResolvedValue({ id: 'audit-1' });

      const id = await createAuditEntry({
        action: 'CREATE',
        entityType: 'Part',
        entityId: 'part-1',
        changeSummary: 'Created new part',
      });

      expect(id).toBe('audit-1');
      const data = mp.auditTrailEntry.create.mock.calls[0][0].data;
      expect(data.action).toBe('CREATE');
      expect(data.entryHash).toHaveLength(64);
      expect(data.chainHash).toHaveLength(64);
    });

    it('should chain hash with previous entry', async () => {
      mp.auditTrailEntry.findFirst.mockResolvedValue({ chainHash: 'abc123prevhash' });
      mp.auditTrailEntry.create.mockResolvedValue({ id: 'audit-2' });

      await createAuditEntry({ action: 'UPDATE', entityType: 'Part', entityId: 'part-1' });

      const data = mp.auditTrailEntry.create.mock.calls[0][0].data;
      expect(data.chainHash).not.toBe(data.entryHash);
    });

    it('should set retention to extended for security events', async () => {
      mp.auditTrailEntry.findFirst.mockResolvedValue(null);
      mp.auditTrailEntry.create.mockResolvedValue({ id: 'audit-3' });

      await createAuditEntry({
        action: 'LOGIN_FAILED',
        entityType: 'Auth',
        isSecurityEvent: true,
      });

      expect(mp.auditTrailEntry.create.mock.calls[0][0].data.retentionCategory).toBe('extended');
    });

    it('should set retention to permanent for SIGNATURE_CREATED', async () => {
      mp.auditTrailEntry.findFirst.mockResolvedValue(null);
      mp.auditTrailEntry.create.mockResolvedValue({ id: 'audit-4' });

      await createAuditEntry({ action: 'SIGNATURE_CREATED', entityType: 'Document', entityId: 'doc-1' });

      expect(mp.auditTrailEntry.create.mock.calls[0][0].data.retentionCategory).toBe('permanent');
    });

    it('should set retention to permanent for ITAR entity types', async () => {
      mp.auditTrailEntry.findFirst.mockResolvedValue(null);
      mp.auditTrailEntry.create.mockResolvedValue({ id: 'audit-5' });

      await createAuditEntry({ action: 'READ', entityType: 'ITARControlledItem', entityId: 'item-1' });

      expect(mp.auditTrailEntry.create.mock.calls[0][0].data.retentionCategory).toBe('permanent');
    });

    it('should serialize complex values', async () => {
      mp.auditTrailEntry.findFirst.mockResolvedValue(null);
      mp.auditTrailEntry.create.mockResolvedValue({ id: 'audit-6' });

      await createAuditEntry({
        action: 'UPDATE',
        entityType: 'Part',
        entityId: 'part-1',
        oldValue: { quantity: 10 },
        newValue: { quantity: 20 },
      });

      const data = mp.auditTrailEntry.create.mock.calls[0][0].data;
      expect(data.oldValue).toBe('{"quantity":10}');
      expect(data.newValue).toBe('{"quantity":20}');
    });

    it('should pass context fields through', async () => {
      mp.auditTrailEntry.findFirst.mockResolvedValue(null);
      mp.auditTrailEntry.create.mockResolvedValue({ id: 'audit-7' });

      await createAuditEntry(
        { action: 'READ', entityType: 'Part' },
        { userId: 'user-1', userName: 'John', ipAddress: '192.168.1.1', sessionId: 'sess-1' }
      );

      const data = mp.auditTrailEntry.create.mock.calls[0][0].data;
      expect(data.userId).toBe('user-1');
      expect(data.userName).toBe('John');
      expect(data.ipAddress).toBe('192.168.1.1');
    });

    it('should handle null/undefined values', async () => {
      mp.auditTrailEntry.findFirst.mockResolvedValue(null);
      mp.auditTrailEntry.create.mockResolvedValue({ id: 'audit-8' });

      await createAuditEntry({
        action: 'CREATE',
        entityType: 'Part',
        oldValue: null,
        newValue: undefined,
      });

      const data = mp.auditTrailEntry.create.mock.calls[0][0].data;
      expect(data.oldValue).toBeNull();
      expect(data.newValue).toBeNull();
    });
  });

  describe('createBatchAuditEntries', () => {
    it('should create multiple entries and return IDs', async () => {
      mp.auditTrailEntry.findFirst.mockResolvedValue(null);
      mp.auditTrailEntry.create
        .mockResolvedValueOnce({ id: 'a1' })
        .mockResolvedValueOnce({ id: 'a2' });

      const ids = await createBatchAuditEntries([
        { action: 'CREATE', entityType: 'Part', entityId: 'p1' },
        { action: 'CREATE', entityType: 'Part', entityId: 'p2' },
      ]);

      expect(ids).toEqual(['a1', 'a2']);
      expect(mp.auditTrailEntry.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('verifyAuditTrailIntegrity', () => {
    it('should return valid for empty trail', async () => {
      mp.auditTrailEntry.findMany.mockResolvedValue([]);

      const result = await verifyAuditTrailIntegrity();
      expect(result.valid).toBe(true);
      expect(result.entriesChecked).toBe(0);
    });

    it('should return error on DB exception', async () => {
      mp.auditTrailEntry.findMany.mockRejectedValue(new Error('DB connection failed'));

      const result = await verifyAuditTrailIntegrity();
      expect(result.valid).toBe(false);
      expect(result.error).toBe('DB connection failed');
    });
  });

  describe('searchAuditTrail', () => {
    it('should search with basic params', async () => {
      mp.auditTrailEntry.findMany.mockResolvedValue([{ id: 'a1', action: 'CREATE' }]);
      mp.auditTrailEntry.count.mockResolvedValue(1);

      const result = await searchAuditTrail({
        userId: 'user-1',
        action: 'CREATE',
        entityType: 'Part',
      });

      expect(result.entries).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should handle array of actions', async () => {
      mp.auditTrailEntry.findMany.mockResolvedValue([]);
      mp.auditTrailEntry.count.mockResolvedValue(0);

      await searchAuditTrail({ action: ['CREATE', 'UPDATE'] });

      const where = mp.auditTrailEntry.findMany.mock.calls[0][0].where;
      expect(where.action).toEqual({ in: ['CREATE', 'UPDATE'] });
    });

    it('should apply date range', async () => {
      mp.auditTrailEntry.findMany.mockResolvedValue([]);
      mp.auditTrailEntry.count.mockResolvedValue(0);
      const from = new Date('2026-01-01');
      const to = new Date('2026-03-01');

      await searchAuditTrail({ fromDate: from, toDate: to });

      const where = mp.auditTrailEntry.findMany.mock.calls[0][0].where;
      expect(where.timestamp).toEqual({ gte: from, lte: to });
    });

    it('should apply searchText with OR', async () => {
      mp.auditTrailEntry.findMany.mockResolvedValue([]);
      mp.auditTrailEntry.count.mockResolvedValue(0);

      await searchAuditTrail({ searchText: 'test' });

      expect(mp.auditTrailEntry.findMany.mock.calls[0][0].where.OR).toHaveLength(3);
    });

    it('should apply limit and offset', async () => {
      mp.auditTrailEntry.findMany.mockResolvedValue([]);
      mp.auditTrailEntry.count.mockResolvedValue(0);

      await searchAuditTrail({ limit: 10, offset: 20 });

      const call = mp.auditTrailEntry.findMany.mock.calls[0][0];
      expect(call.take).toBe(10);
      expect(call.skip).toBe(20);
    });
  });

  describe('getEntityHistory', () => {
    it('should return mapped entity history', async () => {
      mp.auditTrailEntry.findMany.mockResolvedValue([
        { id: 'e1', action: 'CREATE', userName: 'John', userId: 'u1', fieldName: null, oldValue: null, newValue: 'data', changeSummary: 'Created', timestamp: new Date(), ipAddress: '10.0.0.1' },
      ]);

      const result = await getEntityHistory('Part', 'part-1');
      expect(result).toHaveLength(1);
      expect(result[0].action).toBe('CREATE');
      expect(result[0].userName).toBe('John');
    });
  });

  describe('getSecurityEvents', () => {
    it('should query with default limit', async () => {
      mp.auditTrailEntry.findMany.mockResolvedValue([]);
      await getSecurityEvents();
      expect(mp.auditTrailEntry.findMany.mock.calls[0][0].where.isSecurityEvent).toBe(true);
      expect(mp.auditTrailEntry.findMany.mock.calls[0][0].take).toBe(100);
    });

    it('should apply custom limit and fromDate', async () => {
      const from = new Date('2026-01-01');
      mp.auditTrailEntry.findMany.mockResolvedValue([]);
      await getSecurityEvents({ limit: 10, fromDate: from });
      const call = mp.auditTrailEntry.findMany.mock.calls[0][0];
      expect(call.take).toBe(10);
      expect(call.where.timestamp).toEqual({ gte: from });
    });
  });

  describe('getComplianceEvents', () => {
    it('should query compliance events', async () => {
      mp.auditTrailEntry.findMany.mockResolvedValue([]);
      await getComplianceEvents();
      expect(mp.auditTrailEntry.findMany.mock.calls[0][0].where.isComplianceEvent).toBe(true);
    });
  });

  describe('generateAuditReport', () => {
    it('should generate report with statistics', async () => {
      const entries = [
        { action: 'CREATE', entityType: 'Part', isSecurityEvent: false, isComplianceEvent: false, userId: 'u1' },
        { action: 'CREATE', entityType: 'Part', isSecurityEvent: false, isComplianceEvent: true, userId: 'u1' },
        { action: 'UPDATE', entityType: 'Order', isSecurityEvent: true, isComplianceEvent: false, userId: 'u2' },
      ];
      mp.auditTrailEntry.findMany
        .mockResolvedValueOnce(entries)     // report entries
        .mockResolvedValueOnce([]);         // integrity check

      const result = await generateAuditReport({
        fromDate: new Date('2026-01-01'),
        toDate: new Date('2026-03-01'),
      });

      expect(result.statistics.totalEntries).toBe(3);
      expect(result.statistics.securityEvents).toBe(1);
      expect(result.statistics.complianceEvents).toBe(1);
      expect(result.statistics.uniqueUsers).toBe(2);
      expect(result.statistics.byAction['CREATE']).toBe(2);
      expect(result.statistics.byEntityType['Part']).toBe(2);
    });
  });

  describe('createAuditMiddleware', () => {
    beforeEach(() => {
      mp.auditTrailEntry.findFirst.mockResolvedValue(null);
      mp.auditTrailEntry.create.mockResolvedValue({ id: 'a1' });
    });

    it('logCreate should create a CREATE entry', async () => {
      const mw = createAuditMiddleware({ userId: 'user-1' });
      await mw.logCreate('Part', 'part-1', { name: 'Widget' });
      expect(mp.auditTrailEntry.create.mock.calls[0][0].data.action).toBe('CREATE');
    });

    it('logUpdate should create one entry per change', async () => {
      const mw = createAuditMiddleware({ userId: 'user-1' });
      await mw.logUpdate('Part', 'part-1', [
        { field: 'name', oldValue: 'Old', newValue: 'New' },
        { field: 'status', oldValue: 'draft', newValue: 'active' },
      ]);
      expect(mp.auditTrailEntry.create).toHaveBeenCalledTimes(2);
    });

    it('logDelete should create a DELETE entry', async () => {
      const mw = createAuditMiddleware({ userId: 'user-1' });
      await mw.logDelete('Part', 'part-1', { name: 'Deleted' });
      expect(mp.auditTrailEntry.create.mock.calls[0][0].data.action).toBe('DELETE');
    });

    it('logAccess should create a READ entry', async () => {
      const mw = createAuditMiddleware({ userId: 'user-1' });
      await mw.logAccess('Part', 'part-1');
      expect(mp.auditTrailEntry.create.mock.calls[0][0].data.action).toBe('READ');
    });

    it('logSecurityEvent should mark as security event', async () => {
      const mw = createAuditMiddleware({ userId: 'user-1' });
      await mw.logSecurityEvent('LOGIN_FAILED', 'Invalid password');
      const data = mp.auditTrailEntry.create.mock.calls[0][0].data;
      expect(data.action).toBe('LOGIN_FAILED');
      expect(data.isSecurityEvent).toBe(true);
    });
  });
});
