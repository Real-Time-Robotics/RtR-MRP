// =============================================================================
// EMBEDDING SERVICE
// Generates and manages embeddings for semantic search
// Uses OpenAI text-embedding-3-small for cost-efficient vector generation
// =============================================================================

import { prisma } from '../prisma';
import { logger } from '@/lib/logger';
import fs from 'fs';
import path from 'path';

// =============================================================================
// TYPES
// =============================================================================

export interface EmbeddingVector {
  id: string;
  type: 'part' | 'supplier' | 'customer' | 'product' | 'order';
  text: string;
  embedding: number[];
  metadata: Record<string, any>;
  updatedAt: Date;
}

export interface SemanticSearchResult {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  link: string;
  score: number;
  metadata?: Record<string, any>;
}

export interface EmbeddingConfig {
  model: string;
  dimensions: number;
  cacheDir: string;
}

// =============================================================================
// EMBEDDING CACHE (In-memory with file backup)
// =============================================================================

class EmbeddingCache {
  private cache: Map<string, EmbeddingVector> = new Map();
  private cacheFile: string;
  private isDirty: boolean = false;

  constructor(cacheDir: string) {
    this.cacheFile = path.join(cacheDir, 'embeddings-cache.json');
    this.loadFromFile();
  }

  private loadFromFile(): void {
    try {
      if (fs.existsSync(this.cacheFile)) {
        const data = fs.readFileSync(this.cacheFile, 'utf-8');
        const parsed = JSON.parse(data) as EmbeddingVector[];
        parsed.forEach((item) => {
          this.cache.set(`${item.type}:${item.id}`, item);
        });
        logger.info(`[Embeddings] Loaded ${parsed.length} embeddings from cache`);
      }
    } catch (error) {
      logger.warn('[Embeddings] Failed to load cache', { context: 'embedding-service', error: String(error) });
    }
  }

  async saveToFile(): Promise<void> {
    if (!this.isDirty) return;

    try {
      const dir = path.dirname(this.cacheFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = Array.from(this.cache.values());
      fs.writeFileSync(this.cacheFile, JSON.stringify(data, null, 2));
      this.isDirty = false;
      logger.info(`[Embeddings] Saved ${data.length} embeddings to cache`);
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'embedding-service', operation: 'saveCache' });
    }
  }

  get(key: string): EmbeddingVector | undefined {
    return this.cache.get(key);
  }

  set(key: string, value: EmbeddingVector): void {
    this.cache.set(key, value);
    this.isDirty = true;
  }

  getAll(): EmbeddingVector[] {
    return Array.from(this.cache.values());
  }

  size(): number {
    return this.cache.size;
  }

  clear(): void {
    this.cache.clear();
    this.isDirty = true;
  }
}

// =============================================================================
// EMBEDDING SERVICE CLASS
// =============================================================================

export class EmbeddingService {
  private config: EmbeddingConfig;
  private cache: EmbeddingCache;
  private apiKey: string;

  constructor(config?: Partial<EmbeddingConfig>) {
    this.config = {
      model: config?.model || 'text-embedding-3-small',
      dimensions: config?.dimensions || 1536,
      cacheDir: config?.cacheDir || path.join(process.cwd(), '.cache'),
    };
    this.cache = new EmbeddingCache(this.config.cacheDir);
    this.apiKey = process.env.OPENAI_API_KEY || '';
  }

