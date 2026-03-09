import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isVerifiedUSPerson,
  certifyUSPerson,
  revokeUSPersonCertification,
  registerITARControlledItem,
  isITARControlled,
  checkITARAccess,
  getITARAccessLog,
  getITARControlledItems,
  getITARComplianceSummary,
  declassifyITARItem,
  USML_CATEGORIES,
  ITAR_MARKINGS,
} from '../itar-controls';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn(), count: vi.fn() },
    iTARControlledItem: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn(), groupBy: vi.fn() },
    iTARAccessLog: { create: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    auditTrailEntry: { findFirst: vi.fn(), create: vi.fn() },
  },
}));

vi.mock('../audit-trail', () => ({
  createAuditEntry: vi.fn().mockResolvedValue('audit-1'),
}));

import { prisma } from '@/lib/prisma';

const mp = prisma as unknown as {
  user: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn> };
  iTARControlledItem: { findUnique: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn>; groupBy: ReturnType<typeof vi.fn> };
  iTARAccessLog: { create: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn> };
};

describe('ITAR Controls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Constants', () => {
    it('should have USML categories', () => {
      expect(USML_CATEGORIES.I).toContain('Firearms');
      expect(USML_CATEGORIES.XV).toContain('Spacecraft');
    });

    it('should have ITAR markings', () => {
      expect(ITAR_MARKINGS.standard).toContain('Arms Export Control Act');
      expect(ITAR_MARKINGS.short).toContain('ITAR CONTROLLED');
    });
  });

  describe('isVerifiedUSPerson', () => {
    it('should return verified=false if user not found', async () => {
      mp.user.findUnique.mockResolvedValue(null);
      const result = await isVerifiedUSPerson('bad-id');
      expect(result.verified).toBe(false);
      expect(result.status).toBeNull();
    });

    it('should return verified=true for certified US citizen', async () => {
      mp.user.findUnique.mockResolvedValue({
        itarCertified: true, itarCertifiedAt: new Date(), itarCertifiedBy: 'admin-1', usPersonStatus: 'US_CITIZEN',
      });
      const result = await isVerifiedUSPerson('user-1');
      expect(result.verified).toBe(true);
      expect(result.status).toBe('US_CITIZEN');
    });

    it('should return verified=true for certified permanent resident', async () => {
      mp.user.findUnique.mockResolvedValue({
        itarCertified: true, itarCertifiedAt: new Date(), itarCertifiedBy: 'admin-1', usPersonStatus: 'PERMANENT_RESIDENT',
      });
      expect((await isVerifiedUSPerson('user-1')).verified).toBe(true);
    });

    it('should return verified=false for NOT_US_PERSON even if certified', async () => {
      mp.user.findUnique.mockResolvedValue({
        itarCertified: true, itarCertifiedAt: new Date(), itarCertifiedBy: 'admin-1', usPersonStatus: 'NOT_US_PERSON',
      });
      expect((await isVerifiedUSPerson('user-1')).verified).toBe(false);
    });

    it('should return verified=false if not certified', async () => {
      mp.user.findUnique.mockResolvedValue({
        itarCertified: false, itarCertifiedAt: null, itarCertifiedBy: null, usPersonStatus: 'US_CITIZEN',
      });
      expect((await isVerifiedUSPerson('user-1')).verified).toBe(false);
    });
  });

  describe('certifyUSPerson', () => {
    it('should certify and return success', async () => {
      mp.user.update.mockResolvedValue({});
      const result = await certifyUSPerson('user-1', 'US_CITIZEN', 'admin-1');
      expect(result.success).toBe(true);
      expect(mp.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ itarCertified: true, usPersonStatus: 'US_CITIZEN' }) })
      );
    });

    it('should return error on failure', async () => {
      mp.user.update.mockRejectedValue(new Error('DB error'));
      const result = await certifyUSPerson('user-1', 'US_CITIZEN', 'admin-1');
      expect(result.success).toBe(false);
      expect(result.error).toBe('DB error');
    });
  });

  describe('revokeUSPersonCertification', () => {
    it('should revoke and return success', async () => {
      mp.user.update.mockResolvedValue({});
      const result = await revokeUSPersonCertification('user-1', 'admin-1', 'Left company');
      expect(result.success).toBe(true);
      expect(mp.user.update.mock.calls[0][0].data.itarCertified).toBe(false);
    });

    it('should return error on failure', async () => {
      mp.user.update.mockRejectedValue(new Error('Not found'));
      const result = await revokeUSPersonCertification('bad', 'admin-1', 'reason');
      expect(result.success).toBe(false);
    });
  });

  describe('registerITARControlledItem', () => {
    it('should register new ITAR item', async () => {
      mp.iTARControlledItem.findUnique.mockResolvedValue(null);
      mp.iTARControlledItem.create.mockResolvedValue({ id: 'itar-1' });

      const result = await registerITARControlledItem({
        entityType: 'Part', entityId: 'part-1', usmlCategory: 'VIII',
        controlReason: 'Aircraft component', classifiedBy: 'admin-1',
      });

      expect(result.success).toBe(true);
      expect(result.id).toBe('itar-1');
    });

    it('should fail if already registered', async () => {
      mp.iTARControlledItem.findUnique.mockResolvedValue({ id: 'existing' });
      const result = await registerITARControlledItem({
        entityType: 'Part', entityId: 'part-1', controlReason: 'Test', classifiedBy: 'admin-1',
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('already registered');
    });

    it('should use default marking text', async () => {
      mp.iTARControlledItem.findUnique.mockResolvedValue(null);
      mp.iTARControlledItem.create.mockResolvedValue({ id: 'itar-2' });
      await registerITARControlledItem({
        entityType: 'Part', entityId: 'part-2', controlReason: 'Test', classifiedBy: 'admin-1',
      });
      expect(mp.iTARControlledItem.create.mock.calls[0][0].data.markingText).toBe(ITAR_MARKINGS.short);
    });

    it('should handle DB error', async () => {
      mp.iTARControlledItem.findUnique.mockResolvedValue(null);
      mp.iTARControlledItem.create.mockRejectedValue(new Error('DB error'));
      const result = await registerITARControlledItem({
        entityType: 'Part', entityId: 'p3', controlReason: 'T', classifiedBy: 'admin-1',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('isITARControlled', () => {
    it('should return controlled=false when not found', async () => {
      mp.iTARControlledItem.findUnique.mockResolvedValue(null);
      const result = await isITARControlled('Part', 'part-1');
      expect(result.controlled).toBe(false);
    });

    it('should return controlled=false for non-active items', async () => {
      mp.iTARControlledItem.findUnique.mockResolvedValue({ id: 'itar-1', status: 'declassified' });
      expect((await isITARControlled('Part', 'part-1')).controlled).toBe(false);
    });

    it('should return controlled=true for active items', async () => {
      mp.iTARControlledItem.findUnique.mockResolvedValue({
        id: 'itar-1', status: 'active', usmlCategory: 'VIII', eccn: null,
        markingText: 'ITAR', requiresUsPersonVerification: true,
      });
      const result = await isITARControlled('Part', 'part-1');
      expect(result.controlled).toBe(true);
      expect(result.item?.usmlCategory).toBe('VIII');
    });
  });

  describe('checkITARAccess', () => {
    it('should grant access for non-ITAR items', async () => {
      mp.iTARControlledItem.findUnique.mockResolvedValue(null);
      const result = await checkITARAccess({
        userId: 'user-1', entityType: 'Part', entityId: 'part-1', accessType: 'VIEW',
      });
      expect(result.granted).toBe(true);
    });

    it('should deny access for non-US person on ITAR item', async () => {
      mp.iTARControlledItem.findUnique.mockResolvedValue({
        id: 'itar-1', status: 'active', usmlCategory: 'VIII', eccn: null,
        markingText: 'ITAR', requiresUsPersonVerification: true,
      });
      mp.user.findUnique.mockResolvedValue({
        itarCertified: false, itarCertifiedAt: null, itarCertifiedBy: null, usPersonStatus: 'NOT_US_PERSON',
      });
      mp.iTARAccessLog.create.mockResolvedValue({ id: 'log-1' });

      const result = await checkITARAccess({
        userId: 'user-1', entityType: 'Part', entityId: 'part-1', accessType: 'VIEW',
      });
      expect(result.granted).toBe(false);
      expect(result.reason).toContain('not a verified US Person');
    });

    it('should grant access for verified US person on ITAR item', async () => {
      mp.iTARControlledItem.findUnique.mockResolvedValue({
        id: 'itar-1', status: 'active', usmlCategory: 'VIII', eccn: null,
        markingText: 'ITAR', requiresUsPersonVerification: true,
      });
      mp.user.findUnique.mockResolvedValue({
        itarCertified: true, itarCertifiedAt: new Date(), itarCertifiedBy: 'admin', usPersonStatus: 'US_CITIZEN',
      });
      mp.iTARAccessLog.create.mockResolvedValue({ id: 'log-2' });

      const result = await checkITARAccess({
        userId: 'user-1', entityType: 'Part', entityId: 'part-1', accessType: 'VIEW',
      });
      expect(result.granted).toBe(true);
      expect(result.logId).toBe('log-2');
    });
  });

  describe('getITARAccessLog', () => {
    it('should return empty when no itemId and no userId', async () => {
      const result = await getITARAccessLog({});
      expect(result.logs).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should query by controlledItemId', async () => {
      mp.iTARAccessLog.findMany.mockResolvedValue([]);
      mp.iTARAccessLog.count.mockResolvedValue(0);
      await getITARAccessLog({ controlledItemId: 'itar-1' });
      expect(mp.iTARAccessLog.findMany.mock.calls[0][0].where.controlledItemId).toBe('itar-1');
    });

    it('should resolve itemId from entity info', async () => {
      mp.iTARControlledItem.findUnique.mockResolvedValue({ id: 'itar-1' });
      mp.iTARAccessLog.findMany.mockResolvedValue([]);
      mp.iTARAccessLog.count.mockResolvedValue(0);
      await getITARAccessLog({ entityType: 'Part', entityId: 'part-1' });
      expect(mp.iTARAccessLog.findMany.mock.calls[0][0].where.controlledItemId).toBe('itar-1');
    });
  });

  describe('getITARControlledItems', () => {
    it('should return items with total', async () => {
      mp.iTARControlledItem.findMany.mockResolvedValue([{ id: 'itar-1' }]);
      mp.iTARControlledItem.count.mockResolvedValue(1);
      const result = await getITARControlledItems();
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by category and status', async () => {
      mp.iTARControlledItem.findMany.mockResolvedValue([]);
      mp.iTARControlledItem.count.mockResolvedValue(0);
      await getITARControlledItems({ usmlCategory: 'VIII', status: 'active' });
      const where = mp.iTARControlledItem.findMany.mock.calls[0][0].where;
      expect(where.usmlCategory).toBe('VIII');
      expect(where.status).toBe('active');
    });
  });

  describe('getITARComplianceSummary', () => {
    it('should return summary stats', async () => {
      mp.iTARControlledItem.count
        .mockResolvedValueOnce(10)  // totalControlledItems
        .mockResolvedValueOnce(2);  // upcomingReviews
      mp.user.count.mockResolvedValue(5);
      mp.iTARAccessLog.count.mockResolvedValue(3);
      mp.iTARControlledItem.groupBy.mockResolvedValue([
        { usmlCategory: 'VIII', _count: 4 },
        { usmlCategory: null, _count: 6 },
      ]);

      const result = await getITARComplianceSummary();
      expect(result.totalControlledItems).toBe(10);
      expect(result.certifiedUsers).toBe(5);
      expect(result.accessDenials24h).toBe(3);
      expect(result.itemsByCategory['VIII']).toBe(4);
      expect(result.itemsByCategory['Uncategorized']).toBe(6);
    });
  });

  describe('declassifyITARItem', () => {
    it('should declassify an existing item', async () => {
      mp.iTARControlledItem.findUnique.mockResolvedValue({ id: 'itar-1', status: 'active' });
      mp.iTARControlledItem.update.mockResolvedValue({});
      const result = await declassifyITARItem('itar-1', 'admin-1', 'No longer controlled');
      expect(result.success).toBe(true);
      expect(mp.iTARControlledItem.update.mock.calls[0][0].data.status).toBe('declassified');
    });

    it('should fail if item not found', async () => {
      mp.iTARControlledItem.findUnique.mockResolvedValue(null);
      const result = await declassifyITARItem('bad', 'admin-1', 'reason');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Item not found');
    });

    it('should handle DB error', async () => {
      mp.iTARControlledItem.findUnique.mockResolvedValue({ id: 'itar-1' });
      mp.iTARControlledItem.update.mockRejectedValue(new Error('DB fail'));
      const result = await declassifyITARItem('itar-1', 'admin-1', 'reason');
      expect(result.success).toBe(false);
    });
  });
});
