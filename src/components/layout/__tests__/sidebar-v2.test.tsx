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

  it('production → 5 groups (home, my-work, operations, search, reports)', () => {
    const ids = getGroupIds(['production']);
    expect(ids).toEqual(['home', 'my-work', 'operations', 'search', 'reports']);
    expect(ids).toHaveLength(5);
  });

  it('procurement → 6 groups (home, my-work, operations, search, purchasing, reports)', () => {
    const ids = getGroupIds(['procurement']);
    expect(ids).toEqual(['home', 'my-work', 'operations', 'search', 'purchasing', 'reports']);
    expect(ids).toHaveLength(6);
  });

  it('admin → all 9 groups', () => {
    const ids = getGroupIds(['admin']);
    expect(ids).toEqual([
      'home', 'my-work', 'operations', 'search',
      'engineering', 'purchasing', 'warehouse', 'reports', 'admin',
    ]);
    expect(ids).toHaveLength(9);
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
      expect(group.ariaLabel).toMatch(/^[A-Za-z &]+$/);
    }
  });

  it('no duplicate href within a single group', () => {
    for (const group of SIDEBAR_GROUPS) {
      const hrefs = group.items.map((i) => i.href);
      expect(new Set(hrefs).size).toBe(hrefs.length);
    }
  });
});
