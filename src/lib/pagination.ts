// src/lib/pagination.ts
// Server-side pagination utilities for high-performance API responses

import { NextRequest } from 'next/server';

// ============================================
// TYPES
// ============================================

export interface PaginationParams {
  page: number;
  pageSize: number;
  cursor?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    nextCursor?: string;
    prevCursor?: string;
  };
  meta: {
    took: number; // milliseconds
    cached: boolean;
  };
}

export interface CursorPaginatedResponse<T> {
  data: T[];
  pagination: {
    pageSize: number;
    nextCursor: string | null;
    prevCursor: string | null;
    hasMore: boolean;
  };
  meta: {
    took: number;
    cached: boolean;
  };
}

// ============================================
// CONSTANTS
// ============================================

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;
export const MIN_PAGE_SIZE = 10;

// ============================================
// UTILITIES
// ============================================

/**
 * Parse pagination parameters from URL search params
 */
export function parsePaginationParams(request: NextRequest): PaginationParams {
  const { searchParams } = new URL(request.url);

  const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(MIN_PAGE_SIZE, parseInt(searchParams.get('pageSize') || searchParams.get('limit') || String(DEFAULT_PAGE_SIZE)) || DEFAULT_PAGE_SIZE)
  );
  const cursor = searchParams.get('cursor') || undefined;
  const sortBy = searchParams.get('sortBy') || undefined;
  const rawSortOrder = searchParams.get('sortOrder')?.toLowerCase();
  const sortOrder: 'asc' | 'desc' = rawSortOrder === 'asc' ? 'asc' : 'desc';

  return { page, pageSize, cursor, sortBy, sortOrder };
}

/**
 * Validate sortBy against a list of allowed fields.
 * Returns the validated sortBy or the defaultField if invalid.
 * In strict mode, throws an error for invalid values.
 */
export function validateSortBy(
  sortBy: string | undefined,
  allowedFields: string[],
  defaultField: string,
  strict: boolean = false,
): string {
  if (!sortBy) return defaultField;
  if (allowedFields.includes(sortBy)) return sortBy;
  if (strict) {
    throw new SortValidationError(
      `Invalid sortBy: "${sortBy}". Allowed fields: ${allowedFields.join(', ')}`,
      sortBy,
      allowedFields,
    );
  }
  return defaultField;
}

export class SortValidationError extends Error {
  field: string;
  allowedFields: string[];
  constructor(message: string, field: string, allowedFields: string[]) {
    super(message);
    this.name = 'SortValidationError';
    this.field = field;
    this.allowedFields = allowedFields;
  }
}

/**
 * Parse pagination from request body (for POST requests)
 */
export function parsePaginationFromBody(body: Record<string, unknown>): PaginationParams {
  const page = Math.max(1, parseInt(String(body.page || '1')) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(MIN_PAGE_SIZE, parseInt(String(body.pageSize || body.limit || DEFAULT_PAGE_SIZE)) || DEFAULT_PAGE_SIZE)
  );
  const cursor = body.cursor as string | undefined;
  const sortBy = body.sortBy as string | undefined;
  const sortOrder = (body.sortOrder || 'desc') as 'asc' | 'desc';

  return { page, pageSize, cursor, sortBy, sortOrder };
}

/**
 * Build Prisma query options for offset-based pagination
 */
export function buildOffsetPaginationQuery(params: PaginationParams) {
  return {
    skip: (params.page - 1) * params.pageSize,
    take: params.pageSize,
    ...(params.sortBy && {
      orderBy: { [params.sortBy]: params.sortOrder || 'desc' },
    }),
  };
}

/**
 * Build Prisma query options for cursor-based pagination
 */
export function buildCursorPaginationQuery(params: PaginationParams) {
  return {
    take: params.pageSize + 1, // Take one extra to check if there's more
    ...(params.cursor && {
      skip: 1,
      cursor: { id: params.cursor },
    }),
    ...(params.sortBy && {
      orderBy: { [params.sortBy]: params.sortOrder || 'desc' },
    }),
  };
}

/**
 * Build paginated response with metadata
 */
