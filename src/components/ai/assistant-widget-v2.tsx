'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  X,
  Minimize2,
  Maximize2,
  MessageSquare,
  Lightbulb,
  AlertTriangle,
  Package,
  ShoppingCart,
  Factory,
  ChevronRight,
  Bot,
  User,
  Loader2,
  RefreshCw,
  Copy,
  Check,
  HelpCircle,
  Zap,
  Brain,
  Search,
  Wifi,
  WifiOff,
  Truck,
  BarChart3,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { clientLogger } from '@/lib/client-logger';
import { useAIChat, AI_QUICK_ACTIONS, type ChatMessage } from '@/hooks/use-ai-chat';

// =============================================================================
// AI ASSISTANT WIDGET V2
// Connected to real API with OpenAI + Anthropic fallback
// =============================================================================

// Icon mapping
const iconMap: Record<string, React.ReactNode> = {
  AlertTriangle: <AlertTriangle className="w-4 h-4" />,
  Package: <Package className="w-4 h-4" />,
  ShoppingCart: <ShoppingCart className="w-4 h-4" />,
  Factory: <Factory className="w-4 h-4" />,
  Truck: <Truck className="w-4 h-4" />,
  BarChart3: <BarChart3 className="w-4 h-4" />,
};

const colorMap: Record<string, string> = {
  red: 'text-red-500 bg-red-50 dark:bg-red-900/20',
  amber: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20',
  blue: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20',
  purple: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20',
  green: 'text-green-500 bg-green-50 dark:bg-green-900/20',
  pink: 'text-pink-500 bg-pink-50 dark:bg-pink-900/20',
};

// =============================================================================
// SAFE TEXT RENDERER - Parses **bold** markers into React elements
// =============================================================================

