/**
 * Sprint 27 TIP-S27-06 — Sidebar V2 Tests
 * Role × Group matrix + a11y
 */

import { describe, it, expect, vi } from 'vitest';
import { SIDEBAR_GROUPS, filterGroups } from '../sidebar-v2';
import type { RoleCode } from '@/lib/auth/rbac';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/home',
}));

// Mock utils
vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

// Mock feature flags — default all hidden flags off
vi.mock('@/lib/feature-flags', () => ({
  FEATURE_FLAGS: {
    SIDEBAR_V2: true,
    SHOW_FINANCE: false,
    SHOW_AI_ML: false,
    SHOW_MULTITENANT: false,
    SHOW_MOBILE: false,
    SHOW_COMPLIANCE: false,
  },
  // Export type helper
}));

describe('SidebarV2 — filterGroups', () => {
  const allGroups = SIDEBAR_GROUPS;

  function getGroupIds(roles: RoleCode[]): string[] {
    return filterGroups(allGroups, roles).map((g) => g.id);
  }

  it('engineer → 6 groups (home, my-work, operations, search, engineering, reports)', () => {
    const ids = getGroupIds(['engineer']);
    expect(ids).toEqual(['home', 'my-work', 'operations', 'search', 'engineering', 'reports']);
    expect(ids).toHaveLength(6);
  });

  it('warehouse → 6 groups (home, my-work, operations, search, warehouse, reports)', () => {
    const ids = getGroupIds(['warehouse']);
    expect(ids).toEqual(['home', 'my-work', 'operations', 'search', 'warehouse', 'reports']);
    expect(ids).toHaveLength(6);
  });

  it('production → 6 groups (home, my-work, operations, production, search, reports)', () => {
    const ids = getGroupIds(['production']);
    expect(ids).toEqual(['home', 'my-work', 'operations', 'production', 'search', 'reports']);
    expect(ids).toHaveLength(6);
  });

  it('procurement → 6 groups (home, my-work, operations, search, purchasing, reports)', () => {
    const ids = getGroupIds(['procurement']);
    expect(ids).toEqual(['home', 'my-work', 'operations', 'search', 'purchasing', 'reports']);
    expect(ids).toHaveLength(6);
  });

  it('admin → all 10 groups', () => {
    const ids = getGroupIds(['admin']);
    expect(ids).toEqual([
      'home', 'my-work', 'operations', 'production', 'search',
      'engineering', 'purchasing', 'warehouse', 'reports', 'admin',
    ]);
    expect(ids).toHaveLength(10);
  });

  it('engineer + warehouse → 7 groups (union: engineering + warehouse)', () => {
    const ids = getGroupIds(['engineer', 'warehouse']);
    expect(ids).toEqual([
      'home', 'my-work', 'operations', 'search',
      'engineering', 'warehouse', 'reports',
    ]);
    expect(ids).toHaveLength(7);
  });

  it('viewer → 5 groups (only universal groups)', () => {
    const ids = getGroupIds(['viewer']);
    expect(ids).toEqual(['home', 'my-work', 'operations', 'search', 'reports']);
    expect(ids).toHaveLength(5);
  });
});

