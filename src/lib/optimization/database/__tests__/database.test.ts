import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), logError: vi.fn() },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {},
}));

import { batchProcess, batchCreate } from '../index';

describe('Database Optimization', () => {
  describe('batchProcess', () => {
    it('should process items in batches', async () => {
      const items = [1, 2, 3, 4, 5];
      const processor = vi.fn().mockImplementation(async (batch: number[]) =>
        batch.map(n => n * 2)
      );
      const result = await batchProcess(items, processor, { batchSize: 2 });
      expect(result.results).toEqual([2, 4, 6, 8, 10]);
      expect(result.errors).toHaveLength(0);
      expect(processor).toHaveBeenCalledTimes(3); // 2+2+1
    });

    it('should continue on error', async () => {
      const items = [1, 2, 3];
      const processor = vi.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue([6]);
      const result = await batchProcess(items, processor, {
        batchSize: 1,
        continueOnError: true,
      });
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should stop on error when continueOnError is false', async () => {
      const items = [1, 2, 3];
      const processor = vi.fn().mockRejectedValue(new Error('fail'));
      await expect(batchProcess(items, processor, {
        batchSize: 1,
        continueOnError: false,
      })).rejects.toThrow('fail');
    });

    it('should call onProgress', async () => {
      const onProgress = vi.fn();
      const items = [1, 2, 3, 4];
      const processor = vi.fn().mockResolvedValue([]);
      await batchProcess(items, processor, { batchSize: 2, onProgress });
      expect(onProgress).toHaveBeenCalled();
    });
  });

  describe('batchCreate', () => {
    it('should create items in batches', async () => {
      const model = {
        createMany: vi.fn().mockResolvedValue({ count: 2 }),
      };
      const data = [
        { name: 'a' },
        { name: 'b' },
        { name: 'c' },
      ];
      const result = await batchCreate(model as any, data, { batchSize: 2 });
      expect(result.created).toBeGreaterThan(0);
      expect(model.createMany).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      const model = {
        createMany: vi.fn().mockRejectedValue(new Error('db error')),
      };
      const result = await batchCreate(model as any, [{ name: 'a' }], { batchSize: 1 });
      expect(result.errors).toBe(1);
    });
  });
});
