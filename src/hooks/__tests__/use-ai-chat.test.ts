import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock client-logger
vi.mock('@/lib/client-logger', () => ({
  clientLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { useAIChat, AI_QUICK_ACTIONS } from '../use-ai-chat';

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockReset();
});

// =============================================================================
// TESTS
// =============================================================================

describe('useAIChat', () => {
  describe('initialization', () => {
    it('should initialize with empty messages', () => {
      // Mock the health check GET call
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ providers: { openai: { available: true }, anthropic: { available: false } } }),
      });

      const { result } = renderHook(() => useAIChat());

      expect(result.current.messages).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should check health on mount', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          providers: {
            openai: { available: true },
            anthropic: { available: true },
          },
        }),
      });

      const { result } = renderHook(() => useAIChat());

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/ai/chat', { method: 'GET' });
      });

      await waitFor(() => {
        expect(result.current.providerStatus).toEqual({
          openai: true,
          anthropic: true,
        });
      });
    });

    it('should use custom API endpoint', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ providers: {} }),
      });

      renderHook(() => useAIChat({ apiEndpoint: '/api/custom-chat' }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/custom-chat', { method: 'GET' });
      });
    });
  });

  describe('sendMessage', () => {
    it('should not send empty messages', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ providers: {} }),
      });

      const { result } = renderHook(() => useAIChat());

      await act(async () => {
        await result.current.sendMessage('');
      });

      // Only the health check call should have been made
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should not send whitespace-only messages', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ providers: {} }),
      });

      const { result } = renderHook(() => useAIChat());

      await act(async () => {
        await result.current.sendMessage('   ');
      });

      expect(mockFetch).toHaveBeenCalledTimes(1); // only health check
    });

    it('should add user and assistant messages on successful response', async () => {
      // First call: health check, second call: chat
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ providers: {} }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            response: 'AI response here',
            provider: 'openai',
            intent: 'inventory_query',
          }),
        });

      const { result } = renderHook(() => useAIChat());

      await act(async () => {
        await result.current.sendMessage('Hello AI');
      });

      await waitFor(() => {
        expect(result.current.messages).toHaveLength(2);
      });

      const userMsg = result.current.messages[0];
      const assistantMsg = result.current.messages[1];

      expect(userMsg.role).toBe('user');
      expect(userMsg.content).toBe('Hello AI');
      expect(assistantMsg.role).toBe('assistant');
      expect(assistantMsg.content).toBe('AI response here');
      expect(assistantMsg.provider).toBe('openai');
      expect(assistantMsg.intent).toBe('inventory_query');
    });

    it('should handle API error response', async () => {
      const onError = vi.fn();

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ providers: {} }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ error: 'Server error' }),
        });

      const { result } = renderHook(() => useAIChat({ onError }));

      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Server error');
      });

      expect(onError).toHaveBeenCalledWith('Server error');

      // Should have error message in messages
      const errorMsg = result.current.messages.find(m => m.isError);
      expect(errorMsg).toBeDefined();
    });

    it('should handle fetch network error', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ providers: {} }),
        })
        .mockRejectedValueOnce(new Error('Network failed'));

      const { result } = renderHook(() => useAIChat());

      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Network failed');
      });
    });

    it('should call onSuccess callback on successful response', async () => {
      const onSuccess = vi.fn();

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ providers: {} }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ response: 'Success response' }),
        });

      const { result } = renderHook(() => useAIChat({ onSuccess }));

      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(
          expect.objectContaining({
            role: 'assistant',
            content: 'Success response',
          })
        );
      });
    });
  });

  describe('clearMessages', () => {
    it('should clear all messages and error state', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ providers: {} }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ response: 'Hi' }),
        });

      const { result } = renderHook(() => useAIChat());

      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      await waitFor(() => {
        expect(result.current.messages.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.clearMessages();
      });

      expect(result.current.messages).toEqual([]);
      expect(result.current.error).toBeNull();
    });
  });

  describe('retryLastMessage', () => {
    it('should do nothing when there is no last message', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ providers: {} }),
      });

      const { result } = renderHook(() => useAIChat());

      await act(async () => {
        await result.current.retryLastMessage();
      });

      // No additional fetch calls beyond health check
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('checkHealth', () => {
    it('should handle health check failure gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Health check failed'));

      const { result } = renderHook(() => useAIChat());

      await waitFor(() => {
        expect(result.current.providerStatus).toBeNull();
      });
    });

    it('should handle non-ok response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({}),
      });

      const { result } = renderHook(() => useAIChat());

      await waitFor(() => {
        expect(result.current.providerStatus).toBeNull();
      });
    });
  });

  describe('AI_QUICK_ACTIONS', () => {
    it('should export predefined quick actions', () => {
      expect(AI_QUICK_ACTIONS).toBeDefined();
      expect(AI_QUICK_ACTIONS.length).toBeGreaterThan(0);

      for (const action of AI_QUICK_ACTIONS) {
        expect(action).toHaveProperty('id');
        expect(action).toHaveProperty('label');
        expect(action).toHaveProperty('query');
        expect(action).toHaveProperty('icon');
        expect(action).toHaveProperty('color');
      }
    });

    it('should include shortage and low_stock actions', () => {
      const ids = AI_QUICK_ACTIONS.map(a => a.id);
      expect(ids).toContain('shortage');
      expect(ids).toContain('low_stock');
      expect(ids).toContain('pending_orders');
      expect(ids).toContain('production');
      expect(ids).toContain('purchase');
      expect(ids).toContain('analytics');
    });
  });
});
