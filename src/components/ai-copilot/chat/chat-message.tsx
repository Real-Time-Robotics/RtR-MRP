'use client';

import React from 'react';
import {
  Loader2, Bot, User, ThumbsUp, ThumbsDown, Copy, Check,
  AlertTriangle, Info, Shield, Zap,
  Package, ShoppingCart, Factory, Calculator, BarChart3
} from 'lucide-react';
import type { AIMessage, AIAction, AIContext } from './chat-types';

// Icon mapping for AI message sections
const SECTION_ICONS: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  inventory: {
    icon: <Package className="w-4 h-4" />,
    color: 'text-blue-600',
    bg: 'bg-blue-100 dark:bg-blue-900/30'
  },
  orders: {
    icon: <ShoppingCart className="w-4 h-4" />,
    color: 'text-green-600',
    bg: 'bg-green-100 dark:bg-green-900/30'
  },
  production: {
    icon: <Factory className="w-4 h-4" />,
    color: 'text-purple-600',
    bg: 'bg-purple-100 dark:bg-purple-900/30'
  },
  mrp: {
    icon: <Calculator className="w-4 h-4" />,
    color: 'text-orange-600',
    bg: 'bg-orange-100 dark:bg-orange-900/30'
  },
  analytics: {
    icon: <BarChart3 className="w-4 h-4" />,
    color: 'text-indigo-600',
    bg: 'bg-indigo-100 dark:bg-indigo-900/30'
  },
};

// Professional markdown renderer - clean minimalist design
export function renderMessageContent(content: string, isUserMessage: boolean = false): React.ReactNode {
  if (!content) {
    return <span className="text-gray-400 italic">Không có phản hồi</span>;
  }

  // For user messages, just return plain text with white color
  if (isUserMessage) {
    return <span className="text-white">{content}</span>;
  }

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: React.ReactNode[] = [];
  let currentSection: { title: string; items: React.ReactNode[] } | null = null;

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <div key={`list-${elements.length}`} className="space-y-1.5 my-2">
          {currentList}
        </div>
      );
      currentList = [];
    }
  };

  const flushSection = () => {
    if (currentSection) {
      const sectionKey = currentSection.title.toLowerCase();
      const config = SECTION_ICONS[
        sectionKey.includes('tồn kho') || sectionKey.includes('inventory') ? 'inventory' :
          sectionKey.includes('đơn hàng') || sectionKey.includes('order') ? 'orders' :
            sectionKey.includes('sản xuất') || sectionKey.includes('production') ? 'production' :
              sectionKey.includes('mrp') ? 'mrp' : 'analytics'
      ];

      elements.push(
        <div key={`section-${elements.length}`} className="mt-4 first:mt-0">
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-1.5 rounded-lg ${config?.bg || 'bg-gray-100 dark:bg-neutral-700'}`}>
              {config?.icon || <BarChart3 className="w-3.5 h-3.5 text-gray-600" />}
            </div>
            <span className="font-semibold text-gray-900 dark:text-white text-sm">
              {currentSection.title}
            </span>
          </div>
          <div className="pl-8 space-y-1">
            {currentSection.items}
          </div>
        </div>
      );
      currentSection = null;
    }
  };

  const parseInlineContent = (text: string): React.ReactNode => {
    // Clean markdown and format
    const cleaned = text
      .replace(/\*\*(.*?)\*\*/g, '$1')  // Remove bold markers
      .replace(/^\s*[-•]\s*/, '')        // Remove list markers
      .trim();

    // Handle emoji indicators for status
    if (cleaned.includes('\u{1F535}') || cleaned.includes('\u{1F7E2}') || cleaned.includes('\u{1F7E1}') || cleaned.includes('\u{1F534}')) {
      const parts = cleaned.split(/(\u{1F535}|\u{1F7E2}|\u{1F7E1}|\u{1F534})/u);
      return (
        <span className="flex items-center gap-1.5">
          {parts.map((part, i) => {
            if (part === '\u{1F535}') return <span key={i} className="w-2 h-2 rounded-full bg-blue-500" />;
            if (part === '\u{1F7E2}') return <span key={i} className="w-2 h-2 rounded-full bg-green-500" />;
            if (part === '\u{1F7E1}') return <span key={i} className="w-2 h-2 rounded-full bg-yellow-500" />;
            if (part === '\u{1F534}') return <span key={i} className="w-2 h-2 rounded-full bg-red-500" />;
            return <span key={i}>{part}</span>;
          })}
        </span>
      );
    }

    return cleaned;
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // Handle headings (### or ##)
    const headingMatch = trimmed.match(/^#{1,3}\s*(.+)$/);
    if (headingMatch) {
      flushList();
      flushSection();
      currentSection = { title: headingMatch[1], items: [] };
      return;
    }

    // Handle list items (- or bullet)
    const listMatch = trimmed.match(/^[-•]\s*(.+)$/);
    if (listMatch || (currentSection && trimmed)) {
      const content = listMatch ? listMatch[1] : trimmed;
      const item = (
        <div key={`item-${index}`} className="flex items-start gap-2 text-sm text-gray-700 dark:text-neutral-300">
          <span className="text-gray-400 dark:text-neutral-500 mt-0.5">{'\u203A'}</span>
          <span className="flex-1">{parseInlineContent(content)}</span>
        </div>
      );

      if (currentSection) {
        currentSection.items.push(item);
      } else {
        currentList.push(item);
      }
      return;
    }

    // Regular paragraph
    flushList();
    flushSection();
    elements.push(
      <p key={`p-${index}`} className="text-sm text-gray-700 dark:text-neutral-300 leading-relaxed">
        {parseInlineContent(trimmed)}
      </p>
    );
  });

  flushList();
  flushSection();

  return <div className="space-y-2">{elements}</div>;
}

// Confidence indicator component
export const ConfidenceIndicator = ({ confidence, language }: { confidence: number; language: string }) => {
  const getColor = () => {
    if (confidence >= 0.9) return 'text-green-600 bg-green-50';
    if (confidence >= 0.7) return 'text-blue-600 bg-blue-50';
    if (confidence >= 0.5) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getLabel = () => {
    if (confidence >= 0.9) return language === 'vi' ? 'Rất tin cậy' : 'High confidence';
    if (confidence >= 0.7) return language === 'vi' ? 'Tin cậy' : 'Good confidence';
    if (confidence >= 0.5) return language === 'vi' ? 'Trung bình' : 'Medium confidence';
    return language === 'vi' ? 'Thấp' : 'Low confidence';
  };

  return (
    <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getColor()}`}>
      <Shield className="h-3 w-3 mr-1" />
      {Math.round(confidence * 100)}% - {getLabel()}
    </div>
  );
};

