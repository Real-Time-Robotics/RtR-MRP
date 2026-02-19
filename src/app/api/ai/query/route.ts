import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/with-auth';
import { logger } from '@/lib/logger';
import { processNaturalLanguageQuery, getSupportedQueryTypes } from '@/lib/nl-query-engine';

import { checkHeavyEndpointLimit } from '@/lib/rate-limit';

const queryBodySchema = z.object({
  query: z.string(),
  language: z.enum(['en', 'vi']).optional(),
  userId: z.string().optional(),
});
// =============================================================================
// RTR AI COPILOT - NATURAL LANGUAGE QUERY API
// Processes natural language queries and returns structured data
// =============================================================================

// Rate limiting store
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

// Check rate limit
function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitStore.get(userId);
  
  if (!userLimit || userLimit.resetAt < now) {
    rateLimitStore.set(userId, { count: 1, resetAt: now + 60000 });
    return true;
  }
  
  if (userLimit.count >= 30) {
    return false;
  }
  
  userLimit.count++;
  return true;
}

// Audit log function
async function logQuery(
  _userId: string,
  _query: string,
  _result: unknown,
  _latencyMs: number
) {
  // In production, save to database or logging service
  // Audit logging disabled - implement database persistence as needed
}

// POST: Process natural language query
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

  const startTime = Date.now();
  
  try {
const rawBody = await request.json();
    const parseResult = queryBodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { query, language = 'en', userId = 'anonymous' } = parseResult.data;
    
    // Check query length
    if (query.length > 500) {
      return NextResponse.json(
        { error: 'Query too long (max 500 characters)' },
        { status: 400 }
      );
    }
    
    // Rate limiting
    if (!checkRateLimit(userId)) {
      return NextResponse.json(
        { 
          error: language === 'vi' 
            ? 'Quá nhiều yêu cầu. Vui lòng đợi một chút.'
            : 'Too many requests. Please wait a moment.',
        },
        { status: 429 }
      );
    }
    
    // Process query
    const result = await processNaturalLanguageQuery(query, language);
    
    // Audit logging
    const latencyMs = Date.now() - startTime;
    await logQuery(userId, query, result, latencyMs);
    
    return NextResponse.json({
      ...result,
      metadata: {
        ...result.metadata,
        executionTime: latencyMs,
      },
    });
    
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/ai/query' });
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error', code: 'AI_QUERY_ERROR',
        data: [],
        metadata: {
          rowCount: 0,
          executionTime: Date.now() - startTime,
          confidence: 0,
          explanation: 'An error occurred while processing your query',
          explanationVi: 'Đã xảy ra lỗi khi xử lý truy vấn của bạn',
        },
        suggestedFollowups: [],
      },
      { status: 500 }
    );
  }
});

// GET: Get supported query types and examples
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
const { searchParams } = new URL(request.url);
  const language = searchParams.get('language') || 'en';

  const queryTypes = getSupportedQueryTypes();
  
  return NextResponse.json({
    version: '1.0.0',
    supportedQueryTypes: queryTypes,
    examples: queryTypes.flatMap(qt => 
      qt.examples.map(ex => ({
        category: qt.intent,
        query: language === 'vi' ? ex.vi : ex.en,
      }))
    ),
    capabilities: [
      'inventory_queries',
      'sales_analysis',
      'supplier_performance',
      'production_status',
      'quality_metrics',
      'natural_language_processing',
      'vietnamese_support',
      'english_support',
    ],
    limits: {
      maxQueryLength: 500,
      rateLimit: '30 requests/minute',
    },
  });
});
