// =============================================================================
// VITEST GLOBAL SETUP
// =============================================================================

// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference types="vitest" />
import { vi, beforeEach, afterAll } from 'vitest';
import '@testing-library/jest-dom';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

// Mock RTR Auth Gateway client
vi.mock('@/lib/auth-gateway/client', () => ({
  useRtrSession: () => ({
    data: {
      user: {
        id: 'test-user',
        name: 'Test User',
        email: 'test@example.com',
        role: 'admin',
        dept: 'IT',
        role_level: 99,
        gatewayPerms: ['admin'],
      },
    },
    status: 'authenticated',
    update: vi.fn(),
  }),
  useRtrUser: () => ({
    id: 'test-user',
    name: 'Test User',
    email: 'test@example.com',
    role: 'admin',
    dept: 'IT',
    role_level: 99,
    gatewayPerms: ['admin'],
  }),
  useRtrLogout: () => vi.fn(),
  useRtrPermission: () => true,
  useRtrPermissions: () => ({
    can: () => true,
    canAny: () => true,
    canAll: () => true,
    role: 'admin',
    isAdmin: true,
    isManager: true,
    permissions: [],
  }),
  RtrAuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock next-auth (legacy — for any remaining test imports)
vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: { id: 'test-user', name: 'Test User', email: 'test@example.com', role: 'admin' },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
    status: 'authenticated',
  }),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

// Mock @/lib/auth for server-side tests
vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue({
    user: {
      id: 'test-user',
      name: 'Test User',
      email: 'test@example.com',
      role: 'admin',
      dept: 'IT',
      role_level: 99,
      gatewayPerms: ['admin'],
    },
  }),
}));

// Mock fetch globally
global.fetch = vi.fn();

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});

// Cleanup after all tests
afterAll(() => {
  vi.restoreAllMocks();
});
