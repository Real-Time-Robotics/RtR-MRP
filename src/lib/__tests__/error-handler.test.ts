import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  tryCatch,
  successResponse,
  createdResponse,
  noContentResponse,
  paginatedResponse,
} from '../error-handler';

// Mock logger
vi.mock('../logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    logError: vi.fn(),
  },
}));

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create with default values', () => {
      const error = new AppError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.isOperational).toBe(true);
    });

    it('should create with custom values', () => {
      const error = new AppError('Custom', 400, 'CUSTOM_ERROR', false, { key: 'val' });
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('CUSTOM_ERROR');
      expect(error.isOperational).toBe(false);
      expect(error.context).toEqual({ key: 'val' });
    });

    it('should be instanceof Error', () => {
      const error = new AppError('test');
      expect(error instanceof Error).toBe(true);
      expect(error instanceof AppError).toBe(true);
    });
  });

  describe('ValidationError', () => {
    it('should set 400 status', () => {
      const error = new ValidationError('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
    });

    it('should accept context', () => {
      const error = new ValidationError('Bad field', { field: 'name' });
      expect(error.context).toEqual({ field: 'name' });
    });
  });

  describe('AuthenticationError', () => {
    it('should set 401 status', () => {
      const error = new AuthenticationError();
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Authentication required');
    });

    it('should accept custom message', () => {
      const error = new AuthenticationError('Token expired');
      expect(error.message).toBe('Token expired');
    });
  });

  describe('AuthorizationError', () => {
    it('should set 403 status', () => {
      const error = new AuthorizationError();
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe('Permission denied');
    });
  });

  describe('NotFoundError', () => {
    it('should set 404 status with resource name', () => {
      const error = new NotFoundError('Part');
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Part not found');
    });

    it('should include id when provided', () => {
      const error = new NotFoundError('Part', 'abc-123');
      expect(error.message).toBe("Part with id 'abc-123' not found");
    });
  });

  describe('ConflictError', () => {
    it('should set 409 status', () => {
      const error = new ConflictError('Duplicate entry');
      expect(error.statusCode).toBe(409);
    });
  });

  describe('RateLimitError', () => {
    it('should set 429 status', () => {
      const error = new RateLimitError();
      expect(error.statusCode).toBe(429);
      expect(error.message).toBe('Too many requests');
    });
  });
});

describe('tryCatch', () => {
  it('should return result on success', async () => {
    const result = await tryCatch(() => Promise.resolve('success'));
    expect(result).toBe('success');
  });

  it('should rethrow AppError as-is', async () => {
    const appError = new ValidationError('Bad input');
    await expect(tryCatch(() => { throw appError; }))
      .rejects.toThrow(appError);
  });

  it('should wrap generic error in AppError', async () => {
    await expect(
      tryCatch(() => { throw new Error('generic'); })
    ).rejects.toThrow(AppError);
  });

  it('should use custom error message', async () => {
    try {
      await tryCatch(() => { throw new Error('generic'); }, 'Custom message');
    } catch (e) {
      expect((e as AppError).message).toBe('Custom message');
    }
  });
});

describe('Response Helpers', () => {
  describe('successResponse', () => {
    it('should return 200 with data', async () => {
      const response = successResponse({ id: '1' });
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toEqual({ id: '1' });
    });

    it('should include message when provided', async () => {
      const response = successResponse({}, 'Done');
      const body = await response.json();
      expect(body.message).toBe('Done');
    });

    it('should accept custom status', async () => {
      const response = successResponse({}, undefined, 202);
      expect(response.status).toBe(202);
    });
  });

  describe('createdResponse', () => {
    it('should return 201', async () => {
      const response = createdResponse({ id: '1' });
      const body = await response.json();
      expect(response.status).toBe(201);
      expect(body.message).toBe('Created successfully');
    });
  });

  describe('noContentResponse', () => {
    it('should return 204', () => {
      const response = noContentResponse();
      expect(response.status).toBe(204);
    });
  });

  describe('paginatedResponse', () => {
    it('should return paginated data', async () => {
      const response = paginatedResponse([1, 2, 3], 10, 1, 3);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.items).toEqual([1, 2, 3]);
      expect(body.data.total).toBe(10);
      expect(body.data.page).toBe(1);
      expect(body.data.pageSize).toBe(3);
      expect(body.data.totalPages).toBe(4);
    });

    it('should include extra fields', async () => {
      const response = paginatedResponse([], 0, 1, 10, { filter: 'active' });
      const body = await response.json();
      expect(body.data.filter).toBe('active');
    });
  });
});
