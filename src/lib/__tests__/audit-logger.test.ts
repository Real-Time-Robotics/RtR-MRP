/**
 * Audit Logger Unit Tests
 * Tests for AuditLogger class: log, logCreate, logUpdate, logDelete, logStatusChange
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';

// Mock Prisma before importing the module under test
vi.mock('@/lib/prisma', () => ({
  prisma: {
    auditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/request-context', () => ({
  getClientIp: vi.fn(() => '127.0.0.1'),
  getRequestId: vi.fn(() => 'req-123'),
  getRoute: vi.fn(() => '/api/test'),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    logError: vi.fn(),
  },
}));

import { prisma } from '@/lib/prisma';
import { AuditLogger, auditLogger } from '../audit/audit-logger';

describe('AuditLogger', () => {
  let logger: AuditLogger;

  beforeEach(() => {
    vi.clearAllMocks();
    logger = new AuditLogger();
  });

  // ===========================================================================
  // log()
  // ===========================================================================
  describe('log()', () => {
    it('should create an audit log entry and return its id', async () => {
      (prisma.auditLog.create as Mock).mockResolvedValue({ id: 'audit-1' });

      const result = await logger.log({
        entityType: 'PART',
        entityId: 'part-1',
        entityName: 'Bolt M8',
        action: 'CREATE',
        userId: 'user-1',
      });

      expect(result).toBe('audit-1');
      expect(prisma.auditLog.create).toHaveBeenCalledOnce();
      const callArgs = (prisma.auditLog.create as Mock).mock.calls[0][0];
      expect(callArgs.data.entityType).toBe('PART');
      expect(callArgs.data.entityId).toBe('part-1');
      expect(callArgs.data.action).toBe('CREATE');
      expect(callArgs.data.userId).toBe('user-1');
    });

    it('should merge userRole and sessionId into metadata', async () => {
      (prisma.auditLog.create as Mock).mockResolvedValue({ id: 'audit-2' });

      await logger.log({
        entityType: 'PART',
        entityId: 'part-1',
        action: 'UPDATE',
        userId: 'user-1',
        userRole: 'admin',
        sessionId: 'sess-abc',
        metadata: { extra: 'value' },
      });

      const callArgs = (prisma.auditLog.create as Mock).mock.calls[0][0];
      expect(callArgs.data.metadata).toEqual({
        extra: 'value',
        userRole: 'admin',
        sessionId: 'sess-abc',
      });
    });

    it('should use Prisma.JsonNull for optional fields when not provided', async () => {
      (prisma.auditLog.create as Mock).mockResolvedValue({ id: 'audit-3' });

      await logger.log({
        entityType: 'ORDER',
        entityId: 'order-1',
        action: 'DELETE',
        userId: 'user-1',
      });

      const callArgs = (prisma.auditLog.create as Mock).mock.calls[0][0];
      // oldValues and newValues should be JsonNull when not provided
      expect(callArgs.data.oldValues).toBeDefined();
      expect(callArgs.data.newValues).toBeDefined();
    });
  });

  // ===========================================================================
  // logCreate()
  // ===========================================================================
  describe('logCreate()', () => {
    it('should generate correct summary for create action', async () => {
      (prisma.auditLog.create as Mock).mockResolvedValue({ id: 'audit-c1' });

      const result = await logger.logCreate(
        'PURCHASE_ORDER',
        'po-1',
        'PO-2024-001',
        'user-1',
        { amount: 1000 }
      );

      expect(result).toBe('audit-c1');
      const callArgs = (prisma.auditLog.create as Mock).mock.calls[0][0];
      expect(callArgs.data.action).toBe('CREATE');
      expect(callArgs.data.entityType).toBe('PURCHASE_ORDER');
      expect(callArgs.data.entityName).toBe('PO-2024-001');
    });

    it('should pass context fields (userRole, ipAddress, userAgent)', async () => {
      (prisma.auditLog.create as Mock).mockResolvedValue({ id: 'audit-c2' });

      await logger.logCreate(
        'PART',
        'part-1',
        'Bolt M8',
        'user-1',
        { partNumber: 'PN-001' },
        { userRole: 'manager', ipAddress: '10.0.0.1', userAgent: 'TestAgent' }
      );

      const callArgs = (prisma.auditLog.create as Mock).mock.calls[0][0];
      expect(callArgs.data.ipAddress).toBe('10.0.0.1');
      expect(callArgs.data.userAgent).toBe('TestAgent');
    });
  });

  // ===========================================================================
  // logUpdate()
  // ===========================================================================
  describe('logUpdate()', () => {
    it('should calculate field changes correctly', async () => {
      (prisma.auditLog.create as Mock).mockResolvedValue({ id: 'audit-u1' });

      const oldData = { name: 'Old Name', quantity: 10, status: 'DRAFT' };
      const newData = { name: 'New Name', quantity: 10, status: 'CONFIRMED' };

      const result = await logger.logUpdate(
        'SALES_ORDER',
        'so-1',
        'SO-001',
        'user-1',
        oldData,
        newData
      );

      expect(result).toBe('audit-u1');
      const callArgs = (prisma.auditLog.create as Mock).mock.calls[0][0];
      expect(callArgs.data.action).toBe('UPDATE');

      // Check that metadata contains fieldChanges
      const metadata = callArgs.data.metadata;
      expect(metadata.fieldChanges).toBeDefined();
      expect(metadata.fieldChanges).toHaveLength(2); // name and status changed, quantity unchanged
      const changedFields = metadata.fieldChanges.map((c: { field: string }) => c.field);
      expect(changedFields).toContain('name');
      expect(changedFields).toContain('status');
      expect(changedFields).not.toContain('quantity');
    });

    it('should return null when no actual changes detected', async () => {
      const oldData = { name: 'Same Name', quantity: 10 };
      const newData = { name: 'Same Name', quantity: 10 };

      const result = await logger.logUpdate(
        'PART',
        'part-1',
        'PN-001',
        'user-1',
        oldData,
        newData
      );

      expect(result).toBeNull();
      expect(prisma.auditLog.create).not.toHaveBeenCalled();
    });

    it('should ignore id, createdAt, updatedAt, version, deletedAt fields', async () => {
      (prisma.auditLog.create as Mock).mockResolvedValue({ id: 'audit-u2' });

      const oldData = { id: '1', createdAt: 'old', updatedAt: 'old', version: 1, name: 'A' };
      const newData = { id: '2', createdAt: 'new', updatedAt: 'new', version: 2, name: 'B' };

      await logger.logUpdate('PART', 'part-1', 'PN-001', 'user-1', oldData, newData);

      const callArgs = (prisma.auditLog.create as Mock).mock.calls[0][0];
      const fieldChanges = callArgs.data.metadata.fieldChanges;
      // Only 'name' should have changed (id, createdAt, etc. are ignored)
      expect(fieldChanges).toHaveLength(1);
      expect(fieldChanges[0].field).toBe('name');
    });

    it('should generate single-field update summary correctly', async () => {
      (prisma.auditLog.create as Mock).mockResolvedValue({ id: 'audit-u3' });

      const oldData = { name: 'Widget A' };
      const newData = { name: 'Widget B' };

      await logger.logUpdate('PART', 'part-1', 'PN-001', 'user-1', oldData, newData);

      const callArgs = (prisma.auditLog.create as Mock).mock.calls[0][0];
      // For single field changes, summary contains the old and new values
      expect(callArgs.data.action).toBe('UPDATE');
    });

    it('should generate multi-field update summary correctly', async () => {
      (prisma.auditLog.create as Mock).mockResolvedValue({ id: 'audit-u4' });

      const oldData = { name: 'Widget A', quantity: 5, status: 'DRAFT' };
      const newData = { name: 'Widget B', quantity: 10, status: 'ACTIVE' };

      await logger.logUpdate('PART', 'part-1', 'PN-001', 'user-1', oldData, newData);

      const callArgs = (prisma.auditLog.create as Mock).mock.calls[0][0];
      const metadata = callArgs.data.metadata;
      expect(metadata.fieldChanges).toHaveLength(3);
    });
  });

  // ===========================================================================
  // logDelete()
  // ===========================================================================
  describe('logDelete()', () => {
    it('should generate correct summary for delete action', async () => {
      (prisma.auditLog.create as Mock).mockResolvedValue({ id: 'audit-d1' });

      const result = await logger.logDelete(
        'SUPPLIER',
        'sup-1',
        'MotorTech Inc.',
        'user-1',
        { name: 'MotorTech Inc.', code: 'MT-001' }
      );

      expect(result).toBe('audit-d1');
      const callArgs = (prisma.auditLog.create as Mock).mock.calls[0][0];
      expect(callArgs.data.action).toBe('DELETE');
      expect(callArgs.data.entityType).toBe('SUPPLIER');
      expect(callArgs.data.entityName).toBe('MotorTech Inc.');
      expect(callArgs.data.oldValues).toEqual({ name: 'MotorTech Inc.', code: 'MT-001' });
    });

    it('should work without deletedData parameter', async () => {
      (prisma.auditLog.create as Mock).mockResolvedValue({ id: 'audit-d2' });

      const result = await logger.logDelete('PART', 'part-1', 'PN-001', 'user-1');

      expect(result).toBe('audit-d2');
      const callArgs = (prisma.auditLog.create as Mock).mock.calls[0][0];
      expect(callArgs.data.action).toBe('DELETE');
    });
  });

  // ===========================================================================
  // logStatusChange()
  // ===========================================================================
  describe('logStatusChange()', () => {
    it('should generate correct summary for status change', async () => {
      (prisma.auditLog.create as Mock).mockResolvedValue({ id: 'audit-sc1' });

      const result = await logger.logStatusChange(
        'WORK_ORDER',
        'wo-1',
        'WO-2024-001',
        'user-1',
        'PLANNED',
        'IN_PROGRESS'
      );

      expect(result).toBe('audit-sc1');
      const callArgs = (prisma.auditLog.create as Mock).mock.calls[0][0];
      expect(callArgs.data.action).toBe('STATUS_CHANGE');
      expect(callArgs.data.oldValues).toEqual({ status: 'PLANNED' });
      expect(callArgs.data.newValues).toEqual({ status: 'IN_PROGRESS' });
    });

    it('should include field changes in metadata', async () => {
      (prisma.auditLog.create as Mock).mockResolvedValue({ id: 'audit-sc2' });

      await logger.logStatusChange(
        'SALES_ORDER',
        'so-1',
        'SO-001',
        'user-1',
        'DRAFT',
        'CONFIRMED'
      );

      const callArgs = (prisma.auditLog.create as Mock).mock.calls[0][0];
      const metadata = callArgs.data.metadata;
      expect(metadata.fieldChanges).toEqual([
        { field: 'status', oldValue: 'DRAFT', newValue: 'CONFIRMED' },
      ]);
    });

    it('should pass context when provided', async () => {
      (prisma.auditLog.create as Mock).mockResolvedValue({ id: 'audit-sc3' });

      await logger.logStatusChange(
        'NCR',
        'ncr-1',
        'NCR-001',
        'user-1',
        'OPEN',
        'CLOSED',
        { userRole: 'inspector', ipAddress: '10.0.0.5' }
      );

      const callArgs = (prisma.auditLog.create as Mock).mock.calls[0][0];
      expect(callArgs.data.ipAddress).toBe('10.0.0.5');
      // userRole is merged into metadata
      expect(callArgs.data.metadata.userRole).toBe('inspector');
    });
  });

  // ===========================================================================
  // Singleton export
  // ===========================================================================
  describe('auditLogger singleton', () => {
    it('should be an instance of AuditLogger', () => {
      expect(auditLogger).toBeInstanceOf(AuditLogger);
    });
  });
});
