'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { usePathname } from 'next/navigation';

// =============================================================================
// RTR AI COPILOT - CONTEXT PROVIDER
// Manages AI context across the application
// =============================================================================

// Types
export interface AIContext {
  page: string;
  module: string;
  userId: string;
  userName: string;
  userRole: string;
  selectedItems: Record<string, unknown>[];
  filters: Record<string, unknown>;
  recentActions: string[];
  language: 'en' | 'vi';
}

export interface AINotification {
  id: string;
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface AIState {
  isEnabled: boolean;
  isChatOpen: boolean;
  context: AIContext;
  notifications: AINotification[];
  unreadCount: number;
}

interface AIContextValue extends AIState {
  // Chat controls
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  
  // Context management
  updateContext: (updates: Partial<AIContext>) => void;
  setSelectedItems: (items: Record<string, unknown>[]) => void;
  setFilters: (filters: Record<string, unknown>) => void;
  addRecentAction: (action: string) => void;
  
  // Notifications
  addNotification: (notification: Omit<AINotification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  
  // Settings
  enableAI: () => void;
  disableAI: () => void;
}

// Module detection based on pathname
function detectModule(pathname: string): string {
  const moduleMap: Record<string, string> = {
    '/inventory': 'inventory',
    '/parts': 'inventory',
    '/warehouses': 'inventory',
    '/sales': 'sales',
    '/orders': 'sales',
    '/customers': 'sales',
    '/quotations': 'sales',
    '/procurement': 'procurement',
    '/purchase-orders': 'procurement',
    '/suppliers': 'procurement',
    '/production': 'production',
    '/work-orders': 'production',
    '/bom': 'production',
    '/quality': 'quality',
    '/ncr': 'quality',
    '/capa': 'quality',
    '/analytics': 'analytics',
    '/dashboard': 'analytics',
    '/data-migration': 'data-migration',
    '/settings': 'settings',
    '/users': 'settings',
  };
  
  for (const [path, module] of Object.entries(moduleMap)) {
    if (pathname.startsWith(path)) {
      return module;
    }
  }
  
  return 'general';
}

// Page name detection
function detectPageName(pathname: string): string {
  const pageNames: Record<string, string> = {
    '/': 'Dashboard',
    '/inventory': 'Inventory',
    '/parts': 'Parts',
    '/sales': 'Sales',
    '/orders': 'Orders',
    '/customers': 'Customers',
    '/procurement': 'Procurement',
    '/purchase-orders': 'Purchase Orders',
    '/suppliers': 'Suppliers',
    '/production': 'Production',
    '/work-orders': 'Work Orders',
    '/quality': 'Quality',
    '/ncr': 'NCR',
    '/capa': 'CAPA',
    '/analytics': 'Analytics',
    '/data-migration': 'Data Migration',
  };
  
  return pageNames[pathname] || pathname.split('/').pop() || 'Unknown';
}

// Create context
const AIContextContext = createContext<AIContextValue | null>(null);

// Provider props
interface AIProviderProps {
  children: ReactNode;
  user?: {
    id: string;
    name: string;
    role: string;
  };
  language?: 'en' | 'vi';
}

// Provider component
export function AIProvider({ children, user, language = 'vi' }: AIProviderProps) {
  const pathname = usePathname();
  
  const [state, setState] = useState<AIState>({
    isEnabled: true,
    isChatOpen: false,
    context: {
      page: '',
      module: 'general',
      userId: user?.id || 'anonymous',
      userName: user?.name || 'User',
      userRole: user?.role || 'user',
      selectedItems: [],
      filters: {},
      recentActions: [],
      language,
    },
    notifications: [],
    unreadCount: 0,
  });
  
  // Update context when pathname changes
  useEffect(() => {
    setState(prev => ({
      ...prev,
      context: {
        ...prev.context,
        page: detectPageName(pathname),
        module: detectModule(pathname),
      },
    }));
  }, [pathname]);
  
  // Update language when prop changes
  useEffect(() => {
    setState(prev => ({
      ...prev,
      context: {
        ...prev.context,
        language,
      },
    }));
  }, [language]);
  
  // Chat controls
  const openChat = useCallback(() => {
    setState(prev => ({ ...prev, isChatOpen: true }));
  }, []);
  
  const closeChat = useCallback(() => {
    setState(prev => ({ ...prev, isChatOpen: false }));
  }, []);
  
  const toggleChat = useCallback(() => {
    setState(prev => ({ ...prev, isChatOpen: !prev.isChatOpen }));
  }, []);
  
  // Context management
  const updateContext = useCallback((updates: Partial<AIContext>) => {
    setState(prev => ({
      ...prev,
      context: {
        ...prev.context,
        ...updates,
      },
    }));
  }, []);
  
  const setSelectedItems = useCallback((items: Record<string, unknown>[]) => {
    setState(prev => ({
      ...prev,
      context: {
        ...prev.context,
        selectedItems: items,
      },
    }));
  }, []);
  
  const setFilters = useCallback((filters: Record<string, unknown>) => {
    setState(prev => ({
      ...prev,
      context: {
        ...prev.context,
        filters,
      },
    }));
  }, []);
  
  const addRecentAction = useCallback((action: string) => {
    setState(prev => ({
      ...prev,
      context: {
        ...prev.context,
        recentActions: [action, ...prev.context.recentActions.slice(0, 9)],
      },
    }));
  }, []);
  
  // Notifications
  const addNotification = useCallback((notification: Omit<AINotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: AINotification = {
      ...notification,
      id: `notif_${Date.now()}`,
      timestamp: new Date(),
      read: false,
    };
    
    setState(prev => ({
      ...prev,
      notifications: [newNotification, ...prev.notifications.slice(0, 49)],
      unreadCount: prev.unreadCount + 1,
    }));
  }, []);
  
  const markNotificationRead = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => 
        n.id === id ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(0, prev.unreadCount - 1),
    }));
  }, []);
  
  const clearNotifications = useCallback(() => {
    setState(prev => ({
      ...prev,
      notifications: [],
      unreadCount: 0,
    }));
  }, []);
  
  // Settings
  const enableAI = useCallback(() => {
    setState(prev => ({ ...prev, isEnabled: true }));
  }, []);
  
  const disableAI = useCallback(() => {
    setState(prev => ({ ...prev, isEnabled: false, isChatOpen: false }));
  }, []);
  
  const value: AIContextValue = {
    ...state,
    openChat,
    closeChat,
    toggleChat,
    updateContext,
    setSelectedItems,
    setFilters,
    addRecentAction,
    addNotification,
    markNotificationRead,
    clearNotifications,
    enableAI,
    disableAI,
  };
  
  return (
    <AIContextContext.Provider value={value}>
      {children}
    </AIContextContext.Provider>
  );
}

