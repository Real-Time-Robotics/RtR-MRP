'use client';

import { useState, useEffect } from 'react';
import {
  Brain, MessageSquare, Sparkles, Settings, Bell, X,
  ChevronLeft, ChevronRight, Minimize2, Maximize2,
  HelpCircle, History, Shield, Zap
} from 'lucide-react';
import AIChatPanel, { AIChatTrigger } from './ai-chat-panel';
import ProactiveInsights, { InsightsBadge } from './proactive-insights';
import SmartActionExecutor from './smart-action-executor';

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
  payload?: any;
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
  const [insightsCount, setInsightsCount] = useState(5);
  const [pendingAction, setPendingAction] = useState<AIAction | null>(null);
  const [aiEnabled, setAiEnabled] = useState(true);
  
  // Context for AI
  const context = {
    page,
    module,
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    selectedItems: [],
    filters: {},
    language,
  };
  
  // Handle action from chat or insights
  const handleAction = (action: AIAction) => {
    setPendingAction(action);
  };
  
  // Execute action
  const executeAction = async (action: AIAction) => {
    // In production, call the appropriate API
    console.log('Executing action:', action);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return {
      success: true,
      message: language === 'vi' 
        ? `Đã thực hiện: ${action.labelVi}`
        : `Completed: ${action.label}`,
      rollbackId: `rollback_${Date.now()}`,
    };
  };
  
  // Keyboard shortcut to toggle copilot
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K to toggle
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
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
        className="fixed bottom-4 right-4 z-40 p-3 bg-gray-200 text-gray-500 rounded-full shadow-lg hover:bg-gray-300 transition-colors"
        title={language === 'vi' ? 'Bật AI Copilot' : 'Enable AI Copilot'}
      >
        <Brain className="h-6 w-6" />
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
            className="relative p-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all group"
            title={language === 'vi' ? 'AI Copilot (Ctrl+K)' : 'AI Copilot (Ctrl+K)'}
          >
            <Brain className="h-6 w-6" />
            {/* Insights badge */}
            {insightsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                {insightsCount}
              </span>
            )}
          </button>
        </div>
      )}
      
      {/* Main panel */}
      {isOpen && (
        <div
          className={`fixed z-50 bottom-4 right-4 flex flex-col bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-neutral-700 overflow-hidden transition-all duration-300 ${
            isExpanded ? 'w-[600px] h-[700px]' : 'w-[420px] h-[600px]'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-white/20 rounded-lg">
                <Brain className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">RTR AI Copilot</h3>
                <p className="text-xs text-white/80">
                  {context.page} • {context.module}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                title={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          {/* Mode tabs */}
          <div className="flex border-b border-gray-200 dark:border-neutral-700">
            <button
              onClick={() => setActiveMode('chat')}
              className={`flex-1 flex items-center justify-center py-2.5 text-sm font-medium transition-colors ${
                activeMode === 'chat'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/30'
                  : 'text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-300 hover:bg-gray-50 dark:hover:bg-neutral-700'
              }`}
            >
              <MessageSquare className="h-4 w-4 mr-1.5" />
              Chat
            </button>
            <button
              onClick={() => setActiveMode('insights')}
              className={`flex-1 flex items-center justify-center py-2.5 text-sm font-medium transition-colors relative ${
                activeMode === 'insights'
                  ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 bg-purple-50 dark:bg-purple-900/30'
                  : 'text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-300 hover:bg-gray-50 dark:hover:bg-neutral-700'
              }`}
            >
              <Sparkles className="h-4 w-4 mr-1.5" />
              Insights
              {insightsCount > 0 && activeMode !== 'insights' && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {insightsCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveMode('settings')}
              className={`flex-1 flex items-center justify-center py-2.5 text-sm font-medium transition-colors ${
                activeMode === 'settings'
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
                      <Brain className="h-4 w-4 mr-2" />
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
                          className={`relative w-11 h-6 rounded-full transition-colors ${
                            aiEnabled ? 'bg-blue-600' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                              aiEnabled ? 'translate-x-5' : ''
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
          
          {/* Footer */}
          <div className="px-4 py-2 bg-gray-50 dark:bg-neutral-900 border-t border-gray-200 dark:border-neutral-700 text-center">
            <p className="text-xs text-gray-400 flex items-center justify-center">
              <Zap className="h-3 w-3 mr-1" />
              {language === 'vi' 
                ? 'Powered by RTR AI Copilot v1.0'
                : 'Powered by RTR AI Copilot v1.0'}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
