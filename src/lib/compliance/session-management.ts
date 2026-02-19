// src/lib/compliance/session-management.ts
// Session Management System

import { prisma } from "@/lib/prisma";
import { createHash, randomBytes } from "crypto";
import { logger } from '@/lib/logger';

// Session configuration
const SESSION_CONFIG = {
  maxSessionDurationHours: 24,
  inactivityTimeoutMinutes: 30,
  maxConcurrentSessions: 5,
  sessionTokenLength: 64,
};

// Generate secure session token
export function generateSessionToken(): string {
  return randomBytes(SESSION_CONFIG.sessionTokenLength).toString("hex");
}

// Hash session token for storage comparison
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Create a new session
export async function createSession(options: {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
  location?: string;
}): Promise<{ sessionToken: string; expiresAt: Date } | { error: string }> {
  try {
    // Check for concurrent session limit
    const activeSessions = await prisma.userSession.count({
      where: {
        userId: options.userId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
    });

    if (activeSessions >= SESSION_CONFIG.maxConcurrentSessions) {
      // Revoke oldest session
      const oldestSession = await prisma.userSession.findFirst({
        where: {
          userId: options.userId,
          isActive: true,
        },
        orderBy: { createdAt: "asc" },
      });

      if (oldestSession) {
        await prisma.userSession.update({
          where: { id: oldestSession.id },
          data: {
            isActive: false,
            revokedAt: new Date(),
            revokedReason: "max_sessions_exceeded",
          },
        });
      }
    }

    const sessionToken = generateSessionToken();
    const expiresAt = new Date(
      Date.now() + SESSION_CONFIG.maxSessionDurationHours * 60 * 60 * 1000
    );

    await prisma.userSession.create({
      data: {
        userId: options.userId,
        sessionToken: hashSessionToken(sessionToken),
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
        deviceFingerprint: options.deviceFingerprint,
        location: options.location,
        isActive: true,
        lastActivityAt: new Date(),
        expiresAt,
      },
    });

    return { sessionToken, expiresAt };
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'session-management', operation: 'createSession' });
    return { error: "Failed to create session" };
  }
}

// Validate session token
export async function validateSession(sessionToken: string): Promise<{
  valid: boolean;
  userId?: string;
  session?: {
    id: string;
    createdAt: Date;
    expiresAt: Date;
    lastActivityAt: Date;
  };
  error?: string;
}> {
  try {
    const hashedToken = hashSessionToken(sessionToken);

    const session = await prisma.userSession.findUnique({
      where: { sessionToken: hashedToken },
      include: {
        user: {
          select: { id: true, status: true },
        },
      },
    });

    if (!session) {
      return { valid: false, error: "Session not found" };
    }

    if (!session.isActive) {
      return { valid: false, error: "Session has been revoked" };
    }

    if (session.expiresAt < new Date()) {
      await prisma.userSession.update({
        where: { id: session.id },
        data: {
          isActive: false,
          revokedAt: new Date(),
          revokedReason: "expired",
        },
      });
      return { valid: false, error: "Session has expired" };
    }

    // Check inactivity timeout
    const inactivityLimit =
      SESSION_CONFIG.inactivityTimeoutMinutes * 60 * 1000;
    if (Date.now() - session.lastActivityAt.getTime() > inactivityLimit) {
      await prisma.userSession.update({
        where: { id: session.id },
        data: {
          isActive: false,
          revokedAt: new Date(),
          revokedReason: "inactivity_timeout",
        },
      });
      return { valid: false, error: "Session timed out due to inactivity" };
    }

    // Check user status
    if (session.user.status !== "active") {
      return { valid: false, error: "User account is not active" };
    }

    return {
      valid: true,
      userId: session.userId,
      session: {
        id: session.id,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        lastActivityAt: session.lastActivityAt,
      },
    };
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'session-management', operation: 'validateSession' });
    return { valid: false, error: "Session validation failed" };
  }
}

// Update session activity
export async function updateSessionActivity(
  sessionToken: string
): Promise<void> {
  const hashedToken = hashSessionToken(sessionToken);

  await prisma.userSession.update({
    where: { sessionToken: hashedToken },
    data: { lastActivityAt: new Date() },
  });
}

// Revoke a specific session
export async function revokeSession(
  sessionToken: string,
  reason: string = "user_logout"
): Promise<boolean> {
  try {
    const hashedToken = hashSessionToken(sessionToken);

    await prisma.userSession.update({
      where: { sessionToken: hashedToken },
      data: {
        isActive: false,
        revokedAt: new Date(),
        revokedReason: reason,
      },
    });

    return true;
  } catch {
    return false;
  }
}

// Revoke all sessions for a user
export async function revokeAllUserSessions(
  userId: string,
  reason: string = "user_initiated",
  exceptSessionToken?: string
): Promise<number> {
  const exceptHash = exceptSessionToken
    ? hashSessionToken(exceptSessionToken)
    : undefined;

  const result = await prisma.userSession.updateMany({
    where: {
      userId,
      isActive: true,
      ...(exceptHash && { sessionToken: { not: exceptHash } }),
    },
    data: {
      isActive: false,
      revokedAt: new Date(),
      revokedReason: reason,
    },
  });

  return result.count;
}

