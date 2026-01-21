'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { AlertCircle, Lightbulb, ChevronDown, ChevronUp, Bot } from 'lucide-react';
import { explainError, type ErrorExplanation } from '@/lib/ai/error-explainer';
import { cn } from '@/lib/utils';

interface AIErrorToastProps {
  errorMessage: string;
  context?: {
    field?: string;
    entity?: string;
    value?: unknown;
  };
}

/**
 * Custom toast component with AI-powered error explanation
 */
function AIErrorContent({ errorMessage, context }: AIErrorToastProps) {
  const [expanded, setExpanded] = useState(false);
  const explanation = explainError(errorMessage, context);

  return (
    <div className="w-full">
      {/* Error message */}
      <div className="flex items-start gap-2">
        <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium text-red-700 dark:text-red-400">
            {errorMessage}
          </p>
        </div>
      </div>

      {/* AI Explanation toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 mt-2 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
      >
        <Bot className="h-4 w-4" />
        <span>AI Giải thích</span>
        {expanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {/* Expanded AI explanation */}
      {expanded && (
        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
          {/* Explanation */}
          <div className="flex items-start gap-2 mb-2">
            <Bot className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {explanation.explanation}
            </p>
          </div>

          {/* Suggestion */}
          <div className="flex items-start gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">Gợi ý:</span> {explanation.suggestion}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Show an error toast with AI explanation
 */
export function showAIErrorToast(errorMessage: string, context?: AIErrorToastProps['context']) {
  toast.custom(
    (t) => (
      <div
        className={cn(
          'w-full max-w-md p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-red-200 dark:border-red-800',
          'animate-in slide-in-from-top-5 fade-in-20'
        )}
      >
        <AIErrorContent errorMessage={errorMessage} context={context} />
      </div>
    ),
    {
      duration: 10000, // Show longer for AI explanation
      position: 'top-right',
    }
  );
}

/**
 * Show a simple error toast (without AI explanation)
 */
export function showErrorToast(errorMessage: string) {
  toast.error(errorMessage, {
    duration: 5000,
    position: 'top-right',
  });
}

/**
 * Show success toast
 */
export function showSuccessToast(message: string) {
  toast.success(message, {
    duration: 3000,
    position: 'top-right',
  });
}

/**
 * Hook to use AI error toast functionality
 */
export function useAIErrorToast() {
  return {
    showError: showAIErrorToast,
    showSimpleError: showErrorToast,
    showSuccess: showSuccessToast,
  };
}

export default AIErrorContent;
