// =============================================================================
// AI CHAT API ROUTE
// POST /api/ai/chat
// Handles AI assistant chat requests with auto-fallback between providers
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getAIProvider, AIMessage } from '@/lib/ai/provider';
import { detectIntent, buildPrompt, RESPONSE_TEMPLATES } from '@/lib/ai/prompts';
import { getQueryExecutor } from '@/lib/ai/query-executor';

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
  latency?: number;
  error?: string;
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

export async function POST(request: NextRequest): Promise<NextResponse<ChatResponse>> {
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
    const body: ChatRequest = await request.json();
    const { message, query, conversationHistory, history, context, preferredProvider } = body;

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
      return NextResponse.json({
        success: true,
        response: RESPONSE_TEMPLATES.help,
        message: RESPONSE_TEMPLATES.help, // Legacy support
        intent: 'help',
        confidence: detectedIntent.confidence,
        latency: Date.now() - startTime,
      });
    }

    // Fetch relevant data based on intent
    const queryExecutor = getQueryExecutor();
    const queryResult = await queryExecutor.execute(detectedIntent);

    if (!queryResult.success) {
      // Query execution failed silently - will use fallback response
    }

    // Build prompt with context
    const messages = buildPrompt({
      intent: detectedIntent.intent,
      query: userMessage,
      data: queryResult.data,
      context: context, // Legacy context support
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
    });

  } catch (error) {
    console.error('[AI Chat] Error:', error);

    // Check if it's a provider error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Return friendly error with fallback response
    return NextResponse.json({
      success: false,
      response: RESPONSE_TEMPLATES.error,
      message: RESPONSE_TEMPLATES.error, // Legacy support
      error: errorMessage,
      latency: Date.now() - startTime,
    });
  }
}

// =============================================================================
// GET - Health Check
// =============================================================================

export async function GET(): Promise<NextResponse> {
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
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