// Get active sessions for a user
export async function getUserActiveSessions(userId: string) {
  const sessions = await prisma.userSession.findMany({
    where: {
      userId,
      isActive: true,
      expiresAt: { gt: new Date() },
    },
    orderBy: { lastActivityAt: "desc" },
    select: {
      id: true,
      ipAddress: true,
      userAgent: true,
      location: true,
      createdAt: true,
      lastActivityAt: true,
      expiresAt: true,
    },
  });

  return sessions.map((s) => ({
    ...s,
    isCurrent: false, // Will be set by caller
    device: parseUserAgent(s.userAgent),
  }));
}

// Parse user agent string
function parseUserAgent(
  userAgent: string | null
): { browser: string; os: string; device: string } {
  if (!userAgent) {
    return { browser: "Unknown", os: "Unknown", device: "Unknown" };
  }

  let browser = "Unknown";
  let os = "Unknown";
  let device = "Desktop";

  // Browser detection
  if (userAgent.includes("Firefox")) browser = "Firefox";
  else if (userAgent.includes("Edg")) browser = "Edge";
  else if (userAgent.includes("Chrome")) browser = "Chrome";
  else if (userAgent.includes("Safari")) browser = "Safari";
  else if (userAgent.includes("Opera")) browser = "Opera";

  // OS detection
  if (userAgent.includes("Windows")) os = "Windows";
  else if (userAgent.includes("Mac OS")) os = "macOS";
  else if (userAgent.includes("Linux")) os = "Linux";
  else if (userAgent.includes("Android")) os = "Android";
  else if (userAgent.includes("iOS") || userAgent.includes("iPhone"))
    os = "iOS";

  // Device detection
  if (
    userAgent.includes("Mobile") ||
    userAgent.includes("Android") ||
    userAgent.includes("iPhone")
  ) {
    device = "Mobile";
  } else if (userAgent.includes("Tablet") || userAgent.includes("iPad")) {
    device = "Tablet";
  }

  return { browser, os, device };
}

// Clean up expired sessions
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await prisma.userSession.updateMany({
    where: {
      isActive: true,
      expiresAt: { lt: new Date() },
    },
    data: {
      isActive: false,
      revokedAt: new Date(),
      revokedReason: "expired",
    },
  });

  return result.count;
}

// Get session statistics
export async function getSessionStatistics() {
  const [activeSessions, sessionsLast24h, sessionsByDevice] = await Promise.all(
    [
      prisma.userSession.count({
        where: { isActive: true, expiresAt: { gt: new Date() } },
      }),
      prisma.userSession.count({
        where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      }),
      prisma.userSession.groupBy({
        by: ["userAgent"],
        where: { isActive: true },
        _count: true,
      }),
    ]
  );

  // Aggregate by device type
  const deviceCounts = { Desktop: 0, Mobile: 0, Tablet: 0, Unknown: 0 };
  for (const item of sessionsByDevice) {
    const { device } = parseUserAgent(item.userAgent);
    deviceCounts[device as keyof typeof deviceCounts] =
      (deviceCounts[device as keyof typeof deviceCounts] || 0) + item._count;
  }

  return {
    activeSessions,
    sessionsLast24h,
    byDevice: deviceCounts,
  };
}

// Extend session duration
export async function extendSession(
  sessionToken: string,
  additionalHours: number = 24
): Promise<{ success: boolean; newExpiresAt?: Date; error?: string }> {
  try {
    const hashedToken = hashSessionToken(sessionToken);

    const session = await prisma.userSession.findUnique({
      where: { sessionToken: hashedToken },
    });

    if (!session || !session.isActive) {
      return { success: false, error: "Session not found or inactive" };
    }

    const maxDuration = SESSION_CONFIG.maxSessionDurationHours * 60 * 60 * 1000;
    const sessionAge = Date.now() - session.createdAt.getTime();

    if (sessionAge + additionalHours * 60 * 60 * 1000 > maxDuration * 2) {
      return {
        success: false,
        error: "Cannot extend session beyond maximum duration",
      };
    }

    const newExpiresAt = new Date(
      session.expiresAt.getTime() + additionalHours * 60 * 60 * 1000
    );

    await prisma.userSession.update({
      where: { id: session.id },
      data: {
        expiresAt: newExpiresAt,
        lastActivityAt: new Date(),
      },
    });

    return { success: true, newExpiresAt };
  } catch {
    return { success: false, error: "Failed to extend session" };
  }
}

// Session activity middleware helper
export function createSessionMiddleware() {
  const recentUpdates = new Map<string, number>();
  const UPDATE_THROTTLE_MS = 60000; // 1 minute

  return {
    async trackActivity(sessionToken: string): Promise<void> {
      const now = Date.now();
      const lastUpdate = recentUpdates.get(sessionToken);

      // Throttle updates to avoid excessive DB writes
      if (lastUpdate && now - lastUpdate < UPDATE_THROTTLE_MS) {
        return;
      }

      recentUpdates.set(sessionToken, now);
      await updateSessionActivity(sessionToken);

      // Clean up old entries
      recentUpdates.forEach((time, token) => {
        if (now - time > UPDATE_THROTTLE_MS * 2) {
          recentUpdates.delete(token);
        }
      });
    },
  };
}
