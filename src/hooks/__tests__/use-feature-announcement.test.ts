import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFeatureAnnouncement } from '../use-feature-announcement';

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    message: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock localStorage
const mockLocalStorage: Record<string, string> = {};
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: vi.fn((key: string) => mockLocalStorage[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { mockLocalStorage[key] = value; }),
    removeItem: vi.fn((key: string) => { delete mockLocalStorage[key]; }),
  },
  writable: true,
});

describe('useFeatureAnnouncement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    Object.keys(mockLocalStorage).forEach(key => delete mockLocalStorage[key]);
  });

  it('should show announcement on first render', async () => {
    const { toast } = await import('sonner');

    renderHook(() => useFeatureAnnouncement());

    vi.advanceTimersByTime(1500);

    expect(toast.message).toHaveBeenCalledWith(
      'New Pro Features Available',
      expect.objectContaining({
        duration: 8000,
      })
    );
  });

  it('should not show announcement if already seen', async () => {
    const { toast } = await import('sonner');
    mockLocalStorage['announcement-v15-excel-features'] = 'true';

    renderHook(() => useFeatureAnnouncement());

    vi.advanceTimersByTime(2000);

    expect(toast.message).not.toHaveBeenCalled();
  });

  it('should mark as seen after showing', () => {
    renderHook(() => useFeatureAnnouncement());

    vi.advanceTimersByTime(1500);

    expect(localStorage.setItem).toHaveBeenCalledWith(
      'announcement-v15-excel-features',
      'true'
    );
  });
});