// Hook to use AI context
export function useAI() {
  const context = useContext(AIContextContext);
  
  if (!context) {
    throw new Error('useAI must be used within an AIProvider');
  }
  
  return context;
}

// Hook for AI chat specifically
export function useAIChat() {
  const { isChatOpen, openChat, closeChat, toggleChat, context, isEnabled } = useAI();
  
  return {
    isOpen: isChatOpen,
    open: openChat,
    close: closeChat,
    toggle: toggleChat,
    context,
    isEnabled,
  };
}

// Hook for AI notifications
export function useAINotifications() {
  const { notifications, unreadCount, addNotification, markNotificationRead, clearNotifications } = useAI();
  
  return {
    notifications,
    unreadCount,
    add: addNotification,
    markRead: markNotificationRead,
    clear: clearNotifications,
  };
}

// Hook for tracking selected items
export function useAISelection() {
  const { context, setSelectedItems } = useAI();
  
  return {
    selectedItems: context.selectedItems,
    setSelectedItems,
    hasSelection: context.selectedItems.length > 0,
    selectionCount: context.selectedItems.length,
  };
}

// Hook for tracking filters
export function useAIFilters() {
  const { context, setFilters } = useAI();
  
  return {
    filters: context.filters,
    setFilters,
    hasFilters: Object.keys(context.filters).length > 0,
  };
}

// Utility: Get contextual suggestions based on current page
export function getContextualSuggestions(module: string, language: 'en' | 'vi'): string[] {
  const suggestions: Record<string, { en: string[]; vi: string[] }> = {
    inventory: {
      en: [
        'Show low stock items',
        'What is the total inventory value?',
        'Which parts should I reorder?',
        'Analyze inventory by category',
      ],
      vi: [
        'Hiển thị hàng sắp hết',
        'Tổng giá trị tồn kho là bao nhiêu?',
        'Linh kiện nào cần đặt hàng?',
        'Phân tích tồn kho theo danh mục',
      ],
    },
    sales: {
      en: [
        'Show sales this month',
        'What are my top selling products?',
        'Any pending orders?',
        'Compare sales by quarter',
      ],
      vi: [
        'Doanh số tháng này',
        'Sản phẩm bán chạy nhất?',
        'Có đơn hàng nào đang chờ?',
        'So sánh doanh số theo quý',
      ],
    },
    production: {
      en: [
        'Show active work orders',
        'Any material shortages?',
        'Production efficiency this month',
        'What is due this week?',
      ],
      vi: [
        'Work Order đang chạy',
        'Có thiếu vật tư không?',
        'Hiệu suất sản xuất tháng này',
        'Tuần này có gì đến hạn?',
      ],
    },
    quality: {
      en: [
        'Show open NCRs',
        'Quality trend analysis',
        'Suppliers with issues',
        'First pass yield report',
      ],
      vi: [
        'NCR đang mở',
        'Phân tích xu hướng chất lượng',
        'NCC có vấn đề',
        'Báo cáo FPY',
      ],
    },
    procurement: {
      en: [
        'Show overdue POs',
        'Supplier performance',
        'What should I order?',
        'Price trends',
      ],
      vi: [
        'PO quá hạn',
        'Hiệu suất NCC',
        'Nên đặt hàng gì?',
        'Xu hướng giá',
      ],
    },
    general: {
      en: [
        'System overview',
        'Today\'s alerts',
        'Generate daily report',
        'Help me with...',
      ],
      vi: [
        'Tổng quan hệ thống',
        'Cảnh báo hôm nay',
        'Tạo báo cáo hàng ngày',
        'Hỗ trợ tôi với...',
      ],
    },
  };
  
  const moduleSuggestions = suggestions[module] || suggestions.general;
  return language === 'vi' ? moduleSuggestions.vi : moduleSuggestions.en;
}