export function buildPaginatedResponse<T extends { id: string }>(
  data: T[],
  totalCount: number,
  params: PaginationParams,
  startTime: number,
  cached: boolean = false
): PaginatedResponse<T> {
  const safePageSize = Math.max(1, params.pageSize);
  const totalPages = Math.ceil(totalCount / safePageSize);

  return {
    data,
    pagination: {
      page: params.page,
      pageSize: safePageSize,
      totalItems: totalCount,
      totalPages,
      hasNextPage: params.page < totalPages,
      hasPrevPage: params.page > 1,
      nextCursor: data.length > 0 ? data[data.length - 1].id : undefined,
      prevCursor: data.length > 0 ? data[0].id : undefined,
    },
    meta: {
      took: Date.now() - startTime,
      cached,
    },
  };
}

/**
 * Build cursor-paginated response
 */
export function buildCursorPaginatedResponse<T extends { id: string }>(
  data: T[],
  params: PaginationParams,
  startTime: number,
  cached: boolean = false
): CursorPaginatedResponse<T> {
  // Check if there are more items
  const hasMore = data.length > params.pageSize;
  const items = hasMore ? data.slice(0, params.pageSize) : data;

  return {
    data: items,
    pagination: {
      pageSize: params.pageSize,
      nextCursor: hasMore && items.length > 0 ? items[items.length - 1].id : null,
      prevCursor: params.cursor || null,
      hasMore,
    },
    meta: {
      took: Date.now() - startTime,
      cached,
    },
  };
}

/**
 * Calculate optimal page size based on data complexity
 */
export function calculateOptimalPageSize(averageRecordSize: number, targetResponseSize: number = 100000): number {
  const optimalSize = Math.floor(targetResponseSize / averageRecordSize);
  return Math.min(MAX_PAGE_SIZE, Math.max(MIN_PAGE_SIZE, optimalSize));
}

/**
 * Build filter query from search params
 */
export function buildFilterQuery(request: NextRequest, allowedFilters: string[]): Record<string, unknown> {
  const { searchParams } = new URL(request.url);
  const filters: Record<string, unknown> = {};

  for (const filter of allowedFilters) {
    const value = searchParams.get(filter);
    if (value !== null && value !== '') {
      // Handle special filter patterns
      if (value.includes(',')) {
        // Multiple values: status=active,pending -> { status: { in: ['active', 'pending'] } }
        filters[filter] = { in: value.split(',') };
      } else if (value.startsWith('>=')) {
        filters[filter] = { gte: parseFilterValue(value.slice(2)) };
      } else if (value.startsWith('<=')) {
        filters[filter] = { lte: parseFilterValue(value.slice(2)) };
      } else if (value.startsWith('>')) {
        filters[filter] = { gt: parseFilterValue(value.slice(1)) };
      } else if (value.startsWith('<')) {
        filters[filter] = { lt: parseFilterValue(value.slice(1)) };
      } else if (value.startsWith('~')) {
        // Contains search: name=~motor -> { name: { contains: 'motor', mode: 'insensitive' } }
        filters[filter] = { contains: value.slice(1), mode: 'insensitive' };
      } else {
        filters[filter] = value;
      }
    }
  }

  return filters;
}

/**
 * Parse filter value to appropriate type
 */
function parseFilterValue(value: string): string | number | Date {
  // Try to parse as number
  const num = parseFloat(value);
  if (!isNaN(num)) return num;

  // Try to parse as date
  const date = new Date(value);
  if (!isNaN(date.getTime())) return date;

  // Return as string
  return value;
}

/**
 * Build search query for full-text search
 */
export function buildSearchQuery(
  searchTerm: string | null | undefined,
  searchFields: string[]
): { OR?: Record<string, { contains: string; mode: 'insensitive' }>[] } | undefined {
  if (!searchTerm || searchTerm.trim() === '') return undefined;

  return {
    OR: searchFields.map(field => ({
      [field]: { contains: searchTerm.trim(), mode: 'insensitive' as const },
    })),
  };
}

// ============================================
// RESPONSE HELPERS
// ============================================

/**
 * Success response with pagination
 */
export function paginatedSuccess<T>(
  response: PaginatedResponse<T> | CursorPaginatedResponse<T>,
  options?: { cacheControl?: string },
) {
  return Response.json(response, {
    headers: {
      'Cache-Control': options?.cacheControl ?? 'private, max-age=30, stale-while-revalidate=60',
      'X-Response-Time': `${response.meta.took}ms`,
      'X-Cached': response.meta.cached ? 'true' : 'false',
    },
  });
}

/**
 * Error response
 */
export function paginatedError(message: string, status: number = 500) {
  return Response.json(
    { error: message },
    { status }
  );
}
