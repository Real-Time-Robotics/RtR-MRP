import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSystemSetting } = vi.hoisted(() => ({
  mockSystemSetting: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
  },
}));

vi.mock('../../prisma', () => ({
  default: { systemSetting: mockSystemSetting },
}));

import { FEATURE_FLAGS, isFeatureEnabled, getAllFeatureFlags, setFeatureFlag } from '../feature-flags';

describe('feature-flags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('FEATURE_FLAGS', () => {
    it('should define all flags', () => {
      expect(FEATURE_FLAGS.USE_WIP_WAREHOUSE).toBe('use_wip_warehouse');
      expect(FEATURE_FLAGS.USE_FG_WAREHOUSE).toBe('use_fg_warehouse');
      expect(FEATURE_FLAGS.USE_SHIP_WAREHOUSE).toBe('use_ship_warehouse');
    });
  });

  describe('isFeatureEnabled', () => {
    it('should return true when flag is "true"', async () => {
      mockSystemSetting.findUnique.mockResolvedValue({ key: 'use_wip_warehouse', value: 'true' });
      const result = await isFeatureEnabled('use_wip_warehouse');
      expect(result).toBe(true);
    });

    it('should return false when flag is "false"', async () => {
      mockSystemSetting.findUnique.mockResolvedValue({ key: 'use_wip_warehouse', value: 'false' });
      const result = await isFeatureEnabled('use_wip_warehouse');
      expect(result).toBe(false);
    });

    it('should return false when flag not found', async () => {
      mockSystemSetting.findUnique.mockResolvedValue(null);
      const result = await isFeatureEnabled('use_wip_warehouse');
      expect(result).toBe(false);
    });
  });

  describe('getAllFeatureFlags', () => {
    it('should return all flags with values', async () => {
      mockSystemSetting.findMany.mockResolvedValue([
        { key: 'use_wip_warehouse', value: 'true' },
        { key: 'use_fg_warehouse', value: 'false' },
      ]);
      const result = await getAllFeatureFlags();
      expect(result['use_wip_warehouse']).toBe(true);
      expect(result['use_fg_warehouse']).toBe(false);
      expect(result['use_ship_warehouse']).toBe(false);
    });

    it('should default to false when flag not in DB', async () => {
      mockSystemSetting.findMany.mockResolvedValue([]);
      const result = await getAllFeatureFlags();
      expect(result['use_wip_warehouse']).toBe(false);
    });
  });

  describe('setFeatureFlag', () => {
    it('should upsert flag value', async () => {
      mockSystemSetting.upsert.mockResolvedValue({});
      await setFeatureFlag('use_wip_warehouse', true, 'user-1');
      expect(mockSystemSetting.upsert).toHaveBeenCalledWith({
        where: { key: 'use_wip_warehouse' },
        create: { key: 'use_wip_warehouse', value: 'true', updatedBy: 'user-1' },
        update: { value: 'true', updatedBy: 'user-1' },
      });
    });

    it('should handle false value', async () => {
      mockSystemSetting.upsert.mockResolvedValue({});
      await setFeatureFlag('use_fg_warehouse', false);
      expect(mockSystemSetting.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ value: 'false' }),
          update: expect.objectContaining({ value: 'false' }),
        })
      );
    });
  });
});
