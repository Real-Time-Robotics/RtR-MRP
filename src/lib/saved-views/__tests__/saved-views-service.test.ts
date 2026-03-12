import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSavedView } = vi.hoisted(() => ({
  mockSavedView: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    savedView: mockSavedView,
  },
}));

import {
  getSavedViews,
  getSavedView,
  getDefaultView,
  createSavedView,
  updateSavedView,
  deleteSavedView,
  duplicateSavedView,
} from '../saved-views-service';

describe('Saved Views Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSavedViews', () => {
    it('should get views for entity type and user', async () => {
      mockSavedView.findMany.mockResolvedValue([
        { id: '1', name: 'View 1', entity: 'parts' },
      ]);
      const result = await getSavedViews('parts', 'user-1');
      expect(result).toHaveLength(1);
      expect(mockSavedView.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            entity: 'parts',
          }),
        })
      );
    });
  });

  describe('getSavedView', () => {
    it('should return view if user is owner', async () => {
      mockSavedView.findUnique.mockResolvedValue({
        id: '1', createdBy: 'user-1', isShared: false,
      });
      const result = await getSavedView('1', 'user-1');
      expect(result).toBeDefined();
    });

    it('should return null if user is not owner and not shared', async () => {
      mockSavedView.findUnique.mockResolvedValue({
        id: '1', createdBy: 'other-user', isShared: false,
      });
      const result = await getSavedView('1', 'user-1');
      expect(result).toBeNull();
    });

    it('should return shared view even if not owner', async () => {
      mockSavedView.findUnique.mockResolvedValue({
        id: '1', createdBy: 'other-user', isShared: true,
      });
      const result = await getSavedView('1', 'user-1');
      expect(result).toBeDefined();
    });
  });

  describe('getDefaultView', () => {
    it('should return user default view if exists', async () => {
      mockSavedView.findFirst.mockResolvedValueOnce({ id: '1', isDefault: true });
      const result = await getDefaultView('parts', 'user-1');
      expect(result).toBeDefined();
      expect(result!.id).toBe('1');
    });

    it('should fall back to shared default', async () => {
      mockSavedView.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: '2', isDefault: true, isShared: true });
      const result = await getDefaultView('parts', 'user-1');
      expect(mockSavedView.findFirst).toHaveBeenCalledTimes(2);
    });
  });

  describe('createSavedView', () => {
    it('should create a new view', async () => {
      mockSavedView.create.mockResolvedValue({ id: '1', name: 'My View' });
      const result = await createSavedView({
        name: 'My View',
        entityType: 'parts',
        userId: 'user-1',
      });
      expect(result.name).toBe('My View');
    });

    it('should unset other defaults when creating default view', async () => {
      mockSavedView.updateMany.mockResolvedValue({ count: 1 });
      mockSavedView.create.mockResolvedValue({ id: '1', isDefault: true });
      await createSavedView({
        name: 'Default View',
        entityType: 'parts',
        userId: 'user-1',
        isDefault: true,
      });
      expect(mockSavedView.updateMany).toHaveBeenCalled();
    });
  });

  describe('updateSavedView', () => {
    it('should update view if user is owner', async () => {
      mockSavedView.findUnique.mockResolvedValue({
        id: '1', createdBy: 'user-1', entity: 'parts',
      });
      mockSavedView.update.mockResolvedValue({ id: '1', name: 'Updated' });
      const result = await updateSavedView('1', { name: 'Updated' }, 'user-1');
      expect(result.name).toBe('Updated');
    });

    it('should throw if user is not owner', async () => {
      mockSavedView.findUnique.mockResolvedValue({
        id: '1', createdBy: 'other-user',
      });
      await expect(updateSavedView('1', { name: 'Updated' }, 'user-1'))
        .rejects.toThrow('View not found or access denied');
    });

    it('should throw if view not found', async () => {
      mockSavedView.findUnique.mockResolvedValue(null);
      await expect(updateSavedView('1', { name: 'Updated' }, 'user-1'))
        .rejects.toThrow('View not found or access denied');
    });
  });

  describe('deleteSavedView', () => {
    it('should delete view if user is owner', async () => {
      mockSavedView.findUnique.mockResolvedValue({ id: '1', createdBy: 'user-1' });
      mockSavedView.delete.mockResolvedValue({ id: '1' });
      await deleteSavedView('1', 'user-1');
      expect(mockSavedView.delete).toHaveBeenCalledWith({ where: { id: '1' } });
    });

    it('should throw if user is not owner', async () => {
      mockSavedView.findUnique.mockResolvedValue({ id: '1', createdBy: 'other-user' });
      await expect(deleteSavedView('1', 'user-1'))
        .rejects.toThrow('View not found or access denied');
    });
  });

  describe('duplicateSavedView', () => {
    it('should duplicate view', async () => {
      mockSavedView.findUnique.mockResolvedValue({
        id: '1', createdBy: 'user-1', entity: 'parts', filters: {}, columns: null,
        sortBy: null, sortOrder: null,
      });
      mockSavedView.create.mockResolvedValue({ id: '2', name: 'Copy' });
      const result = await duplicateSavedView('1', 'user-1', 'Copy');
      expect(result.name).toBe('Copy');
    });

    it('should throw if view not found', async () => {
      mockSavedView.findUnique.mockResolvedValue(null);
      await expect(duplicateSavedView('999', 'user-1', 'Copy'))
        .rejects.toThrow('View not found');
    });

    it('should throw if not owner and not shared', async () => {
      mockSavedView.findUnique.mockResolvedValue({
        id: '1', createdBy: 'other-user', isShared: false,
      });
      await expect(duplicateSavedView('1', 'user-1', 'Copy'))
        .rejects.toThrow('Access denied');
    });
  });
});
