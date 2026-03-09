import { describe, it, expect, vi, beforeEach } from 'vitest';
import { clientLogger } from '../client-logger';

describe('clientLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should have debug method', () => {
    expect(typeof clientLogger.debug).toBe('function');
    clientLogger.debug('test message');
  });

  it('should have info method', () => {
    expect(typeof clientLogger.info).toBe('function');
    clientLogger.info('test message');
  });

  it('should have warn method', () => {
    expect(typeof clientLogger.warn).toBe('function');
    clientLogger.warn('test message');
  });

  it('should have error method', () => {
    expect(typeof clientLogger.error).toBe('function');
    clientLogger.error('test error');
  });

  it('should handle Error objects in error()', () => {
    const error = new Error('test');
    clientLogger.error('test error', error);
  });

  it('should handle non-Error values in error()', () => {
    clientLogger.error('test error', { some: 'context' });
  });

  it('should handle error without second argument', () => {
    clientLogger.error('test error');
  });

  it('should accept extra args in debug/info/warn', () => {
    clientLogger.debug('msg', 'extra1', 'extra2');
    clientLogger.info('msg', { key: 'val' });
    clientLogger.warn('msg', 42);
  });
});
