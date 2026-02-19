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
  TrendingUp,
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { clientLogger } from '@/lib/client-logger';

// =============================================================================
// AI ASSISTANT WIDGET
// Trợ lý AI thông minh - Không sử dụng tên riêng của bất kỳ AI provider nào
// =============================================================================

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

interface QuickAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  query: string;
  color: string;
}

const quickActions: QuickAction[] = [
  {
    id: '1',
    icon: <AlertTriangle className="w-4 h-4" />,
    label: 'Vật tư thiếu',
    query: 'Những vật tư nào đang thiếu hụt nghiêm trọng?',
    color: 'text-red-500 bg-red-50 dark:bg-red-900/20',
  },
  {
    id: '2',
    icon: <Package className="w-4 h-4" />,
    label: 'Tồn kho thấp',
    query: 'Vật tư nào sắp hết trong 2 tuần tới?',
    color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20',
  },
  {
    id: '3',
    icon: <ShoppingCart className="w-4 h-4" />,
    label: 'Đơn hàng chờ',
    query: 'Tổng hợp các đơn hàng đang chờ xử lý',
    color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20',
  },
  {
    id: '4',
    icon: <Factory className="w-4 h-4" />,
    label: 'Tiến độ SX',
    query: 'Tình trạng sản xuất hôm nay thế nào?',
    color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20',
  },
];

const suggestedQuestions = [
  'Phân tích xu hướng doanh thu tháng này',
  'So sánh hiệu suất với tháng trước',
  'Dự báo nhu cầu nguyên vật liệu tuần tới',
  'Đề xuất tối ưu tồn kho',
];

