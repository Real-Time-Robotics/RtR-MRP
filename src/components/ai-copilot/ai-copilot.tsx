'use client';

import { useState, useEffect } from 'react';
import {
  Bot, MessageSquare, Sparkles, Settings, Bell, X,
  ChevronLeft, ChevronRight, Minimize2, Maximize2,
  HelpCircle, History, Shield, Zap
} from 'lucide-react';
import dynamic from 'next/dynamic';
import ProactiveInsights, { InsightsBadge } from './proactive-insights';
import SmartActionExecutor from './smart-action-executor';

const AIChatPanel = dynamic(() => import('./ai-chat-panel').then(m => ({ default: m.default })), {
  ssr: false,
  loading: () => null,
});
import { useSmartGridStore } from '@/components/ui-v2/smart-grid';

// =============================================================================
// RTR AI COPILOT - MAIN WRAPPER
// Integrates all AI features into a cohesive experience
// =============================================================================

interface AIAction {
  id: string;
  type: 'create' | 'update' | 'delete' | 'navigate' | 'export' | 'notify';
  label: string;
  labelVi: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  requiresApproval: boolean;
  payload?: Record<string, unknown>;
  endpoint?: string;
}

interface AICopilotProps {
  user: {
    id: string;
    name: string;
    role: string;
  };
  language: 'en' | 'vi';
  module?: string;
  page?: string;
}

type PanelMode = 'chat' | 'insights' | 'settings';

