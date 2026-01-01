'use client';

// =============================================================================
// DASHBOARD DATA HOOKS
// Hooks để fetch và quản lý data cho Dashboard
// =============================================================================

import { useState, useEffect, useCallback } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export interface DashboardStats {
  revenue: {
    current: number;
    previous: number;
    growth: number;
    currency: string;
  };
  orders: {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    growth: number;
  };
  inventory: {
    totalItems: number;
    totalValue: number;
    lowStock: number;
    outOfStock: number;
    healthy: number;
  };
  production: {
    efficiency: number;
    running: number;
    waiting: number;
    completed: number;
  };
  quality: {
    passRate: number;
    openNCRs: number;
    inspectionsToday: number;
  };
}

export interface RecentOrder {
  id: string;
  orderNumber: string;
  customer: string;
  value: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  date: string;
  items: number;
}

export interface AlertItem {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  category: 'inventory' | 'orders' | 'production' | 'quality' | 'system';
  title: string;
  description?: string;
  timestamp: Date;
  actionLabel?: string;
  actionHref?: string;
}

export interface ActivityItem {
  id: string;
  type: 'order' | 'inventory' | 'production' | 'quality' | 'system';
  action: string;
  description: string;
  user: string;
  timestamp: Date;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

// =============================================================================
// MOCK DATA - Replace with API calls in production
// =============================================================================

const mockStats: DashboardStats = {
  revenue: {
    current: 3450000000,
    previous: 2990000000,
    growth: 15.3,
    currency: 'VND',
  },
  orders: {
    total: 156,
    pending: 12,
    processing: 28,
    completed: 116,
    growth: 8.2,
  },
  inventory: {
    totalItems: 1645,
    totalValue: 4850000000,
    lowStock: 45,
    outOfStock: 8,
    healthy: 1592,
  },
  production: {
    efficiency: 94.5,
    running: 8,
    waiting: 3,
    completed: 15,
  },
  quality: {
    passRate: 98.2,
    openNCRs: 3,
    inspectionsToday: 24,
  },
};

const mockRecentOrders: RecentOrder[] = [
  { id: '1', orderNumber: 'SO-2025-001', customer: 'ABC Manufacturing', value: 285000000, status: 'processing', date: '2025-01-02', items: 5 },
  { id: '2', orderNumber: 'SO-2025-002', customer: 'XYZ Industries', value: 452000000, status: 'pending', date: '2025-01-02', items: 8 },
  { id: '3', orderNumber: 'SO-2024-155', customer: 'AgriTech Corp', value: 128000000, status: 'completed', date: '2025-01-01', items: 3 },
  { id: '4', orderNumber: 'SO-2024-154', customer: 'Tech Solutions', value: 95000000, status: 'completed', date: '2024-12-31', items: 2 },
  { id: '5', orderNumber: 'SO-2024-153', customer: 'Green Energy', value: 220000000, status: 'completed', date: '2024-12-30', items: 6 },
];

const mockAlerts: AlertItem[] = [
  { id: '1', type: 'critical', category: 'inventory', title: '2 vật tư thiếu hụt nghiêm trọng', description: 'CMP-BRG-002, CMP-MOT-001 cần đặt hàng gấp', timestamp: new Date(), actionLabel: 'Xem chi tiết', actionHref: '/inventory?filter=critical' },
  { id: '2', type: 'warning', category: 'orders', title: '5 đơn hàng chờ xác nhận', description: 'Có 5 đơn hàng mới cần xử lý', timestamp: new Date(), actionLabel: 'Xử lý', actionHref: '/sales?filter=pending' },
  { id: '3', type: 'info', category: 'production', title: 'Máy CNC-02 bảo trì lúc 14:00', description: 'Bảo trì định kỳ, ước tính 2 giờ', timestamp: new Date() },
  { id: '4', type: 'warning', category: 'quality', title: '3 NCR đang mở', description: 'Cần xử lý trong tuần này', timestamp: new Date(), actionLabel: 'Xem NCR', actionHref: '/quality?tab=ncr' },
];

const mockActivities: ActivityItem[] = [
  { id: '1', type: 'order', action: 'Tạo đơn hàng', description: 'SO-2025-002 - XYZ Industries', user: 'Nguyễn Văn A', timestamp: new Date(Date.now() - 30 * 60000) },
  { id: '2', type: 'inventory', action: 'Nhập kho', description: 'CMP-MOT-001 - 50 pcs', user: 'Trần Thị B', timestamp: new Date(Date.now() - 60 * 60000) },
  { id: '3', type: 'production', action: 'Hoàn thành WO', description: 'WO-2025-001 - Model A1', user: 'Lê Văn C', timestamp: new Date(Date.now() - 90 * 60000) },
  { id: '4', type: 'quality', action: 'Đóng NCR', description: 'NCR-2024-042 - Đã khắc phục', user: 'Phạm Thị D', timestamp: new Date(Date.now() - 120 * 60000) },
  { id: '5', type: 'system', action: 'Chạy MRP', description: 'MRP cho 3 đơn hàng mới', user: 'System', timestamp: new Date(Date.now() - 150 * 60000) },
];

const mockRevenueChart: ChartDataPoint[] = [
  { label: 'T7', value: 2800 },
  { label: 'T8', value: 2950 },
  { label: 'T9', value: 3100 },
  { label: 'T10', value: 2990 },
  { label: 'T11', value: 3200 },
  { label: 'T12', value: 3450 },
];

const mockInventoryChart: ChartDataPoint[] = [
  { label: 'Đủ hàng', value: 1592, color: '#22C55E' },
  { label: 'Sắp hết', value: 45, color: '#F59E0B' },
  { label: 'Hết hàng', value: 8, color: '#EF4444' },
];

const mockProductionChart: ChartDataPoint[] = [
  { label: 'T2', value: 12 },
  { label: 'T3', value: 15 },
  { label: 'T4', value: 18 },
  { label: 'T5', value: 14 },
  { label: 'T6', value: 16 },
  { label: 'T7', value: 15 },
  { label: 'CN', value: 8 },
];

// =============================================================================
// HOOKS
// =============================================================================

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      setStats(mockStats);
    } catch (err) {
      setError('Failed to fetch stats');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, isLoading, error, refetch: fetchStats };
}

