/**
 * AI Chat & Query API Route Tests
 * Tests for POST/GET /api/ai/chat and POST/GET /api/ai/query
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

// Mock AI provider
const mockChat = vi.fn();
const mockHealthCheck = vi.fn();
const mockGetStats = vi.fn();

vi.mock('@/lib/ai/provider', () => ({
  getAIProvider: () => ({
    chat: mockChat,
    healthCheck: mockHealthCheck,
    getStats: mockGetStats,
  }),
  AIMessage: {},
}));

vi.mock('@/lib/ai/prompts', () => ({
  detectIntent: vi.fn().mockReturnValue({
    intent: 'inventory_query',
    confidence: 0.85,
    entities: {},
  }),
  buildPrompt: vi.fn().mockReturnValue([
    { role: 'system', content: 'You are an MRP assistant.' },
    { role: 'user', content: 'test message' },
  ]),
  RESPONSE_TEMPLATES: {
    help: 'Here are some things I can help you with...',
    error: 'Sorry, I encountered an error. Please try again.',
  },
}));

vi.mock('@/lib/ai/query-executor', () => ({
  getQueryExecutor: () => ({
    execute: vi.fn().mockResolvedValue({
      success: true,
      data: { items: [], total: 0 },
    }),
  }),
}));

vi.mock('@/lib/ai/response-generator', () => ({
  generateStructuredResponse: vi.fn().mockReturnValue({
    type: 'inventory',
    data: {},
    actions: [{ id: 'action-1', label: 'View inventory', url: '/inventory' }],
  }),
}));

vi.mock('@/lib/ai/rag-knowledge-service', () => ({
  getRAGKnowledgeService: () => ({
    retrieveContext: vi.fn().mockResolvedValue({ chunks: [] }),
    buildContextPrompt: vi.fn().mockReturnValue(''),
  }),
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkReadEndpointLimit: vi.fn().mockResolvedValue(null),
  checkWriteEndpointLimit: vi.fn().mockResolvedValue(null),
  checkHeavyEndpointLimit: vi.fn().mockResolvedValue({ success: true, limit: 100, remaining: 99, retryAfter: 0 }),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    logError: vi.fn(),
  },
}));

// Mock NL query engine for /api/ai/query
const mockProcessNLQuery = vi.fn();
const mockGetSupportedQueryTypes = vi.fn();

vi.mock('@/lib/nl-query-engine', () => ({
  processNaturalLanguageQuery: (...args: unknown[]) => mockProcessNLQuery(...args),
  getSupportedQueryTypes: (...args: unknown[]) => mockGetSupportedQueryTypes(...args),
}));

// Import routes after mocks
import { POST as CHAT_POST, GET as CHAT_GET } from '../ai/chat/route';
import { POST as QUERY_POST, GET as QUERY_GET } from '../ai/query/route';

// Mock context for withAuth wrapper (Next.js 15 async params)
const mockContext = { params: Promise.resolve({}) };

describe('AI Chat API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
  });

  // ===========================================================================
  // POST /api/ai/chat
  // ===========================================================================
  describe('POST /api/ai/chat', () => {
    it('should return 400 when message is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const response = await CHAT_POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Message is required');
    });

    it('should return 400 when message is not a string', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message: 123 }),
      });
      const response = await CHAT_POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid input');
    });

    it('should process a chat message successfully', async () => {
      mockChat.mockResolvedValue({
        content: 'You have 50 items in stock.',
        provider: 'openai',
        model: 'gpt-4',
      });

      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message: 'How many items are in stock?' }),
      });
      const response = await CHAT_POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.response).toBe('You have 50 items in stock.');
      expect(data.provider).toBe('openai');
      expect(data.model).toBe('gpt-4');
      expect(data.intent).toBe('inventory_query');
      expect(data.confidence).toBe(0.85);
      expect(data.latency).toBeDefined();
      expect(typeof data.latency).toBe('number');
    });

    it('should support legacy query field', async () => {
      mockChat.mockResolvedValue({
        content: 'Response to legacy query',
        provider: 'openai',
        model: 'gpt-4',
      });

      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ query: 'What is current production?' }),
      });
      const response = await CHAT_POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.response).toBe('Response to legacy query');
    });

    it('should return help response for help intent', async () => {
      // Override detectIntent for this test
      const { detectIntent } = await import('@/lib/ai/prompts');
      (detectIntent as Mock).mockReturnValueOnce({
        intent: 'help',
        confidence: 0.99,
        entities: {},
      });

      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message: 'help' }),
      });
      const response = await CHAT_POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.intent).toBe('help');
      expect(data.response).toContain('help you with');
      // Should NOT call AI provider for help
      expect(mockChat).not.toHaveBeenCalled();
    });

    it('should include structured response and actions', async () => {
      mockChat.mockResolvedValue({
        content: 'Here is your inventory data.',
        provider: 'openai',
        model: 'gpt-4',
      });

      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message: 'Show me inventory' }),
      });
      const response = await CHAT_POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.structured).toBeDefined();
      expect(data.actions).toBeDefined();
      expect(Array.isArray(data.actions)).toBe(true);
    });

    it('should handle AI provider errors gracefully', async () => {
      mockChat.mockRejectedValue(new Error('Provider timeout'));

      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message: 'Check inventory levels' }),
      });
      const response = await CHAT_POST(request, mockContext);
      const data = await response.json();

      // The route returns a fallback error response (not a 500 status)
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to process chat request');
      expect(data.response).toBeDefined(); // Fallback response template
    });

    it('should handle conversation history', async () => {
      mockChat.mockResolvedValue({
        content: 'Continuing the conversation.',
        provider: 'openai',
        model: 'gpt-4',
      });

      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Tell me more about that',
          conversationHistory: [
            { role: 'user', content: 'What is our top selling product?' },
            { role: 'assistant', content: 'Your top product is Widget A.' },
          ],
        }),
      });
      const response = await CHAT_POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockChat).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.7,
          maxTokens: 2048,
        })
      );
    });
  });

  // ===========================================================================
  // GET /api/ai/chat (Health Check)
  // ===========================================================================
  describe('GET /api/ai/chat', () => {
    it('should return health status when providers are healthy', async () => {
      mockHealthCheck.mockResolvedValue({
        openai: { available: true, latency: 120 },
        anthropic: { available: true, latency: 95 },
      });
      mockGetStats.mockReturnValue({
        totalRequests: 100,
        avgLatency: 200,
      });

      const request = new NextRequest('http://localhost:3000/api/ai/chat');
      const response = await CHAT_GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.status).toBe('healthy');
      expect(data.providers).toBeDefined();
      expect(data.stats).toBeDefined();
      expect(data.timestamp).toBeDefined();
    });

    it('should return 500 when health check fails', async () => {
      mockHealthCheck.mockRejectedValue(new Error('Health check failed'));

      const request = new NextRequest('http://localhost:3000/api/ai/chat');
      const response = await CHAT_GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.status).toBe('unhealthy');
      expect(data.error).toBe('Failed to fetch AI health status');
    });
  });
});

// ===========================================================================
// AI Query API
// ===========================================================================
describe('AI Query API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
  });

  // ===========================================================================
  // POST /api/ai/query
  // ===========================================================================
  describe('POST /api/ai/query', () => {
    it('should return 400 when query is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/query', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const response = await QUERY_POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid input');
    });

    it('should return 400 when query is not a string', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/query', {
        method: 'POST',
        body: JSON.stringify({ query: 42 }),
      });
      const response = await QUERY_POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid input');
    });

    it('should return 400 when query exceeds 500 characters', async () => {
      const longQuery = 'a'.repeat(501);
      const request = new NextRequest('http://localhost:3000/api/ai/query', {
        method: 'POST',
        body: JSON.stringify({ query: longQuery }),
      });
      const response = await QUERY_POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Query too long (max 500 characters)');
    });

    it('should process a natural language query successfully', async () => {
      const mockResult = {
        success: true,
        data: [
          { partNumber: 'PN-001', name: 'Widget', quantity: 100 },
        ],
        metadata: {
          rowCount: 1,
          confidence: 0.92,
          explanation: 'Found 1 part matching your query.',
        },
        suggestedFollowups: ['Show me reorder levels'],
      };
      mockProcessNLQuery.mockResolvedValue(mockResult);

      const request = new NextRequest('http://localhost:3000/api/ai/query', {
        method: 'POST',
        body: JSON.stringify({ query: 'Show me parts with low stock' }),
      });
      const response = await QUERY_POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.metadata).toBeDefined();
      expect(data.metadata.executionTime).toBeDefined();
      expect(typeof data.metadata.executionTime).toBe('number');
      expect(mockProcessNLQuery).toHaveBeenCalledWith(
        'Show me parts with low stock',
        'en'
      );
    });

    it('should support Vietnamese language', async () => {
      mockProcessNLQuery.mockResolvedValue({
        success: true,
        data: [],
        metadata: { rowCount: 0, confidence: 0.8 },
        suggestedFollowups: [],
      });

      const request = new NextRequest('http://localhost:3000/api/ai/query', {
        method: 'POST',
        body: JSON.stringify({
          query: 'Cho toi xem hang ton kho',
          language: 'vi',
        }),
      });
      const response = await QUERY_POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockProcessNLQuery).toHaveBeenCalledWith(
        'Cho toi xem hang ton kho',
        'vi'
      );
    });

    it('should return 500 with structured error when processing fails', async () => {
      mockProcessNLQuery.mockRejectedValue(new Error('NLP processing error'));

      const request = new NextRequest('http://localhost:3000/api/ai/query', {
        method: 'POST',
        body: JSON.stringify({ query: 'Show me inventory' }),
      });
      const response = await QUERY_POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal server error');
      expect(data.data).toEqual([]);
      expect(data.metadata.rowCount).toBe(0);
      expect(data.metadata.confidence).toBe(0);
      expect(data.suggestedFollowups).toEqual([]);
    });

    it('should accept exactly 500 characters', async () => {
      const exactQuery = 'a'.repeat(500);
      mockProcessNLQuery.mockResolvedValue({
        success: true,
        data: [],
        metadata: { rowCount: 0 },
        suggestedFollowups: [],
      });

      const request = new NextRequest('http://localhost:3000/api/ai/query', {
        method: 'POST',
        body: JSON.stringify({ query: exactQuery }),
      });
      const response = await QUERY_POST(request, mockContext);

      expect(response.status).toBe(200);
    });
  });

  // ===========================================================================
  // GET /api/ai/query
  // ===========================================================================
  describe('GET /api/ai/query', () => {
    it('should return supported query types and capabilities', async () => {
      mockGetSupportedQueryTypes.mockReturnValue([
        {
          intent: 'inventory_query',
          examples: [
            { en: 'Show me low stock items', vi: 'Cho toi xem hang ton kho thap' },
          ],
        },
        {
          intent: 'sales_analysis',
          examples: [
            { en: 'Show me top selling products', vi: 'San pham ban chay nhat' },
          ],
        },
      ]);

      const request = new NextRequest('http://localhost:3000/api/ai/query');
      const response = await QUERY_GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.version).toBe('1.0.0');
      expect(data.supportedQueryTypes).toHaveLength(2);
      expect(data.examples).toBeDefined();
      expect(data.capabilities).toContain('inventory_queries');
      expect(data.capabilities).toContain('vietnamese_support');
      expect(data.limits.maxQueryLength).toBe(500);
      expect(data.limits.rateLimit).toBe('30 requests/minute');
    });

    it('should return Vietnamese examples when language=vi', async () => {
      mockGetSupportedQueryTypes.mockReturnValue([
        {
          intent: 'inventory_query',
          examples: [
            { en: 'Show me low stock items', vi: 'Cho toi xem hang ton kho thap' },
          ],
        },
      ]);

      const request = new NextRequest('http://localhost:3000/api/ai/query?language=vi');
      const response = await QUERY_GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.examples[0].query).toBe('Cho toi xem hang ton kho thap');
    });

    it('should return English examples by default', async () => {
      mockGetSupportedQueryTypes.mockReturnValue([
        {
          intent: 'inventory_query',
          examples: [
            { en: 'Show me low stock items', vi: 'Cho toi xem hang ton kho thap' },
          ],
        },
      ]);

      const request = new NextRequest('http://localhost:3000/api/ai/query');
      const response = await QUERY_GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.examples[0].query).toBe('Show me low stock items');
    });
  });
});
