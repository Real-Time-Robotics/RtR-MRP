// =============================================================================
// AUTO-PO API - Main endpoint
// POST: Generate PO suggestions, GET: Get suggestions by part
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { withAuth } from '@/lib/api/with-auth';
import {
  getPOSuggestionEngine,
  getAIPOAnalyzer,
  POSuggestion,
  EnhancedPOSuggestion,
} from '@/lib/ai/autonomous';
import { approvalQueueService } from '@/lib/ai/autonomous/approval-queue-service';

import { checkHeavyEndpointLimit } from '@/lib/rate-limit';

const autoPOBodySchema = z.object({
  partIds: z.array(z.string()).optional(),
  autoAddToQueue: z.boolean().optional(),
  includeAIEnhancement: z.boolean().optional(),
  filters: z.object({
    minConfidence: z.number().optional(),
    maxSuggestions: z.number().optional(),
    excludePartIds: z.array(z.string()).optional(),
  }).optional(),
});
export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkHeavyEndpointLimit(request);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter || 60),
            'X-RateLimit-Limit': String(rateLimitResult.limit),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          },
        }
      );
    }

  try {
const rawBody = await request.json();
    const parseResult = autoPOBodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const {
      partIds,
      autoAddToQueue = true,
      includeAIEnhancement = true,
      filters,
    } = parseResult.data;

    const engine = getPOSuggestionEngine();
    const analyzer = getAIPOAnalyzer();

    let suggestions: (POSuggestion | EnhancedPOSuggestion)[] = [];

    if (partIds && partIds.length > 0) {
      // Generate suggestions for specific parts
      for (const partId of partIds) {
        const suggestion = await engine.generatePOSuggestion(partId);
        if (suggestion) {
          if (includeAIEnhancement) {
            const enhanced = await analyzer.enhanceSuggestion(suggestion);
            suggestions.push(enhanced);
          } else {
            suggestions.push(suggestion);
          }
        }
      }
    } else {
      // Batch generate suggestions based on reorder detection
      const batchSuggestions = await engine.batchGenerateSuggestions();

      // Apply filters
      let filtered = batchSuggestions;
      if (filters?.minConfidence) {
        filtered = filtered.filter(
          (s: POSuggestion) => s.confidenceScore >= (filters.minConfidence ?? 0)
        );
      }
      if (filters?.maxSuggestions) {
        filtered = filtered.slice(0, filters.maxSuggestions);
      }
      if (filters?.excludePartIds) {
        filtered = filtered.filter(
          (s: POSuggestion) => !(filters.excludePartIds ?? []).includes(s.partId)
        );
      }

      suggestions = filtered;

      // Enhance with AI if requested
      if (includeAIEnhancement) {
        suggestions = await Promise.all(
          suggestions.map((s: POSuggestion) => analyzer.enhanceSuggestion(s))
        );
      }
    }

    // Add to approval queue if requested
    const queueItems: Array<{ id: string }> = [];
    if (autoAddToQueue && suggestions.length > 0) {
      for (const suggestion of suggestions) {
        try {
          const queueItem = await approvalQueueService.addToQueue(
            suggestion as EnhancedPOSuggestion,
            session.user?.id || 'system'
          );
          queueItems.push(queueItem);
        } catch (error) {
          logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/ai/auto-po', detail: 'Failed to add suggestion to queue' });
        }
      }
    }

    // Calculate summary
    const getConfidence = (s: POSuggestion | EnhancedPOSuggestion) =>
      s.confidenceScore || 0;
    const getAmount = (s: POSuggestion | EnhancedPOSuggestion) =>
      s.totalAmount || 0;

    return NextResponse.json({
      success: true,
      suggestions,
      addedToQueue: queueItems.length,
      queueItemIds: queueItems.map((q) => q.id),
      summary: {
        total: suggestions.length,
        highConfidence: suggestions.filter((s) => getConfidence(s) >= 0.8).length,
        mediumConfidence: suggestions.filter(
          (s) => getConfidence(s) >= 0.6 && getConfidence(s) < 0.8
        ).length,
        lowConfidence: suggestions.filter((s) => getConfidence(s) < 0.6).length,
        totalValue: suggestions.reduce((sum, s) => sum + getAmount(s), 0),
      },
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/ai/auto-po' });
    return NextResponse.json(
      {
        error: 'Failed to generate PO suggestions',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
});

export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkHeavyEndpointLimit(request);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter || 60),
            'X-RateLimit-Limit': String(rateLimitResult.limit),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          },
        }
      );
    }

  try {
const { searchParams } = new URL(request.url);
    const partId = searchParams.get('partId');

    if (!partId) {
      return NextResponse.json(
        { error: 'partId is required' },
        { status: 400 }
      );
    }

    const engine = getPOSuggestionEngine();
    const analyzer = getAIPOAnalyzer();

    // Generate suggestion for specific part
    const suggestion = await engine.generatePOSuggestion(partId);

    if (!suggestion) {
      return NextResponse.json({
        success: true,
        suggestion: null,
        message: 'No reorder needed for this part',
      });
    }

    // Enhance with AI analysis
    const enhanced = await analyzer.enhanceSuggestion(suggestion);

    return NextResponse.json({
      success: true,
      suggestion: enhanced,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/ai/auto-po' });
    return NextResponse.json(
      { error: 'Failed to get PO suggestion' },
      { status: 500 }
    );
  }
});
