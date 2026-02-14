'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageSquare, X, Send, Loader2, Bot, User, Sparkles,
  ThumbsUp, ThumbsDown, Copy, Check, ChevronDown, ChevronUp,
  AlertTriangle, Info, Zap, History, Settings, Minimize2,
  Maximize2, Volume2, VolumeX, Lightbulb, ArrowRight,
  RefreshCw, HelpCircle, Shield,
  Package, ShoppingCart, Factory, Calculator, BarChart3
} from 'lucide-react';
import { ContextAnalysisCard } from './context-analysis-card';

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
function renderMessageContent(content: string, isUserMessage: boolean = false): React.ReactNode {
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
    if (cleaned.includes('🔵') || cleaned.includes('🟢') || cleaned.includes('🟡') || cleaned.includes('🔴')) {
      const parts = cleaned.split(/(🔵|🟢|🟡|🔴)/);
      return (
        <span className="flex items-center gap-1.5">
          {parts.map((part, i) => {
            if (part === '🔵') return <span key={i} className="w-2 h-2 rounded-full bg-blue-500" />;
            if (part === '🟢') return <span key={i} className="w-2 h-2 rounded-full bg-green-500" />;
            if (part === '🟡') return <span key={i} className="w-2 h-2 rounded-full bg-yellow-500" />;
            if (part === '🔴') return <span key={i} className="w-2 h-2 rounded-full bg-red-500" />;
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

    // Handle list items (- or •)
    const listMatch = trimmed.match(/^[-•]\s*(.+)$/);
    if (listMatch || (currentSection && trimmed)) {
      const content = listMatch ? listMatch[1] : trimmed;
      const item = (
        <div key={`item-${index}`} className="flex items-start gap-2 text-sm text-gray-700 dark:text-neutral-300">
          <span className="text-gray-400 dark:text-neutral-500 mt-0.5">›</span>
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

// Types
interface ResponseAlert {
  type: 'critical' | 'warning' | 'info' | 'success';
  message: string;
  action?: AIAction;
}

interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  confidence?: number;
  suggestedActions?: AIAction[];
  dataUsed?: string[];
  warnings?: string[];
  feedback?: 'positive' | 'negative';
  isLoading?: boolean;
  // Structured response data
  alerts?: ResponseAlert[];
  relatedQueries?: string[];
}

interface AIAction {
  id: string;
  type: 'create' | 'update' | 'delete' | 'navigate' | 'export' | 'notify';
  label: string;
  labelVi: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  requiresApproval: boolean;
  payload?: any;
}

interface AIContext {
  page: string;
  module: string;
  userId: string;
  userName: string;
  userRole: string;
  selectedItems?: any[];
  filters?: Record<string, any>;
  language: 'en' | 'vi';
}

interface AIChatPanelProps {
  context: AIContext;
  isOpen: boolean;
  onClose: () => void;
  onActionExecute?: (action: AIAction) => void;
  position?: 'right' | 'left' | 'bottom';
  embedded?: boolean; // When true, renders without container/header
}

// Quick suggestions based on module
const QUICK_SUGGESTIONS: Record<string, { en: string; vi: string }[]> = {
  inventory: [
    { en: 'What items are low in stock?', vi: 'Linh kiện nào sắp hết hàng?' },
    { en: 'Show inventory value by category', vi: 'Hiển thị giá trị tồn kho theo danh mục' },
    { en: 'Which parts need reordering?', vi: 'Parts nào cần đặt hàng lại?' },
    { en: 'Analyze inventory turnover', vi: 'Phân tích vòng quay tồn kho' },
  ],
  sales: [
    { en: 'Show sales summary this month', vi: 'Tổng hợp bán hàng tháng này' },
    { en: 'Which products sell best?', vi: 'Sản phẩm nào bán chạy nhất?' },
    { en: 'Compare sales Q3 vs Q4', vi: 'So sánh doanh số Q3 và Q4' },
    { en: 'Any pending orders to follow up?', vi: 'Có đơn hàng nào cần theo dõi?' },
  ],
  procurement: [
    { en: 'Which POs are overdue?', vi: 'PO nào đã quá hạn?' },
    { en: 'Analyze supplier performance', vi: 'Phân tích hiệu suất NCC' },
    { en: 'Suggest alternative suppliers', vi: 'Đề xuất NCC thay thế' },
    { en: 'What should I order this week?', vi: 'Tuần này nên đặt hàng gì?' },
  ],
  production: [
    { en: 'Active work orders status', vi: 'Trạng thái WO đang chạy' },
    { en: 'Any material shortages?', vi: 'Có thiếu vật tư không?' },
    { en: 'Production efficiency this month', vi: 'Hiệu suất sản xuất tháng này' },
    { en: 'Optimize production schedule', vi: 'Tối ưu lịch sản xuất' },
  ],
  quality: [
    { en: 'Open NCRs summary', vi: 'Tổng hợp NCR đang mở' },
    { en: 'Quality trends analysis', vi: 'Phân tích xu hướng chất lượng' },
    { en: 'Suppliers with quality issues', vi: 'NCC có vấn đề chất lượng' },
    { en: 'First pass yield report', vi: 'Báo cáo FPY' },
  ],
  analytics: [
    { en: 'Key metrics overview', vi: 'Tổng quan chỉ số chính' },
    { en: 'Revenue trend analysis', vi: 'Phân tích xu hướng doanh thu' },
    { en: 'Cost breakdown report', vi: 'Báo cáo phân tích chi phí' },
    { en: 'Forecast next quarter', vi: 'Dự báo quý tới' },
  ],
  default: [
    { en: 'How can I help you today?', vi: 'Tôi có thể giúp gì cho bạn?' },
    { en: 'Show system overview', vi: 'Hiển thị tổng quan hệ thống' },
    { en: 'What are today\'s alerts?', vi: 'Có cảnh báo gì hôm nay?' },
    { en: 'Generate daily report', vi: 'Tạo báo cáo hàng ngày' },
  ],
};

// Confidence indicator component
const ConfidenceIndicator = ({ confidence, language }: { confidence: number; language: string }) => {
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
const ActionButton = ({
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



  // Get suggestions for current module
  const currentSuggestions = QUICK_SUGGESTIONS[context.module] || QUICK_SUGGESTIONS.default;

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
          query: content.trim(),
          context,
          history: messages.slice(-10),
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
      console.error('Chat error:', error);
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
  // MOVED HERE primarily to access 'sendMessage' which is defined above
  useEffect(() => {
    const handleFillInput = (e: CustomEvent) => {
      if (e.detail?.text) {
        setInputValue(e.detail.text);
        // Optionally auto-send immediate actions like "Analyze"
        if (e.detail.autoSend) {
          sendMessage(e.detail.text);
        } else {
          inputRef.current?.focus();
        }
      }
    };

    window.addEventListener('copilot:fill-input' as any, handleFillInput);
    return () => {
      window.removeEventListener('copilot:fill-input' as any, handleFillInput);
    };
  }, [sendMessage]);

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

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
    // Post feedback to the AI feedback endpoint
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

    // Add confirmation message
    setMessages(prev => [...prev, {
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content: context.language === 'vi'
        ? `✅ Đang thực hiện: ${action.labelVi}...`
        : `✅ Executing: ${action.label}...`,
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

          {/* Context Analysis Card */}
          {context.selectedItems && context.selectedItems.length > 0 && context.selectedItems[0]?.id && (
            <div className="mb-4">
              <ContextAnalysisCard
                selectedItem={context.selectedItems[0]}
                type={
                  (context.selectedItems[0] as any)?.type ||
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

          {/* Quick suggestions - Only show if no context (or different suggestions for context?) */}
          {/* For now, hide standard suggestions if context is active to focus on the item */}
          {showSuggestions && messages.length === 0 && (!context.selectedItems || context.selectedItems.length === 0) && (
            <div className="space-y-2">
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider flex items-center justify-center">
                {context.language === 'vi' ? 'Gợi ý nhanh' : 'Quick suggestions'}
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {currentSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => sendMessage(context.language === 'vi' ? suggestion.vi : suggestion.en)}
                    className="px-3 py-1.5 text-xs bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 text-gray-600 dark:text-neutral-300 rounded hover:bg-neutral-50 dark:hover:bg-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors"
                  >
                    {context.language === 'vi' ? suggestion.vi : suggestion.en}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Context-aware Hints: Removed to prevent loading confusion */}

          {/* Messages */}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
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
                            onExecute={handleActionExecute}
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
                              onClick={() => sendMessage(query)}
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
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area - Modern Minimal Design */}
        <div className="p-3 bg-white dark:bg-neutral-800 border-t border-gray-100 dark:border-neutral-700/50">
          <div className="flex items-center gap-2 p-1 bg-gray-50 dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-700 focus-within:border-blue-400 dark:focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:ring-blue-900/30 transition-all">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={context.language === 'vi' ? 'Nhập tin nhắn...' : 'Message...'}
              className="flex-1 h-9 px-3 py-2 bg-transparent text-gray-900 dark:text-white text-sm placeholder-gray-400 dark:placeholder-neutral-500 resize-none focus:outline-none"
              rows={1}
              disabled={isLoading}
            />
            <button
              onClick={() => sendMessage(inputValue)}
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
            ⌘J · {context.language === 'vi' ? 'AI có thể mắc lỗi' : 'AI can make mistakes'} · RTR AI v1.0
          </p>
        </div>
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
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          >
            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-neutral-900">

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
                      onClick={() => sendMessage(context.language === 'vi' ? suggestion.vi : suggestion.en)}
                      className="px-3 py-1.5 text-xs bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-neutral-300 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
                    >
                      {context.language === 'vi' ? suggestion.vi : suggestion.en}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
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
                                  onExecute={handleActionExecute}
                                />
                              ))}
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex items-center space-x-2 mt-2">
                            <button
                              onClick={() => copyToClipboard(message.content, message.id)}
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
                              onClick={() => handleFeedback(message.id, 'positive')}
                              className={`p-1 transition-colors ${message.feedback === 'positive'
                                ? 'text-green-500'
                                : 'text-gray-400 hover:text-green-500'
                                }`}
                              title={context.language === 'vi' ? 'Hữu ích' : 'Helpful'}
                            >
                              <ThumbsUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleFeedback(message.id, 'negative')}
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
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area - Modern Minimal Design */}
          <div className="p-3 bg-white dark:bg-neutral-800 border-t border-gray-100 dark:border-neutral-700/50">
            <div className="flex items-center gap-2 p-1 bg-gray-50 dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-700 focus-within:border-blue-400 dark:focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:ring-blue-900/30 transition-all">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={context.language === 'vi' ? 'Nhập tin nhắn...' : 'Message...'}
                className="flex-1 h-9 px-3 py-2 bg-transparent text-gray-900 dark:text-white text-sm placeholder-gray-400 dark:placeholder-neutral-500 resize-none focus:outline-none"
                rows={1}
                disabled={isLoading}
              />
              <button
                onClick={() => sendMessage(inputValue)}
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
              ⌘J · {context.language === 'vi' ? 'AI có thể mắc lỗi' : 'AI can make mistakes'} · RTR AI v1.0
            </p>
          </div>
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
