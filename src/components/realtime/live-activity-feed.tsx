'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Activity,
  ShoppingCart,
  Package,
  Factory,
  AlertTriangle,
  CheckCircle,
  Truck,
  Calculator,
  Settings,
  User,
  Clock,
  ArrowRight,
  Pause,
  Play,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSocket } from '@/lib/realtime/use-socket';
import {
  type RTREvent,
  type RTREventType,
  type OrderEventPayload,
  type InventoryEventPayload,
  type ProductionEventPayload,
  type QualityEventPayload,
  getEventLabel,
} from '@/lib/realtime/events';

// =============================================================================
// LIVE ACTIVITY FEED
// Real-time activity stream
// =============================================================================

// =============================================================================
// TYPES
// =============================================================================

interface ActivityItem {
  id: string;
  type: RTREventType;
  title: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  timestamp: Date;
  link?: string;
  user?: string;
  isNew?: boolean;
}

// =============================================================================
// ICON MAPPING
// =============================================================================

const eventConfig: Record<string, { icon: React.ReactNode; bg: string }> = {
  order: { icon: <ShoppingCart className="w-4 h-4" />, bg: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' },
  inventory: { icon: <Package className="w-4 h-4" />, bg: 'bg-green-100 dark:bg-green-900/30 text-green-600' },
  production: { icon: <Factory className="w-4 h-4" />, bg: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600' },
  quality: { icon: <AlertTriangle className="w-4 h-4" />, bg: 'bg-red-100 dark:bg-red-900/30 text-red-600' },
  mrp: { icon: <Calculator className="w-4 h-4" />, bg: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600' },
  system: { icon: <Settings className="w-4 h-4" />, bg: 'bg-gray-100 dark:bg-gray-700 text-gray-600' },
  dashboard: { icon: <Activity className="w-4 h-4" />, bg: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600' },
};

// =============================================================================
// TIME AGO HELPER
// =============================================================================

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diff < 10) return 'Vừa xong';
  if (diff < 60) return `${diff} giây trước`;
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return date.toLocaleDateString('vi-VN');
}

// =============================================================================
// EVENT TO ACTIVITY TRANSFORMER
// =============================================================================

function transformEventToActivity(event: RTREvent<unknown>): ActivityItem | null {
  const category = event.type.split(':')[0];
  const config = eventConfig[category] || eventConfig.system;
  
  let title = getEventLabel(event.type);
  let description = '';
  let link: string | undefined;
  let user: string | undefined;

  switch (event.type) {
    case 'order:created':
    case 'order:updated':
    case 'order:status_changed': {
      const payload = event.payload as OrderEventPayload;
      title = event.type === 'order:created' ? 'Đơn hàng mới' : 'Cập nhật đơn hàng';
      description = `${payload.orderNumber} - ${payload.customer || 'N/A'}${payload.status ? ` (${payload.status})` : ''}`;
      link = `/orders/${payload.orderId}`;
      user = payload.updatedBy;
      break;
    }

    case 'inventory:updated':
    case 'inventory:received': {
      const payload = event.payload as InventoryEventPayload;
      const change = payload.newQty - payload.previousQty;
      title = change > 0 ? 'Nhập kho' : 'Xuất kho';
      description = `${payload.partNumber} - ${Math.abs(change)} ${change > 0 ? 'nhập' : 'xuất'}`;
      link = `/inventory/${payload.partId}`;
      user = payload.updatedBy;
      break;
    }

    case 'inventory:low_stock':
    case 'inventory:out_of_stock': {
      const payload = event.payload as InventoryEventPayload;
      title = event.type === 'inventory:out_of_stock' ? '🚨 Hết hàng' : '⚠️ Tồn kho thấp';
      description = `${payload.partNumber} - ${payload.partName}`;
      link = `/inventory/${payload.partId}`;
      return {
        id: `${event.type}-${Date.now()}`,
        type: event.type,
        title,
        description,
        icon: <Package className="w-4 h-4" />,
        iconBg: event.type === 'inventory:out_of_stock' 
          ? 'bg-red-100 dark:bg-red-900/30 text-red-600'
          : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600',
        timestamp: new Date(event.timestamp),
        link,
        isNew: true,
      };
    }

    case 'production:progress':
    case 'production:completed':
    case 'production:started': {
      const payload = event.payload as ProductionEventPayload;
      title = event.type === 'production:completed' 
        ? '✅ Hoàn thành SX'
        : event.type === 'production:started'
        ? '🏭 Bắt đầu SX'
        : '📊 Tiến độ SX';
      description = `${payload.orderNumber} - ${payload.progress}%`;
      link = `/production/${payload.workOrderId}`;
      break;
    }

    case 'quality:ncr_created':
    case 'quality:ncr_updated':
    case 'quality:ncr_closed': {
      const payload = event.payload as QualityEventPayload;
      title = event.type === 'quality:ncr_created' ? '🔴 NCR mới' : 'Cập nhật NCR';
      description = `${payload.recordNumber} - ${payload.severity}`;
      link = `/quality/${payload.recordId}`;
      user = payload.reportedBy;
      break;
    }

    case 'dashboard:stats_updated':
      // Skip dashboard updates in activity feed
      return null;

    default:
      description = JSON.stringify(event.payload).slice(0, 50);
  }

  return {
    id: `${event.type}-${Date.now()}-${Math.random()}`,
    type: event.type,
    title,
    description,
    icon: config.icon,
    iconBg: config.bg,
    timestamp: new Date(event.timestamp),
    link,
    user,
    isNew: true,
  };
}

// =============================================================================
// ACTIVITY ITEM COMPONENT
// =============================================================================

interface ActivityItemProps {
  item: ActivityItem;
}

function ActivityItemComponent({ item }: ActivityItemProps) {
  const [isNew, setIsNew] = useState(item.isNew);

  useEffect(() => {
    if (isNew) {
      const timer = setTimeout(() => setIsNew(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isNew]);

  const content = (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-xl transition-all duration-500',
        isNew 
          ? 'bg-purple-50 dark:bg-purple-900/20 ring-2 ring-purple-500/30'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50',
        item.link && 'cursor-pointer'
      )}
    >
      <div className={cn('p-2 rounded-lg flex-shrink-0', item.iconBg)}>
        {item.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
            {item.title}
          </p>
          {isNew && (
            <span className="px-1.5 py-0.5 bg-purple-500 text-white text-[10px] font-bold rounded animate-pulse">
              MỚI
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
          {item.description}
        </p>
        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
          <Clock className="w-3 h-3" />
          <span>{formatTimeAgo(item.timestamp)}</span>
          {item.user && (
            <>
              <span>•</span>
              <User className="w-3 h-3" />
              <span>{item.user}</span>
            </>
          )}
        </div>
      </div>
      {item.link && (
        <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
      )}
    </div>
  );

  if (item.link) {
    return <Link href={item.link}>{content}</Link>;
  }

  return content;
}

// =============================================================================
// LIVE ACTIVITY FEED COMPONENT
// =============================================================================

interface LiveActivityFeedProps {
  maxItems?: number;
  className?: string;
  showControls?: boolean;
}

export function LiveActivityFeed({
  maxItems = 10,
  className,
  showControls = true,
}: LiveActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { subscribe, isConnected } = useSocket();

  // Subscribe to all events
  useEffect(() => {
    if (isPaused) return;

    const unsubscribe = subscribe<unknown>('*' as RTREventType, (event) => {
      const activity = transformEventToActivity(event);
      if (activity) {
        setActivities(prev => [activity, ...prev].slice(0, maxItems));
        setLastUpdate(new Date());
      }
    });

    return unsubscribe;
  }, [subscribe, maxItems, isPaused]);

  // Auto-scroll to new items
  useEffect(() => {
    if (containerRef.current && activities[0]?.isNew) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activities]);

  const handleRefresh = () => {
    setActivities([]);
    setLastUpdate(new Date());
  };

  return (
    <div className={cn('bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Hoạt động</h3>
          {isConnected && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Live
            </span>
          )}
        </div>
        {showControls && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                isPaused
                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600'
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
              title={isPaused ? 'Tiếp tục' : 'Tạm dừng'}
              aria-label={isPaused ? 'Tiếp tục' : 'Tạm dừng'}
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>
            <button
              onClick={handleRefresh}
              className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Làm mới"
              aria-label="Làm mới"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Activity List */}
      <div
        ref={containerRef}
        className="max-h-96 overflow-y-auto"
      >
        {activities.length === 0 ? (
          <div className="py-12 text-center">
            <Activity className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-500">Đang chờ hoạt động...</p>
            {isPaused && (
              <p className="text-xs text-amber-600 mt-2">
                Feed đang tạm dừng
              </p>
            )}
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {activities.map((activity) => (
              <ActivityItemComponent key={activity.id} item={activity} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {lastUpdate && (
        <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <p className="text-xs text-gray-500 text-center">
            Cập nhật lần cuối: {formatTimeAgo(lastUpdate)}
          </p>
        </div>
      )}
    </div>
  );
}

export default LiveActivityFeed;
