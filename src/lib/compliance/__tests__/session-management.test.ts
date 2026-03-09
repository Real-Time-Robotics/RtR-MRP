import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateSessionToken,
  hashSessionToken,
  createSession,
  validateSession,
  updateSessionActivity,
  revokeSession,
  revokeAllUserSessions,
  getUserActiveSessions,
  cleanupExpiredSessions,
  getSessionStatistics,
  extendSession,
  createSessionMiddleware,
} from '../session-management';

// ---- mocks ----

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    userSession: {
      count: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      groupBy: vi.fn(),
    },
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), logError: vi.fn() },
}));

// ---- tests ----

describe('Session Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  // ----- generateSessionToken -----

  describe('generateSessionToken', () => {
    it('should return a hex string of length 128 (64 bytes)', () => {
      const token = generateSessionToken();
      expect(token).toHaveLength(128);
      expect(/^[0-9a-f]+$/.test(token)).toBe(true);
    });

    it('should generate unique tokens', () => {
      const a = generateSessionToken();
      const b = generateSessionToken();
      expect(a).not.toBe(b);
    });
  });

  // ----- hashSessionToken -----

  describe('hashSessionToken', () => {
    it('should return sha256 hex (64 chars)', () => {
      const hash = hashSessionToken('test-token');
      expect(hash).toHaveLength(64);
    });

    it('should be deterministic', () => {
      expect(hashSessionToken('abc')).toBe(hashSessionToken('abc'));
    });

    it('should differ for different inputs', () => {
      expect(hashSessionToken('a')).not.toBe(hashSessionToken('b'));
    });
  });

  // ----- createSession -----

  describe('createSession', () => {
    it('should create a session when under concurrent limit', async () => {
      mockPrisma.userSession.count.mockResolvedValue(2);
      mockPrisma.userSession.create.mockResolvedValue({});

      const result = await createSession({ userId: 'user-1', ipAddress: '1.2.3.4' });

      expect(result).toHaveProperty('sessionToken');
      expect(result).toHaveProperty('expiresAt');
      expect(mockPrisma.userSession.create).toHaveBeenCalledTimes(1);
    });

    it('should revoke oldest session when at concurrent limit', async () => {
      mockPrisma.userSession.count.mockResolvedValue(5);
      mockPrisma.userSession.findFirst.mockResolvedValue({ id: 'old-session' });
      mockPrisma.userSession.update.mockResolvedValue({});
      mockPrisma.userSession.create.mockResolvedValue({});

      const result = await createSession({ userId: 'user-1' });
      expect(result).toHaveProperty('sessionToken');
      expect(mockPrisma.userSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'old-session' },
          data: expect.objectContaining({ isActive: false, revokedReason: 'max_sessions_exceeded' }),
        }),
      );
    });

    it('should handle no oldest session found at limit', async () => {
      mockPrisma.userSession.count.mockResolvedValue(5);
      mockPrisma.userSession.findFirst.mockResolvedValue(null);
      mockPrisma.userSession.create.mockResolvedValue({});

      const result = await createSession({ userId: 'user-1' });
      expect(result).toHaveProperty('sessionToken');
      // update should not be called for revoking
      expect(mockPrisma.userSession.update).not.toHaveBeenCalled();
    });

    it('should return error on exception', async () => {
      mockPrisma.userSession.count.mockRejectedValue(new Error('DB down'));

      const result = await createSession({ userId: 'user-1' });
      expect(result).toEqual({ error: 'Failed to create session' });
    });

    it('should set expiresAt 24 hours from now', async () => {
      mockPrisma.userSession.count.mockResolvedValue(0);
      mockPrisma.userSession.create.mockResolvedValue({});

      const before = Date.now();
      const result = await createSession({ userId: 'user-1' });
      const after = Date.now();

      if ('expiresAt' in result) {
        const expTime = result.expiresAt.getTime();
        const expected24h = 24 * 60 * 60 * 1000;
        expect(expTime).toBeGreaterThanOrEqual(before + expected24h);
        expect(expTime).toBeLessThanOrEqual(after + expected24h);
      }
    });
  });

  // ----- validateSession -----

  describe('validateSession', () => {
    it('should return invalid when session not found', async () => {
      mockPrisma.userSession.findUnique.mockResolvedValue(null);

      const result = await validateSession('token');
      expect(result).toEqual({ valid: false, error: 'Session not found' });
    });

    it('should return invalid when session is revoked', async () => {
      mockPrisma.userSession.findUnique.mockResolvedValue({
        id: 's1', isActive: false, expiresAt: new Date(Date.now() + 100000),
        lastActivityAt: new Date(), user: { id: 'u1', status: 'active' },
      });

      const result = await validateSession('token');
      expect(result).toEqual({ valid: false, error: 'Session has been revoked' });
    });

    it('should expire session when past expiresAt', async () => {
      mockPrisma.userSession.findUnique.mockResolvedValue({
        id: 's1', isActive: true, expiresAt: new Date(Date.now() - 1000),
        lastActivityAt: new Date(), user: { id: 'u1', status: 'active' },
      });
      mockPrisma.userSession.update.mockResolvedValue({});

      const result = await validateSession('token');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Session has expired');
      expect(mockPrisma.userSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ revokedReason: 'expired' }),
        }),
      );
    });

    it('should timeout due to inactivity', async () => {
      const inactiveAt = new Date(Date.now() - 31 * 60 * 1000); // 31 min ago
      mockPrisma.userSession.findUnique.mockResolvedValue({
        id: 's1', isActive: true, expiresAt: new Date(Date.now() + 100000),
        lastActivityAt: inactiveAt, user: { id: 'u1', status: 'active' },
      });
      mockPrisma.userSession.update.mockResolvedValue({});

      const result = await validateSession('token');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Session timed out due to inactivity');
    });

    it('should return invalid when user is not active', async () => {
      mockPrisma.userSession.findUnique.mockResolvedValue({
        id: 's1', isActive: true, expiresAt: new Date(Date.now() + 100000),
        lastActivityAt: new Date(), user: { id: 'u1', status: 'suspended' },
      });

      const result = await validateSession('token');
      expect(result).toEqual({ valid: false, error: 'User account is not active' });
    });

    it('should return valid session data on success', async () => {
      const now = new Date();
      const created = new Date(Date.now() - 1000);
      const expires = new Date(Date.now() + 100000);
      mockPrisma.userSession.findUnique.mockResolvedValue({
        id: 's1', userId: 'u1', isActive: true, expiresAt: expires,
        createdAt: created, lastActivityAt: now,
        user: { id: 'u1', status: 'active' },
      });

      const result = await validateSession('token');
      expect(result.valid).toBe(true);
      expect(result.userId).toBe('u1');
      expect(result.session?.id).toBe('s1');
    });

    it('should handle exceptions', async () => {
      mockPrisma.userSession.findUnique.mockRejectedValue(new Error('DB error'));

      const result = await validateSession('token');
      expect(result).toEqual({ valid: false, error: 'Session validation failed' });
    });
  });

  // ----- updateSessionActivity -----

  describe('updateSessionActivity', () => {
    it('should update lastActivityAt', async () => {
      mockPrisma.userSession.update.mockResolvedValue({});

      await updateSessionActivity('token');
      expect(mockPrisma.userSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sessionToken: hashSessionToken('token') },
          data: { lastActivityAt: expect.any(Date) },
        }),
      );
    });
  });

  // ----- revokeSession -----

  describe('revokeSession', () => {
    it('should revoke session and return true', async () => {
      mockPrisma.userSession.update.mockResolvedValue({});

      const result = await revokeSession('token', 'admin_action');
      expect(result).toBe(true);
      expect(mockPrisma.userSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isActive: false, revokedReason: 'admin_action' }),
        }),
      );
    });

    it('should use default reason user_logout', async () => {
      mockPrisma.userSession.update.mockResolvedValue({});

      await revokeSession('token');
      const call = mockPrisma.userSession.update.mock.calls[0][0];
      expect(call.data.revokedReason).toBe('user_logout');
    });

    it('should return false on error', async () => {
      mockPrisma.userSession.update.mockRejectedValue(new Error('fail'));

      const result = await revokeSession('token');
      expect(result).toBe(false);
    });
  });

  // ----- revokeAllUserSessions -----

  describe('revokeAllUserSessions', () => {
    it('should revoke all sessions and return count', async () => {
      mockPrisma.userSession.updateMany.mockResolvedValue({ count: 3 });

      const count = await revokeAllUserSessions('user-1');
      expect(count).toBe(3);
    });

    it('should exclude a session token when provided', async () => {
      mockPrisma.userSession.updateMany.mockResolvedValue({ count: 2 });

      await revokeAllUserSessions('user-1', 'logout_all', 'keep-this-token');
      const where = mockPrisma.userSession.updateMany.mock.calls[0][0].where;
      expect(where.sessionToken).toEqual({ not: hashSessionToken('keep-this-token') });
    });

    it('should not add sessionToken filter when no except token', async () => {
      mockPrisma.userSession.updateMany.mockResolvedValue({ count: 1 });

      await revokeAllUserSessions('user-1');
      const where = mockPrisma.userSession.updateMany.mock.calls[0][0].where;
      expect(where.sessionToken).toBeUndefined();
    });
  });

  // ----- getUserActiveSessions -----

  describe('getUserActiveSessions', () => {
    it('should return sessions with parsed user agent', async () => {
      mockPrisma.userSession.findMany.mockResolvedValue([
        {
          id: 's1', ipAddress: '1.2.3.4',
          userAgent: 'Mozilla/5.0 Chrome Windows',
          location: 'VN', createdAt: new Date(), lastActivityAt: new Date(), expiresAt: new Date(),
        },
      ]);

      const sessions = await getUserActiveSessions('user-1');
      expect(sessions).toHaveLength(1);
      expect(sessions[0].device).toEqual({ browser: 'Chrome', os: 'Windows', device: 'Desktop' });
      expect(sessions[0].isCurrent).toBe(false);
    });

    it('should handle null userAgent', async () => {
      mockPrisma.userSession.findMany.mockResolvedValue([
        {
          id: 's2', ipAddress: null, userAgent: null, location: null,
          createdAt: new Date(), lastActivityAt: new Date(), expiresAt: new Date(),
        },
      ]);

      const sessions = await getUserActiveSessions('user-1');
      expect(sessions[0].device).toEqual({ browser: 'Unknown', os: 'Unknown', device: 'Unknown' });
    });

    it('should detect Firefox browser', async () => {
      mockPrisma.userSession.findMany.mockResolvedValue([
        { id: 's3', ipAddress: null, userAgent: 'Mozilla Firefox Linux', location: null, createdAt: new Date(), lastActivityAt: new Date(), expiresAt: new Date() },
      ]);
      const sessions = await getUserActiveSessions('u1');
      expect(sessions[0].device.browser).toBe('Firefox');
      expect(sessions[0].device.os).toBe('Linux');
    });

    it('should detect Edge browser', async () => {
      mockPrisma.userSession.findMany.mockResolvedValue([
        { id: 's4', ipAddress: null, userAgent: 'Edg Windows', location: null, createdAt: new Date(), lastActivityAt: new Date(), expiresAt: new Date() },
      ]);
      const sessions = await getUserActiveSessions('u1');
      expect(sessions[0].device.browser).toBe('Edge');
    });

    it('should detect Safari browser', async () => {
      mockPrisma.userSession.findMany.mockResolvedValue([
        { id: 's5', ipAddress: null, userAgent: 'Safari Mac OS', location: null, createdAt: new Date(), lastActivityAt: new Date(), expiresAt: new Date() },
      ]);
      const sessions = await getUserActiveSessions('u1');
      expect(sessions[0].device.browser).toBe('Safari');
      expect(sessions[0].device.os).toBe('macOS');
    });

    it('should detect Opera browser', async () => {
      mockPrisma.userSession.findMany.mockResolvedValue([
        { id: 's6', ipAddress: null, userAgent: 'Opera Android', location: null, createdAt: new Date(), lastActivityAt: new Date(), expiresAt: new Date() },
      ]);
      const sessions = await getUserActiveSessions('u1');
      expect(sessions[0].device.browser).toBe('Opera');
      expect(sessions[0].device.os).toBe('Android');
    });

    it('should detect iOS', async () => {
      mockPrisma.userSession.findMany.mockResolvedValue([
        { id: 's7', ipAddress: null, userAgent: 'Safari iPhone iOS', location: null, createdAt: new Date(), lastActivityAt: new Date(), expiresAt: new Date() },
      ]);
      const sessions = await getUserActiveSessions('u1');
      expect(sessions[0].device.os).toBe('iOS');
    });

    it('should detect Mobile device', async () => {
      mockPrisma.userSession.findMany.mockResolvedValue([
        { id: 's8', ipAddress: null, userAgent: 'Chrome Mobile', location: null, createdAt: new Date(), lastActivityAt: new Date(), expiresAt: new Date() },
      ]);
      const sessions = await getUserActiveSessions('u1');
      expect(sessions[0].device.device).toBe('Mobile');
    });

    it('should detect Tablet device (iPad)', async () => {
      mockPrisma.userSession.findMany.mockResolvedValue([
        { id: 's9', ipAddress: null, userAgent: 'Safari iPad', location: null, createdAt: new Date(), lastActivityAt: new Date(), expiresAt: new Date() },
      ]);
      const sessions = await getUserActiveSessions('u1');
      expect(sessions[0].device.device).toBe('Tablet');
    });

    it('should detect Tablet device (Tablet keyword)', async () => {
      mockPrisma.userSession.findMany.mockResolvedValue([
        { id: 's10', ipAddress: null, userAgent: 'Chrome Tablet', location: null, createdAt: new Date(), lastActivityAt: new Date(), expiresAt: new Date() },
      ]);
      const sessions = await getUserActiveSessions('u1');
      expect(sessions[0].device.device).toBe('Tablet');
    });
  });

  // ----- cleanupExpiredSessions -----

  describe('cleanupExpiredSessions', () => {
    it('should update expired sessions and return count', async () => {
      mockPrisma.userSession.updateMany.mockResolvedValue({ count: 5 });

      const count = await cleanupExpiredSessions();
      expect(count).toBe(5);
    });
  });

  // ----- getSessionStatistics -----

  describe('getSessionStatistics', () => {
    it('should return aggregated statistics', async () => {
      mockPrisma.userSession.count
        .mockResolvedValueOnce(10) // activeSessions
        .mockResolvedValueOnce(25); // sessionsLast24h
      mockPrisma.userSession.groupBy.mockResolvedValue([
        { userAgent: 'Chrome Windows', _count: 5 },
        { userAgent: 'Safari Mobile iPhone', _count: 3 },
        { userAgent: null, _count: 2 },
      ]);

      const stats = await getSessionStatistics();
      expect(stats.activeSessions).toBe(10);
      expect(stats.sessionsLast24h).toBe(25);
      expect(stats.byDevice.Desktop).toBe(5);
      expect(stats.byDevice.Mobile).toBe(3);
      expect(stats.byDevice.Unknown).toBe(2);
    });
  });

  // ----- extendSession -----

  describe('extendSession', () => {
    it('should return error when session not found', async () => {
      mockPrisma.userSession.findUnique.mockResolvedValue(null);

      const result = await extendSession('token');
      expect(result).toEqual({ success: false, error: 'Session not found or inactive' });
    });

    it('should return error when session is inactive', async () => {
      mockPrisma.userSession.findUnique.mockResolvedValue({ id: 's1', isActive: false });

      const result = await extendSession('token');
      expect(result).toEqual({ success: false, error: 'Session not found or inactive' });
    });

    it('should return error when extension exceeds max duration', async () => {
      // Session created 47 hours ago, trying to add 24 more => 71h > 48h max
      mockPrisma.userSession.findUnique.mockResolvedValue({
        id: 's1', isActive: true,
        createdAt: new Date(Date.now() - 47 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000),
      });

      const result = await extendSession('token', 24);
      expect(result).toEqual({ success: false, error: 'Cannot extend session beyond maximum duration' });
    });

    it('should extend session successfully', async () => {
      const expiresAt = new Date(Date.now() + 10 * 60 * 60 * 1000);
      mockPrisma.userSession.findUnique.mockResolvedValue({
        id: 's1', isActive: true,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        expiresAt,
      });
      mockPrisma.userSession.update.mockResolvedValue({});

      const result = await extendSession('token', 4);
      expect(result.success).toBe(true);
      expect(result.newExpiresAt).toBeDefined();
      expect(result.newExpiresAt!.getTime()).toBe(expiresAt.getTime() + 4 * 60 * 60 * 1000);
    });

    it('should use default 24h when no additionalHours provided', async () => {
      const expiresAt = new Date(Date.now() + 10 * 60 * 60 * 1000);
      mockPrisma.userSession.findUnique.mockResolvedValue({
        id: 's1', isActive: true,
        createdAt: new Date(),
        expiresAt,
      });
      mockPrisma.userSession.update.mockResolvedValue({});

      const result = await extendSession('token');
      expect(result.success).toBe(true);
      expect(result.newExpiresAt!.getTime()).toBe(expiresAt.getTime() + 24 * 60 * 60 * 1000);
    });

    it('should return error on exception', async () => {
      mockPrisma.userSession.findUnique.mockRejectedValue(new Error('fail'));

      const result = await extendSession('token');
      expect(result).toEqual({ success: false, error: 'Failed to extend session' });
    });
  });

  // ----- createSessionMiddleware -----

  describe('createSessionMiddleware', () => {
    it('should call updateSessionActivity on first call', async () => {
      mockPrisma.userSession.update.mockResolvedValue({});
      const mw = createSessionMiddleware();

      await mw.trackActivity('tok-1');
      expect(mockPrisma.userSession.update).toHaveBeenCalledTimes(1);
    });

    it('should throttle calls within 1 minute', async () => {
      mockPrisma.userSession.update.mockResolvedValue({});
      const mw = createSessionMiddleware();

      await mw.trackActivity('tok-1');
      await mw.trackActivity('tok-1');
      expect(mockPrisma.userSession.update).toHaveBeenCalledTimes(1);
    });

    it('should allow call after throttle period', async () => {
      vi.useFakeTimers();
      mockPrisma.userSession.update.mockResolvedValue({});
      const mw = createSessionMiddleware();

      await mw.trackActivity('tok-1');
      vi.advanceTimersByTime(61000);
      await mw.trackActivity('tok-1');
      expect(mockPrisma.userSession.update).toHaveBeenCalledTimes(2);
    });

    it('should clean up old entries', async () => {
      vi.useFakeTimers();
      mockPrisma.userSession.update.mockResolvedValue({});
      const mw = createSessionMiddleware();

      await mw.trackActivity('tok-old');
      vi.advanceTimersByTime(130000); // > 2 * 60000
      await mw.trackActivity('tok-new');
      // After cleanup, tok-old should have been removed
      // Now tok-old should be treated as new
      vi.advanceTimersByTime(1000);
      await mw.trackActivity('tok-old');
      expect(mockPrisma.userSession.update).toHaveBeenCalledTimes(3);
    });
  });
});
