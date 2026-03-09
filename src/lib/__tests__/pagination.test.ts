import { describe, it, expect } from 'vitest';
import {
  parsePaginationFromBody,
  buildOffsetPaginationQuery,
  buildCursorPaginationQuery,
  buildPaginatedResponse,
  buildCursorPaginatedResponse,
  calculateOptimalPageSize,
  buildSearchQuery,
  paginatedError,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MIN_PAGE_SIZE,
  type PaginationParams,
} from '../pagination';

describe('Pagination', () => {
  describe('constants', () => {
    it('should have correct defaults', () => {
      expect(DEFAULT_PAGE_SIZE).toBe(50);
      expect(MAX_PAGE_SIZE).toBe(100);
      expect(MIN_PAGE_SIZE).toBe(10);
    });
  });

  describe('parsePaginationFromBody', () => {
    it('should parse page and pageSize', () => {
      const result = parsePaginationFromBody({ page: '2', pageSize: '25' });
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(25);
    });

    it('should use defaults for missing values', () => {
      const result = parsePaginationFromBody({});
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(DEFAULT_PAGE_SIZE);
    });

    it('should clamp page to min 1', () => {
      const result = parsePaginationFromBody({ page: '-5' });
      expect(result.page).toBe(1);
    });

    it('should clamp pageSize to min/max', () => {
      expect(parsePaginationFromBody({ pageSize: '5' }).pageSize).toBe(MIN_PAGE_SIZE);
      expect(parsePaginationFromBody({ pageSize: '500' }).pageSize).toBe(MAX_PAGE_SIZE);
    });

    it('should parse sort options', () => {
      const result = parsePaginationFromBody({ sortBy: 'name', sortOrder: 'asc' });
      expect(result.sortBy).toBe('name');
      expect(result.sortOrder).toBe('asc');
    });
  });

  describe('buildOffsetPaginationQuery', () => {
    it('should calculate skip and take', () => {
      const result = buildOffsetPaginationQuery({ page: 3, pageSize: 20, sortOrder: 'desc' });
      expect(result.skip).toBe(40);
      expect(result.take).toBe(20);
    });

    it('should include orderBy when sortBy provided', () => {
      const result = buildOffsetPaginationQuery({ page: 1, pageSize: 10, sortBy: 'name', sortOrder: 'asc' });
      expect(result.orderBy).toEqual({ name: 'asc' });
    });

    it('should not include orderBy without sortBy', () => {
      const result = buildOffsetPaginationQuery({ page: 1, pageSize: 10, sortOrder: 'desc' });
      expect(result.orderBy).toBeUndefined();
    });
  });

  describe('buildCursorPaginationQuery', () => {
    it('should take pageSize + 1', () => {
      const result = buildCursorPaginationQuery({ page: 1, pageSize: 20, sortOrder: 'desc' });
      expect(result.take).toBe(21);
    });

    it('should include cursor when provided', () => {
      const result = buildCursorPaginationQuery({ page: 1, pageSize: 10, cursor: 'abc', sortOrder: 'desc' });
      expect(result.cursor).toEqual({ id: 'abc' });
      expect(result.skip).toBe(1);
    });
  });

  describe('buildPaginatedResponse', () => {
    const data = [{ id: '1', name: 'A' }, { id: '2', name: 'B' }];
    const params: PaginationParams = { page: 1, pageSize: 10, sortOrder: 'desc' };

    it('should build response with pagination info', () => {
      const result = buildPaginatedResponse(data, 20, params, Date.now());
      expect(result.data).toEqual(data);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.totalItems).toBe(20);
      expect(result.pagination.totalPages).toBe(2);
      expect(result.pagination.hasNextPage).toBe(true);
      expect(result.pagination.hasPrevPage).toBe(false);
    });

    it('should handle last page', () => {
      const result = buildPaginatedResponse(data, 20, { ...params, page: 2 }, Date.now());
      expect(result.pagination.hasNextPage).toBe(false);
      expect(result.pagination.hasPrevPage).toBe(true);
    });

    it('should handle empty data', () => {
      const result = buildPaginatedResponse([], 0, params, Date.now());
      expect(result.pagination.totalPages).toBe(0);
    });

    it('should include meta', () => {
      const result = buildPaginatedResponse(data, 20, params, Date.now(), true);
      expect(result.meta.cached).toBe(true);
    });
  });

  describe('buildCursorPaginatedResponse', () => {
    it('should detect hasMore', () => {
      const data = Array.from({ length: 11 }, (_, i) => ({ id: String(i) }));
      const result = buildCursorPaginatedResponse(data, { page: 1, pageSize: 10, sortOrder: 'desc' }, Date.now());
      expect(result.pagination.hasMore).toBe(true);
      expect(result.data).toHaveLength(10);
    });

    it('should detect no more', () => {
      const data = [{ id: '1' }];
      const result = buildCursorPaginatedResponse(data, { page: 1, pageSize: 10, sortOrder: 'desc' }, Date.now());
      expect(result.pagination.hasMore).toBe(false);
    });
  });

  describe('calculateOptimalPageSize', () => {
    it('should calculate based on target size', () => {
      const result = calculateOptimalPageSize(1000);
      expect(result).toBe(100);
    });

    it('should clamp to min', () => {
      const result = calculateOptimalPageSize(100000);
      expect(result).toBe(MIN_PAGE_SIZE);
    });
  });

  describe('buildSearchQuery', () => {
    it('should build OR query', () => {
      const result = buildSearchQuery('motor', ['name', 'description']);
      expect(result!.OR).toHaveLength(2);
    });

    it('should return undefined for empty search', () => {
      expect(buildSearchQuery('', ['name'])).toBeUndefined();
      expect(buildSearchQuery(null, ['name'])).toBeUndefined();
      expect(buildSearchQuery(undefined, ['name'])).toBeUndefined();
    });
  });

  describe('paginatedError', () => {
    it('should return error response', () => {
      const response = paginatedError('Not found', 404);
      expect(response.status).toBe(404);
    });

    it('should default to 500', () => {
      const response = paginatedError('Server error');
      expect(response.status).toBe(500);
    });
  });
});
