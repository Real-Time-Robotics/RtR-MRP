import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));
vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), logError: vi.fn() },
}));

import {
  errorResponse,
  validationError,
  unauthorizedError,
  forbiddenError,
  notFoundError,
  serverError,
  successResponse,
  createdResponse,
  noContentResponse,
  validateQuery,
  IdParamSchema,
  PaginationQuerySchema,
  DateRangeQuerySchema,
} from '../validation';

describe('API Validation', () => {
  describe('errorResponse', () => {
    it('should return JSON error response with defaults', async () => {
      const res = errorResponse('Something failed');
      const body = await res.json();
      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Something failed');
      expect(body.code).toBe('ERROR');
      expect(body.timestamp).toBeDefined();
    });

    it('should accept custom status and code', async () => {
      const res = errorResponse('Not found', 404, 'NOT_FOUND');
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.code).toBe('NOT_FOUND');
    });

    it('should include details when provided', async () => {
      const res = errorResponse('Err', 400, 'ERR', { field: 'name' });
      const body = await res.json();
      expect(body.details).toEqual({ field: 'name' });
    });
  });

  describe('validationError', () => {
    it('should format Zod errors', async () => {
      const schema = z.object({ name: z.string() });
      const result = schema.safeParse({ name: 123 });
      if (!result.success) {
        const res = validationError(result.error);
        const body = await res.json();
        expect(res.status).toBe(400);
        expect(body.code).toBe('VALIDATION_ERROR');
        expect(body.details).toBeDefined();
        expect(body.details[0]).toHaveProperty('field');
        expect(body.details[0]).toHaveProperty('message');
      }
    });
  });

  describe('unauthorizedError', () => {
    it('should return 401', async () => {
      const res = unauthorizedError();
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.code).toBe('UNAUTHORIZED');
    });
  });

  describe('forbiddenError', () => {
    it('should return 403', async () => {
      const res = forbiddenError();
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.code).toBe('FORBIDDEN');
    });
  });

  describe('notFoundError', () => {
    it('should return 404 with default message', async () => {
      const res = notFoundError();
      const body = await res.json();
      expect(res.status).toBe(404);
      expect(body.error).toContain('Resource not found');
    });

    it('should accept custom resource name', async () => {
      const res = notFoundError('Part');
      const body = await res.json();
      expect(body.error).toBe('Part not found');
    });
  });

  describe('serverError', () => {
    it('should return 500', async () => {
      const res = serverError();
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.code).toBe('INTERNAL_ERROR');
    });

    it('should accept custom message', async () => {
      const res = serverError('DB connection failed');
      const body = await res.json();
      expect(body.error).toBe('DB connection failed');
    });
  });

  describe('successResponse', () => {
    it('should return success with data', async () => {
      const res = successResponse({ items: [1, 2, 3] });
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toEqual({ items: [1, 2, 3] });
      expect(body.timestamp).toBeDefined();
    });

    it('should include meta when provided', async () => {
      const res = successResponse([1], { total: 100, page: 1, pageSize: 10 });
      const body = await res.json();
      expect(body.meta).toEqual({ total: 100, page: 1, pageSize: 10 });
    });
  });

  describe('createdResponse', () => {
    it('should return 201 with data', async () => {
      const res = createdResponse({ id: '123' });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toEqual({ id: '123' });
    });
  });

  describe('noContentResponse', () => {
    it('should return 204 with no body', () => {
      const res = noContentResponse();
      expect(res.status).toBe(204);
    });
  });

  describe('validateQuery', () => {
    it('should validate valid query params', () => {
      const schema = z.object({ page: z.string() });
      const params = new URLSearchParams('page=1');
      const result = validateQuery(schema, params);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe('1');
      }
    });

    it('should return error for invalid query params', () => {
      const schema = z.object({ page: z.string().min(5) });
      const params = new URLSearchParams('page=1');
      const result = validateQuery(schema, params);
      expect(result.success).toBe(false);
    });
  });

  describe('Common schemas', () => {
    it('IdParamSchema should validate id', () => {
      expect(IdParamSchema.safeParse({ id: 'abc' }).success).toBe(true);
      expect(IdParamSchema.safeParse({ id: '' }).success).toBe(false);
    });

    it('PaginationQuerySchema should have defaults', () => {
      const result = PaginationQuerySchema.parse({});
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.sortOrder).toBe('desc');
    });

    it('PaginationQuerySchema should coerce strings', () => {
      const result = PaginationQuerySchema.parse({ page: '3', pageSize: '50' });
      expect(result.page).toBe(3);
      expect(result.pageSize).toBe(50);
    });

    it('PaginationQuerySchema should reject invalid values', () => {
      expect(PaginationQuerySchema.safeParse({ page: '0' }).success).toBe(false);
      expect(PaginationQuerySchema.safeParse({ pageSize: '200' }).success).toBe(false);
    });

    it('DateRangeQuerySchema should parse dates', () => {
      const result = DateRangeQuerySchema.parse({ startDate: '2026-01-01' });
      expect(result.startDate).toBeInstanceOf(Date);
    });

    it('DateRangeQuerySchema should allow empty', () => {
      const result = DateRangeQuerySchema.parse({});
      expect(result.startDate).toBeUndefined();
    });
  });
});
