'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { 
  Scan, 
  Package, 
  PackagePlus,
  PackageMinus,
  ArrowLeftRight,
  ClipboardCheck,
  Factory,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Boxes
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// MOBILE HOME PAGE
// =============================================================================

export default function MobileHomePage() {
  const router = useRouter();

  // Quick actions
  const quickActions = [
    { 
      icon: Scan, 
      label: 'Quét mã', 
      href: '/mobile/scan',
      color: 'bg-blue-500',
      description: 'Quét barcode/QR'
    },
    { 
      icon: PackagePlus, 
      label: 'Nhận hàng', 
      href: '/mobile/receiving',
      color: 'bg-green-500',
      description: 'PO receiving'
    },
    { 
      icon: PackageMinus, 
      label: 'Xuất hàng', 
      href: '/mobile/picking',
      color: 'bg-orange-500',
      description: 'SO picking'
    },
    { 
      icon: ArrowLeftRight, 
      label: 'Chuyển kho', 
      href: '/mobile/inventory/transfer',
      color: 'bg-purple-500',
      description: 'Chuyển vị trí'
    },
    { 
      icon: ClipboardCheck, 
      label: 'Kiểm kê', 
      href: '/mobile/inventory/count',
      color: 'bg-cyan-500',
      description: 'Cycle count'
    },
    { 
      icon: CheckCircle, 
      label: 'Kiểm tra CL', 
      href: '/mobile/quality',
      color: 'bg-pink-500',
      description: 'QC inspection'
    },
  ];

  // Mock stats
  const stats = [
    { label: 'Chờ nhận', value: 5, icon: PackagePlus, color: 'text-green-600', bgColor: 'bg-green-50' },
    { label: 'Chờ xuất', value: 8, icon: PackageMinus, color: 'text-orange-600', bgColor: 'bg-orange-50' },
    { label: 'Lệnh SX', value: 3, icon: Factory, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { label: 'Chờ QC', value: 2, icon: CheckCircle, color: 'text-pink-600', bgColor: 'bg-pink-50' },
  ];

  // Mock recent activity
  const recentActivity = [
    { action: 'Nhận hàng', item: 'RTR-MOTOR-001', qty: 50, time: '5 phút trước', status: 'success' },
    { action: 'Xuất hàng', item: 'RTR-ESC-002', qty: 20, time: '15 phút trước', status: 'success' },
    { action: 'Chuyển kho', item: 'RTR-FRAME-003', qty: 10, time: '30 phút trước', status: 'success' },
    { action: 'Kiểm kê', item: 'WH-01-R01-C01', qty: null, time: '1 giờ trước', status: 'warning' },
  ];

  return (
    <div className="p-4 space-y-6">
      {/* Big Scan Button */}
      <button
        onClick={() => router.push('/mobile/scan')}
        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl p-6 shadow-lg active:scale-[0.98] transition-transform"
      >
        <div className="flex items-center justify-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
            <Scan className="w-8 h-8" />
          </div>
          <div className="text-left">
            <div className="text-2xl font-bold">Quét mã</div>
            <div className="text-blue-100">Barcode / QR Code</div>
          </div>
        </div>
      </button>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-3">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div 
              key={i}
              className={cn(
                'rounded-xl p-3 text-center',
                stat.bgColor
              )}
            >
              <Icon className={cn('w-5 h-5 mx-auto mb-1', stat.color)} />
              <div className={cn('text-2xl font-bold', stat.color)}>{stat.value}</div>
              <div className="text-xs text-gray-600 truncate">{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Thao tác nhanh
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {quickActions.map((action, i) => {
            const Icon = action.icon;
            return (
              <button
                key={i}
                onClick={() => router.push(action.href)}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 active:scale-95 transition-transform"
              >
                <div className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center mb-2 mx-auto',
                  action.color
                )}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="text-sm font-medium text-gray-900 dark:text-white text-center">
                  {action.label}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Hoạt động gần đây
        </h2>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
          {recentActivity.map((item, i) => (
            <div key={i} className="p-3 flex items-center gap-3">
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center',
                item.status === 'success' ? 'bg-green-100' : 'bg-yellow-100'
              )}>
                {item.status === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 dark:text-white">
                  {item.action}
                </div>
                <div className="text-sm text-gray-500 truncate">
                  {item.item} {item.qty && `× ${item.qty}`}
                </div>
              </div>
              <div className="text-xs text-gray-400">
                {item.time}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Inventory Alerts */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-500" />
          Cảnh báo tồn kho
        </h2>
        <div className="space-y-2">
          {[
            { part: 'RTR-MOTOR-001', name: 'Brushless Motor', current: 15, min: 50 },
            { part: 'RTR-BATT-005', name: 'LiPo Battery', current: 8, min: 25 },
          ].map((item, i) => (
            <div 
              key={i}
              className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-yellow-800 dark:text-yellow-200">
                    {item.part}
                  </div>
                  <div className="text-sm text-yellow-600 dark:text-yellow-300">
                    {item.name}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-yellow-800 dark:text-yellow-200">
                    {item.current}
                  </div>
                  <div className="text-xs text-yellow-600">
                    Min: {item.min}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