// Simulated AI responses
const simulateResponse = (query: string): Promise<string> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const lowerQuery = query.toLowerCase();
      
      if (lowerQuery.includes('thiếu') || lowerQuery.includes('shortage')) {
        resolve(`📊 **Phân tích vật tư thiếu hụt:**

🔴 **Nghiêm trọng (2 items):**
• CMP-BRG-002 - Bạc đạn 6201: Thiếu 65 pcs
• CMP-MOT-001 - Motor DC 12V: Thiếu 25 pcs

🟡 **Cảnh báo (2 items):**
• RM-STL-002 - Thép tấm 3mm: Thiếu 100kg
• CMP-GBX-001 - Hộp số 1:10: Thiếu 12 pcs

💡 **Đề xuất:** Tạo PO khẩn cấp cho SKF Vietnam và Oriental Motor.`);
      } else if (lowerQuery.includes('tồn kho') || lowerQuery.includes('hết')) {
        resolve(`📦 **Cảnh báo tồn kho thấp:**

Có **6 vật tư** cần chú ý trong 2 tuần tới:

1. 🔴 CMP-BRG-002 - Còn 25 pcs (Min: 50)
2. 🔴 CMP-MOT-001 - Còn 15 pcs (Min: 20)
3. 🟡 RM-STL-002 - Còn 120 kg (Min: 150)
4. 🟡 CMP-GBX-001 - Còn 18 pcs (Min: 25)
5. 🟢 RM-ALU-001 - Còn 85 kg (Min: 80) ✓
6. 🟢 CMP-SEN-001 - Còn 80 pcs (Min: 50) ✓

💡 **Gợi ý:** Chạy MRP để xem chi tiết và tạo đề xuất mua hàng.`);
      } else if (lowerQuery.includes('đơn hàng') || lowerQuery.includes('order')) {
        resolve(`📋 **Tổng hợp đơn hàng:**

📊 **Tổng quan:**
• Tổng đơn: 156 đơn
• Chờ xác nhận: 12 đơn
• Đang xử lý: 28 đơn
• Hoàn thành tuần này: 15 đơn

⏰ **Cần xử lý gấp:**
• SO-2025-001 (ABC Manufacturing) - Giao 15/01
• SO-2025-002 (XYZ Industries) - Giao 20/01

💰 **Doanh thu tháng:** 3.45 tỷ VND (+15.3%)`);
      } else if (lowerQuery.includes('sản xuất') || lowerQuery.includes('production')) {
        resolve(`🏭 **Tình trạng sản xuất:**

📈 **Hiệu suất hôm nay:** 94.5%

✅ **Đang chạy:**
• WO-2025-001: Model A1 (8/10 hoàn thành)
• WO-2025-002: Model A2 (3/5 hoàn thành)

⏳ **Chờ vật tư:**
• WO-2025-003: Thiếu Motor DC 12V

⚠️ **Cần chú ý:**
• Máy CNC-02 bảo trì lúc 14:00
• 2 NCR mới cần xử lý`);
      } else {
        resolve(`Tôi đã nhận được câu hỏi của bạn: "${query}"

Để trả lời chính xác, tôi cần phân tích dữ liệu từ hệ thống. 

💡 **Bạn có thể thử:**
• Hỏi về tình trạng tồn kho
• Xem đơn hàng đang chờ
• Kiểm tra tiến độ sản xuất
• Phân tích vật tư thiếu hụt`);
      }
    }, 1000);
  });
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function AIAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const handleSend = async (query: string) => {
    if (!query.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await simulateResponse(query);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
        suggestions: suggestedQuestions.slice(0, 2),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      clientLogger.error('AI assistant error', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleQuickAction = (action: QuickAction) => {
    handleSend(action.query);
  };

  const clearChat = () => {
    setMessages([]);
  };

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
        
        {/* Pulse animation */}
        <span className="absolute inset-0 rounded-full bg-purple-400 animate-ping opacity-25" />
        
        {/* Badge */}
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white dark:border-gray-900">
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
            <h3 className="font-semibold">Trợ lý AI</h3>
            <p className="text-xs text-white/80">Sẵn sàng hỗ trợ bạn</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            title={isExpanded ? 'Thu nhỏ' : 'Mở rộng'}
          >
            {isExpanded ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            title="Đóng"
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
                {quickActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => handleQuickAction(action)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2.5 rounded-xl',
                      'text-left text-sm font-medium',
                      'border border-gray-200 dark:border-gray-700',
                      'hover:border-purple-300 dark:hover:border-purple-700',
                      'hover:shadow-md transition-all duration-200',
                      action.color
                    )}
                  >
                    {action.icon}
                    <span className="text-gray-700 dark:text-gray-300">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex gap-3',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-4 py-3',
                    message.role === 'user'
                      ? 'bg-purple-600 text-white rounded-br-md'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-md'
                  )}
                >
                  <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                  
                  {message.role === 'assistant' && (
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <button
                        onClick={() => handleCopy(message.content, message.id)}
                        className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
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

                  {/* Suggestions */}
                  {message.suggestions && message.suggestions.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-1.5">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Câu hỏi liên quan:</p>
                      {message.suggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSend(suggestion)}
                          className="block w-full text-left text-xs px-2 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                        >
                          <ChevronRight className="w-3 h-3 inline mr-1" />
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  </div>
                )}
              </div>
            ))}

            {/* Loading */}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                    <span className="text-sm text-gray-500">Đang phân tích...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        {messages.length > 0 && (
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={clearChat}
              className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Cuộc hội thoại mới
            </button>
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
            onClick={() => handleSend(input)}
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
            <Send className="w-5 h-5" />
          </button>
        </div>
        
        <p className="text-[10px] text-gray-400 text-center mt-2">
          Trợ lý AI giúp bạn truy vấn dữ liệu và phân tích nhanh
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// INLINE AI HELP TOOLTIP
// =============================================================================

interface AIHelpTooltipProps {
  term: string;
  children: React.ReactNode;
}

export function AIHelpTooltip({ term, children }: AIHelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const explanations: Record<string, string> = {
    'reorder_point': 'Điểm đặt hàng lại - Mức tồn kho tối thiểu trước khi cần đặt hàng mới. Khi tồn kho giảm xuống mức này, hệ thống sẽ cảnh báo.',
    'safety_stock': 'Tồn kho an toàn - Lượng hàng dự trữ để đề phòng biến động nhu cầu hoặc chậm trễ giao hàng từ nhà cung cấp.',
    'lead_time': 'Thời gian chờ - Số ngày từ khi đặt hàng đến khi nhận được hàng từ nhà cung cấp.',
    'bom': 'Bill of Materials - Danh sách tất cả nguyên vật liệu, linh kiện cần thiết để sản xuất một sản phẩm.',
    'mrp': 'Material Requirements Planning - Hệ thống hoạch định nhu cầu nguyên vật liệu dựa trên đơn hàng và BOM.',
    'net_requirement': 'Nhu cầu thực = Nhu cầu brutto - Tồn kho - Đang đặt + Tồn an toàn',
  };

  const loadExplanation = () => {
    setIsLoading(true);
    setTimeout(() => {
      setExplanation(explanations[term] || 'Đang cập nhật giải thích...');
      setIsLoading(false);
    }, 300);
  };

  return (
    <span className="relative inline-flex items-center gap-1">
      {children}
      <button
        onMouseEnter={() => {
          setIsOpen(true);
          if (!explanation) loadExplanation();
        }}
        onMouseLeave={() => setIsOpen(false)}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
      >
        <HelpCircle className="w-3 h-3" />
      </button>
      
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 z-50 w-64 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 text-sm">
          <div className="flex items-start gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span className="text-gray-500">Đang tải...</span>
                </div>
              ) : (
                <p className="text-gray-700 dark:text-gray-300">{explanation}</p>
              )}
            </div>
          </div>
          {/* Arrow */}
          <div className="absolute -bottom-1 left-4 w-2 h-2 bg-white dark:bg-gray-800 border-r border-b border-gray-200 dark:border-gray-700 transform rotate-45" />
        </div>
      )}
    </span>
  );
}

// =============================================================================
// AI INSIGHT CARD
// =============================================================================

interface AIInsightCardProps {
  type: 'warning' | 'info' | 'success' | 'action';
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: () => void;
}

export function AIInsightCard({ type, title, description, action, onDismiss }: AIInsightCardProps) {
  const styles = {
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-200 dark:border-amber-800',
      icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
      iconBg: 'bg-amber-100 dark:bg-amber-900/40',
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      icon: <Lightbulb className="w-5 h-5 text-blue-500" />,
      iconBg: 'bg-blue-100 dark:bg-blue-900/40',
    },
    success: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      icon: <TrendingUp className="w-5 h-5 text-green-500" />,
      iconBg: 'bg-green-100 dark:bg-green-900/40',
    },
    action: {
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      border: 'border-purple-200 dark:border-purple-800',
      icon: <Zap className="w-5 h-5 text-purple-500" />,
      iconBg: 'bg-purple-100 dark:bg-purple-900/40',
    },
  };

  const style = styles[type];

  return (
    <div className={cn(
      'relative p-4 rounded-xl border',
      style.bg,
      style.border
    )}>
      <div className="flex items-start gap-3">
        <div className={cn('p-2 rounded-lg', style.iconBg)}>
          {style.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-3 h-3 text-purple-500" />
            <span className="text-[10px] font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wider">
              AI Insight
            </span>
          </div>
          <h4 className="font-medium text-gray-900 dark:text-white">{title}</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{description}</p>
          
          {action && (
            <button
              onClick={action.onClick}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
            >
              {action.label}
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export default AIAssistantWidget;
