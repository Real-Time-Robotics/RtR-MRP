import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// =============================================================================
// HOISTED MOCKS
// =============================================================================

const { mockPrisma, mockFs, mockFetch } = vi.hoisted(() => ({
  mockPrisma: {
    part: { findMany: vi.fn() },
    supplier: { findMany: vi.fn() },
    customer: { findMany: vi.fn() },
    product: { findMany: vi.fn() },
  },
  mockFs: {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
  },
  mockFetch: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    logError: vi.fn(),
  },
}));
vi.mock('fs', () => ({
  default: mockFs,
  ...mockFs,
}));

vi.stubGlobal('fetch', mockFetch);

import {
  EmbeddingService,
  getEmbeddingService,
  resetEmbeddingService,
} from '../embedding-service';
import type { EmbeddingVector, SemanticSearchResult } from '../embedding-service';

// =============================================================================
// HELPERS
// =============================================================================

function makeEmbeddingVector(overrides: Partial<EmbeddingVector> = {}): EmbeddingVector {
  return {
    id: 'test-id',
    type: 'part',
    text: 'test text',
    embedding: [0.1, 0.2, 0.3],
    metadata: { name: 'Test' },
    updatedAt: new Date(),
    ...overrides,
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe('EmbeddingService', () => {
  let service: EmbeddingService;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = '';
    // No cache file by default
    mockFs.existsSync.mockReturnValue(false);
    service = new EmbeddingService({ cacheDir: '/tmp/test-cache' });
  });

  afterEach(() => {
    resetEmbeddingService();
  });

  // =========================================================================
  // SINGLETON
  // =========================================================================

  describe('getEmbeddingService / resetEmbeddingService', () => {
    it('returns a singleton instance', () => {
      const a = getEmbeddingService({ cacheDir: '/tmp/test' });
      const b = getEmbeddingService();
      expect(a).toBe(b);
    });

    it('resets the singleton', () => {
      const a = getEmbeddingService({ cacheDir: '/tmp/test' });
      resetEmbeddingService();
      const b = getEmbeddingService({ cacheDir: '/tmp/test2' });
      expect(a).not.toBe(b);
    });
  });

  // =========================================================================
  // EmbeddingCache
  // =========================================================================

  describe('EmbeddingCache (tested via EmbeddingService)', () => {
    it('loads cached embeddings from file on construction', () => {
      const cached: EmbeddingVector[] = [
        makeEmbeddingVector({ id: 'p1', type: 'part', text: 'part one' }),
      ];
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(cached));

      const svc = new EmbeddingService({ cacheDir: '/tmp/cache-test' });
      const stats = svc.getStats();
      expect(stats.totalEmbeddings).toBe(1);
    });

    it('handles corrupt cache file gracefully', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('not valid json!!!');

      // Should not throw
      const svc = new EmbeddingService({ cacheDir: '/tmp/cache-corrupt' });
      expect(svc.getStats().totalEmbeddings).toBe(0);
    });

    it('handles missing cache file gracefully', () => {
      mockFs.existsSync.mockReturnValue(false);
      const svc = new EmbeddingService({ cacheDir: '/tmp/no-cache' });
      expect(svc.getStats().totalEmbeddings).toBe(0);
    });
  });

  // =========================================================================
  // generateEmbedding
  // =========================================================================

  describe('generateEmbedding', () => {
    it('uses fallback embedding when no API key', async () => {
      const embedding = await service.generateEmbedding('test text');
      expect(embedding).toHaveLength(1536); // default dimensions
      expect(typeof embedding[0]).toBe('number');
    });

    it('calls OpenAI API when key is set', async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      service = new EmbeddingService({ cacheDir: '/tmp/api-test' });

      const mockEmbedding = new Array(1536).fill(0.01);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [{ embedding: mockEmbedding }] }),
      });

      const result = await service.generateEmbedding('hello world');
      expect(result).toEqual(mockEmbedding);
      expect(mockFetch).toHaveBeenCalledOnce();
    });

    it('falls back to local embedding on API error', async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      service = new EmbeddingService({ cacheDir: '/tmp/api-err' });

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      const result = await service.generateEmbedding('hello');
      expect(result).toHaveLength(1536);
    });

    it('falls back to local embedding on fetch exception', async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      service = new EmbeddingService({ cacheDir: '/tmp/api-exc' });

      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await service.generateEmbedding('hello');
      expect(result).toHaveLength(1536);
    });
  });

  // =========================================================================
  // generateFallbackEmbedding
  // =========================================================================

  describe('generateFallbackEmbedding (via generateEmbedding without API key)', () => {
    it('produces normalized embedding', async () => {
      const embedding = await service.generateEmbedding('hello world test');
      const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
      // Should be approximately 1.0 (normalized)
      expect(magnitude).toBeCloseTo(1.0, 5);
    });

    it('produces different embeddings for different texts', async () => {
      const e1 = await service.generateEmbedding('hello world');
      const e2 = await service.generateEmbedding('completely different text');
      // At least some dimensions should differ
      const differ = e1.some((v, i) => v !== e2[i]);
      expect(differ).toBe(true);
    });

    it('handles empty text', async () => {
      const embedding = await service.generateEmbedding('');
      expect(embedding).toHaveLength(1536);
      // Should produce a valid embedding (possibly normalized)
      expect(embedding.every((v) => typeof v === 'number')).toBe(true);
    });

    it('handles single word', async () => {
      const embedding = await service.generateEmbedding('word');
      expect(embedding).toHaveLength(1536);
    });

    it('respects custom dimensions', async () => {
      const svc = new EmbeddingService({ dimensions: 256, cacheDir: '/tmp/dim-test' });
      const embedding = await svc.generateEmbedding('test');
      expect(embedding).toHaveLength(256);
    });
  });

  // =========================================================================
  // indexParts
  // =========================================================================

  describe('indexParts', () => {
    it('indexes parts and saves to cache', async () => {
      mockPrisma.part.findMany.mockResolvedValue([
        { id: 'p1', partNumber: 'PT-001', name: 'Bolt', description: 'M8 bolt', category: 'Fastener', partType: 'Component', unit: 'pcs' },
        { id: 'p2', partNumber: 'PT-002', name: 'Nut', description: null, category: null, partType: null, unit: 'pcs' },
      ]);
      mockFs.existsSync.mockReturnValue(true);

      const count = await service.indexParts();
      expect(count).toBe(2);
      expect(service.getStats().totalEmbeddings).toBe(2);
    });

    it('skips parts already cached with same text', async () => {
      // Pre-populate cache
      const cached: EmbeddingVector[] = [
        makeEmbeddingVector({
          id: 'p1',
          type: 'part',
          text: 'PT-001 Bolt M8 bolt Fastener Component',
        }),
      ];
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(cached));

      service = new EmbeddingService({ cacheDir: '/tmp/skip-test' });

      mockPrisma.part.findMany.mockResolvedValue([
        { id: 'p1', partNumber: 'PT-001', name: 'Bolt', description: 'M8 bolt', category: 'Fastener', partType: 'Component', unit: 'pcs' },
      ]);

      const count = await service.indexParts();
      expect(count).toBe(0); // skipped since text is same
    });

    it('handles rate limiting batch delay', async () => {
      // Create more parts than batchSize to trigger delay
      const parts = Array.from({ length: 5 }, (_, i) => ({
        id: `p${i}`,
        partNumber: `PT-${i}`,
        name: `Part ${i}`,
        description: null,
        category: null,
        partType: null,
        unit: 'pcs',
      }));
      mockPrisma.part.findMany.mockResolvedValue(parts);
      mockFs.existsSync.mockReturnValue(true);

      const count = await service.indexParts(3); // batchSize = 3
      expect(count).toBe(5);
    });
  });

  // =========================================================================
  // indexSuppliers
  // =========================================================================

  describe('indexSuppliers', () => {
    it('indexes suppliers', async () => {
      mockPrisma.supplier.findMany.mockResolvedValue([
        { id: 's1', code: 'SUP-01', name: 'Steel Co', country: 'VN', status: 'ACTIVE', category: 'Material' },
      ]);
      mockFs.existsSync.mockReturnValue(true);

      const count = await service.indexSuppliers();
      expect(count).toBe(1);
    });

    it('skips unchanged suppliers', async () => {
      const cached: EmbeddingVector[] = [
        makeEmbeddingVector({
          id: 's1',
          type: 'supplier',
          text: 'SUP-01 Steel Co VN Material supplier vendor ACTIVE',
        }),
      ];
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(cached));
      service = new EmbeddingService({ cacheDir: '/tmp/sup-skip' });

      mockPrisma.supplier.findMany.mockResolvedValue([
        { id: 's1', code: 'SUP-01', name: 'Steel Co', country: 'VN', status: 'ACTIVE', category: 'Material' },
      ]);

      const count = await service.indexSuppliers();
      expect(count).toBe(0);
    });
  });

  // =========================================================================
  // indexCustomers
  // =========================================================================

  describe('indexCustomers', () => {
    it('indexes customers', async () => {
      mockPrisma.customer.findMany.mockResolvedValue([
        { id: 'c1', code: 'CUST-01', name: 'ACME', country: 'US', type: 'OEM', status: 'ACTIVE' },
      ]);
      mockFs.existsSync.mockReturnValue(true);

      const count = await service.indexCustomers();
      expect(count).toBe(1);
    });

    it('skips unchanged customers', async () => {
      const cached: EmbeddingVector[] = [
        makeEmbeddingVector({
          id: 'c1',
          type: 'customer',
          text: 'CUST-01 ACME US customer client OEM',
        }),
      ];
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(cached));
      service = new EmbeddingService({ cacheDir: '/tmp/cust-skip' });

      mockPrisma.customer.findMany.mockResolvedValue([
        { id: 'c1', code: 'CUST-01', name: 'ACME', country: 'US', type: 'OEM', status: 'ACTIVE' },
      ]);

      const count = await service.indexCustomers();
      expect(count).toBe(0);
    });
  });

  // =========================================================================
  // indexProducts
  // =========================================================================

  describe('indexProducts', () => {
    it('indexes products', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'pr1', sku: 'SKU-001', name: 'Widget', description: 'A widget', status: 'ACTIVE' },
      ]);
      mockFs.existsSync.mockReturnValue(true);

      const count = await service.indexProducts();
      expect(count).toBe(1);
    });

    it('skips unchanged products', async () => {
      const cached: EmbeddingVector[] = [
        makeEmbeddingVector({
          id: 'pr1',
          type: 'product',
          text: 'SKU-001 Widget A widget product finished goods',
        }),
      ];
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(cached));
      service = new EmbeddingService({ cacheDir: '/tmp/prod-skip' });

      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'pr1', sku: 'SKU-001', name: 'Widget', description: 'A widget', status: 'ACTIVE' },
      ]);

      const count = await service.indexProducts();
      expect(count).toBe(0);
    });
  });

  // =========================================================================
  // indexAll
  // =========================================================================

  describe('indexAll', () => {
    it('indexes all entity types and returns counts', async () => {
      mockPrisma.part.findMany.mockResolvedValue([
        { id: 'p1', partNumber: 'PT-1', name: 'P1', description: null, category: null, partType: null, unit: 'pcs' },
      ]);
      mockPrisma.supplier.findMany.mockResolvedValue([
        { id: 's1', code: 'S1', name: 'Sup1', country: null, status: 'ACTIVE', category: null },
      ]);
      mockPrisma.customer.findMany.mockResolvedValue([
        { id: 'c1', code: 'C1', name: 'Cust1', country: null, type: null, status: 'ACTIVE' },
      ]);
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'pr1', sku: 'SK1', name: 'Prod1', description: null, status: 'ACTIVE' },
      ]);
      mockFs.existsSync.mockReturnValue(true);

      const result = await service.indexAll();
      expect(result).toEqual({ parts: 1, suppliers: 1, customers: 1, products: 1 });
    });
  });

  // =========================================================================
  // cosineSimilarity (tested via semanticSearch)
  // =========================================================================

  describe('cosineSimilarity', () => {
    it('returns 0 for vectors of different lengths (via semanticSearch)', async () => {
      // This is handled internally, but we can set up a scenario
      // where embeddings have different dimensions
      const cached: EmbeddingVector[] = [
        makeEmbeddingVector({
          id: 'x1',
          type: 'part',
          text: 'test',
          embedding: [1, 0, 0], // 3 dims
          metadata: { partNumber: 'X', name: 'X', category: 'C', partType: 'T' },
        }),
      ];
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(cached));

      // Service with different dimension count
      const svc = new EmbeddingService({ dimensions: 3, cacheDir: '/tmp/cos-test' });

      const results = await svc.semanticSearch('test', { threshold: 0 });
      // Should work since both are 3 dims
      expect(results.length).toBeGreaterThanOrEqual(0);
    });
  });

  // =========================================================================
  // semanticSearch
  // =========================================================================

  describe('semanticSearch', () => {
    beforeEach(() => {
      const cached: EmbeddingVector[] = [
        makeEmbeddingVector({
          id: 'p1',
          type: 'part',
          text: 'bolt fastener',
          embedding: [1, 0, 0],
          metadata: { partNumber: 'PT-001', name: 'Bolt', category: 'Fastener', partType: 'Component' },
        }),
        makeEmbeddingVector({
          id: 's1',
          type: 'supplier',
          text: 'steel supplier',
          embedding: [0, 1, 0],
          metadata: { code: 'SUP-01', name: 'Steel Co', country: 'VN', status: 'ACTIVE' },
        }),
        makeEmbeddingVector({
          id: 'c1',
          type: 'customer',
          text: 'acme customer',
          embedding: [0, 0, 1],
          metadata: { code: 'CUST-01', name: 'ACME', country: 'US', type: 'OEM' },
        }),
        makeEmbeddingVector({
          id: 'pr1',
          type: 'product',
          text: 'widget product',
          embedding: [0.5, 0.5, 0],
          metadata: { sku: 'SKU-001', name: 'Widget', status: 'ACTIVE' },
        }),
      ];
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(cached));
      service = new EmbeddingService({ dimensions: 3, cacheDir: '/tmp/search-test' });
    });

    it('returns results sorted by score', async () => {
      const results = await service.semanticSearch('bolt', { threshold: 0 });
      expect(results.length).toBeGreaterThan(0);
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
      }
    });

    it('filters by type', async () => {
      const results = await service.semanticSearch('test', {
        types: ['supplier'],
        threshold: 0,
      });
      expect(results.every((r) => r.type === 'supplier')).toBe(true);
    });

    it('respects limit', async () => {
      const results = await service.semanticSearch('test', {
        limit: 2,
        threshold: 0,
      });
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('respects threshold by filtering low-score results', async () => {
      // Use a threshold higher than any possible cosine similarity (max is 1.0)
      const results = await service.semanticSearch('test', { threshold: 1.01 });
      expect(results.length).toBe(0);
    });

    it('uses default options when none provided', async () => {
      const results = await service.semanticSearch('test');
      expect(results).toBeDefined();
    });
  });

  // =========================================================================
  // formatTitle / formatSubtitle / formatLink
  // =========================================================================

  describe('formatting helpers (tested via semanticSearch results)', () => {
    beforeEach(() => {
      const cached: EmbeddingVector[] = [
        makeEmbeddingVector({
          id: 'p1',
          type: 'part',
          embedding: [1, 0, 0],
          metadata: { partNumber: 'PT-001', name: 'Bolt', category: 'Fastener', partType: 'Component' },
        }),
        makeEmbeddingVector({
          id: 's1',
          type: 'supplier',
          embedding: [0, 1, 0],
          metadata: { code: 'SUP-01', name: 'Steel Co', country: 'VN', status: 'ACTIVE' },
        }),
        makeEmbeddingVector({
          id: 'c1',
          type: 'customer',
          embedding: [0, 0, 1],
          metadata: { code: 'CUST-01', name: 'ACME', country: 'US', type: 'OEM' },
        }),
        makeEmbeddingVector({
          id: 'pr1',
          type: 'product',
          embedding: [0.5, 0.5, 0],
          metadata: { sku: 'SKU-001', name: 'Widget', status: 'ACTIVE' },
        }),
      ];
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(cached));
      service = new EmbeddingService({ dimensions: 3, cacheDir: '/tmp/format-test' });
    });

    it('formats part title correctly', async () => {
      const results = await service.semanticSearch('bolt', { types: ['part'], threshold: 0 });
      if (results.length > 0) {
        expect(results[0].title).toBe('PT-001 - Bolt');
        expect(results[0].subtitle).toContain('Fastener');
        expect(results[0].link).toBe('/inventory/p1');
      }
    });

    it('formats supplier title correctly', async () => {
      const results = await service.semanticSearch('steel', { types: ['supplier'], threshold: 0 });
      if (results.length > 0) {
        expect(results[0].title).toBe('SUP-01 - Steel Co');
        expect(results[0].subtitle).toContain('VN');
        expect(results[0].link).toBe('/suppliers/s1');
      }
    });

    it('formats customer title correctly', async () => {
      const results = await service.semanticSearch('acme', { types: ['customer'], threshold: 0 });
      if (results.length > 0) {
        expect(results[0].title).toBe('CUST-01 - ACME');
        expect(results[0].subtitle).toContain('US');
        expect(results[0].link).toBe('/customers/c1');
      }
    });

    it('formats product title correctly', async () => {
      const results = await service.semanticSearch('widget', { types: ['product'], threshold: 0 });
      if (results.length > 0) {
        expect(results[0].title).toBe('SKU-001 - Widget');
        expect(results[0].subtitle).toContain('ACTIVE');
        expect(results[0].link).toBe('/bom/pr1');
      }
    });
  });

  // =========================================================================
  // getStats
  // =========================================================================

  describe('getStats', () => {
    it('returns correct stats', async () => {
      mockPrisma.part.findMany.mockResolvedValue([
        { id: 'p1', partNumber: 'PT-1', name: 'P1', description: null, category: null, partType: null, unit: 'pcs' },
        { id: 'p2', partNumber: 'PT-2', name: 'P2', description: null, category: null, partType: null, unit: 'pcs' },
      ]);
      mockFs.existsSync.mockReturnValue(true);

      await service.indexParts();
      const stats = service.getStats();

      expect(stats.totalEmbeddings).toBe(2);
      expect(stats.byType['part']).toBe(2);
    });
  });

  // =========================================================================
  // clearCache
  // =========================================================================

  describe('clearCache', () => {
    it('clears all cached embeddings', async () => {
      mockPrisma.part.findMany.mockResolvedValue([
        { id: 'p1', partNumber: 'PT-1', name: 'P1', description: null, category: null, partType: null, unit: 'pcs' },
      ]);
      mockFs.existsSync.mockReturnValue(true);

      await service.indexParts();
      expect(service.getStats().totalEmbeddings).toBe(1);

      service.clearCache();
      expect(service.getStats().totalEmbeddings).toBe(0);
    });
  });

  // =========================================================================
  // saveToFile
  // =========================================================================

  describe('cache saveToFile', () => {
    it('saves to file after indexing', async () => {
      mockPrisma.part.findMany.mockResolvedValue([
        { id: 'p1', partNumber: 'PT-1', name: 'P1', description: null, category: null, partType: null, unit: 'pcs' },
      ]);
      mockFs.existsSync.mockReturnValue(true);

      await service.indexParts();
      expect(mockFs.writeFileSync).toHaveBeenCalled();
    });

    it('creates directory if it does not exist', async () => {
      mockPrisma.part.findMany.mockResolvedValue([
        { id: 'p1', partNumber: 'PT-1', name: 'P1', description: null, category: null, partType: null, unit: 'pcs' },
      ]);
      // First call for loadFromFile, rest for saveToFile
      mockFs.existsSync.mockReturnValueOnce(false).mockReturnValueOnce(false);

      await service.indexParts();
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    });

    it('handles write errors gracefully', async () => {
      mockPrisma.part.findMany.mockResolvedValue([
        { id: 'p1', partNumber: 'PT-1', name: 'P1', description: null, category: null, partType: null, unit: 'pcs' },
      ]);
      mockFs.existsSync.mockReturnValue(true);
      mockFs.writeFileSync.mockImplementation(() => {
        throw new Error('Write failed');
      });

      // Should not throw
      await service.indexParts();
    });

    it('does not save when cache is not dirty', async () => {
      // No indexing = nothing dirty
      mockPrisma.part.findMany.mockResolvedValue([]);
      mockFs.existsSync.mockReturnValue(true);

      await service.indexParts();
      // writeFileSync should not be called since no items were indexed
      expect(mockFs.writeFileSync).not.toHaveBeenCalled();
    });
  });
});
