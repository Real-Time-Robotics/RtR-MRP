/**
 * Auth Middleware Unit Tests
 * Tests for withAuth and withRoleAuth higher-order route handler wrappers.
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { NextRequest } from 'next/server';
import { withAuth, withRoleAuth, AuthSession, RouteContext } from '../with-auth';

// ---------------------------------------------------------------------------
// Mock @/lib/auth -- the only external dependency of with-auth.ts
// ---------------------------------------------------------------------------
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

import { auth } from '@/lib/auth';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal NextRequest for testing. */
function makeRequest(url = 'http://localhost:3000/api/test'): NextRequest {
  return new NextRequest(url);
}

/** Build a minimal RouteContext for testing. */
function makeContext(params: Record<string, string> = {}): RouteContext {
  return { params: Promise.resolve(params) };
}

/** Build a valid session object matching the AuthSession shape. */
function makeSession(overrides: Partial<AuthSession['user']> = {}): AuthSession {
  return {
    user: {
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
      role: 'admin',
      image: null,
      ...overrides,
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('withAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // 1. Returns 401 when auth() returns null (no session at all)
  // -------------------------------------------------------------------------
  it('returns 401 when auth() returns null', async () => {
    (auth as Mock).mockResolvedValue(null);

    const handler = vi.fn();
    const wrapped = withAuth(handler);

    const response = await wrapped(makeRequest(), makeContext());

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({ error: 'Unauthorized' });
    expect(handler).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 2. Returns 401 when auth() returns a session without a user property
  // -------------------------------------------------------------------------
  it('returns 401 when auth() returns session without user', async () => {
    (auth as Mock).mockResolvedValue({});

    const handler = vi.fn();
    const wrapped = withAuth(handler);

    const response = await wrapped(makeRequest(), makeContext());

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({ error: 'Unauthorized' });
    expect(handler).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 3. Returns 401 when session.user is explicitly null
  // -------------------------------------------------------------------------
  it('returns 401 when session.user is null', async () => {
    (auth as Mock).mockResolvedValue({ user: null });

    const handler = vi.fn();
    const wrapped = withAuth(handler);

    const response = await wrapped(makeRequest(), makeContext());

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({ error: 'Unauthorized' });
    expect(handler).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 4. Calls handler with (request, context, session) when authenticated
  // -------------------------------------------------------------------------
  it('calls handler with request, context, and session when authenticated', async () => {
    const session = makeSession();
    (auth as Mock).mockResolvedValue(session);

    const handler = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    );
    const wrapped = withAuth(handler);

    const request = makeRequest();
    const context = makeContext({ id: 'abc' });

    await wrapped(request, context);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(request, context, session);
  });

  // -------------------------------------------------------------------------
  // 5. Passes the correct session object to handler
  // -------------------------------------------------------------------------
  it('passes the correct session object to handler', async () => {
    const session = makeSession({
      id: 'user-999',
      name: 'Custom Name',
      email: 'custom@example.com',
      role: 'manager',
      image: 'https://img.example.com/avatar.png',
    });
    (auth as Mock).mockResolvedValue(session);

    const handler = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    const wrapped = withAuth(handler);

    await wrapped(makeRequest(), makeContext());

    const receivedSession = handler.mock.calls[0][2] as AuthSession;
    expect(receivedSession.user.id).toBe('user-999');
    expect(receivedSession.user.name).toBe('Custom Name');
    expect(receivedSession.user.email).toBe('custom@example.com');
    expect(receivedSession.user.role).toBe('manager');
    expect(receivedSession.user.image).toBe('https://img.example.com/avatar.png');
  });

  // -------------------------------------------------------------------------
  // 6. Returns the response from the inner handler
  // -------------------------------------------------------------------------
  it('returns the response produced by the handler', async () => {
    (auth as Mock).mockResolvedValue(makeSession());

    const expectedBody = { data: 'hello' };
    const handler = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(expectedBody), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const wrapped = withAuth(handler);

    const response = await wrapped(makeRequest(), makeContext());

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(expectedBody);
  });

  // -------------------------------------------------------------------------
  // 7. Handler errors propagate correctly (not swallowed)
  // -------------------------------------------------------------------------
  it('propagates errors thrown by the handler', async () => {
    (auth as Mock).mockResolvedValue(makeSession());

    const handler = vi.fn().mockRejectedValue(new Error('handler boom'));
    const wrapped = withAuth(handler);

    await expect(wrapped(makeRequest(), makeContext())).rejects.toThrow('handler boom');
  });

  // -------------------------------------------------------------------------
  // 8. Propagates errors thrown by auth() itself
  // -------------------------------------------------------------------------
  it('propagates errors thrown by auth()', async () => {
    (auth as Mock).mockRejectedValue(new Error('auth service down'));

    const handler = vi.fn();
    const wrapped = withAuth(handler);

    await expect(wrapped(makeRequest(), makeContext())).rejects.toThrow('auth service down');
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('withRoleAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // 1. Returns 401 when not authenticated (delegates to withAuth)
  // -------------------------------------------------------------------------
  it('returns 401 when not authenticated', async () => {
    (auth as Mock).mockResolvedValue(null);

    const handler = vi.fn();
    const wrapped = withRoleAuth(['admin'], handler);

    const response = await wrapped(makeRequest(), makeContext());

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({ error: 'Unauthorized' });
    expect(handler).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 2. Returns 403 when user role is not in allowedRoles
  // -------------------------------------------------------------------------
  it('returns 403 when user role is not in allowedRoles', async () => {
    (auth as Mock).mockResolvedValue(makeSession({ role: 'viewer' }));

    const handler = vi.fn();
    const wrapped = withRoleAuth(['admin', 'manager'], handler);

    const response = await wrapped(makeRequest(), makeContext());

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body).toEqual({ error: 'Forbidden' });
    expect(handler).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 3. Returns 403 when user has no role (undefined)
  // -------------------------------------------------------------------------
  it('returns 403 when user has no role', async () => {
    (auth as Mock).mockResolvedValue(makeSession({ role: undefined }));

    const handler = vi.fn();
    const wrapped = withRoleAuth(['admin'], handler);

    const response = await wrapped(makeRequest(), makeContext());

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body).toEqual({ error: 'Forbidden' });
    expect(handler).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 4. Calls handler when user role is in allowedRoles
  // -------------------------------------------------------------------------
  it('calls handler when user role is in allowedRoles', async () => {
    const session = makeSession({ role: 'admin' });
    (auth as Mock).mockResolvedValue(session);

    const handler = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    const wrapped = withRoleAuth(['admin'], handler);

    const request = makeRequest();
    const context = makeContext();

    const response = await wrapped(request, context);

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledTimes(1);
    // The handler receives the same session that auth() returned (cast to AuthSession)
    expect(handler).toHaveBeenCalledWith(request, context, session);
  });

  // -------------------------------------------------------------------------
  // 5. Works with multiple allowed roles
  // -------------------------------------------------------------------------
  it('allows access when user role matches any of multiple allowedRoles', async () => {
    const session = makeSession({ role: 'manager' });
    (auth as Mock).mockResolvedValue(session);

    const handler = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    const wrapped = withRoleAuth(['admin', 'manager', 'supervisor'], handler);

    const response = await wrapped(makeRequest(), makeContext());

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // 6. Returns 403 for role not in a larger allowedRoles list
  // -------------------------------------------------------------------------
  it('returns 403 for role not present in a larger allowedRoles list', async () => {
    (auth as Mock).mockResolvedValue(makeSession({ role: 'intern' }));

    const handler = vi.fn();
    const wrapped = withRoleAuth(['admin', 'manager', 'supervisor'], handler);

    const response = await wrapped(makeRequest(), makeContext());

    expect(response.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 7. Handler errors propagate correctly
  // -------------------------------------------------------------------------
  it('propagates errors thrown by the handler', async () => {
    (auth as Mock).mockResolvedValue(makeSession({ role: 'admin' }));

    const handler = vi.fn().mockRejectedValue(new Error('role handler boom'));
    const wrapped = withRoleAuth(['admin'], handler);

    await expect(wrapped(makeRequest(), makeContext())).rejects.toThrow('role handler boom');
  });

  // -------------------------------------------------------------------------
  // 8. Passes correct session including role to handler
  // -------------------------------------------------------------------------
  it('passes the full session to handler when role matches', async () => {
    const session = makeSession({
      id: 'user-777',
      role: 'manager',
      email: 'mgr@example.com',
    });
    (auth as Mock).mockResolvedValue(session);

    const handler = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    const wrapped = withRoleAuth(['manager'], handler);

    await wrapped(makeRequest(), makeContext());

    const receivedSession = handler.mock.calls[0][2] as AuthSession;
    expect(receivedSession.user.id).toBe('user-777');
    expect(receivedSession.user.role).toBe('manager');
    expect(receivedSession.user.email).toBe('mgr@example.com');
  });

  // -------------------------------------------------------------------------
  // 9. Returns 401 when session exists but user is missing (withAuth layer)
  // -------------------------------------------------------------------------
  it('returns 401 when session has no user (withAuth layer)', async () => {
    (auth as Mock).mockResolvedValue({ user: undefined });

    const handler = vi.fn();
    const wrapped = withRoleAuth(['admin'], handler);

    const response = await wrapped(makeRequest(), makeContext());

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({ error: 'Unauthorized' });
    expect(handler).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 10. Empty allowedRoles array rejects all users
  // -------------------------------------------------------------------------
  it('returns 403 when allowedRoles is an empty array', async () => {
    (auth as Mock).mockResolvedValue(makeSession({ role: 'admin' }));

    const handler = vi.fn();
    const wrapped = withRoleAuth([], handler);

    const response = await wrapped(makeRequest(), makeContext());

    expect(response.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });
});
