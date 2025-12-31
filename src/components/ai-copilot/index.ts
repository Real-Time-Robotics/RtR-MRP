// RTR AI Copilot - Main Exports
// ================================

// Components
export { default as AICopilot } from './ai-copilot';
export { default as AIChatPanel, AIChatTrigger } from './ai-chat-panel';
export { default as ProactiveInsights, InsightsBadge } from './proactive-insights';
export { default as SmartActionExecutor, QuickActionButton } from './smart-action-executor';
export { default as AuditLogViewer } from './audit-log-viewer';

// Context & Hooks
export {
  AIProvider,
  useAI,
  useAIChat,
  useAINotifications,
  useAISelection,
  useAIFilters,
  getContextualSuggestions,
} from '@/lib/ai-context';

// Services
export { AIService, getAIService } from '@/lib/ai-service';
export { processNaturalLanguageQuery, getSupportedQueryTypes } from '@/lib/nl-query-engine';

// Types
export type {
  AIContext,
  AIMessage,
  AIAction,
  AIResponse,
  AuditLogEntry,
} from '@/lib/ai-service';

export type {
  NLQueryResult,
} from '@/lib/nl-query-engine';
