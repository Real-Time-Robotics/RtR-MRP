// src/lib/monitoring/sentry.ts
// Error tracking integration for RTR MRP System
// Uses console logging by default, Sentry is optional

import { logger } from "./logger";

type SeverityLevel = "fatal" | "error" | "warning" | "log" | "info" | "debug";

interface Breadcrumb {
  type?: string;
  category?: string;
  message?: string;
  data?: Record<string, unknown>;
  level?: SeverityLevel;
  timestamp?: number;
}

interface User {
  id: string;
  email?: string;
  name?: string;
}

// Sentry integration placeholder
// To enable Sentry:
// 1. Install: npm install @sentry/nextjs
// 2. Configure: npx @sentry/wizard@latest -i nextjs
// 3. Set SENTRY_DSN in environment

const SENTRY_DSN = process.env.SENTRY_DSN;

export function initSentry() {
  if (!SENTRY_DSN) {
    logger.info("Sentry not configured. Using console logging.");
    return;
  }

  logger.info("Sentry DSN configured. Install @sentry/nextjs for error tracking.");
}

// Capture custom errors
export function captureError(
  error: Error,
  context?: Record<string, unknown>
) {
  logger.error("Error captured", {
    error: error.message,
    stack: error.stack,
    ...context
  });
}

// Capture messages
export function captureMessage(
  message: string,
  level: SeverityLevel = "info"
) {
  switch (level) {
    case "error":
    case "fatal":
      logger.error(message);
      break;
    case "warning":
      logger.warn(message);
      break;
    default:
      logger.info(message);
  }
}

// Set user context (no-op without Sentry)
export function setUser(user: User | null) {
  if (user) {
    logger.debug("User context set", { userId: user.id });
  }
}

// Add breadcrumb (no-op without Sentry)
export function addBreadcrumb(breadcrumb: Breadcrumb) {
  logger.debug("Breadcrumb", {
    category: breadcrumb.category,
    message: breadcrumb.message,
  });
}

// Wrap async function with error capturing
export function withErrorCapture<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  context?: Record<string, unknown>
): T {
  return (async (...args: unknown[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      captureError(error as Error, {
        ...context,
        functionName: fn.name,
      });
      throw error;
    }
  }) as T;
}
