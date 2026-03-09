import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getNavHistory,
  addToNavHistory,
  popNavHistory,
  hasPreviousPage,
  clearNavHistory,
} from '../use-navigation-history';

// Mock sessionStorage
const mockStorage: Record<string, string> = {};
const sessionStorageMock = {
  getItem: vi.fn((key: string) => mockStorage[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { mockStorage[key] = value; }),
  removeItem: vi.fn((key: string) => { delete mockStorage[key]; }),
};

Object.defineProperty(globalThis, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
});

describe('Navigation History Utilities', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
    vi.clearAllMocks();
  });

  describe('getNavHistory', () => {
    it('should return empty array when no history', () => {
      expect(getNavHistory()).toEqual([]);
    });

    it('should return stored history', () => {
      mockStorage['rtr_nav_history'] = JSON.stringify(['/home', '/parts']);
      expect(getNavHistory()).toEqual(['/home', '/parts']);
    });

    it('should return empty array on parse error', () => {
      mockStorage['rtr_nav_history'] = 'invalid-json';
      expect(getNavHistory()).toEqual([]);
    });
  });

  describe('addToNavHistory', () => {
    it('should add path to history', () => {
      addToNavHistory('/home');
      const stored = JSON.parse(mockStorage['rtr_nav_history']);
      expect(stored).toContain('/home');
    });

    it('should not add duplicate consecutive path', () => {
      addToNavHistory('/home');
      addToNavHistory('/home');
      const stored = JSON.parse(mockStorage['rtr_nav_history']);
      expect(stored.filter((p: string) => p === '/home')).toHaveLength(1);
    });

    it('should limit history to MAX_HISTORY_LENGTH (50)', () => {
      for (let i = 0; i < 60; i++) {
        addToNavHistory(`/page-${i}`);
      }
      const stored = JSON.parse(mockStorage['rtr_nav_history']);
      expect(stored).toHaveLength(50);
      expect(stored[0]).toBe('/page-10');
    });
  });

  describe('popNavHistory', () => {
    it('should return null when history is empty', () => {
      expect(popNavHistory()).toBeNull();
    });

    it('should return null when only one entry', () => {
      mockStorage['rtr_nav_history'] = JSON.stringify(['/home']);
      expect(popNavHistory()).toBeNull();
    });

    it('should return previous page and update history', () => {
      mockStorage['rtr_nav_history'] = JSON.stringify(['/home', '/parts', '/orders']);
      const result = popNavHistory();
      expect(result).toBe('/parts');
      const stored = JSON.parse(mockStorage['rtr_nav_history']);
      expect(stored).toEqual(['/home', '/parts']);
    });
  });

  describe('hasPreviousPage', () => {
    it('should return false when no history', () => {
      expect(hasPreviousPage()).toBe(false);
    });

    it('should return false with single entry', () => {
      mockStorage['rtr_nav_history'] = JSON.stringify(['/home']);
      expect(hasPreviousPage()).toBe(false);
    });

    it('should return true with multiple entries', () => {
      mockStorage['rtr_nav_history'] = JSON.stringify(['/home', '/parts']);
      expect(hasPreviousPage()).toBe(true);
    });
  });

  describe('clearNavHistory', () => {
    it('should remove history from storage', () => {
      mockStorage['rtr_nav_history'] = JSON.stringify(['/home']);
      clearNavHistory();
      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('rtr_nav_history');
    });
  });
});
