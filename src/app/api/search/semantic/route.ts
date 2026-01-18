// =============================================================================
// SEMANTIC SEARCH API
// POST /api/search/semantic
// Natural language search using embeddings
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getEmbeddingService } from '@/lib/ai/embedding-service';
import { globalSearch } from '@/lib/search-engine';

// =============================================================================
// TYPES
// =============================================================================

interface SearchRequest {
  query: string;
  types?: ('part' | 'supplier' | 'customer' | 'product')[];
  limit?: number;
  mode?: 'semantic' | 'keyword' | 'hybrid';
}

// =============================================================================
// RATE LIMITING
// =============================================================================

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 60;
const RATE_LIMIT_WINDOW = 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

// =============================================================================
// HYBRID SEARCH
// =============================================================================

async function hybridSearch(
  query: string,
  types?: ('part' | 'supplier' | 'customer' | 'product')[],
  limit: number = 10
) {
  const embeddingService = getEmbeddingService();

  // Run both searches in parallel
  const [semanticResults, keywordResults] = await Promise.all([
    embeddingService.semanticSearch(query, { types, limit, threshold: 0.2 }),
    globalSearch(query, limit),
  ]);

  // Merge and deduplicate results
  const seen = new Set<string>();
  const merged: any[] = [];

  // Add semantic results first (higher priority)
  semanticResults.forEach((result) => {
    const key = `${result.type}:${result.id}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push({
        ...result,
        source: 'semantic',
        relevanceScore: result.score,
      });
    }
  });

  // Add keyword results
  keywordResults.forEach((result) => {
    const key = `${result.type}:${result.id}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push({
        ...result,
        source: 'keyword',
        relevanceScore: 0.5, // Default score for keyword matches
      });
    }
  });

  // Sort by relevance and return
  return merged.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, limit);
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Parse request
    const body: SearchRequest = await request.json();
    const { query, types, limit = 10, mode = 'hybrid' } = body;

    if (!query || typeof query !== 'string' || query.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Query must be at least 2 characters' },
        { status: 400 }
      );
    }

    let results;

    switch (mode) {
      case 'semantic': {
        const embeddingService = getEmbeddingService();
        results = await embeddingService.semanticSearch(query, { types, limit });
        break;
      }
      case 'keyword': {
        results = await globalSearch(query, limit);
        break;
      }
      case 'hybrid':
      default: {
        results = await hybridSearch(query, types, limit);
        break;
      }
    }

    const latency = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      query,
      mode,
      count: results.length,
      results,
      latency,
    });
  } catch (error) {
    console.error('[Semantic Search] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Search failed',
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// GET - Index Status & Trigger
// =============================================================================

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');

  const embeddingService = getEmbeddingService();

  // Trigger indexing
  if (action === 'index') {
    try {
      const results = await embeddingService.indexAll();
      return NextResponse.json({
        success: true,
        message: 'Indexing completed',
        indexed: results,
      });
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Indexing failed',
        },
        { status: 500 }
      );
    }
  }

  // Return stats
  const stats = embeddingService.getStats();
  return NextResponse.json({
    success: true,
    stats,
  });
}
