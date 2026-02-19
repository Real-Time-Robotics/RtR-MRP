'use client';

import React from 'react';
import { Send, Loader2 } from 'lucide-react';
import type { AIContext } from './chat-types';

export interface ChatInputProps {
  inputValue: string;
  isLoading: boolean;
  context: AIContext;
  inputRef: React.RefObject<HTMLTextAreaElement>;
  onInputChange: (value: string) => void;
  onSend: (content: string) => void;
}

export function ChatInput({
  inputValue,
  isLoading,
  context,
  inputRef,
  onInputChange,
  onSend,
}: ChatInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend(inputValue);
    }
  };

  return (
    <div className="p-3 bg-white dark:bg-neutral-800 border-t border-gray-100 dark:border-neutral-700/50">
      <div className="flex items-center gap-2 p-1 bg-gray-50 dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-700 focus-within:border-blue-400 dark:focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:ring-blue-900/30 transition-all">
        <textarea
          ref={inputRef}
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={context.language === 'vi' ? 'Nhập tin nhắn...' : 'Message...'}
          aria-label={context.language === 'vi' ? 'Nhập tin nhắn' : 'Message'}
          className="flex-1 h-9 px-3 py-2 bg-transparent text-gray-900 dark:text-white text-sm placeholder-gray-400 dark:placeholder-neutral-500 resize-none focus:outline-none"
          rows={1}
          disabled={isLoading}
        />
        <button
          onClick={() => onSend(inputValue)}
          disabled={!inputValue.trim() || isLoading}
          className="h-8 w-8 shrink-0 mr-1 flex items-center justify-center bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>
      <p className="text-[10px] text-gray-400 dark:text-neutral-500 text-center mt-2">
        {'\u2318'}J {'\u00B7'} {context.language === 'vi' ? 'AI có thể mắc lỗi' : 'AI can make mistakes'} {'\u00B7'} RTR AI v1.0
      </p>
    </div>
  );
}
