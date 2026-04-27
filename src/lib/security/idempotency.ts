// =============================================================================
// RTR MRP - IDEMPOTENCY-KEY MIDDLEWARE (TIP-03 · Sprint 26)
// -----------------------------------------------------------------------------
// Wraps an ApiHandler so that POST mutations carrying an `Idempotency-Key`
// request header can be safely retried without double-executing.
//
// Semantics (RFC-draft-ietf-httpapi-idempotency-key-header inspired):
//   - No Idempotency-Key header → pass through untouched.
//   - Key seen before, same request body hash → return the cached response
//     verbatim with `Idempotent-Replayed: true` set.
//   - Key seen before, different body hash → 409 Conflict.
//   - Key new → execute handler, snapshot response, store under key with
//     24-hour TTL. Only 2xx responses are cached; 4xx/5xx let the client retry.
//
// Composition:
//   export const POST = withPermission(
//     withIdempotency(postHandler),
//     { create: 'purchasing:create' },
//   );
//
// withPermission MUST wrap withIdempotency so that unauthenticated requests
// cannot poison or probe the cache.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import type { Prisma } from '@prisma/client';
import prismaDefault from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { ApiHandler, HandlerContext } from '@/lib/api/with-permission';

// The IdempotencyKey model was added in Sprint-26 migration
// `20260423000000_add_idempotency_key`. TypeScript will only see it on
// `prisma.idempotencyKey` AFTER `prisma generate` runs. Until that step,
// the shape below lets this file typecheck deterministically without
// depending on whether the generator has been re-run in a given sandbox.
type IdempotencyKeyDelegate = {
  findUnique: (args: {
    where: { key: string };
    select?: Record<string, boolean>;
  }) => Promise<{
    key: string;
    requestHash: string;
    responseStatus: number;
    responseBody: unknown;
    expiresAt: Date;
  } | null>;
  upsert: (args: {
    where: { key: string };
    create: Record<string, unknown>;
    update: Record<string, unknown>;
  }) => Promise<unknown>;
  deleteMany: (args: { where: { expiresAt: { lt: Date } } }) => Promise<{ count: number }>;
};

const prisma = prismaDefault as unknown as {
  idempotencyKey: IdempotencyKeyDelegate;
};

// =============================================================================
// CONSTANTS
// =============================================================================

/** How long a snapshot lives. 24 hours matches the draft spec recommendation. */
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

/** Accepted Idempotency-Key shape: 8..255 chars, URL-safe alphabet. */
const KEY_FORMAT = /^[A-Za-z0-9_\-:.]{8,255}$/;

/** Header name (case-insensitive, Next reads lowercased). */
const HEADER_NAME = 'idempotency-key';

// =============================================================================
// HASHING
// =============================================================================

/**
 * Compute a SHA-256 hex digest of the raw request body. Clients can send the
 * same logical payload with different JSON formatting, so we hash the raw
 * bytes — clients must replay byte-identical payloads to get a cache hit, per
 * the idempotency draft spec. We do NOT attempt canonicalisation.
 */
function hashBody(body: string): string {
  return createHash('sha256').update(body, 'utf8').digest('hex');
}

// =============================================================================
// RESPONSE HELPERS
// =============================================================================

function jsonResponse(status: number, body: unknown, extraHeaders: Record<string, string> = {}): Response {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...extraHeaders,
    },
  });
}

function badRequest(message: string): Response {
  return jsonResponse(400, { success: false, error: message, message });
}

function conflict(): Response {
  return jsonResponse(409, {
    success: false,
    error: 'Idempotency-Key conflict',
    message:
      'The Idempotency-Key has already been used with a different request body. ' +
      'Use a new Idempotency-Key for new requests, or retry with the exact same payload.',
  });
}

/**
 * Serialise a Response so we can persist it. We keep the full JSON body and
 * status code — headers are intentionally NOT snapshotted (set-cookie, auth
 * tokens, rate-limit counters etc. should not be replayed verbatim).
 */
async function snapshotResponse(res: Response): Promise<{ status: number; body: unknown }> {
  const clone = res.clone();
  const text = await clone.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // Non-JSON response — store as raw string so replay is still faithful.
    body = { __raw: text };
  }
  return { status: res.status, body };
}

/**
 * Rebuild a Response from a stored snapshot.
 */
function responseFromSnapshot(status: number, body: unknown): Response {
  const payload =
    body && typeof body === 'object' && body !== null && '__raw' in body
      ? (body as { __raw: string }).__raw
      : JSON.stringify(body);
  return new NextResponse(payload, {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'Idempotent-Replayed': 'true',
    },
  });
}

// =============================================================================
// MIDDLEWARE
// =============================================================================

/**
 * Wrap an ApiHandler to honour the Idempotency-Key header for POST mutations.
 *
 * @example
 *   export const POST = withPermission(
 *     withIdempotency(postHandler),
 *     { create: 'inventory:write' },
 *   );
 */
