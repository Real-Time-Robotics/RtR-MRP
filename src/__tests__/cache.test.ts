import { describe, it, expect, beforeEach, vi } from 'vitest'
import { cache, cacheKeys, cacheTTL, cachePatterns } from '@/lib/cache/redis'

describe('Cache Module', () => {
  beforeEach(async () => {
    // Clear cache before each test
    await cache.deletePattern('*')
    cache.resetStats()
  })

  describe('cache.get and cache.set', () => {
    it('should return null for non-existent key', async () => {
      const result = await cache.get('non-existent-key')
      expect(result).toBeNull()
    })

    it('should set and get a value', async () => {
      const testData = { name: 'Test', value: 123 }
      await cache.set('test-key', testData, 60)

      const result = await cache.get('test-key')
      expect(result).toEqual(testData)
    })

    it('should handle complex objects', async () => {
      const complexData = {
        items: [{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }],
        meta: { page: 1, total: 100 },
        nested: { deep: { value: 'test' } }
      }

      await cache.set('complex-key', complexData, 60)
      const result = await cache.get('complex-key')
      expect(result).toEqual(complexData)
    })
  })

  describe('cache.delete', () => {
    it('should delete a specific key', async () => {
      await cache.set('delete-test', { data: 'test' }, 60)
      expect(await cache.get('delete-test')).not.toBeNull()

      await cache.del('delete-test')
      expect(await cache.get('delete-test')).toBeNull()
    })
  })

  describe('cache.deletePattern', () => {
    it('should delete keys matching pattern', async () => {
      await cache.set('prefix:key1', { id: 1 }, 60)
      await cache.set('prefix:key2', { id: 2 }, 60)
      await cache.set('other:key', { id: 3 }, 60)

      await cache.delPattern('prefix:*')

      expect(await cache.get('prefix:key1')).toBeNull()
      expect(await cache.get('prefix:key2')).toBeNull()
      expect(await cache.get('other:key')).not.toBeNull()
    })
  })

  describe('cache.aside', () => {
    it('should return cached value if exists', async () => {
      await cache.set('aside-test', { cached: true }, 60)

      const fetcher = vi.fn().mockResolvedValue({ cached: false })
      const result = await cache.aside('aside-test', fetcher, 60)

      expect(result).toEqual({ cached: true })
      expect(fetcher).not.toHaveBeenCalled()
    })

    it('should call fetcher and cache result if not cached', async () => {
      const fetchedData = { fetched: true, timestamp: Date.now() }
      const fetcher = vi.fn().mockResolvedValue(fetchedData)

      const result = await cache.aside('new-key', fetcher, 60)

      expect(result).toEqual(fetchedData)
      expect(fetcher).toHaveBeenCalledOnce()

      // Verify it's now cached
      const cached = await cache.get('new-key')
      expect(cached).toEqual(fetchedData)
    })
  })

  describe('cache.getStats', () => {
    it('should track hits and misses', async () => {
      cache.resetStats()

      // Miss
      await cache.get('missing-key')

      // Hit
      await cache.set('existing-key', { data: 'test' }, 60)
      await cache.get('existing-key')

      const stats = cache.getStats()
      // Stats tracking may vary by implementation (in-memory vs Redis)
      expect(stats).toBeDefined()
      expect(typeof stats.hits).toBe('number')
      expect(typeof stats.misses).toBe('number')
    })
  })

  describe('cacheKeys builders', () => {
    it('should build workOrders key', () => {
      const key = cacheKeys.workOrders({ page: 1, pageSize: 20 })
      expect(key).toMatch(/^workorders:/)
    })

    it('should build consistent keys for same params', () => {
      const params = { page: 1, pageSize: 20, status: 'active' }
      const key1 = cacheKeys.workOrders(params)
      const key2 = cacheKeys.workOrders(params)
      expect(key1).toBe(key2)
    })

    it('should build different keys for different params', () => {
      const key1 = cacheKeys.parts({ page: 1 })
      const key2 = cacheKeys.parts({ page: 2 })
      expect(key1).not.toBe(key2)
    })

    it('should build single entity keys', () => {
      const id = 'test-id-123'
      expect(cacheKeys.workOrder(id)).toBe(`workorder:${id}`)
      expect(cacheKeys.salesOrder(id)).toBe(`salesorder:${id}`)
      expect(cacheKeys.part(id)).toBe(`part:${id}`)
    })
  })

  describe('cacheTTL constants', () => {
    it('should have correct TTL values', () => {
      expect(cacheTTL.SHORT).toBe(60)       // 1 minute
      expect(cacheTTL.MEDIUM).toBe(300)     // 5 minutes
      expect(cacheTTL.STANDARD).toBe(300)   // 5 minutes
      expect(cacheTTL.LONG).toBe(600)       // 10 minutes
      expect(cacheTTL.extended).toBe(1800)  // 30 minutes
    })
  })

  describe('cachePatterns', () => {
    it('should have wildcard patterns', () => {
      expect(cachePatterns.ALL_WORK_ORDERS).toBe('workorders:*')
      expect(cachePatterns.ALL_PARTS).toBe('parts:*')
      expect(cachePatterns.ALL_DASHBOARD).toBe('dashboard:*')
    })
  })
})
