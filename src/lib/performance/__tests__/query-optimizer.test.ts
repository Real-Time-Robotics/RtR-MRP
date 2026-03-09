import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: vi.fn((queries: unknown[]) => Promise.resolve(queries.map(() => []))),
  },
}));

import {
  getPaginationParams,
  createPaginatedResult,
  buildSelect,
  DEFAULT_SELECTS,
  buildCursorPagination,
  processCursorResult,
  buildSearchConditions,
  buildFullTextSearch,
  buildAggregation,
  withTimeout,
  chunkOperation,
} from '../query-optimizer';

describe('query-optimizer', () => {
  // ===========================================================================
  // getPaginationParams
  // ===========================================================================
  describe('getPaginationParams', () => {
    it('should calculate skip and take for page 1', () => {
      const result = getPaginationParams({ page: 1, pageSize: 20 });
      expect(result).toEqual({ skip: 0, take: 20 });
    });

    it('should calculate skip and take for page 3', () => {
      const result = getPaginationParams({ page: 3, pageSize: 10 });
      expect(result).toEqual({ skip: 20, take: 10 });
    });
  });

  // ===========================================================================
  // createPaginatedResult
  // ===========================================================================
  describe('createPaginatedResult', () => {
    it('should create paginated result with correct metadata', () => {
      const items = [{ id: '1' }, { id: '2' }];
      const result = createPaginatedResult(items, 50, { page: 2, pageSize: 10 });

      expect(result.items).toEqual(items);
      expect(result.total).toBe(50);
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(10);
      expect(result.totalPages).toBe(5);
      expect(result.hasNext).toBe(true);
      expect(result.hasPrevious).toBe(true);
    });

    it('should set hasNext=false on last page', () => {
      const result = createPaginatedResult([], 20, { page: 2, pageSize: 10 });
      expect(result.hasNext).toBe(false);
    });

    it('should set hasPrevious=false on first page', () => {
      const result = createPaginatedResult([], 20, { page: 1, pageSize: 10 });
      expect(result.hasPrevious).toBe(false);
    });

    it('should handle zero total', () => {
      const result = createPaginatedResult([], 0, { page: 1, pageSize: 10 });
      expect(result.totalPages).toBe(0);
      expect(result.hasNext).toBe(false);
    });
  });

  // ===========================================================================
  // buildSelect
  // ===========================================================================
  describe('buildSelect', () => {
    it('should return select object with only allowed fields', () => {
      const result = buildSelect(['name', 'id', 'secret'], ['id', 'name', 'email']);
      expect(result).toEqual({ name: true, id: true });
    });

    it('should return undefined for empty fields', () => {
      expect(buildSelect([], ['id'])).toBeUndefined();
    });

    it('should return undefined when no fields match allowed list', () => {
      expect(buildSelect(['secret'], ['id', 'name'])).toBeUndefined();
    });
  });

  // ===========================================================================
  // DEFAULT_SELECTS
  // ===========================================================================
  describe('DEFAULT_SELECTS', () => {
    it('should have part list and detail selects', () => {
      expect(DEFAULT_SELECTS.part.list).toBeDefined();
      expect(DEFAULT_SELECTS.part.list.id).toBe(true);
      expect(DEFAULT_SELECTS.part.detail).toBeDefined();
    });

    it('should have workOrder selects', () => {
      expect(DEFAULT_SELECTS.workOrder.list).toBeDefined();
      expect(DEFAULT_SELECTS.workOrder.detail).toBe(true);
    });

    it('should have inventory selects', () => {
      expect(DEFAULT_SELECTS.inventory.list).toBeDefined();
    });
  });

  // ===========================================================================
  // buildCursorPagination
  // ===========================================================================
  describe('buildCursorPagination', () => {
    it('should build forward pagination without cursor', () => {
      const result = buildCursorPagination({ take: 10 });
      expect(result).toEqual({ take: 11 }); // take + 1 for hasMore check
    });

    it('should build forward pagination with cursor', () => {
      const result = buildCursorPagination({ cursor: 'abc', take: 10 });
      expect(result).toEqual({
        take: 11,
        cursor: { id: 'abc' },
        skip: 1,
      });
    });

    it('should build backward pagination', () => {
      const result = buildCursorPagination({
        cursor: 'abc',
        take: 10,
        direction: 'backward',
      });
      expect(result.take).toBe(-11);
    });

    it('should use custom cursor field', () => {
      const result = buildCursorPagination(
        { cursor: 'abc', take: 5 },
        'orderNumber',
      );
      expect(result.cursor).toEqual({ orderNumber: 'abc' });
    });
  });

  // ===========================================================================
  // processCursorResult
  // ===========================================================================
  describe('processCursorResult', () => {
    it('should detect hasMore when items exceed take', () => {
      const items = [
        { id: '1' },
        { id: '2' },
        { id: '3' },
      ];
      const result = processCursorResult(items, 2);
      expect(result.hasMore).toBe(true);
      expect(result.items).toHaveLength(2);
      expect(result.nextCursor).toBe('2');
      expect(result.previousCursor).toBe('1');
    });

    it('should set hasMore=false when items fit within take', () => {
      const items = [{ id: '1' }, { id: '2' }];
      const result = processCursorResult(items, 5);
      expect(result.hasMore).toBe(false);
      expect(result.items).toHaveLength(2);
    });

    it('should reverse items for backward direction', () => {
      const items = [{ id: '3' }, { id: '2' }, { id: '1' }];
      const result = processCursorResult(items, 5, 'backward');
      expect(result.items[0].id).toBe('1');
      expect(result.items[2].id).toBe('3');
    });

    it('should handle empty items', () => {
      const result = processCursorResult([], 10);
      expect(result.items).toHaveLength(0);
      expect(result.nextCursor).toBeNull();
      expect(result.previousCursor).toBeNull();
      expect(result.hasMore).toBe(false);
    });
  });

  // ===========================================================================
  // buildSearchConditions
  // ===========================================================================
  describe('buildSearchConditions', () => {
    it('should return undefined for empty search', () => {
      expect(buildSearchConditions('', ['name'])).toBeUndefined();
      expect(buildSearchConditions(undefined, ['name'])).toBeUndefined();
      expect(buildSearchConditions('   ', ['name'])).toBeUndefined();
    });

    it('should use startsWith for short search terms (<=3 chars)', () => {
      const result = buildSearchConditions('ab', ['name', 'code']);
      expect(result).toBeDefined();
      expect(result!.OR).toHaveLength(2);
      expect(result!.OR[0]).toEqual({
        name: { startsWith: 'ab', mode: 'insensitive' },
      });
    });

    it('should use contains for longer search terms', () => {
      const result = buildSearchConditions('search term', ['name']);
      expect(result!.OR[0]).toEqual({
        name: { contains: 'search term', mode: 'insensitive' },
      });
    });
  });

  // ===========================================================================
  // buildFullTextSearch
  // ===========================================================================
  describe('buildFullTextSearch', () => {
    it('should return undefined for empty search', () => {
      expect(buildFullTextSearch('')).toBeUndefined();
      expect(buildFullTextSearch(undefined)).toBeUndefined();
    });

    it('should convert search to tsquery format', () => {
      const result = buildFullTextSearch('hello world');
      expect(result).toEqual({
        searchVector: { search: 'hello:* & world:*' },
      });
    });

    it('should use custom field name', () => {
      const result = buildFullTextSearch('test', 'searchIndex');
      expect(result).toEqual({
        searchIndex: { search: 'test:*' },
      });
    });
  });

  // ===========================================================================
  // buildAggregation
  // ===========================================================================
  describe('buildAggregation', () => {
    it('should build aggregation config', () => {
      const result = buildAggregation(['status'], {
        _count: true,
        _sum: { quantity: true },
      });

      expect(result).toEqual({
        by: ['status'],
        _count: true,
        _sum: { quantity: true },
      });
    });
  });

  // ===========================================================================
  // withTimeout
  // ===========================================================================
  describe('withTimeout', () => {
    it('should resolve when query completes within timeout', async () => {
      const query = Promise.resolve('data');
      const result = await withTimeout(query, 1000);
      expect(result).toBe('data');
    });

    it('should reject when query exceeds timeout', async () => {
      const query = new Promise((resolve) => setTimeout(resolve, 500));
      await expect(withTimeout(query, 10)).rejects.toThrow('Query timeout');
    });
  });

  // ===========================================================================
  // chunkOperation
  // ===========================================================================
  describe('chunkOperation', () => {
    it('should process items in chunks', async () => {
      const items = [1, 2, 3, 4, 5];
      const operation = vi.fn().mockImplementation((chunk: number[]) =>
        Promise.resolve(chunk.map((x) => x * 2)),
      );

      const results = await chunkOperation(items, 2, operation);

      expect(operation).toHaveBeenCalledTimes(3); // 2+2+1
      expect(results).toEqual([2, 4, 6, 8, 10]);
    });

    it('should handle empty array', async () => {
      const operation = vi.fn().mockResolvedValue([]);
      const results = await chunkOperation([], 10, operation);
      expect(results).toEqual([]);
      expect(operation).not.toHaveBeenCalled();
    });
  });
});
