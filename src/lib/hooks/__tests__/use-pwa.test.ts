import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock client-logger
vi.mock('@/lib/client-logger', () => ({
  clientLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import {
  useServiceWorker,
  useNetworkStatus,
  useInstallPrompt,
  usePushNotifications,
  usePWA,
} from '../use-pwa';

// =============================================================================
// HELPERS
// =============================================================================

function createMockServiceWorkerRegistration(overrides: Partial<ServiceWorkerRegistration> = {}): ServiceWorkerRegistration {
  return {
    active: null,
    installing: null,
    waiting: null,
    scope: '/',
    updateViaCache: 'none' as ServiceWorkerUpdateViaCache,
    navigationPreload: {} as NavigationPreloadManager,
    onupdatefound: null,
    getNotifications: vi.fn().mockResolvedValue([]),
    showNotification: vi.fn().mockResolvedValue(undefined),
    unregister: vi.fn().mockResolvedValue(true),
    update: vi.fn().mockResolvedValue(undefined),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn().mockReturnValue(true),
    ...overrides,
  } as any;
}

// =============================================================================
// useServiceWorker
// =============================================================================

describe('useServiceWorker', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production');

    Object.defineProperty(global, 'navigator', {
      value: {
        onLine: true,
        userAgent: 'test-agent',
        serviceWorker: {
          register: vi.fn(),
          getRegistrations: vi.fn().mockResolvedValue([]),
          controller: null,
          ready: Promise.resolve(createMockServiceWorkerRegistration()),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        },
      },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('detects service worker support', async () => {
    const { result } = renderHook(() => useServiceWorker());

    await waitFor(() => {
      expect(result.current.isSupported).toBe(true);
    });
  });

  it('auto-registers in production and becomes registered', async () => {
    const mockRegistration = createMockServiceWorkerRegistration();
    (navigator.serviceWorker.register as ReturnType<typeof vi.fn>).mockResolvedValue(mockRegistration);

    const { result } = renderHook(() => useServiceWorker());

    // In production with SW support, it auto-registers
    await waitFor(() => {
      expect(result.current.isRegistered).toBe(true);
    });

    expect(result.current.isSupported).toBe(true);
    expect(result.current.isUpdating).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('registers service worker successfully', async () => {
    const mockRegistration = createMockServiceWorkerRegistration();
    (navigator.serviceWorker.register as ReturnType<typeof vi.fn>).mockResolvedValue(mockRegistration);

    const { result } = renderHook(() => useServiceWorker());

    await act(async () => {
      await result.current.register();
    });

    expect(result.current.isRegistered).toBe(true);
    expect(result.current.registration).toBe(mockRegistration);
    expect(result.current.error).toBeNull();
  });

  it('handles registration failure', async () => {
    const error = new Error('Registration failed');
    (navigator.serviceWorker.register as ReturnType<typeof vi.fn>).mockRejectedValue(error);

    const { result } = renderHook(() => useServiceWorker());

    await act(async () => {
      await result.current.register();
    });

    expect(result.current.isRegistered).toBe(false);
    expect(result.current.error).toBe(error);
  });

  it('unregisters service worker', async () => {
    const mockRegistration = createMockServiceWorkerRegistration();
    (navigator.serviceWorker.register as ReturnType<typeof vi.fn>).mockResolvedValue(mockRegistration);

    const { result } = renderHook(() => useServiceWorker());

    await act(async () => {
      await result.current.register();
    });

    expect(result.current.isRegistered).toBe(true);

    await act(async () => {
      await result.current.unregister();
    });

    expect(result.current.isRegistered).toBe(false);
    expect(result.current.registration).toBeNull();
    expect(mockRegistration.unregister).toHaveBeenCalled();
  });

  it('updates service worker', async () => {
    const mockRegistration = createMockServiceWorkerRegistration();
    (navigator.serviceWorker.register as ReturnType<typeof vi.fn>).mockResolvedValue(mockRegistration);

    const { result } = renderHook(() => useServiceWorker());

    await act(async () => {
      await result.current.register();
    });

    await act(async () => {
      await result.current.update();
    });

    expect(mockRegistration.update).toHaveBeenCalled();
  });

  it('provides clearCache function', async () => {
    const postMessage = vi.fn();
    Object.defineProperty(navigator.serviceWorker, 'controller', {
      value: { postMessage },
      configurable: true,
    });

    const { result } = renderHook(() => useServiceWorker());

    // Wait for effects to settle
    await waitFor(() => {
      expect(result.current.isSupported).toBe(true);
    });

    act(() => {
      result.current.clearCache();
    });

    expect(postMessage).toHaveBeenCalledWith({ type: 'CLEAR_CACHE' });
  });

  it('handles register when service workers not supported', async () => {
    Object.defineProperty(global, 'navigator', {
      value: { onLine: true, userAgent: 'test' },
      configurable: true,
      writable: true,
    });

    const { result } = renderHook(() => useServiceWorker());

    await act(async () => {
      await result.current.register();
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Service workers are not supported');
  });
});

// =============================================================================
// useNetworkStatus
// =============================================================================

describe('useNetworkStatus', () => {
  beforeEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: { onLine: true, userAgent: 'test' },
      configurable: true,
      writable: true,
    });
  });

  it('returns initial online state', async () => {
    const { result } = renderHook(() => useNetworkStatus());

    await waitFor(() => {
      expect(result.current.isOnline).toBe(true);
    });
  });

  it('initializes with null network info when connection API unavailable', async () => {
    const { result } = renderHook(() => useNetworkStatus());

    await waitFor(() => {
      expect(result.current.isOnline).toBe(true);
    });

    expect(result.current.effectiveType).toBeNull();
    expect(result.current.downlink).toBeNull();
    expect(result.current.rtt).toBeNull();
    expect(result.current.saveData).toBe(false);
  });

  it('detects network info when connection API is available', async () => {
    Object.defineProperty(global, 'navigator', {
      value: {
        onLine: true,
        userAgent: 'test',
        connection: {
          effectiveType: '4g',
          downlink: 10,
          rtt: 50,
          saveData: false,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        },
      },
      configurable: true,
      writable: true,
    });

    const { result } = renderHook(() => useNetworkStatus());

    await waitFor(() => {
      expect(result.current.effectiveType).toBe('4g');
      expect(result.current.downlink).toBe(10);
      expect(result.current.rtt).toBe(50);
    });
  });

  it('responds to online/offline events', async () => {
    const { result } = renderHook(() => useNetworkStatus());

    await waitFor(() => {
      expect(result.current.isOnline).toBe(true);
    });

    // Simulate going offline
    await act(async () => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current.isOnline).toBe(false);

    // Simulate coming back online
    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });

    expect(result.current.isOnline).toBe(true);
  });
});

// =============================================================================
// useInstallPrompt
// =============================================================================

describe('useInstallPrompt', () => {
  beforeEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: { userAgent: 'Mozilla/5.0 Chrome', onLine: true },
      configurable: true,
      writable: true,
    });

    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn().mockReturnValue({ matches: false }),
      configurable: true,
      writable: true,
    });
  });

  it('starts as not installable and not installed', async () => {
    const { result } = renderHook(() => useInstallPrompt());

    // Let effects settle
    await waitFor(() => {
      expect(result.current.isInstalled).toBe(false);
    });

    expect(result.current.canInstall).toBe(false);
    expect(result.current.prompt).toBeNull();
  });

  it('detects iOS user agent', async () => {
    Object.defineProperty(global, 'navigator', {
      value: { userAgent: 'Mozilla/5.0 iPhone AppleWebKit', onLine: true },
      configurable: true,
      writable: true,
    });

    const { result } = renderHook(() => useInstallPrompt());

    await waitFor(() => {
      expect(result.current.isIOS).toBe(true);
    });
  });

  it('detects non-iOS user agent', async () => {
    Object.defineProperty(global, 'navigator', {
      value: { userAgent: 'Mozilla/5.0 Chrome Android', onLine: true },
      configurable: true,
      writable: true,
    });

    const { result } = renderHook(() => useInstallPrompt());

    await waitFor(() => {
      expect(result.current.isIOS).toBe(false);
    });
  });

  it('detects standalone mode as installed', async () => {
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn().mockReturnValue({ matches: true }),
      configurable: true,
      writable: true,
    });

    const { result } = renderHook(() => useInstallPrompt());

    await waitFor(() => {
      expect(result.current.isInstalled).toBe(true);
    });
  });

  it('sets canInstall when beforeinstallprompt fires', async () => {
    const { result } = renderHook(() => useInstallPrompt());

    await act(async () => {
      const event = new Event('beforeinstallprompt');
      Object.assign(event, {
        prompt: vi.fn().mockResolvedValue(undefined),
        userChoice: Promise.resolve({ outcome: 'accepted' }),
      });
      window.dispatchEvent(event);
    });

    await waitFor(() => {
      expect(result.current.canInstall).toBe(true);
      expect(result.current.prompt).not.toBeNull();
    });
  });

  it('handles appinstalled event', async () => {
    const { result } = renderHook(() => useInstallPrompt());

    // First trigger install prompt
    await act(async () => {
      const event = new Event('beforeinstallprompt');
      Object.assign(event, {
        prompt: vi.fn(),
        userChoice: Promise.resolve({ outcome: 'accepted' }),
      });
      window.dispatchEvent(event);
    });

    await waitFor(() => {
      expect(result.current.canInstall).toBe(true);
    });

    // Then trigger installed
    await act(async () => {
      window.dispatchEvent(new Event('appinstalled'));
    });

    await waitFor(() => {
      expect(result.current.isInstalled).toBe(true);
      expect(result.current.canInstall).toBe(false);
    });
  });
});

