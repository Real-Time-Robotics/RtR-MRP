'use client';

import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Zap,
  ShoppingCart,
  Package,
  Factory,
  AlertTriangle,
  RefreshCw,
  Radio,
  Settings,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { eventSimulator } from '@/lib/realtime/simulator';
import { useSocket } from '@/lib/realtime/use-socket';

// =============================================================================
// REAL-TIME DEMO CONTROL PANEL
// For testing and demonstrating real-time features
// =============================================================================

interface DemoControlPanelProps {
  className?: string;
  defaultExpanded?: boolean;
}

export function DemoControlPanel({ className, defaultExpanded = false }: DemoControlPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isSimulating, setIsSimulating] = useState(false);
  const [eventCount, setEventCount] = useState(0);
  const { isConnected, emit } = useSocket();

  // Track event count
  useEffect(() => {
    if (isSimulating) {
      const interval = setInterval(() => {
        setEventCount(prev => prev + 1);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isSimulating]);

  // Toggle simulator
  const toggleSimulator = () => {
    if (isSimulating) {
      eventSimulator.stop();
      setIsSimulating(false);
    } else {
      eventSimulator.start({
        dashboardInterval: 10000,    // 10s for demo
        orderInterval: 15000,        // 15s
        inventoryInterval: 8000,     // 8s
        productionInterval: 12000,   // 12s
        notificationInterval: 20000, // 20s
      });
      setIsSimulating(true);
    }
  };

  // Manual triggers
  const triggerDashboardUpdate = () => {
    eventSimulator.triggerDashboardUpdate();
    setEventCount(prev => prev + 1);
  };

  const triggerNewOrder = () => {
    eventSimulator.triggerNewOrder();
    setEventCount(prev => prev + 1);
  };

  const triggerLowStock = () => {
    eventSimulator.triggerLowStock();
    setEventCount(prev => prev + 1);
  };

  const triggerNCR = () => {
    eventSimulator.triggerNCR();
    setEventCount(prev => prev + 1);
  };

  return (
    <div className={cn(
      'fixed bottom-4 left-4 z-50 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden',
      className
    )}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
      >
        <div className="flex items-center gap-2">
          <Radio className={cn('w-5 h-5', isSimulating && 'animate-pulse')} />
          <span className="font-semibold">Real-Time Demo</span>
          {isSimulating && (
            <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">
              LIVE
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs opacity-80">{eventCount} events</span>
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 space-y-4 w-72">
          {/* Connection Status */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Trạng thái:</span>
            <span className={cn(
              'flex items-center gap-1 font-medium',
              isConnected ? 'text-green-600' : 'text-red-600'
            )}>
              <span className={cn(
                'w-2 h-2 rounded-full',
                isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
              )} />
              {isConnected ? 'Đã kết nối' : 'Mất kết nối'}
            </span>
          </div>

          {/* Simulator Toggle */}
          <button
            onClick={toggleSimulator}
            className={cn(
              'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all',
              isSimulating
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200'
                : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200'
            )}
          >
            {isSimulating ? (
              <>
                <Pause className="w-5 h-5" />
                Dừng mô phỏng
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Bắt đầu mô phỏng
              </>
            )}
          </button>

          {/* Manual Triggers */}
          <div className="space-y-2">
            <p className="text-xs text-gray-500 font-medium uppercase">Trigger thủ công</p>
            
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={triggerDashboardUpdate}
                className="flex items-center gap-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 rounded-lg text-sm hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Dashboard
              </button>
              
              <button
                onClick={triggerNewOrder}
                className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg text-sm hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
              >
                <ShoppingCart className="w-4 h-4" />
                Đơn hàng
              </button>
              
              <button
                onClick={triggerLowStock}
                className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-lg text-sm hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
              >
                <Package className="w-4 h-4" />
                Tồn kho thấp
              </button>
              
              <button
                onClick={triggerNCR}
                className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              >
                <AlertTriangle className="w-4 h-4" />
                NCR mới
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              <strong>Hướng dẫn:</strong> Click "Bắt đầu mô phỏng" để tự động tạo events, 
              hoặc sử dụng các nút trigger để tạo events thủ công. 
              Quan sát Dashboard, Activity Feed và Notification Center.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default DemoControlPanel;
