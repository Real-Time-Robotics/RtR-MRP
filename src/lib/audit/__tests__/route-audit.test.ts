import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockAuditMiddleware } = vi.hoisted(() => ({
  mockAuditMiddleware: {
    logCreate: vi.fn().mockResolvedValue(undefined),
    logUpdate: vi.fn().mockResolvedValue(undefined),
    logDelete: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/lib/compliance/audit-trail', () => ({
  createAuditMiddleware: vi.fn(() => mockAuditMiddleware),
}));

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), logError: vi.fn() },
}));

import { NextRequest } from 'next/server';
import {
  getAuditContext,
  getFieldChanges,
  auditCreate,
  auditUpdate,
  auditDelete,
  auditStatusChange,
} from '../route-audit';
import { createAuditMiddleware } from '@/lib/compliance/audit-trail';

function makeRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/test', {
    headers: new Headers(headers),
  });
}

describe('getAuditContext', () => {
  it('should extract user id and name', () => {
    const request = makeRequest({
      'x-forwarded-for': '10.0.0.1',
      'user-agent': 'TestAgent/1.0',
    });
    const user = { id: 'u-1', name: 'John', email: 'john@test.com' };

    const ctx = getAuditContext(request, user);

    expect(ctx).toEqual({
      userId: 'u-1',
      userName: 'John',
      ipAddress: '10.0.0.1',
      userAgent: 'TestAgent/1.0',
    });
  });

  it('should use email as userName when name is null', () => {
    const request = makeRequest();
    const user = { id: 'u-2', name: null, email: 'jane@test.com' };

    const ctx = getAuditContext(request, user);

    expect(ctx.userName).toBe('jane@test.com');
  });

  it('should handle null user', () => {
    const request = makeRequest();

    const ctx = getAuditContext(request, null);

    expect(ctx.userId).toBeUndefined();
    expect(ctx.userName).toBeUndefined();
  });

  it('should return undefined for missing headers', () => {
    const request = makeRequest();
    const user = { id: 'u-1', name: 'Test', email: 'test@test.com' };

    const ctx = getAuditContext(request, user);

    expect(ctx.ipAddress).toBeUndefined();
    expect(ctx.userAgent).toBeUndefined();
  });
});

describe('getFieldChanges', () => {
  it('should detect scalar field changes', () => {
    const oldObj = { name: 'Old', status: 'draft', count: 5 };
    const newObj = { name: 'New', status: 'draft', count: 10 };

    const changes = getFieldChanges(oldObj, newObj);

    expect(changes).toEqual([
      { field: 'name', oldValue: 'Old', newValue: 'New' },
      { field: 'count', oldValue: 5, newValue: 10 },
    ]);
  });

  it('should ignore createdAt and updatedAt', () => {
    const oldObj = { createdAt: 'old', updatedAt: 'old', name: 'Same' };
    const newObj = { createdAt: 'new', updatedAt: 'new', name: 'Same' };

    const changes = getFieldChanges(oldObj, newObj);

    expect(changes).toHaveLength(0);
  });

  it('should skip undefined new values', () => {
    const oldObj = { name: 'Old', status: 'draft' };
    const newObj = { name: 'New' };

    const changes = getFieldChanges(oldObj, newObj);

    expect(changes).toEqual([{ field: 'name', oldValue: 'Old', newValue: 'New' }]);
  });

  it('should skip nested objects and arrays', () => {
    const oldObj = { name: 'A', nested: { a: 1 }, list: [1, 2] };
    const newObj = { name: 'B', nested: { a: 2 }, list: [3, 4] };

    const changes = getFieldChanges(oldObj, newObj);

    expect(changes).toEqual([{ field: 'name', oldValue: 'A', newValue: 'B' }]);
  });

  it('should only track specified fields when fieldsToTrack provided', () => {
    const oldObj = { name: 'Old', status: 'draft', price: 100 };
    const newObj = { name: 'New', status: 'active', price: 200 };

    const changes = getFieldChanges(oldObj, newObj, ['status']);

    expect(changes).toEqual([{ field: 'status', oldValue: 'draft', newValue: 'active' }]);
  });

  it('should handle null values', () => {
    const oldObj = { name: null };
    const newObj = { name: 'New' };

    const changes = getFieldChanges(oldObj, newObj);

    expect(changes).toEqual([{ field: 'name', oldValue: null, newValue: 'New' }]);
  });

  it('should detect change from value to null', () => {
    const oldObj = { name: 'Old' };
    const newObj = { name: null };

    const changes = getFieldChanges(oldObj, newObj);

    expect(changes).toEqual([{ field: 'name', oldValue: 'Old', newValue: null }]);
  });
});

describe('auditCreate', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should call createAuditMiddleware and logCreate', () => {
    const request = makeRequest();
    const user = { id: 'u-1', name: 'Test', email: 'test@test.com' };

    auditCreate(request, user, 'PART', 'p-1', { name: 'Bolt' });

    expect(createAuditMiddleware).toHaveBeenCalled();
    expect(mockAuditMiddleware.logCreate).toHaveBeenCalledWith('PART', 'p-1', { name: 'Bolt' });
  });
});

describe('auditUpdate', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should not call logUpdate when no changes', () => {
    const request = makeRequest();
    const user = { id: 'u-1', name: 'Test', email: 'test@test.com' };

    auditUpdate(request, user, 'PART', 'p-1', { name: 'Same' }, { name: 'Same' });

    expect(mockAuditMiddleware.logUpdate).not.toHaveBeenCalled();
  });

  it('should call logUpdate when changes exist', () => {
    const request = makeRequest();
    const user = { id: 'u-1', name: 'Test', email: 'test@test.com' };

    auditUpdate(request, user, 'PART', 'p-1', { name: 'Old' }, { name: 'New' });

    expect(mockAuditMiddleware.logUpdate).toHaveBeenCalledWith('PART', 'p-1', [
      { field: 'name', oldValue: 'Old', newValue: 'New' },
    ]);
  });
});

describe('auditDelete', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should call logDelete', () => {
    const request = makeRequest();
    const user = { id: 'u-1', name: 'Test', email: 'test@test.com' };

    auditDelete(request, user, 'PART', 'p-1', { name: 'Bolt' });

    expect(mockAuditMiddleware.logDelete).toHaveBeenCalledWith('PART', 'p-1', { name: 'Bolt' });
  });
});

describe('auditStatusChange', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should call logUpdate with status field change', () => {
    const request = makeRequest();
    const user = { id: 'u-1', name: 'Test', email: 'test@test.com' };

    auditStatusChange(request, user, 'WORK_ORDER', 'wo-1', 'draft', 'released');

    expect(mockAuditMiddleware.logUpdate).toHaveBeenCalledWith('WORK_ORDER', 'wo-1', [
      { field: 'status', oldValue: 'draft', newValue: 'released' },
    ]);
  });
});
