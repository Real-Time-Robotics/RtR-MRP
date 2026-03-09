import { describe, it, expect, vi } from 'vitest';

// We need to mock next/server before importing the module
vi.mock('next/server', () => {
  class MockNextRequest extends Request {
    constructor(input: string | URL, init?: RequestInit) {
      super(input, init);
    }
  }

  class MockNextResponse extends Response {
    static json(data: unknown, init?: ResponseInit) {
      const body = JSON.stringify(data);
      return new Response(body, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...init?.headers,
        },
      });
    }
  }

  return {
    NextRequest: MockNextRequest,
    NextResponse: MockNextResponse,
  };
});

import {
  CachePresets,
  buildCacheControl,
  generateETag,
  generateWeakETag,
  checkETag,
  optimizedResponse,
  paginatedResponse,
  streamResponse,
  checkIfModifiedSince,
  omitEmpty,
  flattenResponse,
  pickFields,
  minimalResponse,
  batchResponses,
} from '../response-optimizer';

// Use the mocked NextRequest
const { NextRequest } = await import('next/server');

function createRequest(url: string, headers: Record<string, string> = {}) {
  return new NextRequest(url, { headers });
}

describe('response-optimizer', () => {
  // ===========================================================================
  // CachePresets
  // ===========================================================================
  describe('CachePresets', () => {
    it('should have noCache preset', () => {
      expect(CachePresets.noCache.noCache).toBe(true);
      expect(CachePresets.noCache.noStore).toBe(true);
    });

    it('should have privateShort preset', () => {
      expect(CachePresets.privateShort.private).toBe(true);
      expect(CachePresets.privateShort.maxAge).toBe(60);
    });

    it('should have immutable preset', () => {
      expect(CachePresets.immutable.immutable).toBe(true);
      expect(CachePresets.immutable.maxAge).toBe(31536000);
    });
  });

  // ===========================================================================
  // buildCacheControl
  // ===========================================================================
  describe('buildCacheControl', () => {
    it('should build noCache header', () => {
      const header = buildCacheControl(CachePresets.noCache);
      expect(header).toContain('no-cache');
      expect(header).toContain('no-store');
      expect(header).toContain('must-revalidate');
    });

    it('should build public header with max-age', () => {
      const header = buildCacheControl({
        public: true,
        maxAge: 300,
        sMaxAge: 600,
      });
      expect(header).toContain('public');
      expect(header).toContain('max-age=300');
      expect(header).toContain('s-maxage=600');
    });

    it('should include stale-while-revalidate', () => {
      const header = buildCacheControl({
        staleWhileRevalidate: 60,
      });
      expect(header).toContain('stale-while-revalidate=60');
    });

    it('should include stale-if-error', () => {
      const header = buildCacheControl({ staleIfError: 120 });
      expect(header).toContain('stale-if-error=120');
    });

    it('should include immutable', () => {
      const header = buildCacheControl(CachePresets.immutable);
      expect(header).toContain('immutable');
    });
  });

  // ===========================================================================
  // generateETag / generateWeakETag
  // ===========================================================================
  describe('generateETag', () => {
    it('should generate ETag from object', () => {
      const etag = generateETag({ id: 1, name: 'test' });
      expect(etag).toMatch(/^"[a-f0-9]+"$/);
    });

    it('should generate ETag from string', () => {
      const etag = generateETag('hello');
      expect(etag).toMatch(/^"[a-f0-9]+"$/);
    });

    it('should produce same ETag for same data', () => {
      const e1 = generateETag({ a: 1 });
      const e2 = generateETag({ a: 1 });
      expect(e1).toBe(e2);
    });

    it('should produce different ETags for different data', () => {
      const e1 = generateETag({ a: 1 });
      const e2 = generateETag({ a: 2 });
      expect(e1).not.toBe(e2);
    });
  });

  describe('generateWeakETag', () => {
    it('should prefix with W/', () => {
      const etag = generateWeakETag('data');
      expect(etag).toMatch(/^W\/"[a-f0-9]+"$/);
    });
  });

  // ===========================================================================
  // checkETag
  // ===========================================================================
  describe('checkETag', () => {
    it('should return false when no if-none-match header', () => {
      const req = createRequest('http://localhost/api');
      expect(checkETag(req as never, '"abc"')).toBe(false);
    });

    it('should return true when ETag matches', () => {
      const req = createRequest('http://localhost/api', {
        'if-none-match': '"abc"',
      });
      expect(checkETag(req as never, '"abc"')).toBe(true);
    });

    it('should return true for wildcard *', () => {
      const req = createRequest('http://localhost/api', {
        'if-none-match': '*',
      });
      expect(checkETag(req as never, '"abc"')).toBe(true);
    });

    it('should handle multiple ETags', () => {
      const req = createRequest('http://localhost/api', {
        'if-none-match': '"aaa", "bbb", "ccc"',
      });
      expect(checkETag(req as never, '"bbb"')).toBe(true);
      expect(checkETag(req as never, '"zzz"')).toBe(false);
    });
  });

  // ===========================================================================
  // optimizedResponse
  // ===========================================================================
  describe('optimizedResponse', () => {
    it('should create JSON response with cache headers', () => {
      const req = createRequest('http://localhost/api');
      const response = optimizedResponse({ data: 'test' }, req as never);

      expect(response.status).toBe(200);
      expect(response.headers.get('Cache-Control')).toBeTruthy();
      expect(response.headers.get('Vary')).toContain('Accept-Encoding');
    });

    it('should return 304 when ETag matches', () => {
      const data = { id: 1 };
      const etag = generateETag(data);
      const req = createRequest('http://localhost/api', {
        'if-none-match': etag,
      });

      const response = optimizedResponse(data, req as never);
      expect(response.status).toBe(304);
    });

    it('should skip ETag when etag option is false', () => {
      const req = createRequest('http://localhost/api');
      const response = optimizedResponse(
        { data: 'test' },
        req as never,
        { etag: false },
      );
      expect(response.headers.get('ETag')).toBeNull();
    });
  });

  // ===========================================================================
  // paginatedResponse
  // ===========================================================================
  describe('paginatedResponse', () => {
    it('should create paginated response', () => {
      const req = createRequest('http://localhost/api');
      const response = paginatedResponse(
        {
          items: [{ id: '1' }],
          total: 50,
          page: 1,
          pageSize: 10,
          totalPages: 5,
        },
        req as never,
      );

      expect(response.status).toBe(200);
    });
  });

  // ===========================================================================
  // checkIfModifiedSince
  // ===========================================================================
  describe('checkIfModifiedSince', () => {
    it('should return false when no if-modified-since header', () => {
      const req = createRequest('http://localhost/api');
      expect(checkIfModifiedSince(req as never, new Date())).toBe(false);
    });

    it('should return true when resource not modified since', () => {
      const lastModified = new Date('2024-01-01');
      const req = createRequest('http://localhost/api', {
        'if-modified-since': new Date('2024-06-01').toUTCString(),
      });
      expect(checkIfModifiedSince(req as never, lastModified)).toBe(true);
    });

    it('should return false when resource was modified after', () => {
      const lastModified = new Date('2024-06-01');
      const req = createRequest('http://localhost/api', {
        'if-modified-since': new Date('2024-01-01').toUTCString(),
      });
      expect(checkIfModifiedSince(req as never, lastModified)).toBe(false);
    });
  });

  // ===========================================================================
  // omitEmpty
  // ===========================================================================
  describe('omitEmpty', () => {
    it('should remove null and undefined values', () => {
      const result = omitEmpty({
        a: 1,
        b: null,
        c: undefined,
        d: 'hello',
        e: 0,
        f: false,
      });
      expect(result).toEqual({ a: 1, d: 'hello', e: 0, f: false });
    });

    it('should return empty object for all null/undefined', () => {
      const result = omitEmpty({ a: null, b: undefined });
      expect(result).toEqual({});
    });
  });

  // ===========================================================================
  // flattenResponse
  // ===========================================================================
  describe('flattenResponse', () => {
    it('should flatten nested objects', () => {
      const result = flattenResponse({
        name: 'test',
        address: { city: 'HCM', country: 'VN' },
      });
      expect(result).toEqual({
        name: 'test',
        'address.city': 'HCM',
        'address.country': 'VN',
      });
    });

    it('should not flatten arrays', () => {
      const result = flattenResponse({
        tags: ['a', 'b'],
      });
      expect(result).toEqual({ tags: ['a', 'b'] });
    });

    it('should not flatten Date objects', () => {
      const date = new Date('2024-01-01');
      const result = flattenResponse({ created: date });
      expect(result.created).toBe(date);
    });

    it('should handle deeply nested objects', () => {
      const result = flattenResponse({
        a: { b: { c: 'deep' } },
      });
      expect(result).toEqual({ 'a.b.c': 'deep' });
    });
  });

  // ===========================================================================
  // pickFields
  // ===========================================================================
  describe('pickFields', () => {
    it('should pick only specified fields', () => {
      const result = pickFields(
        { id: '1', name: 'test', secret: 'hidden' },
        ['id', 'name'],
      );
      expect(result).toEqual({ id: '1', name: 'test' });
    });

    it('should ignore fields not in object', () => {
      const result = pickFields({ id: '1' }, ['id', 'name']);
      expect(result).toEqual({ id: '1' });
    });
  });

  // ===========================================================================
  // minimalResponse
  // ===========================================================================
  describe('minimalResponse', () => {
    it('should return items with only id and specified fields', () => {
      const items = [
        { id: '1', name: 'A', extra: 'x' },
        { id: '2', name: 'B', extra: 'y' },
      ];
      const result = minimalResponse(items, ['name']);
      expect(result).toEqual([
        { id: '1', name: 'A' },
        { id: '2', name: 'B' },
      ]);
    });
  });

  // ===========================================================================
  // batchResponses
  // ===========================================================================
  describe('batchResponses', () => {
    it('should execute all request functions in parallel', async () => {
      const result = await batchResponses({
        users: async () => [{ id: 1 }],
        orders: async () => [{ id: 2 }],
      });

      expect(result.users).toEqual([{ id: 1 }]);
      expect(result.orders).toEqual([{ id: 2 }]);
    });
  });

  // ===========================================================================
  // streamResponse
  // ===========================================================================
  describe('streamResponse', () => {
    it('should create a streaming response', async () => {
      async function* gen() {
        yield { id: 1 };
        yield { id: 2 };
      }

      const req = createRequest('http://localhost/api');
      const response = streamResponse(gen(), req as never);

      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('Transfer-Encoding')).toBe('chunked');

      const text = await response.text();
      expect(text).toBe('[{"id":1},{"id":2}]');
    });
  });
});
