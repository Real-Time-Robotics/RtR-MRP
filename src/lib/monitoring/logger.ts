// src/lib/monitoring/logger.ts
// Structured logging utility for RTR MRP System

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private serviceName: string;
  private minLevel: LogLevel;

  private levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor() {
    this.serviceName = process.env.SERVICE_NAME || "rtr-mrp";
    this.minLevel = (process.env.LOG_LEVEL as LogLevel) || "info";
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levelPriority[level] >= this.levelPriority[this.minLevel];
  }

  private formatEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.serviceName,
    };

    if (context && Object.keys(context).length > 0) {
      entry.context = context;
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    return entry;
  }

  private log(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ) {
    if (!this.shouldLog(level)) return;

    const entry = this.formatEntry(level, message, context, error);

    // In production, output JSON for log aggregation
    // In development, output human-readable format
    if (process.env.NODE_ENV === "production") {
      const output = JSON.stringify(entry);

      switch (level) {
        case "error":
          console.error(output);
          break;
        case "warn":
          console.warn(output);
          break;
        case "debug":
          console.debug(output);
          break;
        default:
          console.log(output);
      }
    } else {
      // Human-readable format for development
      const prefix = `[${entry.timestamp}] [${level.toUpperCase()}]`;

      switch (level) {
        case "error":
          console.error(prefix, message, context || "", error || "");
          break;
        case "warn":
          console.warn(prefix, message, context || "");
          break;
        case "debug":
          console.debug(prefix, message, context || "");
          break;
        default:
          console.log(prefix, message, context || "");
      }
    }
  }

  debug(message: string, context?: LogContext) {
    this.log("debug", message, context);
  }

  info(message: string, context?: LogContext) {
    this.log("info", message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log("warn", message, context);
  }

  error(message: string, error?: Error, context?: LogContext) {
    this.log("error", message, context, error);
  }

  // HTTP request logging
  request(req: {
    method: string;
    url: string;
    duration: number;
    status: number;
    userId?: string;
    ip?: string;
  }) {
    const level = req.status >= 500 ? "error" : req.status >= 400 ? "warn" : "info";
    this.log(level, "HTTP Request", {
      method: req.method,
      url: req.url,
      duration: `${req.duration}ms`,
      status: req.status,
      userId: req.userId,
      ip: req.ip,
    });
  }

  // Database query logging
  query(query: { operation: string; model: string; duration: number }) {
    this.debug("Database Query", {
      operation: query.operation,
      model: query.model,
      duration: `${query.duration}ms`,
    });
  }

  // API operation logging
  api(operation: string, context?: LogContext) {
    this.info(`API: ${operation}`, context);
  }

  // Security event logging
  security(event: string, context?: LogContext) {
    this.warn(`Security: ${event}`, context);
  }

  // Audit logging
  audit(action: string, userId: string, context?: LogContext) {
    this.info(`Audit: ${action}`, {
      userId,
      ...context,
    });
  }
}

export const logger = new Logger();

// Express/Next.js middleware helper
export function requestLogger() {
  return (
    req: { method: string; url: string },
    _res: unknown,
    next: () => void
  ) => {
    const start = Date.now();

    // Log after response
    const originalEnd = (_res as { end: (...args: unknown[]) => void }).end;
    (_res as { end: (...args: unknown[]) => void }).end = function (
      ...args: unknown[]
    ) {
      const duration = Date.now() - start;
      logger.request({
        method: req.method,
        url: req.url,
        duration,
        status: (_res as { statusCode: number }).statusCode,
      });
      return originalEnd.apply(_res, args);
    };

    next();
  };
}