// =============================================================================
// usePushNotifications
// =============================================================================

describe('usePushNotifications', () => {
  it('detects when push notifications are not supported', async () => {
    const origNotification = (window as unknown as Record<string, unknown>).Notification;
    const origPushManager = (window as unknown as Record<string, unknown>).PushManager;
    delete (window as unknown as Record<string, unknown>).Notification;
    delete (window as unknown as Record<string, unknown>).PushManager;

    const { result } = renderHook(() => usePushNotifications());

    await waitFor(() => {
      // isSupported should be false once effect runs
      expect(result.current.isSupported).toBe(false);
    });

    // Restore
    if (origNotification) (window as unknown as Record<string, unknown>).Notification = origNotification;
    if (origPushManager) (window as unknown as Record<string, unknown>).PushManager = origPushManager;
  });

  it('detects when push notifications are supported', async () => {
    (window as unknown as Record<string, unknown>).Notification = { permission: 'default', requestPermission: vi.fn() };
    (window as unknown as Record<string, unknown>).PushManager = {};

    const { result } = renderHook(() => usePushNotifications());

    await waitFor(() => {
      expect(result.current.isSupported).toBe(true);
    });

    expect(result.current.permission).toBe('default');
  });

  it('requestPermission returns false when not supported', async () => {
    delete (window as unknown as Record<string, unknown>).Notification;
    delete (window as unknown as Record<string, unknown>).PushManager;

    const { result } = renderHook(() => usePushNotifications());

    await waitFor(() => {
      expect(result.current.isSupported).toBe(false);
    });

    let granted: boolean;
    await act(async () => {
      granted = await result.current.requestPermission();
    });

    expect(granted!).toBe(false);
  });

  it('requestPermission returns true when granted', async () => {
    (window as unknown as Record<string, unknown>).Notification = {
      permission: 'default',
      requestPermission: vi.fn().mockResolvedValue('granted'),
    };
    (window as unknown as Record<string, unknown>).PushManager = {};

    const { result } = renderHook(() => usePushNotifications());

    await waitFor(() => {
      expect(result.current.isSupported).toBe(true);
    });

    let granted: boolean;
    await act(async () => {
      granted = await result.current.requestPermission();
    });

    expect(granted!).toBe(true);
    expect(result.current.permission).toBe('granted');
  });

  it('unsubscribe returns false when no subscription', async () => {
    delete (window as unknown as Record<string, unknown>).Notification;
    delete (window as unknown as Record<string, unknown>).PushManager;

    const { result } = renderHook(() => usePushNotifications());

    await waitFor(() => {
      expect(result.current.isSupported).toBe(false);
    });

    let res: boolean;
    await act(async () => {
      res = await result.current.unsubscribe();
    });

    expect(res!).toBe(false);
  });
});

