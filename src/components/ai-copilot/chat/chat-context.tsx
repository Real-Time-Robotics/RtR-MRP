'use client';

import React from 'react';
import { Sparkles, Lightbulb } from 'lucide-react';
import { ContextAnalysisCard } from '../context-analysis-card';
import type { AIContext } from './chat-types';
import { QUICK_SUGGESTIONS } from './chat-types';

// Context card display for embedded mode
export interface ChatContextEmbeddedProps {
  context: AIContext;
  messages: { length: number };
  showSuggestions: boolean;
  onSendMessage: (content: string) => void;
}

export function ChatContextEmbedded({
  context,
  messages,
  showSuggestions,
  onSendMessage,
}: ChatContextEmbeddedProps) {
  const currentSuggestions = QUICK_SUGGESTIONS[context.module] || QUICK_SUGGESTIONS.default;

  return (
    <>
      {/* Context Analysis Card */}
      {context.selectedItems && context.selectedItems.length > 0 && context.selectedItems[0]?.id && (
        <div className="mb-4">
          <ContextAnalysisCard
            selectedItem={context.selectedItems[0]}
            type={
              (context.selectedItems[0]?.type as 'part' | 'order' | 'customer' | 'supplier' | 'production' | 'general' | undefined) ||
              (context.module === 'suppliers' ? 'supplier' :
                context.module === 'customers' ? 'customer' :
                  'part')
            }
            partId={context.selectedItems[0].id}
            partNumber={context.selectedItems[0].partNumber}
            partName={context.selectedItems[0].name}
          />
        </div>
      )}

      {/* Welcome message - Only show if no context and no messages */}
      {messages.length === 0 && (!context.selectedItems || context.selectedItems.length === 0) && (
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 mb-3">
            <Sparkles className="h-6 w-6 text-neutral-500" />
          </div>
          <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
            {context.language === 'vi' ? 'Xin chào!' : 'Hello!'}
          </h4>
          <p className="text-xs text-gray-500 dark:text-neutral-500 mb-4 px-8">
            {context.language === 'vi'
              ? 'Tôi là AI Copilot, sẵn sàng hỗ trợ bạn.'
              : 'I\'m your AI Copilot, ready to help.'}
          </p>
        </div>
      )}

      {/* Quick suggestions - Only show if no context */}
      {showSuggestions && messages.length === 0 && (!context.selectedItems || context.selectedItems.length === 0) && (
        <div className="space-y-2">
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider flex items-center justify-center">
            {context.language === 'vi' ? 'Gợi ý nhanh' : 'Quick suggestions'}
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {currentSuggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => onSendMessage(context.language === 'vi' ? suggestion.vi : suggestion.en)}
                className="px-3 py-1.5 text-xs bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 text-gray-600 dark:text-neutral-300 rounded hover:bg-neutral-50 dark:hover:bg-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors"
              >
                {context.language === 'vi' ? suggestion.vi : suggestion.en}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// Context card display for standalone mode
export interface ChatContextStandaloneProps {
  context: AIContext;
  messages: { length: number };
  showSuggestions: boolean;
  onSendMessage: (content: string) => void;
}

export function ChatContextStandalone({
  context,
  messages,
  showSuggestions,
  onSendMessage,
}: ChatContextStandaloneProps) {
  const currentSuggestions = QUICK_SUGGESTIONS[context.module] || QUICK_SUGGESTIONS.default;

  return (
    <>
      {/* Context Analysis Card (Floating Mode) */}
      {context.selectedItems && context.selectedItems.length > 0 && context.selectedItems[0]?.id && (
        <div className="mb-4">
          <ContextAnalysisCard
            partId={context.selectedItems[0].id}
            partName={context.selectedItems[0].name}
            partNumber={context.selectedItems[0].partNumber}
          />
        </div>
      )}

      {/* Welcome message */}
      {messages.length === 0 && (
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 mb-4">
            <Sparkles className="h-8 w-8 text-blue-600" />
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">
            {context.language === 'vi' ? 'Xin chào!' : 'Hello!'}
          </h4>
          <p className="text-sm text-gray-600 mb-4">
            {context.language === 'vi'
              ? 'Tôi là AI Copilot, sẵn sàng hỗ trợ bạn với hệ thống MRP.'
              : 'I\'m your AI Copilot, ready to help you with the MRP system.'}
          </p>
        </div>
      )}

      {/* Quick suggestions */}
      {showSuggestions && messages.length === 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 flex items-center">
            <Lightbulb className="h-3.5 w-3.5 mr-1" />
            {context.language === 'vi' ? 'Gợi ý nhanh:' : 'Quick suggestions:'}
          </p>
          <div className="flex flex-wrap gap-2">
            {currentSuggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => onSendMessage(context.language === 'vi' ? suggestion.vi : suggestion.en)}
                className="px-3 py-1.5 text-xs bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-neutral-300 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
              >
                {context.language === 'vi' ? suggestion.vi : suggestion.en}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