export function useRecentOrders(limit: number = 5) {
  const [orders, setOrders] = useState<RecentOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 300));
      setOrders(mockRecentOrders.slice(0, limit));
      setIsLoading(false);
    };
    fetchOrders();
  }, [limit]);

  return { orders, isLoading };
}

export function useAlerts() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 200));
      setAlerts(mockAlerts);
      setIsLoading(false);
    };
    fetchAlerts();
  }, []);

  const dismissAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setAlerts([]);
  }, []);

  return { alerts, isLoading, dismissAlert, dismissAll };
}

export function useActivities(limit: number = 5) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 300));
      setActivities(mockActivities.slice(0, limit));
      setIsLoading(false);
    };
    fetchActivities();
  }, [limit]);

  return { activities, isLoading };
}

export function useChartData() {
  const [revenue, setRevenue] = useState<ChartDataPoint[]>([]);
  const [inventory, setInventory] = useState<ChartDataPoint[]>([]);
  const [production, setProduction] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchChartData = async () => {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 400));
      setRevenue(mockRevenueChart);
      setInventory(mockInventoryChart);
      setProduction(mockProductionChart);
      setIsLoading(false);
    };
    fetchChartData();
  }, []);

  return { revenue, inventory, production, isLoading };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function formatCurrency(value: number, currency: string = 'VND'): string {
  if (currency === 'VND') {
    if (value >= 1000000000) {
      return `${(value / 1000000000).toFixed(2)} tỷ`;
    }
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)} tr`;
    }
    return new Intl.NumberFormat('vi-VN').format(value);
  }
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value);
}

export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  if (days < 7) return `${days} ngày trước`;
  return date.toLocaleDateString('vi-VN');
}

export function getStatusColor(status: string): { bg: string; text: string; dot: string } {
  const colors: Record<string, { bg: string; text: string; dot: string }> = {
    pending: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
    processing: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-500' },
    completed: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-400', dot: 'bg-green-500' },
    cancelled: { bg: 'bg-gray-50 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-400', dot: 'bg-gray-500' },
    critical: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500' },
    warning: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
    info: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-500' },
    success: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-400', dot: 'bg-green-500' },
  };
  return colors[status] || colors.info;
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Chờ xử lý',
    processing: 'Đang xử lý',
    completed: 'Hoàn thành',
    cancelled: 'Đã hủy',
  };
  return labels[status] || status;
}
