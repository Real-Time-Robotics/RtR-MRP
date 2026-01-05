// =============================================================================
// 📱 MOBILE HOME PAGE - Polished Version
// Professional mobile-first dashboard
// =============================================================================

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
  AlertTriangle,
  Wrench,
  Clock,
  TrendingUp,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  MobileCard,
  MobileButton,
  MobileBadge,
  haptic
} from '@/components/mobile/mobile-ui-kit';

// =============================================================================
// TYPES
// =============================================================================

interface QuickAction {
  icon: React.ElementType;
  label: string;
  href: string;
  color: string;
  bgColor: string;
}

interface Stat {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

interface Activity {
  action: string;
  item: string;
  qty: number | null;
  time: string;
  status: 'success' | 'warning' | 'error';
}

interface Alert {
  part: string;
  name: string;
  current: number;
  min: number;
}

// =============================================================================
// BIG SCAN BUTTON
// =============================================================================

function BigScanButton() {
  const router = useRouter();
  
  return (
    <button
      onClick={() => {
        haptic.medium();
        router.push('/mobile/scan');
      }}
      className="w-full bg-gradient-to-br from-blue-600 via-blue-600 to-blue-700 text-white rounded-3xl p-5 shadow-xl shadow-blue-600/30 active:scale-[0.98] transition-all"
    >
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
          <Scan className="w-7 h-7" />
        </div>
        <div className="text-left flex-1">
          <div className="text-xl font-bold">Quét mã</div>
          <div className="text-blue-100 text-sm">Barcode / QR Code</div>
        </div>
        <ChevronRight className="w-6 h-6 text-blue-200" />
      </div>
    </button>
  );
}

// =============================================================================
// STATS GRID
// =============================================================================

function StatsGrid({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <div 
            key={i}
            className={cn(
              'rounded-2xl p-3 text-center transition-all',
              stat.bgColor
            )}
          >
            <Icon className={cn('w-5 h-5 mx-auto mb-1', stat.color)} />
            <div className={cn('text-xl font-bold', stat.color)}>
              {stat.value}
            </div>
            <div className="text-[10px] text-gray-600 dark:text-gray-400 truncate font-medium">
              {stat.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// QUICK ACTIONS
// =============================================================================

function QuickActions({ actions }: { actions: QuickAction[] }) {
  const router = useRouter();
  
  return (
    <section>
      <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3 px-1">
        Thao tác nhanh
      </h2>
      <div className="grid grid-cols-3 gap-2">
        {actions.map((action, i) => {
          const Icon = action.icon;
          return (
            <button
              key={i}
              onClick={() => {
                haptic.light();
                router.push(action.href);
              }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700/50 active:scale-95 transition-all"
            >
              <div className={cn(
                'w-11 h-11 rounded-xl flex items-center justify-center mb-2 mx-auto',
                action.bgColor
              )}>
                <Icon className={cn('w-5 h-5', action.color)} />
              </div>
              <div className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center truncate">
                {action.label}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

// =============================================================================
// RECENT ACTIVITY
// =============================================================================

function RecentActivity({ activities }: { activities: Activity[] }) {
  return (
    <section>
      <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3 px-1">
        Hoạt động gần đây
      </h2>
      <MobileCard padding="none">
        <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {activities.map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                item.status === 'success' ? 'bg-green-100 dark:bg-green-900/30' : 
                item.status === 'warning' ? 'bg-amber-100 dark:bg-amber-900/30' :
                'bg-red-100 dark:bg-red-900/30'
              )}>
                {item.status === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : item.status === 'warning' ? (
                  <Clock className="w-5 h-5 text-amber-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-gray-900 dark:text-white truncate">
                  {item.action}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {item.item} {item.qty && `× ${item.qty}`}
                </div>
              </div>
              <div className="text-[10px] text-gray-400 flex-shrink-0">
                {item.time}
              </div>
            </div>
          ))}
        </div>
      </MobileCard>
    </section>
  );
}

// =============================================================================
// INVENTORY ALERTS
// =============================================================================

function InventoryAlerts({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) return null;
  
  return (
    <section>
      <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3 px-1 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
        Cảnh báo tồn kho
      </h2>
      <div className="space-y-2">
        {alerts.map((item, i) => (
          <MobileCard key={i} variant="warning" padding="sm">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm text-amber-800 dark:text-amber-200 truncate">
                  {item.part}
                </div>
                <div className="text-xs text-amber-600 dark:text-amber-300 truncate">
                  {item.name}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-lg font-bold text-amber-800 dark:text-amber-200">
                  {item.current}
                </div>
                <div className="text-[10px] text-amber-600">
                  Min: {item.min}
                </div>
              </div>
            </div>
          </MobileCard>
        ))}
      </div>
    </section>
  );
}

// =============================================================================
// TECHNICIAN QUICK ACCESS
// =============================================================================

function TechnicianAccess() {
  const router = useRouter();
  
  return (
    <section>
      <MobileCard
        onClick={() => router.push('/mobile/technician')}
        variant="elevated"
        padding="md"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
            <Wrench className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900 dark:text-white">
              Kỹ thuật viên
            </div>
            <div className="text-xs text-gray-500 truncate">
              Thiết bị, bảo trì, downtime
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </div>
      </MobileCard>
    </section>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function MobileHomePage() {
  // Stats data
  const stats: Stat[] = [
    { 
      label: 'Chờ nhận', 
      value: 5, 
      icon: PackagePlus, 
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20'
    },
    { 
      label: 'Chờ xuất', 
      value: 8, 
      icon: PackageMinus, 
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20'
    },
    { 
      label: 'Lệnh SX', 
      value: 3, 
      icon: Factory, 
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20'
    },
    { 
      label: 'Chờ QC', 
      value: 2, 
      icon: CheckCircle, 
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20'
    },
  ];

  // Quick actions
  const quickActions: QuickAction[] = [
    { 
      icon: PackagePlus, 
      label: 'Nhận hàng', 
      href: '/mobile/receiving',
      color: 'text-white',
      bgColor: 'bg-green-500'
    },
    { 
      icon: PackageMinus, 
      label: 'Xuất hàng', 
      href: '/mobile/picking',
      color: 'text-white',
      bgColor: 'bg-orange-500'
    },
    { 
      icon: ArrowLeftRight, 
      label: 'Chuyển kho', 
      href: '/mobile/inventory/transfer',
      color: 'text-white',
      bgColor: 'bg-blue-500'
    },
    { 
      icon: ClipboardCheck, 
      label: 'Kiểm kê', 
      href: '/mobile/inventory/count',
      color: 'text-white',
      bgColor: 'bg-cyan-500'
    },
    { 
      icon: CheckCircle, 
      label: 'Kiểm tra CL', 
      href: '/mobile/quality',
      color: 'text-white',
      bgColor: 'bg-pink-500'
    },
    { 
      icon: Factory, 
      label: 'Lệnh SX', 
      href: '/mobile/workorder',
      color: 'text-white',
      bgColor: 'bg-indigo-500'
    },
  ];

  // Recent activities
  const activities: Activity[] = [
    { action: 'Nhận hàng', item: 'RTR-MOTOR-001', qty: 50, time: '5 phút', status: 'success' },
    { action: 'Xuất hàng', item: 'RTR-ESC-002', qty: 20, time: '15 phút', status: 'success' },
    { action: 'Chuyển kho', item: 'RTR-FRAME-003', qty: 10, time: '30 phút', status: 'success' },
    { action: 'Kiểm kê', item: 'WH-01-R01-C01', qty: null, time: '1 giờ', status: 'warning' },
  ];

  // Inventory alerts
  const alerts: Alert[] = [
    { part: 'RTR-MOTOR-001', name: 'Brushless Motor', current: 15, min: 50 },
    { part: 'RTR-BATT-005', name: 'LiPo Battery', current: 8, min: 25 },
  ];

  return (
    <div className="p-4 space-y-5">
      {/* Big Scan Button */}
      <BigScanButton />

      {/* Stats Grid */}
      <StatsGrid stats={stats} />

      {/* Quick Actions */}
      <QuickActions actions={quickActions} />

      {/* Technician Access */}
      <TechnicianAccess />

      {/* Recent Activity */}
      <RecentActivity activities={activities} />

      {/* Inventory Alerts */}
      <InventoryAlerts alerts={alerts} />
    </div>
  );
}