// Action button component
export const ActionButton = ({
  action,
  language,
  onExecute
}: {
  action: AIAction;
  language: string;
  onExecute: (action: AIAction) => void;
}) => {
  const getRiskColor = () => {
    switch (action.riskLevel) {
      case 'low': return 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100';
      case 'medium': return 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100';
      case 'high': return 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100';
      case 'critical': return 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100';
      default: return 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100';
    }
  };

  return (
    <button
      onClick={() => onExecute(action)}
      className={`flex items-center px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${getRiskColor()}`}
    >
      <Zap className="h-3.5 w-3.5 mr-1.5" />
      {language === 'vi' ? action.labelVi : action.label}
      {action.requiresApproval && (
        <span className="ml-1.5 text-xs opacity-75">
          ({language === 'vi' ? 'cần duyệt' : 'needs approval'})
        </span>
      )}
    </button>
  );
};

// Individual chat message rendering (embedded mode)
export interface ChatMessageEmbeddedProps {
  message: AIMessage;
  context: AIContext;
  onSendMessage: (content: string) => void;
  onActionExecute: (action: AIAction) => void;
}

export function ChatMessageEmbedded({
  message,
  context,
  onSendMessage,
  onActionExecute,
}: ChatMessageEmbeddedProps) {
  return (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] ${message.role === 'user' ? 'order-1' : 'order-2'}`}>
        <div className={`flex items-start space-x-2 ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${message.role === 'user'
            ? 'bg-blue-600 text-white'
            : 'bg-gradient-to-br from-purple-500 to-blue-500 text-white'
            }`}>
            {message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
          </div>

          <div className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`px-4 py-2.5 rounded-2xl ${message.role === 'user'
              ? 'bg-blue-600 text-white rounded-tr-sm'
              : 'bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 text-gray-800 dark:text-neutral-200 rounded-tl-sm shadow-sm'
              }`}>
              {message.isLoading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">
                    {context.language === 'vi' ? 'Đang suy nghĩ...' : 'Thinking...'}
                  </span>
                </div>
              ) : (
                <div className="text-sm">{renderMessageContent(message.content, message.role === 'user')}</div>
              )}
            </div>

            {/* Alerts for assistant messages */}
            {message.role === 'assistant' && !message.isLoading && message.alerts && message.alerts.length > 0 && (
              <div className="mt-2 space-y-1.5 w-full">
                {message.alerts.map((alert, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-2 px-3 py-2 rounded-lg text-xs ${
                      alert.type === 'critical' ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' :
                      alert.type === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400' :
                      alert.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' :
                      'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                    }`}
                  >
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                    <span className="flex-1">{alert.message}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Actions for assistant messages */}
            {message.role === 'assistant' && !message.isLoading && message.suggestedActions && message.suggestedActions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {message.suggestedActions.slice(0, 3).map((action) => (
                  <ActionButton
                    key={action.id}
                    action={action}
                    language={context.language}
                    onExecute={onActionExecute}
                  />
                ))}
              </div>
            )}

            {/* Related Queries */}
            {message.role === 'assistant' && !message.isLoading && message.relatedQueries && message.relatedQueries.length > 0 && (
              <div className="mt-3 w-full">
                <p className="text-[10px] text-gray-400 dark:text-neutral-500 mb-1.5">
                  {context.language === 'vi' ? 'Câu hỏi liên quan:' : 'Related:'}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {message.relatedQueries.slice(0, 3).map((query, idx) => (
                    <button
                      key={idx}
                      onClick={() => onSendMessage(query)}
                      className="px-2.5 py-1 text-[11px] bg-gray-100 dark:bg-neutral-700 text-gray-600 dark:text-neutral-300 rounded-full hover:bg-gray-200 dark:hover:bg-neutral-600 transition-colors"
                    >
                      {query}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <span className="text-xs text-gray-400 dark:text-neutral-500 mt-1" suppressHydrationWarning>
              {message.timestamp.toLocaleTimeString(context.language === 'vi' ? 'vi-VN' : 'en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Individual chat message rendering (standalone mode - with feedback/copy)
export interface ChatMessageStandaloneProps {
  message: AIMessage;
  context: AIContext;
  copiedId: string | null;
  onSendMessage: (content: string) => void;
  onActionExecute: (action: AIAction) => void;
  onCopy: (text: string, id: string) => void;
  onFeedback: (messageId: string, feedback: 'positive' | 'negative') => void;
}

export function ChatMessageStandalone({
  message,
  context,
  copiedId,
  onSendMessage,
  onActionExecute,
  onCopy,
  onFeedback,
}: ChatMessageStandaloneProps) {
  return (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] ${message.role === 'user' ? 'order-1' : 'order-2'}`}>
        {/* Avatar */}
        <div className={`flex items-start space-x-2 ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${message.role === 'user'
            ? 'bg-blue-600 text-white'
            : 'bg-gradient-to-br from-purple-500 to-blue-500 text-white'
            }`}>
            {message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
          </div>

          <div className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
            {/* Message bubble */}
            <div className={`px-4 py-2.5 rounded-2xl ${message.role === 'user'
              ? 'bg-blue-600 text-white rounded-tr-sm'
              : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm'
              }`}>
              {message.isLoading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">
                    {context.language === 'vi' ? 'Đang suy nghĩ...' : 'Thinking...'}
                  </span>
                </div>
              ) : (
                <div className="text-sm">{renderMessageContent(message.content, message.role === 'user')}</div>
              )}
            </div>

            {/* Metadata for assistant messages */}
            {message.role === 'assistant' && !message.isLoading && (
              <div className="mt-2 space-y-2">
                {/* Confidence */}
                {message.confidence !== undefined && message.confidence > 0 && (
                  <ConfidenceIndicator confidence={message.confidence} language={context.language} />
                )}

                {/* Warnings */}
                {message.warnings && message.warnings.length > 0 && (
                  <div className="flex items-start space-x-1 text-xs text-yellow-600">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                    <span>{message.warnings[0]}</span>
                  </div>
                )}

                {/* Data sources */}
                {message.dataUsed && message.dataUsed.length > 0 && (
                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                    <Info className="h-3.5 w-3.5" />
                    <span>
                      {context.language === 'vi' ? 'Nguồn: ' : 'Sources: '}
                      {message.dataUsed.join(', ')}
                    </span>
                  </div>
                )}

                {/* Suggested actions */}
                {message.suggestedActions && message.suggestedActions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {message.suggestedActions.map((action) => (
                      <ActionButton
                        key={action.id}
                        action={action}
                        language={context.language}
                        onExecute={onActionExecute}
                      />
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center space-x-2 mt-2">
                  <button
                    onClick={() => onCopy(message.content, message.id)}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title={context.language === 'vi' ? 'Sao chép' : 'Copy'}
                  >
                    {copiedId === message.id ? (
                      <Check className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => onFeedback(message.id, 'positive')}
                    className={`p-1 transition-colors ${message.feedback === 'positive'
                      ? 'text-green-500'
                      : 'text-gray-400 hover:text-green-500'
                      }`}
                    title={context.language === 'vi' ? 'Hữu ích' : 'Helpful'}
                  >
                    <ThumbsUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => onFeedback(message.id, 'negative')}
                    className={`p-1 transition-colors ${message.feedback === 'negative'
                      ? 'text-red-500'
                      : 'text-gray-400 hover:text-red-500'
                      }`}
                    title={context.language === 'vi' ? 'Không hữu ích' : 'Not helpful'}
                  >
                    <ThumbsDown className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Timestamp */}
            <span className="text-xs text-gray-400 mt-1" suppressHydrationWarning>
              {message.timestamp.toLocaleTimeString(context.language === 'vi' ? 'vi-VN' : 'en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
