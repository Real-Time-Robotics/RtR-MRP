'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Home, 
  Package, 
  Scan, 
  ClipboardList, 
  Settings,
  Wifi,
  WifiOff,
  Cloud,
  CloudOff,
  Menu,
  Bell,
  User,
  ChevronLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// MOBILE LAYOUT - Shop Floor Optimized
// =============================================================================

interface MobileLayoutProps {
  children: React.ReactNode;
}

export default function MobileLayout({ children }: MobileLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSync, setPendingSync] = useState(0);

  // Monitor online status
  useEffect(() => {
    setIsOnline(navigator.onLine);
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Navigation items
  const navItems = [
    { href: '/mobile', icon: Home, label: 'Trang chủ' },
    { href: '/mobile/inventory', icon: Package, label: 'Tồn kho' },
    { href: '/mobile/scan', icon: Scan, label: 'Quét mã', highlight: true },
    { href: '/mobile/workorder', icon: ClipboardList, label: 'Lệnh SX' },
    { href: '/mobile/settings', icon: Settings, label: 'Cài đặt' },
  ];

  // Get page title based on pathname
  const getPageTitle = () => {
    const titles: Record<string, string> = {
      '/mobile': 'RTR Mobile',
      '/mobile/scan': 'Quét mã',
      '/mobile/inventory': 'Tồn kho',
      '/mobile/inventory/adjust': 'Điều chỉnh',
      '/mobile/inventory/transfer': 'Chuyển kho',
      '/mobile/inventory/count': 'Kiểm kê',
      '/mobile/receiving': 'Nhận hàng',
      '/mobile/picking': 'Xuất hàng',
      '/mobile/quality': 'Kiểm tra CL',
      '/mobile/workorder': 'Lệnh sản xuất',
      '/mobile/settings': 'Cài đặt',
    };
    return titles[pathname] || 'RTR Mobile';
  };

  const showBackButton = pathname !== '/mobile';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Status Bar */}
      <div className="bg-blue-600 dark:bg-blue-800 text-white px-4 py-2 flex items-center justify-between text-sm safe-area-top">
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Wifi className="w-4 h-4" />
          ) : (
            <WifiOff className="w-4 h-4 text-yellow-300" />
          )}
          <span>{isOnline ? 'Online' : 'Offline'}</span>
        </div>
        
        {pendingSync > 0 && (
          <div className="flex items-center gap-1 bg-yellow-500 text-yellow-900 px-2 py-0.5 rounded-full text-xs font-medium">
            <CloudOff className="w-3 h-3" />
            <span>{pendingSync} chờ sync</span>
          </div>
        )}
        
        <div className="flex items-center gap-3">
          <button className="p-1 hover:bg-white/10 rounded">
            <Bell className="w-4 h-4" />
          </button>
          <button className="p-1 hover:bg-white/10 rounded">
            <User className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-3">
        {showBackButton && (
          <button 
            onClick={() => router.back()}
            className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-gray-600 dark:text-gray-300" />
          </button>
        )}
        <h1 className="text-xl font-bold text-gray-900 dark:text-white flex-1">
          {getPageTitle()}
        </h1>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pb-20">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 safe-area-bottom">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/mobile' && pathname.startsWith(item.href));
            const Icon = item.icon;
            
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all min-w-[64px]',
                  item.highlight && !isActive && 'relative',
                  isActive 
                    ? 'text-blue-600 dark:text-blue-400' 
                    : 'text-gray-500 dark:text-gray-400'
                )}
              >
                {item.highlight && !isActive ? (
                  <div className="w-14 h-14 -mt-6 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                ) : (
                  <Icon className={cn(
                    'w-6 h-6',
                    isActive && 'scale-110'
                  )} />
                )}
                <span className={cn(
                  'text-xs font-medium',
                  item.highlight && !isActive && 'mt-1'
                )}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Safe area spacing for iOS */}
      <style jsx global>{`
        .safe-area-top {
          padding-top: env(safe-area-inset-top, 0px);
        }
        .safe-area-bottom {
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }
      `}</style>
    </div>
  );
}