export default function AICopilot({
  user,
  language,
  module = 'general',
  page = 'Dashboard',
}: AICopilotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeMode, setActiveMode] = useState<PanelMode>('chat');
  const [insightsCount, setInsightsCount] = useState(0);
  const [pendingAction, setPendingAction] = useState<AIAction | null>(null);
  const [aiEnabled, setAiEnabled] = useState(true);

  // Connect to Grid State
  const { selectedItem } = useSmartGridStore();

  // Context for AI
  const context = {
    page,
    module,
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    selectedItems: selectedItem ? [selectedItem] : [],
    filters: {},
    language,
  };

  // Update insights count when selection changes
  useEffect(() => {
    if (selectedItem) {
      // Future: fetch real insights count from API
    }
  }, [selectedItem]);

  // Handle action from chat or insights
  const handleAction = (action: AIAction) => {
    setPendingAction(action);
  };

  // Execute action
  const executeAction = async (action: AIAction) => {
    // Dispatch smart action event
    window.dispatchEvent(new CustomEvent('copilot:action', {
      detail: {
        type: action.type,
        payload: action.payload,
        actionId: action.id
      }
    }));

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));

    return {
      success: true,
      message: language === 'vi'
        ? `Đã thực hiện: ${action.labelVi}`
        : `Completed: ${action.label}`,
      rollbackId: `rollback_${Date.now()}`,
    };
  };

  // Keyboard shortcut to toggle copilot (Cmd+J on macOS, Ctrl+J on Windows)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + J to toggle (changed from K to avoid conflict with Command Palette)
      if ((e.ctrlKey || e.metaKey) && e.key === 'j') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!aiEnabled) {
    return (
      <button
        onClick={() => setAiEnabled(true)}
        className="fixed bottom-4 right-4 z-40 p-2.5 bg-gray-200 text-gray-500 rounded-full shadow-lg hover:bg-gray-300 transition-colors"
        title={language === 'vi' ? 'Bật AI Copilot' : 'Enable AI Copilot'}
      >
        <Bot className="h-5 w-5" />
      </button>
    );
  }

  return (
    <>
      {/* Floating trigger button - Single button */}
      {!isOpen && (
        <div className="fixed bottom-4 right-4 z-40">
          <button
            onClick={() => { setIsOpen(true); setActiveMode('chat'); }}
            className="relative p-2 bg-gradient-to-br from-emerald-600 to-green-700 text-white rounded-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all"
            title={language === 'vi' ? 'AI Copilot (⌘J / Ctrl+J)' : 'AI Copilot (⌘J / Ctrl+J)'}
          >
            <Bot className="h-5 w-5" />
            {/* Insights badge */}
            {insightsCount > 0 && (
              <span className="absolute -top-2 -right-2 min-w-[22px] h-[22px] px-1 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-md">
                {insightsCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Main panel */}
      {isOpen && (
        <div
          className={`fixed z-50 flex flex-col bg-white dark:bg-neutral-800 shadow-2xl border border-gray-200 dark:border-neutral-700 overflow-hidden transition-all duration-300 inset-0 rounded-none sm:inset-auto sm:bottom-4 sm:right-4 sm:rounded-2xl ${isExpanded ? 'sm:w-[600px] sm:h-[700px]' : 'sm:w-[420px] sm:h-[600px]'}`}
        >
          {/* Header */}
          {/* Header - Industrial Style */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-emerald-600 to-green-700 dark:from-neutral-900 dark:to-neutral-800 text-white border-b border-emerald-700 dark:border-neutral-700">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-white/20 dark:bg-neutral-800 rounded border border-white/30 dark:border-neutral-700">
                <Bot className="h-4 w-4 text-white dark:text-neutral-300" />
              </div>
              <div>
                <h3 className="font-mono text-sm font-semibold tracking-wide">RTR AI COPILOT</h3>
                <p className="text-[10px] text-white/70 dark:text-neutral-400 font-mono uppercase">
                  {context.page} • {context.module}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="hidden sm:block p-1.5 hover:bg-white/20 dark:hover:bg-neutral-800 rounded transition-colors text-white/70 dark:text-neutral-400 hover:text-white"
                title={isExpanded ? 'Collapse' : 'Expand'}
                aria-label={isExpanded ? 'Thu nhỏ' : 'Mở rộng'}
              >
                {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/20 dark:hover:bg-neutral-800 rounded transition-colors text-white/70 dark:text-neutral-400 hover:text-white"
                title="Close"
                aria-label="Đóng"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Mode tabs - Industrial Style */}
          <div className="flex border-b border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-900">
            <button
              onClick={() => setActiveMode('chat')}
              className={`flex-1 flex items-center justify-center py-2.5 text-xs font-medium uppercase tracking-wider transition-colors border-b-2 ${activeMode === 'chat'
                ? 'text-neutral-900 dark:text-white border-neutral-900 dark:border-white bg-white dark:bg-neutral-800'
                : 'text-gray-500 dark:text-neutral-500 border-transparent hover:text-gray-900 dark:hover:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800'
                }`}
            >
              <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
              Chat
            </button>
            <button
              onClick={() => setActiveMode('insights')}
              className={`flex-1 flex items-center justify-center py-2.5 text-xs font-medium uppercase tracking-wider transition-colors relative border-b-2 ${activeMode === 'insights'
                ? 'text-neutral-900 dark:text-white border-neutral-900 dark:border-white bg-white dark:bg-neutral-800'
                : 'text-gray-500 dark:text-neutral-500 border-transparent hover:text-gray-900 dark:hover:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800'
                }`}
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Insights
              {insightsCount > 0 && activeMode !== 'insights' && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {insightsCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveMode('settings')}
              className={`flex-1 flex items-center justify-center py-2.5 text-sm font-medium transition-colors ${activeMode === 'settings'
                ? 'text-gray-700 dark:text-neutral-200 border-b-2 border-gray-700 dark:border-neutral-300 bg-gray-50 dark:bg-neutral-700'
                : 'text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-300 hover:bg-gray-50 dark:hover:bg-neutral-700'
                }`}
            >
              <Settings className="h-4 w-4 mr-1.5" />
              {language === 'vi' ? 'Cài đặt' : 'Settings'}
            </button>
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-hidden">
            {/* Chat mode */}
            {activeMode === 'chat' && (
              <div className="h-full">
                <AIChatPanel
                  context={context}
                  isOpen={true}
                  onClose={() => setIsOpen(false)}
                  onActionExecute={handleAction}
                  position="right"
                  embedded={true}
                />
              </div>
            )}

            {/* Insights mode */}
            {activeMode === 'insights' && (
              <div className="h-full overflow-y-auto p-4">
                <ProactiveInsights
                  language={language}
                  module={module}
                  maxItems={10}
                  onInsightClick={(insight) => {
                    if (insight.action) {
                      insight.action.onClick();
                    }
                  }}
                />
              </div>
            )}

            {/* Settings mode */}
            {activeMode === 'settings' && (
              <div className="h-full overflow-y-auto p-4">
                <div className="space-y-6">
                  {/* AI Settings */}
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                      <Bot className="h-4 w-4 mr-2" />
                      {language === 'vi' ? 'Cài đặt AI' : 'AI Settings'}
                    </h4>

                    <div className="space-y-3">
                      {/* Enable/Disable */}
                      <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-neutral-700 rounded-lg">
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {language === 'vi' ? 'Bật AI Copilot' : 'Enable AI Copilot'}
                          </span>
                          <p className="text-xs text-gray-500 dark:text-neutral-400 mt-0.5">
                            {language === 'vi'
                              ? 'Hiển thị trợ lý AI trong ứng dụng'
                              : 'Show AI assistant in the application'}
                          </p>
                        </div>
                        <button
                          onClick={() => setAiEnabled(!aiEnabled)}
                          className={`relative w-11 h-6 rounded-full transition-colors ${aiEnabled ? 'bg-blue-600' : 'bg-gray-300'
                            }`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${aiEnabled ? 'translate-x-5' : ''
                              }`}
                          />
                        </button>
                      </label>

                      {/* Proactive insights */}
                      <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-neutral-700 rounded-lg">
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {language === 'vi' ? 'Insights chủ động' : 'Proactive Insights'}
                          </span>
                          <p className="text-xs text-gray-500 dark:text-neutral-400 mt-0.5">
                            {language === 'vi'
                              ? 'AI tự động phân tích và đề xuất'
                              : 'AI automatically analyzes and suggests'}
                          </p>
                        </div>
                        <button className="relative w-11 h-6 rounded-full transition-colors bg-blue-600">
                          <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow translate-x-5" />
                        </button>
                      </label>

                      {/* Auto-draft */}
                      <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-neutral-700 rounded-lg">
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {language === 'vi' ? 'Tự động tạo nháp' : 'Auto-draft'}
                          </span>
                          <p className="text-xs text-gray-500 dark:text-neutral-400 mt-0.5">
                            {language === 'vi'
                              ? 'AI tự động tạo draft PO, WO'
                              : 'AI automatically creates draft PO, WO'}
                          </p>
                        </div>
                        <button className="relative w-11 h-6 rounded-full transition-colors bg-gray-300">
                          <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow" />
                        </button>
                      </label>
                    </div>
                  </div>

                  {/* Safety */}
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                      <Shield className="h-4 w-4 mr-2" />
                      {language === 'vi' ? 'An toàn & Bảo mật' : 'Safety & Security'}
                    </h4>

                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-green-600">
                        <Shield className="h-4 w-4 mr-2" />
                        {language === 'vi' ? 'Guardrails đang hoạt động' : 'Safety guardrails active'}
                      </div>
                      <div className="flex items-center text-sm text-green-600">
                        <Shield className="h-4 w-4 mr-2" />
                        {language === 'vi' ? 'Rate limiting được bật' : 'Rate limiting enabled'}
                      </div>
                      <div className="flex items-center text-sm text-green-600">
                        <Shield className="h-4 w-4 mr-2" />
                        {language === 'vi' ? 'Audit logging hoạt động' : 'Audit logging active'}
                      </div>
                    </div>
                  </div>

                  {/* User info */}
                  <div className="pt-4 border-t dark:border-neutral-700">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <span className="text-blue-600 dark:text-blue-400 font-semibold">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                        <p className="text-xs text-gray-500 dark:text-neutral-400 capitalize">{user.role}</p>
                      </div>
                    </div>
                  </div>

                  {/* Help */}
                  <div className="pt-4 border-t dark:border-neutral-700">
                    <button className="w-full flex items-center justify-center py-2 text-sm text-gray-600 dark:text-neutral-400 hover:text-gray-800 dark:hover:text-neutral-200">
                      <HelpCircle className="h-4 w-4 mr-2" />
                      {language === 'vi' ? 'Hướng dẫn sử dụng AI' : 'AI Usage Guide'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action executor modal */}
          {pendingAction && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4">
              <div className="w-full max-w-md">
                <SmartActionExecutor
                  action={pendingAction}
                  language={language}
                  userRole={user.role}
                  onExecute={executeAction}
                  onCancel={() => setPendingAction(null)}
                />
              </div>
            </div>
          )}

        </div>
      )}
    </>
  );
}
