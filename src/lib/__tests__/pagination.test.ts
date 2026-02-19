/**
 * Pagination Utility Unit Tests
 * Tests for all exported functions in src/lib/pagination.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  parsePaginationParams,
  parsePaginationFromBody,
  buildOffsetPaginationQuery,
  buildCursorPaginationQuery,
  buildPaginatedResponse,
  buildCursorPaginatedResponse,
  calculateOptimalPageSize,
  buildFilterQuery,
  buildSearchQuery,
  paginatedSuccess,
  paginatedError,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MIN_PAGE_SIZE,
} from '../pagination';

// Helper to create a NextRequest from a URL string
function createRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'));
}

// Helper to create mock data items with id field
function createMockItems(count: number): { id: string; name: string }[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `item-${i + 1}`,
    name: `Item ${i + 1}`,
  }));
}

describe('Pagination Utilities', () => {
  // ============================================
  // CONSTANTS
  // ============================================

  describe('Constants', () => {
    it('should export correct default constants', () => {
      expect(DEFAULT_PAGE_SIZE).toBe(50);
      expect(MAX_PAGE_SIZE).toBe(100);
      expect(MIN_PAGE_SIZE).toBe(10);
    });
  });

  // ============================================
  // parsePaginationParams
  // ============================================

  describe('parsePaginationParams', () => {
    it('should return default values when no params are provided', () => {
      const request = createRequest('/api/items');
      const result = parsePaginationParams(request);

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(DEFAULT_PAGE_SIZE);
      expect(result.cursor).toBeUndefined();
      expect(result.sortBy).toBeUndefined();
      expect(result.sortOrder).toBe('desc');
    });

    it('should parse custom page and pageSize', () => {
      const request = createRequest('/api/items?page=3&pageSize=25');
      const result = parsePaginationParams(request);

      expect(result.page).toBe(3);
      expect(result.pageSize).toBe(25);
    });

    it('should accept "limit" as an alias for "pageSize"', () => {
      const request = createRequest('/api/items?page=2&limit=30');
      const result = parsePaginationParams(request);

      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(30);
    });

    it('should cap pageSize at MAX_PAGE_SIZE', () => {
      const request = createRequest('/api/items?pageSize=500');
      const result = parsePaginationParams(request);

      expect(result.pageSize).toBe(MAX_PAGE_SIZE);
    });

    it('should enforce MIN_PAGE_SIZE as lower bound', () => {
      const request = createRequest('/api/items?pageSize=1');
      const result = parsePaginationParams(request);

      expect(result.pageSize).toBe(MIN_PAGE_SIZE);
    });

    it('should set page to 1 for negative page values', () => {
      const request = createRequest('/api/items?page=-5');
      const result = parsePaginationParams(request);

      expect(result.page).toBe(1);
    });

    it('should set page to 1 for page=0', () => {
      const request = createRequest('/api/items?page=0');
      const result = parsePaginationParams(request);

      expect(result.page).toBe(1);
    });

    it('should handle non-numeric page gracefully', () => {
      const request = createRequest('/api/items?page=abc');
      const result = parsePaginationParams(request);

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(DEFAULT_PAGE_SIZE);
    });

    it('should handle non-numeric pageSize gracefully', () => {
      const request = createRequest('/api/items?pageSize=abc');
      const result = parsePaginationParams(request);

      expect(result.pageSize).toBe(DEFAULT_PAGE_SIZE);
    });

    it('should parse cursor, sortBy, and sortOrder', () => {
      const request = createRequest(
        '/api/items?cursor=abc123&sortBy=createdAt&sortOrder=asc'
      );
      const result = parsePaginationParams(request);

      expect(result.cursor).toBe('abc123');
      expect(result.sortBy).toBe('createdAt');
      expect(result.sortOrder).toBe('asc');
    });

    it('should handle very large page numbers', () => {
      const request = createRequest('/api/items?page=999999');
      const result = parsePaginationParams(request);

      expect(result.page).toBe(999999);
    });
  });

  // ============================================
  // parsePaginationFromBody
  // ============================================

  describe('parsePaginationFromBody', () => {
    it('should return defaults for empty body', () => {
      const result = parsePaginationFromBody({});

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(DEFAULT_PAGE_SIZE);
      expect(result.sortOrder).toBe('desc');
    });

    it('should parse page and pageSize from body', () => {
      const result = parsePaginationFromBody({ page: 4, pageSize: 20 });

      expect(result.page).toBe(4);
      expect(result.pageSize).toBe(20);
    });

    it('should accept "limit" as alias for pageSize in body', () => {
      const result = parsePaginationFromBody({ page: 2, limit: 30 });

      expect(result.pageSize).toBe(30);
    });

    it('should cap pageSize at MAX_PAGE_SIZE in body', () => {
      const result = parsePaginationFromBody({ pageSize: 200 });

      expect(result.pageSize).toBe(MAX_PAGE_SIZE);
    });

    it('should enforce MIN_PAGE_SIZE in body', () => {
      const result = parsePaginationFromBody({ pageSize: 3 });

      expect(result.pageSize).toBe(MIN_PAGE_SIZE);
    });

    it('should clamp negative page to 1', () => {
      const result = parsePaginationFromBody({ page: -10 });

      expect(result.page).toBe(1);
    });
  });

  // ============================================
  // buildOffsetPaginationQuery
  // ============================================

  describe('buildOffsetPaginationQuery', () => {
    it('should calculate correct skip and take for page 1', () => {
      const result = buildOffsetPaginationQuery({
        page: 1,
        pageSize: 20,
      });

      expect(result.skip).toBe(0);
      expect(result.take).toBe(20);
    });

    it('should calculate correct skip for page 3 with pageSize 25', () => {
      const result = buildOffsetPaginationQuery({
        page: 3,
        pageSize: 25,
      });

      expect(result.skip).toBe(50); // (3-1) * 25
      expect(result.take).toBe(25);
    });

    it('should include orderBy when sortBy is provided', () => {
      const result = buildOffsetPaginationQuery({
        page: 1,
        pageSize: 10,
        sortBy: 'createdAt',
        sortOrder: 'asc',
      });

      expect(result.orderBy).toEqual({ createdAt: 'asc' });
    });

    it('should default sortOrder to desc when sortBy is provided but no sortOrder', () => {
      const result = buildOffsetPaginationQuery({
        page: 1,
        pageSize: 10,
        sortBy: 'name',
      });

      expect(result.orderBy).toEqual({ name: 'desc' });
    });

    it('should not include orderBy when sortBy is not provided', () => {
      const result = buildOffsetPaginationQuery({
        page: 2,
        pageSize: 50,
      });

      expect(result).not.toHaveProperty('orderBy');
    });
  });

  // ============================================
  // buildCursorPaginationQuery
  // ============================================

  describe('buildCursorPaginationQuery', () => {
    it('should take pageSize + 1 to detect hasMore', () => {
      const result = buildCursorPaginationQuery({
        page: 1,
        pageSize: 20,
      });

      expect(result.take).toBe(21); // pageSize + 1
    });

    it('should include cursor and skip when cursor is provided', () => {
      const result = buildCursorPaginationQuery({
        page: 1,
        pageSize: 20,
        cursor: 'cursor-abc',
      });

      expect(result.cursor).toEqual({ id: 'cursor-abc' });
      expect(result.skip).toBe(1);
      expect(result.take).toBe(21);
    });

    it('should not include cursor or skip when cursor is not provided', () => {
      const result = buildCursorPaginationQuery({
        page: 1,
        pageSize: 10,
      });

      expect(result).not.toHaveProperty('cursor');
      expect(result).not.toHaveProperty('skip');
    });

    it('should include orderBy when sortBy is provided', () => {
      const result = buildCursorPaginationQuery({
        page: 1,
        pageSize: 10,
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      });

      expect(result.orderBy).toEqual({ updatedAt: 'desc' });
    });
  });

  // ============================================
  // buildPaginatedResponse
  // ============================================

  describe('buildPaginatedResponse', () => {
    const startTime = Date.now() - 50; // 50ms ago

    it('should calculate totalPages correctly', () => {
      const data = createMockItems(10);
      const result = buildPaginatedResponse(data, 100, { page: 1, pageSize: 10 }, startTime);

      expect(result.pagination.totalPages).toBe(10);
      expect(result.pagination.totalItems).toBe(100);
    });

    it('should set hasNextPage to true when not on last page', () => {
      const data = createMockItems(20);
      const result = buildPaginatedResponse(data, 60, { page: 1, pageSize: 20 }, startTime);

      expect(result.pagination.hasNextPage).toBe(true);
      expect(result.pagination.hasPrevPage).toBe(false);
    });

    it('should set hasPrevPage to true when on page > 1', () => {
      const data = createMockItems(20);
      const result = buildPaginatedResponse(data, 60, { page: 2, pageSize: 20 }, startTime);

      expect(result.pagination.hasNextPage).toBe(true);
      expect(result.pagination.hasPrevPage).toBe(true);
    });

    it('should set hasNextPage to false on the last page', () => {
      const data = createMockItems(10);
      const result = buildPaginatedResponse(data, 30, { page: 3, pageSize: 10 }, startTime);

      expect(result.pagination.hasNextPage).toBe(false);
      expect(result.pagination.hasPrevPage).toBe(true);
    });

    it('should handle empty data', () => {
      const result = buildPaginatedResponse([], 0, { page: 1, pageSize: 20 }, startTime);

      expect(result.data).toEqual([]);
      expect(result.pagination.totalPages).toBe(0);
      expect(result.pagination.hasNextPage).toBe(false);
      expect(result.pagination.hasPrevPage).toBe(false);
      expect(result.pagination.nextCursor).toBeUndefined();
      expect(result.pagination.prevCursor).toBeUndefined();
    });

    it('should set nextCursor to last item id and prevCursor to first item id', () => {
      const data = createMockItems(3);
      const result = buildPaginatedResponse(data, 10, { page: 1, pageSize: 3 }, startTime);

      expect(result.pagination.nextCursor).toBe('item-3');
      expect(result.pagination.prevCursor).toBe('item-1');
    });

    it('should calculate totalPages with ceiling division', () => {
      const data = createMockItems(5);
      const result = buildPaginatedResponse(data, 23, { page: 1, pageSize: 10 }, startTime);

      // 23 / 10 = 2.3, ceil = 3
      expect(result.pagination.totalPages).toBe(3);
    });

    it('should include meta with took and cached fields', () => {
      const data = createMockItems(5);
      const result = buildPaginatedResponse(data, 5, { page: 1, pageSize: 10 }, startTime);

      expect(result.meta.took).toBeGreaterThanOrEqual(0);
      expect(result.meta.cached).toBe(false);
    });

    it('should set cached to true when specified', () => {
      const data = createMockItems(5);
      const result = buildPaginatedResponse(data, 5, { page: 1, pageSize: 10 }, startTime, true);

      expect(result.meta.cached).toBe(true);
    });
  });

  // ============================================
  // buildCursorPaginatedResponse
  // ============================================

  describe('buildCursorPaginatedResponse', () => {
    const startTime = Date.now() - 30;

    it('should detect hasMore when data exceeds pageSize', () => {
      // Simulate pageSize=3 but 4 items returned (the extra one for hasMore detection)
      const data = createMockItems(4);
      const result = buildCursorPaginatedResponse(data, { page: 1, pageSize: 3 }, startTime);

      expect(result.pagination.hasMore).toBe(true);
      expect(result.data).toHaveLength(3); // sliced to pageSize
      expect(result.pagination.nextCursor).toBe('item-3');
    });

    it('should set hasMore to false when data fits within pageSize', () => {
      const data = createMockItems(2);
      const result = buildCursorPaginatedResponse(data, { page: 1, pageSize: 5 }, startTime);

      expect(result.pagination.hasMore).toBe(false);
      expect(result.data).toHaveLength(2);
      expect(result.pagination.nextCursor).toBeNull();
    });

    it('should set prevCursor from params.cursor', () => {
      const data = createMockItems(2);
      const result = buildCursorPaginatedResponse(
        data,
        { page: 1, pageSize: 5, cursor: 'prev-cursor-id' },
        startTime
      );

      expect(result.pagination.prevCursor).toBe('prev-cursor-id');
    });

    it('should set prevCursor to null when no cursor in params', () => {
      const data = createMockItems(2);
      const result = buildCursorPaginatedResponse(data, { page: 1, pageSize: 5 }, startTime);

      expect(result.pagination.prevCursor).toBeNull();
    });

    it('should handle empty data', () => {
      const result = buildCursorPaginatedResponse([], { page: 1, pageSize: 10 }, startTime);

      expect(result.data).toEqual([]);
      expect(result.pagination.hasMore).toBe(false);
      expect(result.pagination.nextCursor).toBeNull();
    });
  });

  // ============================================
  // calculateOptimalPageSize
  // ============================================

  describe('calculateOptimalPageSize', () => {
    it('should calculate page size based on record size and target response size', () => {
      // 100000 / 1000 = 100, which equals MAX_PAGE_SIZE
      const result = calculateOptimalPageSize(1000);
      expect(result).toBe(MAX_PAGE_SIZE);
    });

    it('should not exceed MAX_PAGE_SIZE', () => {
      // 100000 / 100 = 1000, capped at 100
      const result = calculateOptimalPageSize(100);
      expect(result).toBe(MAX_PAGE_SIZE);
    });

    it('should not go below MIN_PAGE_SIZE', () => {
      // 100000 / 50000 = 2, floored to MIN_PAGE_SIZE
      const result = calculateOptimalPageSize(50000);
      expect(result).toBe(MIN_PAGE_SIZE);
    });

    it('should accept custom target response size', () => {
      // 5000 / 100 = 50
      const result = calculateOptimalPageSize(100, 5000);
      expect(result).toBe(50);
    });
  });

  // ============================================
  // buildSearchQuery
  // ============================================

  describe('buildSearchQuery', () => {
    it('should return undefined for null search term', () => {
      const result = buildSearchQuery(null, ['name', 'description']);
      expect(result).toBeUndefined();
    });

    it('should return undefined for undefined search term', () => {
      const result = buildSearchQuery(undefined, ['name']);
      expect(result).toBeUndefined();
    });

    it('should return undefined for empty string search term', () => {
      const result = buildSearchQuery('', ['name']);
      expect(result).toBeUndefined();
    });

    it('should return undefined for whitespace-only search term', () => {
      const result = buildSearchQuery('   ', ['name']);
      expect(result).toBeUndefined();
    });

    it('should build OR query for single search field', () => {
      const result = buildSearchQuery('motor', ['name']);

      expect(result).toEqual({
        OR: [{ name: { contains: 'motor', mode: 'insensitive' } }],
      });
    });

    it('should build OR query for multiple search fields', () => {
      const result = buildSearchQuery('motor', ['name', 'description', 'partNumber']);

      expect(result).toEqual({
        OR: [
          { name: { contains: 'motor', mode: 'insensitive' } },
          { description: { contains: 'motor', mode: 'insensitive' } },
          { partNumber: { contains: 'motor', mode: 'insensitive' } },
        ],
      });
    });

    it('should trim the search term', () => {
      const result = buildSearchQuery('  motor  ', ['name']);

      expect(result).toEqual({
        OR: [{ name: { contains: 'motor', mode: 'insensitive' } }],
      });
    });
  });

  // ============================================
  // buildFilterQuery
  // ============================================

  describe('buildFilterQuery', () => {
    it('should return empty object when no matching filters in URL', () => {
      const request = createRequest('/api/items');
      const result = buildFilterQuery(request, ['status', 'category']);

      expect(result).toEqual({});
    });

    it('should extract simple equality filter', () => {
      const request = createRequest('/api/items?status=active');
      const result = buildFilterQuery(request, ['status']);

      expect(result).toEqual({ status: 'active' });
    });

    it('should handle comma-separated values as "in" filter', () => {
      const request = createRequest('/api/items?status=active,pending,draft');
      const result = buildFilterQuery(request, ['status']);

      expect(result).toEqual({
        status: { in: ['active', 'pending', 'draft'] },
      });
    });

    it('should handle >= comparison operator', () => {
      const request = createRequest('/api/items?quantity=>=100');
      const result = buildFilterQuery(request, ['quantity']);

      expect(result).toEqual({ quantity: { gte: 100 } });
    });

    it('should handle <= comparison operator', () => {
      const request = createRequest('/api/items?price=<=50.5');
      const result = buildFilterQuery(request, ['price']);

      expect(result).toEqual({ price: { lte: 50.5 } });
    });

    it('should handle > comparison operator', () => {
      const request = createRequest('/api/items?stock=>0');
      const result = buildFilterQuery(request, ['stock']);

      expect(result).toEqual({ stock: { gt: 0 } });
    });

    it('should handle < comparison operator', () => {
      const request = createRequest('/api/items?weight=<25');
      const result = buildFilterQuery(request, ['weight']);

      expect(result).toEqual({ weight: { lt: 25 } });
    });

    it('should handle ~ contains search operator', () => {
      const request = createRequest('/api/items?name=~motor');
      const result = buildFilterQuery(request, ['name']);

      expect(result).toEqual({
        name: { contains: 'motor', mode: 'insensitive' },
      });
    });

    it('should ignore filters not in allowedFilters list', () => {
      const request = createRequest('/api/items?status=active&secret=admin');
      const result = buildFilterQuery(request, ['status']);

      expect(result).toEqual({ status: 'active' });
      expect(result).not.toHaveProperty('secret');
    });

    it('should ignore empty string filter values', () => {
      const request = createRequest('/api/items?status=');
      const result = buildFilterQuery(request, ['status']);

      expect(result).toEqual({});
    });

    it('should handle multiple allowed filters', () => {
      const request = createRequest('/api/items?status=active&category=raw_material');
      const result = buildFilterQuery(request, ['status', 'category']);

      expect(result).toEqual({
        status: 'active',
        category: 'raw_material',
      });
    });
  });

  // ============================================
  // paginatedSuccess
  // ============================================

  describe('paginatedSuccess', () => {
    it('should return a Response with correct JSON body', async () => {
      const responseData = {
        data: createMockItems(2),
        pagination: {
          page: 1,
          pageSize: 10,
          totalItems: 2,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
        meta: { took: 15, cached: false },
      };

      const response = paginatedSuccess(responseData);

      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.data).toHaveLength(2);
      expect(body.pagination.totalItems).toBe(2);
    });

    it('should set correct cache and timing headers', async () => {
      const responseData = {
        data: [],
        pagination: {
          page: 1,
          pageSize: 10,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
        meta: { took: 42, cached: true },
      };

      const response = paginatedSuccess(responseData);

      expect(response.headers.get('Cache-Control')).toBe('private, max-age=30, stale-while-revalidate=60');
      expect(response.headers.get('X-Response-Time')).toBe('42ms');
      expect(response.headers.get('X-Cached')).toBe('true');
    });

    it('should set X-Cached to false when not cached', async () => {
      const responseData = {
        data: [],
        pagination: {
          page: 1,
          pageSize: 10,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
        meta: { took: 10, cached: false },
      };

      const response = paginatedSuccess(responseData);

      expect(response.headers.get('X-Cached')).toBe('false');
    });
  });

  // ============================================
  // paginatedError
  // ============================================

  describe('paginatedError', () => {
    it('should return error response with default 500 status', async () => {
      const response = paginatedError('Internal server error');

      expect(response.status).toBe(500);

      const body = await response.json();
      expect(body.error).toBe('Internal server error');
    });

    it('should return error response with custom status code', async () => {
      const response = paginatedError('Not found', 404);

      expect(response.status).toBe(404);

      const body = await response.json();
      expect(body.error).toBe('Not found');
    });

    it('should return error response with 400 status for bad request', async () => {
      const response = paginatedError('Invalid pagination parameters', 400);

      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error).toBe('Invalid pagination parameters');
    });
  });
});