  // ===========================================================================
  // EMBEDDING GENERATION
  // ===========================================================================

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.apiKey) {
      logger.warn('[Embeddings] No OpenAI API key, using fallback', { context: 'embedding-service' });
      return this.generateFallbackEmbedding(text);
    }

    try {
      const response = await fetch(`${process.env.OPENAI_API_BASE_URL || 'https://api.openai.com'}/v1/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          input: text,
          dimensions: this.config.dimensions,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'embedding-service', operation: 'generateEmbedding' });
      return this.generateFallbackEmbedding(text);
    }
  }

  // Fallback: Simple TF-IDF-like embedding when API unavailable
  private generateFallbackEmbedding(text: string): number[] {
    const normalized = text.toLowerCase().replace(/[^\w\s]/g, '');
    const words = normalized.split(/\s+/);
    const embedding = new Array(this.config.dimensions).fill(0);

    words.forEach((word, idx) => {
      // Use word hash to distribute across dimensions
      const hash = this.simpleHash(word);
      const dimIdx = hash % this.config.dimensions;
      embedding[dimIdx] += 1 / (idx + 1); // Weight by position
    });

    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      return embedding.map((val) => val / magnitude);
    }
    return embedding;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  // ===========================================================================
  // INDEX BUILDING
  // ===========================================================================

  async indexParts(batchSize: number = 100): Promise<number> {
    const parts = await prisma.part.findMany({
      select: {
        id: true,
        partNumber: true,
        name: true,
        description: true,
        category: true,
        partType: true,
        unit: true,
      },
    });

    let indexed = 0;
    for (const part of parts) {
      const key = `part:${part.id}`;
      const cached = this.cache.get(key);

      // Build searchable text
      const text = [
        part.partNumber,
        part.name,
        part.description || '',
        part.category || '',
        part.partType || '',
      ]
        .filter(Boolean)
        .join(' ');

      // Skip if unchanged
      if (cached && cached.text === text) continue;

      const embedding = await this.generateEmbedding(text);

      this.cache.set(key, {
        id: part.id,
        type: 'part',
        text,
        embedding,
        metadata: {
          partNumber: part.partNumber,
          name: part.name,
          category: part.category,
          partType: part.partType,
        },
        updatedAt: new Date(),
      });

      indexed++;

      // Rate limiting
      if (indexed % batchSize === 0) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    await this.cache.saveToFile();
    return indexed;
  }

  async indexSuppliers(): Promise<number> {
    const suppliers = await prisma.supplier.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        country: true,
        status: true,
        category: true,
      },
    });

    let indexed = 0;
    for (const supplier of suppliers) {
      const key = `supplier:${supplier.id}`;
      const cached = this.cache.get(key);

      const text = [
        supplier.code,
        supplier.name,
        supplier.country || '',
        supplier.category || '',
        `supplier vendor ${supplier.status}`,
      ]
        .filter(Boolean)
        .join(' ');

      if (cached && cached.text === text) continue;

      const embedding = await this.generateEmbedding(text);

      this.cache.set(key, {
        id: supplier.id,
        type: 'supplier',
        text,
        embedding,
        metadata: {
          code: supplier.code,
          name: supplier.name,
          country: supplier.country,
          status: supplier.status,
        },
        updatedAt: new Date(),
      });

      indexed++;
    }

    await this.cache.saveToFile();
    return indexed;
  }

  async indexCustomers(): Promise<number> {
    const customers = await prisma.customer.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        country: true,
        type: true,
        status: true,
      },
    });

    let indexed = 0;
    for (const customer of customers) {
      const key = `customer:${customer.id}`;
      const cached = this.cache.get(key);

      const text = [
        customer.code,
        customer.name,
        customer.country || '',
        `customer client ${customer.type || ''}`,
      ]
        .filter(Boolean)
        .join(' ');

      if (cached && cached.text === text) continue;

      const embedding = await this.generateEmbedding(text);

      this.cache.set(key, {
        id: customer.id,
        type: 'customer',
        text,
        embedding,
        metadata: {
          code: customer.code,
          name: customer.name,
          country: customer.country,
          type: customer.type,
        },
        updatedAt: new Date(),
      });

      indexed++;
    }

    await this.cache.saveToFile();
    return indexed;
  }

  async indexProducts(): Promise<number> {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        sku: true,
        name: true,
        description: true,
        status: true,
      },
    });

    let indexed = 0;
    for (const product of products) {
      const key = `product:${product.id}`;
      const cached = this.cache.get(key);

      const text = [
        product.sku,
        product.name,
        product.description || '',
        'product finished goods',
      ]
        .filter(Boolean)
        .join(' ');

      if (cached && cached.text === text) continue;

      const embedding = await this.generateEmbedding(text);

      this.cache.set(key, {
        id: product.id,
        type: 'product',
        text,
        embedding,
        metadata: {
          sku: product.sku,
          name: product.name,
          status: product.status,
        },
        updatedAt: new Date(),
      });

      indexed++;
    }

    await this.cache.saveToFile();
    return indexed;
  }

  async indexAll(): Promise<{ parts: number; suppliers: number; customers: number; products: number }> {
    logger.info('[Embeddings] Starting full index...');

    const parts = await this.indexParts();
    const suppliers = await this.indexSuppliers();
    const customers = await this.indexCustomers();
    const products = await this.indexProducts();

    logger.info(`[Embeddings] Indexed: ${parts} parts, ${suppliers} suppliers, ${customers} customers, ${products} products`);

    return { parts, suppliers, customers, products };
  }

  // ===========================================================================
  // SIMILARITY SEARCH
  // ===========================================================================

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude > 0 ? dotProduct / magnitude : 0;
  }

  async semanticSearch(
    query: string,
    options: {
      types?: ('part' | 'supplier' | 'customer' | 'product')[];
      limit?: number;
      threshold?: number;
    } = {}
  ): Promise<SemanticSearchResult[]> {
    const { types, limit = 10, threshold = 0.3 } = options;

    // Generate query embedding
    const queryEmbedding = await this.generateEmbedding(query);

    // Get all cached embeddings
    const allEmbeddings = this.cache.getAll();

    // Filter by type if specified
    const filtered = types
      ? allEmbeddings.filter((e) => (types as string[]).includes(e.type))
      : allEmbeddings;

    // Calculate similarities
    const results: SemanticSearchResult[] = filtered
      .map((item) => ({
        id: item.id,
        type: item.type,
        score: this.cosineSimilarity(queryEmbedding, item.embedding),
        title: this.formatTitle(item),
        subtitle: this.formatSubtitle(item),
        link: this.formatLink(item),
        metadata: item.metadata,
      }))
      .filter((r) => r.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return results;
  }

  private formatTitle(item: EmbeddingVector): string {
    const { metadata, type } = item;
    switch (type) {
      case 'part':
        return `${metadata.partNumber} - ${metadata.name}`;
      case 'supplier':
        return `${metadata.code} - ${metadata.name}`;
      case 'customer':
        return `${metadata.code} - ${metadata.name}`;
      case 'product':
        return `${metadata.sku} - ${metadata.name}`;
      default:
        return metadata.name || item.id;
    }
  }

  private formatSubtitle(item: EmbeddingVector): string {
    const { metadata, type } = item;
    switch (type) {
      case 'part':
        return `Category: ${metadata.category || 'N/A'} | Type: ${metadata.partType || 'N/A'}`;
      case 'supplier':
        return `Country: ${metadata.country || 'N/A'} | Status: ${metadata.status || 'N/A'}`;
      case 'customer':
        return `Country: ${metadata.country || 'N/A'} | Type: ${metadata.type || 'N/A'}`;
      case 'product':
        return `Status: ${metadata.status || 'N/A'}`;
      default:
        return '';
    }
  }

  private formatLink(item: EmbeddingVector): string {
    switch (item.type) {
      case 'part':
        return `/inventory/${item.id}`;
      case 'supplier':
        return `/suppliers/${item.id}`;
      case 'customer':
        return `/customers/${item.id}`;
      case 'product':
        return `/bom/${item.id}`;
      default:
        return '#';
    }
  }

  // ===========================================================================
  // UTILITIES
  // ===========================================================================

  getStats(): { totalEmbeddings: number; byType: Record<string, number> } {
    const all = this.cache.getAll();
    const byType: Record<string, number> = {};

    all.forEach((item) => {
      byType[item.type] = (byType[item.type] || 0) + 1;
    });

    return {
      totalEmbeddings: all.length,
      byType,
    };
  }

  clearCache(): void {
    this.cache.clear();
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let embeddingServiceInstance: EmbeddingService | null = null;

export function getEmbeddingService(config?: Partial<EmbeddingConfig>): EmbeddingService {
  if (!embeddingServiceInstance) {
    embeddingServiceInstance = new EmbeddingService(config);
  }
  return embeddingServiceInstance;
}

export function resetEmbeddingService(): void {
  embeddingServiceInstance = null;
}

export default EmbeddingService;
