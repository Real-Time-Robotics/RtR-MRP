// =============================================================================
// RAG KNOWLEDGE API
// Endpoints for knowledge base management and RAG queries
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { auth } from '@/lib/auth';
import { getRAGKnowledgeService, KnowledgeType } from '@/lib/ai/rag-knowledge-service';

// =============================================================================
// GET: Get knowledge stats or search
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const ragService = getRAGKnowledgeService();

    // Get stats
    if (action === 'stats') {
      const stats = ragService.getStats();
      return NextResponse.json({
        success: true,
        data: stats,
      });
    }

    // Search knowledge
    if (action === 'search') {
      const query = searchParams.get('q');
      if (!query) {
        return NextResponse.json({ error: 'Query required' }, { status: 400 });
      }

      const typesParam = searchParams.get('types');
      const types = typesParam ? typesParam.split(',') as KnowledgeType[] : undefined;
      const limit = parseInt(searchParams.get('limit') || '10');

      const results = await ragService.searchKnowledge(query, { types, limit });

      return NextResponse.json({
        success: true,
        query,
        count: results.length,
        results,
      });
    }

    // Get context for a query
    if (action === 'context') {
      const query = searchParams.get('q');
      if (!query) {
        return NextResponse.json({ error: 'Query required' }, { status: 400 });
      }

      const typesParam = searchParams.get('types');
      const types = typesParam ? typesParam.split(',') as KnowledgeType[] : undefined;
      const limit = parseInt(searchParams.get('limit') || '5');

      const context = await ragService.retrieveContext(query, { types, limit });
      const contextPrompt = ragService.buildContextPrompt(context);

      return NextResponse.json({
        success: true,
        query,
        context: {
          chunksCount: context.chunks.length,
          totalRelevance: context.totalRelevance,
          sources: context.sources,
          chunks: context.chunks.map(c => ({
            id: c.id,
            type: c.type,
            title: c.title,
            content: c.content.substring(0, 300) + (c.content.length > 300 ? '...' : ''),
            metadata: c.metadata,
          })),
        },
        contextPrompt,
      });
    }

    // Default: return stats
    const stats = ragService.getStats();
    return NextResponse.json({
      success: true,
      data: stats,
    });

  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/ai/knowledge' });
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST: Index knowledge or query RAG
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;
    const ragService = getRAGKnowledgeService();

    // Index all knowledge
    if (action === 'index_all') {
      logger.info('Starting full knowledge base index');
      const startTime = Date.now();

      const results = await ragService.indexAll();

      const duration = Date.now() - startTime;
      logger.info('Knowledge base index completed', { durationMs: duration });

      return NextResponse.json({
        success: true,
        message: 'Knowledge base indexed successfully',
        indexed: results,
        duration: `${duration}ms`,
        stats: ragService.getStats(),
      });
    }

    // Index specific type
    if (action === 'index') {
      const { type } = body;
      let count = 0;

      switch (type) {
        case 'parts':
          count = await ragService.indexParts();
          break;
        case 'suppliers':
          count = await ragService.indexSuppliers();
          break;
        case 'customers':
          count = await ragService.indexCustomers();
          break;
        case 'boms':
          count = await ragService.indexBOMs();
          break;
        case 'orders':
          count = await ragService.indexOrders();
          break;
        case 'compliance':
          count = await ragService.indexComplianceKnowledge();
          break;
        default:
          return NextResponse.json(
            { error: `Unknown type: ${type}` },
            { status: 400 }
          );
      }

      return NextResponse.json({
        success: true,
        message: `Indexed ${count} ${type}`,
        count,
        stats: ragService.getStats(),
      });
    }

    // RAG query - retrieve context for AI
    if (action === 'query') {
      const { query, types, limit = 5, threshold = 0.25 } = body;

      if (!query) {
        return NextResponse.json({ error: 'Query required' }, { status: 400 });
      }

      const context = await ragService.retrieveContext(query, {
        types,
        limit,
        threshold,
      });

      const contextPrompt = ragService.buildContextPrompt(context);

      return NextResponse.json({
        success: true,
        query,
        context: {
          chunksCount: context.chunks.length,
          totalRelevance: context.totalRelevance,
          sources: context.sources,
          chunks: context.chunks.map(c => ({
            id: c.id,
            type: c.type,
            title: c.title,
            contentPreview: c.content.substring(0, 200),
            metadata: c.metadata,
          })),
        },
        contextPrompt,
      });
    }

    return NextResponse.json(
      { error: `Unknown action: ${action}` },
      { status: 400 }
    );

  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/ai/knowledge' });
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
