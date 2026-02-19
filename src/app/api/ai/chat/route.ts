// =============================================================================
// AI CHAT API ROUTE
// POST /api/ai/chat
// Handles AI assistant chat requests with auto-fallback between providers
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/with-auth';
import { logger } from '@/lib/logger';
import { getAIProvider, AIMessage } from '@/lib/ai/provider';
import { detectIntent, buildPrompt, RESPONSE_TEMPLATES } from '@/lib/ai/prompts';
import { getQueryExecutor } from '@/lib/ai/query-executor';
import { generateStructuredResponse, StructuredResponse, AIAction } from '@/lib/ai/response-generator';
import { getRAGKnowledgeService } from '@/lib/ai/rag-knowledge-service';

import { checkHeavyEndpointLimit } from '@/lib/rate-limit';

const chatBodySchema = z.object({
  message: z.string().optional(),
  query: z.string().optional(),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
  })).optional(),
  history: z.array(z.object({
    role: z.string(),
    content: z.string(),
  })).optional(),
  context: z.string().optional(),
  preferredProvider: z.enum(['openai', 'anthropic']).optional(),
});
// =============================================================================
// TYPES
// =============================================================================

interface ChatRequest {
  message?: string;
  query?: string; // Legacy support for old AI Copilot
  conversationHistory?: AIMessage[];
  history?: Array<{ role: string; content: string }>; // Legacy support
  context?: string; // Legacy support
  preferredProvider?: 'openai' | 'anthropic';
}

interface ChatResponse {
  success: boolean;
  response?: string;
  provider?: string;
  model?: string;
  intent?: string;
  confidence?: number;
  latency?: number;
  error?: string;
  // Structured response data
  structured?: StructuredResponse;
  actions?: AIAction[];
}

// =============================================================================
// RATE LIMITING (Simple in-memory)
// =============================================================================

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 30; // requests per minute
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

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
// MAIN HANDLER
// =============================================================================

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
// Rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
        },
        { status: 429 }
      );
    }

    // Parse request
    const rawBody = await request.json();
    const parseResult = chatBodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { message, query, conversationHistory, history, context, preferredProvider } = parseResult.data;

    // Support both new format (message) and legacy format (query)
    const userMessage = message || query;

    if (!userMessage || typeof userMessage !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Message is required',
        },
        { status: 400 }
      );
    }

    // Convert legacy history format if needed
    const chatHistory = conversationHistory || (history?.map(h => ({
      role: h.role as 'user' | 'assistant' | 'system',
      content: h.content,
    })) || []);

    // Detect intent from message
    const detectedIntent = detectIntent(userMessage);

    // Handle help intent directly
    if (detectedIntent.intent === 'help') {
      const helpStructured = generateStructuredResponse(detectedIntent, {});
      return NextResponse.json({
        success: true,
        response: RESPONSE_TEMPLATES.help,
        message: RESPONSE_TEMPLATES.help, // Legacy support
        intent: 'help',
        confidence: detectedIntent.confidence,
        latency: Date.now() - startTime,
        structured: helpStructured,
        actions: helpStructured.actions,
      });
    }

    // Fetch relevant data based on intent
    const queryExecutor = getQueryExecutor();
    const queryResult = await queryExecutor.execute(detectedIntent);

    if (!queryResult.success) {
      // Query execution failed silently - will use fallback response
    }

    // Retrieve RAG knowledge context
    let ragContext = '';
    try {
      const ragService = getRAGKnowledgeService();
      const ragResult = await ragService.retrieveContext(userMessage, {
        limit: 5,
        threshold: 0.25,
      });
      if (ragResult.chunks.length > 0) {
        ragContext = ragService.buildContextPrompt(ragResult);
      }
    } catch (ragError) {
      logger.warn('RAG context retrieval failed', { context: 'POST /api/ai/chat', error: String(ragError) });
      // Continue without RAG context
    }

    // Generate structured response with actions and alerts
    const structuredResponse = generateStructuredResponse(
      detectedIntent,
      queryResult.data || {}
    );

    // Build prompt with context (including RAG)
    const messages = buildPrompt({
      intent: detectedIntent.intent,
      query: userMessage,
      data: queryResult.data,
      context: context, // Legacy context support
      ragContext: ragContext || undefined,
    });

    // Add conversation history if provided
    if (chatHistory && chatHistory.length > 0) {
      // Insert history after system message
      const systemMsg = messages.shift();
      if (systemMsg) {
        messages.unshift(systemMsg);
      }
      // Add last few messages from history (limit to prevent token overflow)
      const recentHistory = chatHistory.slice(-6);
      messages.splice(1, 0, ...recentHistory);
    }

    // Get AI provider and make request
    const aiProvider = getAIProvider();
    
    // Make the AI request
    const aiResponse = await aiProvider.chat({
      messages,
      temperature: 0.7,
      maxTokens: 2048,
      provider: preferredProvider,
    });

    const totalLatency = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      response: aiResponse.content,
      message: aiResponse.content, // Legacy support
      provider: aiResponse.provider,
      model: aiResponse.model,
      intent: detectedIntent.intent,
      confidence: detectedIntent.confidence,
      latency: totalLatency,
      // Structured response data for rich UI
      structured: structuredResponse,
      actions: structuredResponse.actions,
    });

  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/ai/chat' });

    // Check if it's a provider error
    // Return friendly error with fallback response
    return NextResponse.json({
      success: false,
      response: RESPONSE_TEMPLATES.error,
      message: RESPONSE_TEMPLATES.error, // Legacy support
      error: 'Failed to process chat request',
      latency: Date.now() - startTime,
    });
  }
});

// =============================================================================
// GET - Health Check
// =============================================================================

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
const aiProvider = getAIProvider();
    const health = await aiProvider.healthCheck();
    const stats = aiProvider.getStats();

    return NextResponse.json({
      success: true,
      status: 'healthy',
      providers: health,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        status: 'unhealthy',
        error: 'Failed to fetch AI health status',
      },
      { status: 500 }
    );
  }
});
