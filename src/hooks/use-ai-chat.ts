// =============================================================================
// AI CHAT HOOK
// React hook for AI assistant chat functionality
// =============================================================================

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { clientLogger } from '@/lib/client-logger';

// =============================================================================
// TYPES
// =============================================================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  provider?: string;
  intent?: string;
  isLoading?: boolean;
  isError?: boolean;
}

export interface UseChatOptions {
  apiEndpoint?: string;
  onError?: (error: string) => void;
  onSuccess?: (response: ChatMessage) => void;
  maxHistory?: number;
}

export interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (message: string) => Promise<void>;
  clearMessages: () => void;
  retryLastMessage: () => Promise<void>;
  providerStatus: {
    openai: boolean;
    anthropic: boolean;
  } | null;
  checkHealth: () => Promise<void>;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useAIChat(options: UseChatOptions = {}): UseChatReturn {
  const {
    apiEndpoint = '/api/ai/chat',
    onError,
    onSuccess,
    maxHistory = 50,
  } = options;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providerStatus, setProviderStatus] = useState<{
    openai: boolean;
    anthropic: boolean;
  } | null>(null);

  const lastUserMessageRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Generate unique message ID
  const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Convert messages to API format
  const messagesToApiFormat = (msgs: ChatMessage[]) => {
    return msgs
      .filter(m => !m.isLoading && !m.isError)
      .map(m => ({
        role: m.role,
        content: m.content,
      }));
  };

  // Send message to API
  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim() || isLoading) return;

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    lastUserMessageRef.current = message;
    setError(null);
    setIsLoading(true);

    // Add user message
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: message,
      timestamp: new Date(),
    };

    // Add loading placeholder
    const loadingMessage: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages(prev => {
      const newMessages = [...prev, userMessage, loadingMessage];
      // Limit history
      if (newMessages.length > maxHistory) {
        return newMessages.slice(-maxHistory);
      }
      return newMessages;
    });

    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          conversationHistory: messagesToApiFormat(messages),
        }),
        signal: abortControllerRef.current.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error ${response.status}`);
      }

      // Remove loading message and add real response
      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: data.response || 'Xin lỗi, tôi không thể xử lý yêu cầu này.',
        timestamp: new Date(),
        provider: data.provider,
        intent: data.intent,
      };

      setMessages(prev => {
        // Remove loading message and add real response
        const withoutLoading = prev.filter(m => !m.isLoading);
        return [...withoutLoading, assistantMessage];
      });

      if (onSuccess) {
        onSuccess(assistantMessage);
      }

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was cancelled, ignore
        return;
      }

      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);

      // Remove loading message and add error message
      const errorResponse: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: `Xin lỗi, đã có lỗi xảy ra: ${errorMessage}. Vui lòng thử lại.`,
        timestamp: new Date(),
        isError: true,
      };

      setMessages(prev => {
        const withoutLoading = prev.filter(m => !m.isLoading);
        return [...withoutLoading, errorResponse];
      });

      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [apiEndpoint, isLoading, maxHistory, messages, onError, onSuccess]);

  // Retry last message
  const retryLastMessage = useCallback(async () => {
    if (!lastUserMessageRef.current) return;

    // Remove the error message
    setMessages(prev => {
      const withoutError = prev.filter(m => !m.isError);
      // Also remove the last user message that failed
      return withoutError.slice(0, -1);
    });

    await sendMessage(lastUserMessageRef.current);
  }, [sendMessage]);

  // Clear all messages
  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    lastUserMessageRef.current = null;
  }, []);

  // Check provider health
  const checkHealth = useCallback(async () => {
    try {
      const response = await fetch(apiEndpoint, {
        method: 'GET',
      });
      
      if (response.ok) {
        const data = await response.json();
        setProviderStatus({
          openai: data.providers?.openai?.available || false,
          anthropic: data.providers?.anthropic?.available || false,
        });
      }
    } catch (err) {
      clientLogger.error('Health check failed', err);
    }
  }, [apiEndpoint]);

  // Check health on mount
  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    retryLastMessage,
    providerStatus,
    checkHealth,
  };
}

// =============================================================================
// QUICK ACTIONS PRESETS
// =============================================================================

export const AI_QUICK_ACTIONS = [
  {
    id: 'shortage',
    label: 'Vật tư thiếu',
    query: 'Những vật tư nào đang thiếu hụt nghiêm trọng?',
    icon: 'AlertTriangle',
    color: 'red',
  },
  {
    id: 'low_stock',
    label: 'Tồn kho thấp',
    query: 'Vật tư nào sắp hết trong 2 tuần tới?',
    icon: 'Package',
    color: 'amber',
  },
  {
    id: 'pending_orders',
    label: 'Đơn hàng chờ',
    query: 'Tổng hợp các đơn hàng đang chờ xử lý',
    icon: 'ShoppingCart',
    color: 'blue',
  },
  {
    id: 'production',
    label: 'Tiến độ SX',
    query: 'Tình trạng sản xuất hôm nay thế nào?',
    icon: 'Factory',
    color: 'purple',
  },
  {
    id: 'purchase',
    label: 'Đề xuất mua',
    query: 'Những vật tư nào cần đặt hàng gấp?',
    icon: 'Truck',
    color: 'green',
  },
  {
    id: 'analytics',
    label: 'Phân tích',
    query: 'Phân tích xu hướng doanh thu tháng này',
    icon: 'BarChart3',
    color: 'pink',
  },
] as const;

export default useAIChat;
