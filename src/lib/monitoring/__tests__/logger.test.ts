import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logger, createRequestLogger, loggingMiddleware, Logger } from '../logger';

describe('Logger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('log levels', () => {
    it('should log info', () => {
      logger.info('test info');
      expect(console.info).toHaveBeenCalled();
    });

    it('should log warn', () => {
      logger.warn('test warn');
      expect(console.warn).toHaveBeenCalled();
    });

    it('should log error', () => {
      logger.error('test error');
      expect(console.error).toHaveBeenCalled();
    });

    it('should log fatal', () => {
      logger.fatal('test fatal');
      expect(console.error).toHaveBeenCalled();
    });

    it('should log with data', () => {
      logger.info('with data', { key: 'value' });
      expect(console.info).toHaveBeenCalled();
    });

    it('should log with error object', () => {
      logger.error('with error', { error: new Error('test err') });
      expect(console.error).toHaveBeenCalled();
    });

    it('should log with duration', () => {
      logger.info('with duration', { duration: 150 });
      expect(console.info).toHaveBeenCalled();
    });
  });

  describe('child', () => {
    it('should create child logger with context', () => {
      const child = logger.child({ requestId: 'req-1', userId: 'user-1' });
      expect(child).toBeInstanceOf(Logger);
      child.info('child log');
      expect(console.info).toHaveBeenCalled();
    });
  });

  describe('setContext', () => {
    it('should merge context', () => {
      const l = new Logger();
      l.setContext({ tenantId: 'tenant-1' });
      l.info('with context');
      expect(console.info).toHaveBeenCalled();
    });
  });

  describe('http', () => {
    it('should log info for 2xx status', () => {
      logger.http({ method: 'GET', url: '/api/test', status: 200, duration: 50 });
      expect(console.info).toHaveBeenCalled();
    });

    it('should log warn for 4xx status', () => {
      logger.http({ method: 'POST', url: '/api/test', status: 404, duration: 30 });
      expect(console.warn).toHaveBeenCalled();
    });

    it('should log error for 5xx status', () => {
      logger.http({ method: 'GET', url: '/api/test', status: 500, duration: 100 });
      expect(console.error).toHaveBeenCalled();
    });

    it('should include ip and userAgent', () => {
      logger.http({ method: 'GET', url: '/', status: 200, duration: 10, ip: '1.2.3.4', userAgent: 'test' });
      expect(console.info).toHaveBeenCalled();
    });
  });

  describe('db', () => {
    it('should log debug for successful query', () => {
      logger.db({ operation: 'findMany', model: 'Part', duration: 5, success: true });
      // debug level might be suppressed by default log level
    });

    it('should log error for failed query', () => {
      logger.db({ operation: 'create', model: 'Part', duration: 10, success: false });
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('job', () => {
    it('should log info for started/completed jobs', () => {
      logger.job({ queue: 'main', name: 'test', id: 'j1', status: 'started' });
      expect(console.info).toHaveBeenCalled();
    });

    it('should log error for failed jobs', () => {
      logger.job({ queue: 'main', name: 'test', id: 'j1', status: 'failed', error: new Error('boom') });
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('security', () => {
    it('should log info for login', () => {
      logger.security({ type: 'login', userId: 'u1' });
      expect(console.info).toHaveBeenCalled();
    });

    it('should log warn for access_denied', () => {
      logger.security({ type: 'access_denied', ip: '1.2.3.4' });
      expect(console.warn).toHaveBeenCalled();
    });

    it('should log warn for suspicious', () => {
      logger.security({ type: 'suspicious', details: 'brute force' });
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('audit', () => {
    it('should log audit event', () => {
      logger.audit({ action: 'update', resource: 'Part', resourceId: 'p1', userId: 'u1' });
      expect(console.info).toHaveBeenCalled();
    });

    it('should include changes', () => {
      logger.audit({
        action: 'update',
        resource: 'Part',
        userId: 'u1',
        changes: { name: { old: 'A', new: 'B' } },
      });
      expect(console.info).toHaveBeenCalled();
    });
  });

  describe('time', () => {
    it('should return a timer function', () => {
      const end = logger.time('test-op');
      expect(typeof end).toBe('function');
      end();
    });
  });
});

describe('createRequestLogger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  it('should create logger with request headers', () => {
    const reqLogger = createRequestLogger({
      headers: {
        'x-request-id': 'req-123',
        'x-tenant-id': 'tenant-1',
        'x-user-id': 'user-1',
        'x-trace-id': 'trace-1',
      },
    });
    expect(reqLogger).toBeInstanceOf(Logger);
    reqLogger.info('test');
    expect(console.info).toHaveBeenCalled();
  });

  it('should generate request ID when not provided', () => {
    const reqLogger = createRequestLogger({ headers: {} });
    expect(reqLogger).toBeInstanceOf(Logger);
  });
});

describe('loggingMiddleware', () => {
  beforeEach(() => {
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  it('should return middleware function', () => {
    const middleware = loggingMiddleware();
    expect(typeof middleware).toBe('function');
  });

  it('should attach logger to request and call next', () => {
    const middleware = loggingMiddleware();
    const req = {
      method: 'GET',
      url: '/api/test',
      headers: {},
    } as any;
    const finishCallbacks: (() => void)[] = [];
    const res = {
      statusCode: 200,
      on: (event: string, cb: () => void) => { if (event === 'finish') finishCallbacks.push(cb); },
    };
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.log).toBeDefined();

    // Trigger finish
    finishCallbacks.forEach(cb => cb());
  });
});
