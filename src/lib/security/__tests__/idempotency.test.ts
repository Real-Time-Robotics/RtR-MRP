/**
 * Idempotency-Key Middleware Unit Tests (TIP-03 · Sprint 26)
 *
 * We cover:
 *   - hashBody: deterministic + different inputs → different outputs
 *   - pass-through for GET (no body) / missing header
 *   - key format validation → 400 on malformed keys
 *   - cache miss → handler runs, response snapshot stored
 *   - cache hit (same body) → cached response replayed with
 *     Idempotent-Replayed header, handler NOT re-invoked
 *   - cache hit (different body) → 409 Conflict, handler NOT re-invoked
 *   - expired snapshot → treated as miss
 *   - non-2xx response → NOT cached (so clients can retry)
 *   - DB lookup failure → fail-open (handler still runs)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// =============================================================================
// SHARED MOCKS
// =============================================================================

// Mock logger so we don't spam stdout during tests.
vi.mock('@/lib/logger', () => ({
  logger: {
    logError: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Prisma mock — we rebuild it per test so each suite has isolated state.
type StoredKey = {
  key: string;
  requestHash: string;
  responseStatus: number;
  responseBody: unknown;
  expiresAt: Date;
  tenantId: string | null;
  method: string;
  path: string;
};

function mockPrisma() {
  const store = new Map<string, StoredKey>();
  const findUnique = vi.fn(async ({ where }: { where: { key: string } }) => {
    const row = store.get(where.key);
    return row ? { ...row } : null;
  });
  const upsert = vi.fn(
    async ({ where, create, update }: { where: { key: string }; create: StoredKey; update: Partial<StoredKey> }) => {
      const existing = store.get(where.key);
      const next = existing ? { ...existing, ...update } : { ...create };
      store.set(where.key, next);
      return next;
    },
  );
  const deleteMany = vi.fn(async ({ where }: { where: { expiresAt: { lt: Date } } }) => {
    const cutoff = where.expiresAt.lt.getTime();
    let count = 0;
    for (const [k, v] of store.entries()) {
      if (v.expiresAt.getTime() < cutoff) {
        store.delete(k);
        count++;
      }
    }
    return { count };
  });
  return {
    default: { idempotencyKey: { findUnique, upsert, deleteMany } },
    store,
    findUnique,
    upsert,
    deleteMany,
  };
}

// =============================================================================
// HELPERS
// =============================================================================

function makeRequest(opts: {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  url?: string;
}): NextRequest {
  const bodyText = opts.body === undefined ? undefined : JSON.stringify(opts.body);
  return new NextRequest(opts.url ?? 'http://localhost/api/test', {
    method: opts.method ?? 'POST',
    body: bodyText,
    headers: {
      'content-type': 'application/json',
      ...(opts.headers ?? {}),
    },
  });
}

const fakeUser = {
  id: 'user-1',
  email: 'a@b.c',
  name: 'Tester',
  role: 'admin' as const,
  isDemo: false,
};

// =============================================================================
// TESTS
// =============================================================================

describe('Idempotency Middleware', () => {
  // ---------------------------------------------------------------------------
  describe('hashBody', () => {
    it('is deterministic and differentiates payloads', async () => {
      vi.resetModules();
      const mod = await import('../idempotency');
      const { hashBody } = mod.__testing__;

      expect(hashBody('{"a":1}')).toBe(hashBody('{"a":1}'));
      expect(hashBody('{"a":1}')).not.toBe(hashBody('{"a":2}'));
      // Whitespace IS significant — clients must replay byte-identical bodies.
      expect(hashBody('{"a":1}')).not.toBe(hashBody('{ "a": 1 }'));
    });
  });

  // ---------------------------------------------------------------------------
  describe('pass-through paths', () => {
    let withIdempotency: typeof import('../idempotency').withIdempotency;

    beforeEach(async () => {
      vi.resetModules();
      const pm = mockPrisma();
      vi.doMock('@/lib/prisma', () => pm);
      ({ withIdempotency } = await import('../idempotency'));
    });

    it('passes GET requests through unchanged', async () => {
      const handler = vi.fn(async () => new Response('ok', { status: 200 }));
      const wrapped = withIdempotency(handler);
      const req = makeRequest({ method: 'GET' });
      const res = await wrapped(req, { user: fakeUser });
      expect(res.status).toBe(200);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('passes POST without Idempotency-Key through unchanged', async () => {
      const handler = vi.fn(async () => new Response('ok', { status: 201 }));
      const wrapped = withIdempotency(handler);
      const req = makeRequest({ method: 'POST', body: { x: 1 } });
      const res = await wrapped(req, { user: fakeUser });
      expect(res.status).toBe(201);
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  describe('key format validation', () => {
    let withIdempotency: typeof import('../idempotency').withIdempotency;
    beforeEach(async () => {
      vi.resetModules();
      const pm = mockPrisma();
      vi.doMock('@/lib/prisma', () => pm);
      ({ withIdempotency } = await import('../idempotency'));
    });

    it('rejects too-short keys with 400', async () => {
      const handler = vi.fn(async () => new Response('ok', { status: 201 }));
      const wrapped = withIdempotency(handler);
      const req = makeRequest({
        method: 'POST',
        body: { x: 1 },
        headers: { 'idempotency-key': 'abc' }, // 3 chars, too short
      });
      const res = await wrapped(req, { user: fakeUser });
      expect(res.status).toBe(400);
      expect(handler).not.toHaveBeenCalled();
    });

    it('rejects keys with disallowed chars', async () => {
      const handler = vi.fn(async () => new Response('ok', { status: 201 }));
      const wrapped = withIdempotency(handler);
      const req = makeRequest({
        method: 'POST',
        body: { x: 1 },
        headers: { 'idempotency-key': 'has space keyhere' },
      });
      const res = await wrapped(req, { user: fakeUser });
      expect(res.status).toBe(400);
      expect(handler).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  describe('cache miss → execute + store', () => {
    let withIdempotency: typeof import('../idempotency').withIdempotency;
    let pm: ReturnType<typeof mockPrisma>;

    beforeEach(async () => {
      vi.resetModules();
      pm = mockPrisma();
      vi.doMock('@/lib/prisma', () => pm);
      ({ withIdempotency } = await import('../idempotency'));
    });

    it('runs handler once and stores snapshot for 2xx', async () => {
      const handler = vi.fn(async (req: NextRequest) => {
        // Verify the wrapped handler CAN still read the body.
        const body = await req.json();
        return new Response(JSON.stringify({ ok: true, echo: body }), {
          status: 201,
          headers: { 'content-type': 'application/json' },
        });
      });
      const wrapped = withIdempotency(handler);
      const req = makeRequest({
        method: 'POST',
        body: { partId: 'P-1', qty: 5 },
        headers: { 'idempotency-key': 'req-0001-aaaa' },
      });
      const res = await wrapped(req, { user: fakeUser });

      expect(res.status).toBe(201);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(pm.upsert).toHaveBeenCalledTimes(1);
      expect(pm.store.has('req-0001-aaaa')).toBe(true);
      const stored = pm.store.get('req-0001-aaaa')!;
      expect(stored.responseStatus).toBe(201);
      expect(stored.responseBody).toMatchObject({ ok: true, echo: { partId: 'P-1', qty: 5 } });
    });

    it('does NOT cache 4xx responses', async () => {
      const handler = vi.fn(async () => new Response(JSON.stringify({ error: 'nope' }), { status: 422 }));
      const wrapped = withIdempotency(handler);
      const req = makeRequest({
        method: 'POST',
        body: { bad: true },
        headers: { 'idempotency-key': 'req-0002-bbbb' },
      });
      const res = await wrapped(req, { user: fakeUser });

      expect(res.status).toBe(422);
      expect(pm.upsert).not.toHaveBeenCalled();
    });

    it('does NOT cache 5xx responses', async () => {
      const handler = vi.fn(async () => new Response(JSON.stringify({ error: 'boom' }), { status: 500 }));
      const wrapped = withIdempotency(handler);
      const req = makeRequest({
        method: 'POST',
        body: { x: 1 },
        headers: { 'idempotency-key': 'req-0003-cccc' },
      });
      const res = await wrapped(req, { user: fakeUser });

      expect(res.status).toBe(500);
      expect(pm.upsert).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  describe('cache hit (same body) → replay', () => {
    let withIdempotency: typeof import('../idempotency').withIdempotency;
    let pm: ReturnType<typeof mockPrisma>;

    beforeEach(async () => {
      vi.resetModules();
      pm = mockPrisma();
      vi.doMock('@/lib/prisma', () => pm);
      ({ withIdempotency } = await import('../idempotency'));
    });

    it('replays cached response without invoking handler a second time', async () => {
      const handler = vi.fn(async () => {
        return new Response(JSON.stringify({ poNumber: 'PO-0001' }), {
          status: 201,
          headers: { 'content-type': 'application/json' },
        });
      });
      const wrapped = withIdempotency(handler);

      const req1 = makeRequest({
        method: 'POST',
        body: { supplierId: 'S-1', lines: [{ partId: 'P-1', qty: 10 }] },
        headers: { 'idempotency-key': 'po-create-XYZ-12345' },
      });
      const res1 = await wrapped(req1, { user: fakeUser });
      expect(res1.status).toBe(201);
      expect(handler).toHaveBeenCalledTimes(1);

      // Retry with identical body + same key
      const req2 = makeRequest({
        method: 'POST',
        body: { supplierId: 'S-1', lines: [{ partId: 'P-1', qty: 10 }] },
        headers: { 'idempotency-key': 'po-create-XYZ-12345' },
      });
      const res2 = await wrapped(req2, { user: fakeUser });

      expect(res2.status).toBe(201);
      expect(handler).toHaveBeenCalledTimes(1); // NOT re-invoked
      expect(res2.headers.get('Idempotent-Replayed')).toBe('true');
      const body = await res2.json();
      expect(body).toEqual({ poNumber: 'PO-0001' });
    });
  });

  // ---------------------------------------------------------------------------
  describe('cache hit (different body) → 409', () => {
    let withIdempotency: typeof import('../idempotency').withIdempotency;
    let pm: ReturnType<typeof mockPrisma>;

    beforeEach(async () => {
      vi.resetModules();
      pm = mockPrisma();
      vi.doMock('@/lib/prisma', () => pm);
      ({ withIdempotency } = await import('../idempotency'));
    });

    it('returns 409 Conflict when same key has different body hash', async () => {
      const handler = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 201 }));
      const wrapped = withIdempotency(handler);

      const req1 = makeRequest({
        method: 'POST',
        body: { amount: 100 },
        headers: { 'idempotency-key': 'key-collide-001-xxx' },
      });
      await wrapped(req1, { user: fakeUser });
      expect(handler).toHaveBeenCalledTimes(1);

      const req2 = makeRequest({
        method: 'POST',
        body: { amount: 999 }, // different!
        headers: { 'idempotency-key': 'key-collide-001-xxx' },
      });
      const res2 = await wrapped(req2, { user: fakeUser });

      expect(res2.status).toBe(409);
      expect(handler).toHaveBeenCalledTimes(1); // NOT re-invoked
      const body = await res2.json();
      expect(body.error).toMatch(/conflict/i);
    });
  });

  // ---------------------------------------------------------------------------
  describe('expired snapshot → treated as cache miss', () => {
    let withIdempotency: typeof import('../idempotency').withIdempotency;
    let pm: ReturnType<typeof mockPrisma>;

    beforeEach(async () => {
      vi.resetModules();
      pm = mockPrisma();
      vi.doMock('@/lib/prisma', () => pm);
      ({ withIdempotency } = await import('../idempotency'));
    });

    it('re-runs handler when a prior snapshot has expired', async () => {
      // Pre-seed an EXPIRED snapshot manually.
      pm.store.set('expired-key-001-xyz', {
        key: 'expired-key-001-xyz',
        requestHash: 'stale-hash',
        responseStatus: 201,
        responseBody: { stale: true },
        expiresAt: new Date(Date.now() - 60_000), // 1 min ago
        tenantId: null,
        method: 'POST',
        path: '/api/test',
      });

      const handler = vi.fn(async () => new Response(JSON.stringify({ fresh: true }), { status: 201 }));
      const wrapped = withIdempotency(handler);
      const req = makeRequest({
        method: 'POST',
        body: { foo: 1 },
        headers: { 'idempotency-key': 'expired-key-001-xyz' },
      });
      const res = await wrapped(req, { user: fakeUser });

      expect(res.status).toBe(201);
      expect(handler).toHaveBeenCalledTimes(1); // freshly executed
      const body = await res.json();
      expect(body).toEqual({ fresh: true });

      // Snapshot refreshed (upsert update branch)
      const stored = pm.store.get('expired-key-001-xyz')!;
      expect(stored.responseBody).toMatchObject({ fresh: true });
      expect(stored.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  // ---------------------------------------------------------------------------
  describe('DB lookup failure → fail-open', () => {
    let withIdempotency: typeof import('../idempotency').withIdempotency;

    beforeEach(async () => {
      vi.resetModules();
      const prismaMock = {
        default: {
          idempotencyKey: {
            findUnique: vi.fn(async () => {
              throw new Error('connection refused');
            }),
            upsert: vi.fn(async () => ({})),
            deleteMany: vi.fn(),
          },
        },
      };
      vi.doMock('@/lib/prisma', () => prismaMock);
      ({ withIdempotency } = await import('../idempotency'));
    });

    it('still runs the handler when the DB lookup fails', async () => {
      const handler = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 201 }));
      const wrapped = withIdempotency(handler);
      const req = makeRequest({
        method: 'POST',
        body: { x: 1 },
        headers: { 'idempotency-key': 'db-down-key-00001' },
      });
      const res = await wrapped(req, { user: fakeUser });
      expect(res.status).toBe(201);
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });
});