export function withIdempotency(handler: ApiHandler): ApiHandler {
  return async (request: NextRequest, context: HandlerContext): Promise<Response> => {
    // Only care about body-bearing mutations. GET/HEAD don't carry bodies
    // worth de-duping, and most idempotency tooling skips them too.
    const method = (request.method ?? 'GET').toUpperCase();
    if (method !== 'POST' && method !== 'PUT' && method !== 'PATCH' && method !== 'DELETE') {
      return handler(request, context);
    }

    const rawKey = request.headers.get(HEADER_NAME);
    if (!rawKey) {
      // No key → plain request, run as usual. (Callers can choose to enforce
      // the header at the route level if they want mandatory idempotency.)
      return handler(request, context);
    }

    const key = rawKey.trim();
    if (!KEY_FORMAT.test(key)) {
      return badRequest(
        `Invalid Idempotency-Key header. Expected 8-255 URL-safe chars (letters, digits, _-.:), got ${rawKey.length} chars.`,
      );
    }

    // Clone first so the handler still has an un-consumed body to read.
    // `Request.clone()` tees the underlying stream per the fetch spec.
    let bodyForHash: string;
    let clonedRequest: NextRequest;
    try {
      clonedRequest = request.clone() as NextRequest;
      bodyForHash = await request.text();
    } catch (err) {
      logger.logError?.(err as Error, { where: 'idempotency.readBody', key });
      return badRequest('Unable to read request body for idempotency hashing.');
    }

    const requestHash = hashBody(bodyForHash);
    const path = new URL(request.url).pathname;
    const tenantId =
      request.headers.get('x-tenant-id') ||
      // withPermission does not expose tenantId on AuthUser — fall back to
      // user.id so that keys are at least scoped per-user. If the app gets a
      // stricter tenant model later, swap to that context.
      (context?.user?.id ?? null);

    // ------------------------------------------------------------
    // Cache lookup
    // ------------------------------------------------------------
    type ExistingRow = {
      requestHash: string;
      responseStatus: number;
      responseBody: unknown;
      expiresAt: Date;
    };
    let existing: ExistingRow | null = null;
    try {
      const row = await prisma.idempotencyKey.findUnique({
        where: { key },
        select: { requestHash: true, responseStatus: true, responseBody: true, expiresAt: true },
      });
      existing = row as ExistingRow | null;
    } catch (err) {
      // DB down → fail open: process the request but don't cache. Better to
      // duplicate than to block writes entirely when the idempotency table
      // is unreachable.
      logger.logError?.(err as Error, { where: 'idempotency.lookup', key });
      return handler(createReplayRequest(clonedRequest, bodyForHash), context);
    }

    if (existing && existing.expiresAt.getTime() > Date.now()) {
      if (existing.requestHash !== requestHash) {
        return conflict();
      }
      return responseFromSnapshot(existing.responseStatus, existing.responseBody);
    }

    // ------------------------------------------------------------
    // Cache miss — execute handler with a fresh body-readable request
    // ------------------------------------------------------------
    const response = await handler(createReplayRequest(clonedRequest, bodyForHash), context);

    // Only snapshot successful mutations. 4xx means the client should fix
    // their request; 5xx means the server hiccupped and the client should
    // be allowed to retry without hitting a poisoned cache.
    if (response.status >= 200 && response.status < 300) {
      try {
        const snap = await snapshotResponse(response);
        await prisma.idempotencyKey.upsert({
          where: { key },
          create: {
            key,
            tenantId,
            method,
            path,
            requestHash,
            responseStatus: snap.status,
            responseBody: snap.body as Prisma.InputJsonValue,
            expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_MS),
          },
          update: {
            // Race: another replica might have inserted the same key while
            // we were processing. Refresh hash + response so the winner's
            // snapshot stays coherent with the key.
            requestHash,
            responseStatus: snap.status,
            responseBody: snap.body as Prisma.InputJsonValue,
            expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_MS),
          },
        });
      } catch (err) {
        // Don't fail the user's mutation if the snapshot write dies.
        logger.logError?.(err as Error, { where: 'idempotency.persist', key });
      }
    }

    return response;
  };
}

/**
 * Build a NextRequest that carries the already-consumed body, so that the
 * wrapped handler can call `request.json()` normally.
 */
function createReplayRequest(original: NextRequest, bodyText: string): NextRequest {
  // A full NextRequest rebuild keeps method + headers + url intact. Body is
  // supplied as a plain string (Next/undici will encode it as utf-8).
  // NextRequest's `RequestInit` is a narrower type than the global one — cast
  // through `unknown` to avoid fighting the generic.
  const init = {
    method: original.method,
    headers: original.headers,
    body:
      original.method === 'GET' || original.method === 'HEAD' || bodyText === ''
        ? undefined
        : bodyText,
  } as unknown as ConstructorParameters<typeof NextRequest>[1];
  return new NextRequest(original.url, init);
}

// =============================================================================
// MAINTENANCE
// =============================================================================

/**
 * Sweep expired keys. Intended to be called periodically (e.g. nightly cron
 * via the workers runtime — see `src/lib/jobs/workers/`). Returns the number
 * of rows deleted so callers can surface it in logs.
 */
export async function sweepExpiredIdempotencyKeys(now: Date = new Date()): Promise<number> {
  const res = await prisma.idempotencyKey.deleteMany({
    where: { expiresAt: { lt: now } },
  });
  return res.count;
}

export const __testing__ = {
  hashBody,
  KEY_FORMAT,
  IDEMPOTENCY_TTL_MS,
};