// =============================================================================
// usePWA (combined hook)
// =============================================================================

describe('usePWA', () => {
  beforeEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: {
        onLine: true,
        userAgent: 'Mozilla/5.0 Chrome',
        serviceWorker: {
          register: vi.fn(),
          getRegistrations: vi.fn().mockResolvedValue([]),
          controller: null,
          ready: Promise.resolve(createMockServiceWorkerRegistration()),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        },
      },
      configurable: true,
      writable: true,
    });

    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn().mockReturnValue({ matches: false }),
      configurable: true,
      writable: true,
    });

    delete (window as unknown as Record<string, unknown>).Notification;
    delete (window as unknown as Record<string, unknown>).PushManager;
  });

  it('returns combined state from sub-hooks', async () => {
    const { result } = renderHook(() => usePWA());

    await waitFor(() => {
      expect(result.current.serviceWorker).toBeDefined();
    });

    expect(result.current.network).toBeDefined();
    expect(result.current.installPrompt).toBeDefined();
    expect(result.current.pushNotifications).toBeDefined();
    expect(typeof result.current.isReady).toBe('boolean');
  });

  it('isReady is false initially (not registered)', async () => {
    const { result } = renderHook(() => usePWA());

    await waitFor(() => {
      expect(result.current.serviceWorker.isSupported).toBe(true);
    });

    expect(result.current.isReady).toBe(false);
  });
});
