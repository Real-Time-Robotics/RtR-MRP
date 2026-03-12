import { describe, it, expect, vi, beforeEach } from 'vitest';

// Need to import maskSensitiveData separately - it's not exported directly from logger
// Instead we test the logger instance behavior

describe('Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should import logger without error', async () => {
    // Logger is disabled in test mode (NODE_ENV=test), so we test import
    // eslint-disable-next-line @next/next/no-assign-module-variable
    const module = await import('../logger');
    expect(module.logger).toBeDefined();
  });

  it('should have all log methods', async () => {
    const { logger } = await import('../logger');
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.logError).toBe('function');
  });

  it('should have utility methods', async () => {
    const { logger } = await import('../logger');
    expect(typeof logger.time).toBe('function');
    expect(typeof logger.logRequest).toBe('function');
    expect(typeof logger.logQuery).toBe('function');
    expect(typeof logger.audit).toBe('function');
  });

  it('should have context methods', async () => {
    const { logger } = await import('../logger');
    expect(typeof logger.setRequestContext).toBe('function');
    expect(typeof logger.clearRequestContext).toBe('function');
    expect(typeof logger.child).toBe('function');
  });

  it('should call log methods without throwing', async () => {
    const { logger } = await import('../logger');
    expect(() => logger.debug('test debug')).not.toThrow();
    expect(() => logger.info('test info')).not.toThrow();
    expect(() => logger.warn('test warn')).not.toThrow();
    expect(() => logger.error('test error')).not.toThrow();
  });

  it('should accept context in log calls', async () => {
    const { logger } = await import('../logger');
    expect(() => logger.info('test', { key: 'value' })).not.toThrow();
  });

  it('should handle logError with Error object', async () => {
    const { logger } = await import('../logger');
    expect(() => logger.logError(new Error('test error'))).not.toThrow();
  });

  it('should handle time function', async () => {
    const { logger } = await import('../logger');
    const end = logger.time('test-timer');
    expect(typeof end).toBe('function');
    expect(() => end()).not.toThrow();
  });

  it('should handle logRequest', async () => {
    const { logger } = await import('../logger');
    expect(() => logger.logRequest('GET', '/api/test', 200, 42)).not.toThrow();
  });

  it('should handle logQuery', async () => {
    const { logger } = await import('../logger');
    expect(() => logger.logQuery('SELECT * FROM parts', 15)).not.toThrow();
  });

  it('should handle audit', async () => {
    const { logger } = await import('../logger');
    expect(() => logger.audit('CREATE', 'part', 'part-123')).not.toThrow();
  });

  it('should create child logger', async () => {
    const { logger } = await import('../logger');
    // @ts-expect-error test data
    const child = logger.child({ module: 'test' });
    expect(child).toBeDefined();
    expect(typeof child.info).toBe('function');
  });

  it('should handle request context', async () => {
    const { logger } = await import('../logger');
    expect(() => logger.setRequestContext('req-123', 'user-456')).not.toThrow();
    expect(() => logger.clearRequestContext()).not.toThrow();
  });

  it('should export standalone log functions', async () => {
    // eslint-disable-next-line @next/next/no-assign-module-variable
    const module = await import('../logger');
    expect(typeof module.debug).toBe('function');
    expect(typeof module.info).toBe('function');
    expect(typeof module.warn).toBe('function');
    expect(typeof module.error).toBe('function');
    expect(typeof module.logError).toBe('function');
    expect(typeof module.audit).toBe('function');
  });

  it('should call standalone functions without throwing', async () => {
    const { debug, info, warn, error, logError, audit } = await import('../logger');
    expect(() => debug('test')).not.toThrow();
    expect(() => info('test')).not.toThrow();
    expect(() => warn('test')).not.toThrow();
    expect(() => error('test')).not.toThrow();
    expect(() => logError(new Error('test'))).not.toThrow();
    expect(() => audit('CREATE', 'part', 'p1')).not.toThrow();
  });

  it('should export createRequestLogger', async () => {
    const { createRequestLogger } = await import('../logger');
    expect(typeof createRequestLogger).toBe('function');
    const reqLogger = createRequestLogger('req-123', 'user-456');
    expect(reqLogger).toBeDefined();
    expect(typeof reqLogger.info).toBe('function');
  });
});
