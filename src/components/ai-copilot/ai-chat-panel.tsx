'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageSquare, X, Bot, Sparkles,
  RefreshCw, Minimize2, Maximize2,
} from 'lucide-react';
import { clientLogger } from '@/lib/client-logger';

// Import sub-components
import { ChatMessageEmbedded, ChatMessageStandalone } from './chat/chat-message';
import { ChatInput } from './chat/chat-input';
import { ChatContextEmbedded, ChatContextStandalone } from './chat/chat-context';
import type { AIMessage, AIAction, AIChatPanelProps } from './chat/chat-types';

// Re-export types for backward compatibility
export type { AIMessage, AIAction, AIContext, AIChatPanelProps, ResponseAlert } from './chat/chat-types';
export { QUICK_SUGGESTIONS } from './chat/chat-types';
export { renderMessageContent, ConfidenceIndicator, ActionButton } from './chat/chat-message';

// Main Chat Panel Component
export default function AIChatPanel({
  context,
  isOpen,
  onClose,
  onActionExecute,
  position = 'right',
  embedded = false
}: AIChatPanelProps) {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  // Send message
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: AIMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setShowSuggestions(false);

    // Add loading message
    const loadingMessage: AIMessage = {
      id: `loading_${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };
    setMessages(prev => [...prev, loadingMessage]);

    try {
      // Call AI API
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content.trim(),
          context: context ? JSON.stringify(context) : undefined,
          conversationHistory: messages
            .filter(m => !m.isLoading)
            .slice(-10)
            .map(m => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await response.json();

      // Remove loading message and add response
      setMessages(prev => {
        const filtered = prev.filter(m => !m.isLoading);
        return [...filtered, {
          id: `msg_${Date.now()}`,
          role: 'assistant',
          content: data.response || data.message,
          timestamp: new Date(),
          confidence: data.confidence,
          suggestedActions: data.actions || data.suggestedActions,
          dataUsed: data.dataUsed,
          warnings: data.warnings,
          // New structured response data
          alerts: data.structured?.alerts,
          relatedQueries: data.structured?.relatedQueries,
        }];
      });

    } catch (error) {
      clientLogger.error('Chat error', error);
      setMessages(prev => {
        const filtered = prev.filter(m => !m.isLoading);
        return [...filtered, {
          id: `msg_${Date.now()}`,
          role: 'assistant',
          content: context.language === 'vi'
            ? 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.'
            : 'Sorry, an error occurred. Please try again.',
          timestamp: new Date(),
          confidence: 0,
        }];
      });
    } finally {
      setIsLoading(false);
    }
  }, [context, messages, isLoading]);

  // Listen for custom events from Context Card
  useEffect(() => {
    const handleFillInput = (e: CustomEvent) => {
      if (e.detail?.text) {
        setInputValue(e.detail.text);
        if (e.detail.autoSend) {
          sendMessage(e.detail.text);
        } else {
          inputRef.current?.focus();
        }
      }
    };

    window.addEventListener('copilot:fill-input', handleFillInput as EventListener);
    return () => {
      window.removeEventListener('copilot:fill-input', handleFillInput as EventListener);
    };
  }, [sendMessage]);

  // Copy message to clipboard
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Handle feedback
  const handleFeedback = (messageId: string, feedback: 'positive' | 'negative') => {
    setMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, feedback } : m
    ));
    fetch('/api/ai/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId, feedback, context }),
    }).catch(() => {
      // Silently ignore feedback delivery errors
    });
  };

  // Handle action execution
  const handleActionExecute = (action: AIAction) => {
    if (onActionExecute) {
      onActionExecute(action);
    }

    setMessages(prev => [...prev, {
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content: context.language === 'vi'
        ? `\u2705 Đang thực hiện: ${action.labelVi}...`
        : `\u2705 Executing: ${action.label}...`,
      timestamp: new Date(),
    }]);
  };

  // Clear chat
  const clearChat = () => {
    setMessages([]);
    setShowSuggestions(true);
  };

  if (!isOpen) return null;

  // Embedded mode - render only content without container
  if (embedded) {
    return (
      <div className="flex flex-col h-full">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-neutral-900">
          <ChatContextEmbedded
            context={context}
            messages={messages}
            showSuggestions={showSuggestions}
            onSendMessage={sendMessage}
          />

          {/* Messages */}
          {messages.map((message) => (
            <ChatMessageEmbedded
              key={message.id}
              message={message}
              context={context}
              onSendMessage={sendMessage}
              onActionExecute={handleActionExecute}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <ChatInput
          inputValue={inputValue}
          isLoading={isLoading}
          context={context}
          inputRef={inputRef}
          onInputChange={setInputValue}
          onSend={sendMessage}
        />
      </div>
    );
  }

  // Standalone mode - full container with header
  return (
    <div
      className={`fixed z-50 ${position === 'right' ? 'right-4' : position === 'left' ? 'left-4' : 'bottom-4 left-1/2 -translate-x-1/2'
        } bottom-4 flex flex-col bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-neutral-700 overflow-hidden transition-all duration-300 ${isMinimized ? 'w-80 h-14' : 'w-96 h-[600px]'
        }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-white/20 rounded-lg">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">RTR AI Copilot</h3>
            {!isMinimized && (
              <p className="text-xs text-white/80">
                {context.language === 'vi' ? `Module: ${context.module}` : `Module: ${context.module}`}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={clearChat}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            title={context.language === 'vi' ? 'Xóa chat' : 'Clear chat'}
            aria-label={context.language === 'vi' ? 'Xóa chat' : 'Clear chat'}
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            aria-label={isMinimized ? 'Mở rộng' : 'Thu nhỏ'}
          >
            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-neutral-900">
            <ChatContextStandalone
              context={context}
              messages={messages}
              showSuggestions={showSuggestions}
              onSendMessage={sendMessage}
            />

            {/* Messages */}
            {messages.map((message) => (
              <ChatMessageStandalone
                key={message.id}
                message={message}
                context={context}
                copiedId={copiedId}
                onSendMessage={sendMessage}
                onActionExecute={handleActionExecute}
                onCopy={copyToClipboard}
                onFeedback={handleFeedback}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <ChatInput
            inputValue={inputValue}
            isLoading={isLoading}
            context={context}
            inputRef={inputRef}
            onInputChange={setInputValue}
            onSend={sendMessage}
          />
        </>
      )}
    </div>
  );
}

// Floating trigger button component
export function AIChatTrigger({
  onClick,
  isOpen,
  hasUnread = false,
  language = 'en'
}: {
  onClick: () => void;
  isOpen: boolean;
  hasUnread?: boolean;
  language?: 'en' | 'vi';
}) {
  if (isOpen) return null;

  return (
    <button
      onClick={onClick}
      className="fixed bottom-4 right-4 z-40 p-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 group"
      title={language === 'vi' ? 'Mở AI Copilot' : 'Open AI Copilot'}
    >
      <MessageSquare className="h-6 w-6" />
      {hasUnread && (
        <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
      )}
      <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-neutral-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
        {language === 'vi' ? 'AI Copilot' : 'AI Copilot'}
      </span>
    </button>
  );
}