describe('SidebarV2 — structure', () => {
  it('each group has unique id', () => {
    const ids = SIDEBAR_GROUPS.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('each group has ariaLabel for a11y', () => {
    for (const group of SIDEBAR_GROUPS) {
      expect(group.ariaLabel).toBeTruthy();
      // ariaLabel should be in English
      expect(group.ariaLabel).toMatch(/^[A-Za-z &\-]+$/);
    }
  });

  it('no duplicate href within a single group', () => {
    for (const group of SIDEBAR_GROUPS) {
      const hrefs = group.items.map((i) => i.href);
      expect(new Set(hrefs).size).toBe(hrefs.length);
    }
  });
});

describe('SidebarV2 — feature flag gating (TIP-S27-08)', () => {
  it('admin + SHOW_FINANCE=false → no finance group', () => {
    // FEATURE_FLAGS.SHOW_FINANCE is mocked as false
    const ids = filterGroups(SIDEBAR_GROUPS, ['admin']).map((g) => g.id);
    expect(ids).not.toContain('finance');
  });

  it('admin + SHOW_FINANCE=true → finance group visible', async () => {
    // Temporarily override the mock
    const featureFlags = await import('@/lib/feature-flags');
    const origValue = featureFlags.FEATURE_FLAGS.SHOW_FINANCE;
    // @ts-expect-error - mutating mock for test
    featureFlags.FEATURE_FLAGS.SHOW_FINANCE = true;

    const ids = filterGroups(SIDEBAR_GROUPS, ['admin']).map((g) => g.id);
    expect(ids).toContain('finance');

    // Restore
    // @ts-expect-error - mutating mock for test
    featureFlags.FEATURE_FLAGS.SHOW_FINANCE = origValue;
  });

  it('engineer (non-admin) + SHOW_FINANCE=true → still no finance (role gate)', async () => {
    const featureFlags = await import('@/lib/feature-flags');
    const origValue = featureFlags.FEATURE_FLAGS.SHOW_FINANCE;
    // @ts-expect-error - mutating mock for test
    featureFlags.FEATURE_FLAGS.SHOW_FINANCE = true;

    const ids = filterGroups(SIDEBAR_GROUPS, ['engineer']).map((g) => g.id);
    expect(ids).not.toContain('finance');

    // @ts-expect-error - mutating mock for test
    featureFlags.FEATURE_FLAGS.SHOW_FINANCE = origValue;
  });
});

describe('SidebarV2 — path correction (TIP-S275-01)', () => {
  const allHrefs = SIDEBAR_GROUPS.flatMap((g) => g.items.map((i) => i.href));

  it('old broken paths are NOT present', () => {
    const oldPaths = ['/purchase-orders', '/grn', '/admin/audit', '/warehouse/locations', '/warehouse-issues'];
    for (const old of oldPaths) {
      expect(allHrefs).not.toContain(old);
    }
  });

  it('corrected paths ARE present', () => {
    const corrected = ['/purchasing', '/purchasing/grn', '/audit', '/warehouses', '/inventory/issue'];
    for (const path of corrected) {
      expect(allHrefs).toContain(path);
    }
  });
});

describe('SidebarV2 — cụm Sản xuất (TIP-S28-02)', () => {
  function getGroupIds(roles: RoleCode[]): string[] {
    return filterGroups(SIDEBAR_GROUPS, roles).map((g) => g.id);
  }

  it('engineer → KHÔNG thấy cụm Sản xuất', () => {
    const ids = getGroupIds(['engineer']);
    expect(ids).not.toContain('production');
  });

  it('production role → thấy cụm Sản xuất với 6 sub-menu', () => {
    const groups = filterGroups(SIDEBAR_GROUPS, ['production']);
    const productionGroup = groups.find((g) => g.id === 'production');
    expect(productionGroup).toBeDefined();
    expect(productionGroup!.items).toHaveLength(6);
    expect(productionGroup!.items.map((i) => i.href)).toEqual([
      '/production/daily-plan',
      '/production/shift-report',
      '/production/shift-entry',
      '/production/equipment',
      '/production/downtime',
      '/production/report',
    ]);
  });

  it('warehouse → KHÔNG thấy cụm Sản xuất', () => {
    const ids = getGroupIds(['warehouse']);
    expect(ids).not.toContain('production');
  });

  it('admin → thấy cụm Sản xuất', () => {
    const ids = getGroupIds(['admin']);
    expect(ids).toContain('production');
  });

  it('production + admin combined → Sản xuất xuất hiện 1 lần (no duplicate)', () => {
    const ids = getGroupIds(['production', 'admin']);
    const productionCount = ids.filter((id) => id === 'production').length;
    expect(productionCount).toBe(1);
  });

  it('production role → "Gia công" trong cụm Vận hành vẫn visible (regression)', () => {
    const groups = filterGroups(SIDEBAR_GROUPS, ['production']);
    const opsGroup = groups.find((g) => g.id === 'operations');
    expect(opsGroup).toBeDefined();
    const giaConghref = opsGroup!.items.find((i) => i.label === 'Gia công');
    expect(giaConghref).toBeDefined();
  });
});