function parseTextWithBold(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

// =============================================================================
// MESSAGE COMPONENT
// =============================================================================

interface MessageBubbleProps {
  message: ChatMessage;
  onCopy: (content: string) => void;
  copiedId: string | null;
}

function MessageBubble({ message, onCopy, copiedId }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isLoading = message.isLoading;
  const isError = message.isError;

  return (
    <div className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}>
      {/* Avatar */}
      {!isUser && (
        <div className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
          isError
            ? 'bg-red-500'
            : 'bg-gradient-to-br from-violet-500 to-purple-600'
        )}>
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-white animate-spin" />
          ) : isError ? (
            <AlertCircle className="w-4 h-4 text-white" />
          ) : (
            <Bot className="w-4 h-4 text-white" />
          )}
        </div>
      )}

      {/* Message content */}
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-3',
          isUser
            ? 'bg-purple-600 text-white rounded-br-md'
            : isError
            ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-bl-md border border-red-200 dark:border-red-800'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-md'
        )}
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-sm text-gray-500">Đang phân tích...</span>
          </div>
        ) : (
          <>
            {/* Render content with markdown-like formatting */}
            <div className="text-sm whitespace-pre-wrap">
              {message.content.split('\n').map((line: string, i: number) => {
                // Bullet points
                if (line.startsWith('- ') || line.startsWith('• ')) {
                  return (
                    <p key={i} className="ml-2 my-0.5">{'• '}{parseTextWithBold(line.slice(2))}</p>
                  );
                }
                // Headers
                if (line.startsWith('### ')) {
                  return <p key={i} className="font-bold mt-2 mb-1">{parseTextWithBold(line.slice(4))}</p>;
                }
                if (line.startsWith('## ')) {
                  return <p key={i} className="font-bold text-base mt-3 mb-1">{parseTextWithBold(line.slice(3))}</p>;
                }
                return <p key={i} className="my-0.5">{parseTextWithBold(line)}</p>;
              })}
            </div>

            {/* Provider badge */}
            {message.provider && (
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  {message.provider === 'openai' ? 'GPT-4' : 'Claude'}
                </span>
                <button
                  onClick={() => onCopy(message.content)}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1 ml-auto"
                >
                  {copiedId === message.id ? (
                    <>
                      <Check className="w-3 h-3 text-green-500" />
                      Đã copy
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MAIN WIDGET COMPONENT
// =============================================================================

export function AIAssistantWidgetV2() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Use the AI chat hook
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    retryLastMessage,
    providerStatus,
  } = useAIChat({
    onError: (err: string) => clientLogger.error('AI Chat Error', err),
  });

  // Scroll to bottom on new messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleQuickAction = (query: string) => {
    sendMessage(query);
  };

  // Connection status
  const isConnected = providerStatus && (providerStatus.openai || providerStatus.anthropic);

  // Floating button when closed
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed bottom-6 right-6 z-50',
          'w-14 h-14 rounded-full',
          'bg-gradient-to-br from-violet-500 to-purple-600',
          'text-white shadow-lg shadow-purple-500/30',
          'flex items-center justify-center',
          'hover:scale-110 hover:shadow-xl hover:shadow-purple-500/40',
          'transition-all duration-300',
          'group'
        )}
        title="Mở Trợ lý AI"
      >
        <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform" />
        <span className="absolute inset-0 rounded-full bg-purple-400 animate-ping opacity-25" />
        <span className={cn(
          'absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white dark:border-gray-900',
          isConnected ? 'bg-green-500' : 'bg-gray-400'
        )}>
          AI
        </span>
      </button>
    );
  }

  // Chat widget when open
  return (
    <div
      className={cn(
        'fixed z-50 transition-all duration-300 ease-out',
        isExpanded
          ? 'inset-4 md:inset-8'
          : 'bottom-6 right-6 w-[400px] h-[600px]',
        'flex flex-col',
        'bg-white dark:bg-gray-900',
        'rounded-2xl shadow-2xl',
        'border border-gray-200 dark:border-gray-700',
        'overflow-hidden'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              Trợ lý AI
              {isConnected ? (
                <Wifi className="w-3 h-3 text-green-300" />
              ) : (
                <WifiOff className="w-3 h-3 text-red-300" />
              )}
            </h3>
            <p className="text-xs text-white/80">
              {providerStatus?.openai && providerStatus?.anthropic
                ? 'GPT-4 + Claude sẵn sàng'
                : providerStatus?.openai
                ? 'GPT-4 sẵn sàng'
                : providerStatus?.anthropic
                ? 'Claude sẵn sàng'
                : 'Đang kết nối...'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            {/* Welcome */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Xin chào! 👋
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Tôi là trợ lý AI của bạn. Hãy hỏi tôi về tồn kho, đơn hàng, sản xuất hoặc bất kỳ điều gì!
            </p>

            {/* Quick Actions */}
            <div className="w-full space-y-2">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
                Truy vấn nhanh
              </p>
              <div className="grid grid-cols-2 gap-2">
                {AI_QUICK_ACTIONS.slice(0, 4).map((action: { id: string; label: string; query: string; icon: string; color: string }) => (
                  <button
                    key={action.id}
                    onClick={() => handleQuickAction(action.query)}
                    disabled={isLoading}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2.5 rounded-xl',
                      'text-left text-sm font-medium',
                      'border border-gray-200 dark:border-gray-700',
                      'hover:border-purple-300 dark:hover:border-purple-700',
                      'hover:shadow-md transition-all duration-200',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      colorMap[action.color]
                    )}
                  >
                    {iconMap[action.icon]}
                    <span className="text-gray-700 dark:text-gray-300">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onCopy={handleCopy}
                copiedId={copiedId}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        {messages.length > 0 && (
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={clearMessages}
              className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Cuộc hội thoại mới
            </button>
            {error && (
              <button
                onClick={retryLastMessage}
                className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Thử lại
              </button>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Hỏi điều gì đó..."
              aria-label="Hỏi điều gì đó"
              disabled={isLoading}
              className={cn(
                'w-full px-4 py-3 pr-12',
                'bg-white dark:bg-gray-900',
                'border border-gray-300 dark:border-gray-600',
                'rounded-xl',
                'text-sm text-gray-900 dark:text-white',
                'placeholder:text-gray-400',
                'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            />
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className={cn(
              'w-12 h-12 rounded-xl',
              'flex items-center justify-center',
              'bg-gradient-to-br from-violet-500 to-purple-600',
              'text-white',
              'hover:shadow-lg hover:shadow-purple-500/30',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-all duration-200'
            )}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>

        <p className="text-[10px] text-gray-400 text-center mt-2">
          Trợ lý AI • OpenAI GPT-4 + Anthropic Claude
        </p>
      </div>
    </div>
  );
}

export default AIAssistantWidgetV2;
