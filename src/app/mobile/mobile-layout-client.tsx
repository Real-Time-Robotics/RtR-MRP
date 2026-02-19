// =============================================================================
// 📱 RTR MOBILE LAYOUT - Enhanced Version
// Professional mobile-first layout with safe areas
// =============================================================================

'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  Package,
  Scan,
  ClipboardList,
  Settings,
  Wifi,
  WifiOff,
  Bell,
  User,
  ChevronLeft,
  Wrench,
  Loader2,
  Monitor,
  ArrowLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MobileToastProvider, MOBILE_TOKENS } from '@/components/mobile/mobile-ui-kit';

// =============================================================================
// TYPES
// =============================================================================

interface MobileLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
  highlight?: boolean;
}

// =============================================================================
// PAGE TITLES
// =============================================================================

const PAGE_TITLES: Record<string, string> = {
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
  '/mobile/technician': 'Kỹ thuật viên',
  '/mobile/technician/equipment': 'Thiết bị',
  '/mobile/technician/maintenance': 'Bảo trì',
  '/mobile/technician/downtime': 'Downtime',
  '/mobile/technician/downtime/new': 'Ghi nhận Downtime',
};

// =============================================================================
// NAVIGATION ITEMS
// =============================================================================

const NAV_ITEMS: NavItem[] = [
  { href: '/mobile', icon: Home, label: 'Trang chủ' },
  { href: '/mobile/inventory', icon: Package, label: 'Tồn kho' },
  { href: '/mobile/scan', icon: Scan, label: 'Quét', highlight: true },
  { href: '/mobile/workorder', icon: ClipboardList, label: 'Lệnh SX' },
  { href: '/mobile/settings', icon: Settings, label: 'Cài đặt' },
];

// =============================================================================
// LOADING FALLBACK
// =============================================================================

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
    </div>
  );
}

// =============================================================================
// STATUS BAR
// =============================================================================

function StatusBar() {
  const [isOnline, setIsOnline] = useState(true);
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    // Check online status
    setIsOnline(navigator.onLine);
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Update time
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString('vi-VN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(timer);
    };
  }, []);

  return (
    <div 
      className="bg-blue-600 dark:bg-gray-900 text-white px-4 py-1.5 flex items-center justify-between text-xs font-medium"
      style={{ paddingTop: `max(0.375rem, ${MOBILE_TOKENS.safeArea.top})` }}
    >
      <div className="flex items-center gap-2">
        {isOnline ? (
          <Wifi className="w-3.5 h-3.5" />
        ) : (
          <WifiOff className="w-3.5 h-3.5 text-yellow-300" />
        )}
        <span className={isOnline ? '' : 'text-yellow-300'}>
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>
      
      <span className="opacity-80">{currentTime}</span>
      
      <div className="flex items-center gap-2">
        <button className="p-1 hover:bg-white/10 rounded-full transition-colors">
          <Bell className="w-3.5 h-3.5" />
        </button>
        <button className="p-1 hover:bg-white/10 rounded-full transition-colors">
          <User className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// HEADER
// =============================================================================

interface HeaderProps {
  title: string;
  showBack: boolean;
  onBack: () => void;
  onBackToDesktop: () => void;
}

function Header({ title, showBack, onBack, onBackToDesktop }: HeaderProps) {
  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-2 min-h-[56px]">
      {/* Back to Desktop - Only visible on larger screens */}
      <button
        onClick={onBackToDesktop}
        className="hidden md:flex items-center gap-1.5 px-2 py-1.5 mr-2 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
        aria-label="Về giao diện Desktop"
      >
        <ArrowLeft className="w-4 h-4" />
        <Monitor className="w-4 h-4" />
        <span className="hidden lg:inline">Desktop</span>
      </button>

      {/* Divider - Only on desktop */}
      <div className="hidden md:block w-px h-6 bg-gray-200 dark:bg-gray-700 mr-2" />

      {showBack && (
        <button
          onClick={onBack}
          className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors active:scale-95"
          aria-label="Quay lại"
        >
          <ChevronLeft className="w-6 h-6 text-gray-600 dark:text-gray-300" />
        </button>
      )}
      <h1 className="text-lg font-bold text-gray-900 dark:text-white flex-1 truncate">
        {title}
      </h1>
    </header>
  );
}

// =============================================================================
// BOTTOM NAVIGATION
// =============================================================================

interface BottomNavProps {
  pathname: string;
  onNavigate: (href: string) => void;
}

function BottomNav({ pathname, onNavigate }: BottomNavProps) {
  const isActive = (href: string) => {
    if (href === '/mobile') return pathname === '/mobile';
    return pathname.startsWith(href);
  };

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-40"
      style={{ paddingBottom: MOBILE_TOKENS.safeArea.bottom }}
    >
      <div className="flex items-center justify-around py-1.5 max-w-lg mx-auto">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          
          return (
            <button
              key={item.href}
              onClick={() => onNavigate(item.href)}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all min-w-[60px]',
                'active:scale-95',
                active 
                  ? 'text-blue-600 dark:text-blue-400' 
                  : 'text-gray-500 dark:text-gray-400'
              )}
            >
              {item.highlight ? (
                <div className={cn(
                  'w-12 h-12 -mt-5 rounded-full flex items-center justify-center shadow-lg transition-all',
                  active 
                    ? 'bg-blue-600 scale-110' 
                    : 'bg-blue-600'
                )}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              ) : (
                <Icon className={cn(
                  'w-6 h-6 transition-transform',
                  active && 'scale-110'
                )} />
              )}
              <span className={cn(
                'text-[10px] font-medium',
                item.highlight && 'mt-0.5'
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// =============================================================================
// MAIN LAYOUT
// =============================================================================

export function MobileLayoutClient({ children }: MobileLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();

  const getPageTitle = () => {
    // Try exact match first
    if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
    
    // Try partial match for dynamic routes
    const parts = pathname.split('/');
    while (parts.length > 0) {
      const path = parts.join('/');
      if (PAGE_TITLES[path]) return PAGE_TITLES[path];
      parts.pop();
    }
    
    return 'RTR Mobile';
  };

  const showBackButton = pathname !== '/mobile';

  const handleBack = () => {
    // Smart back navigation
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length > 1) {
      parts.pop();
      router.push('/' + parts.join('/'));
    } else {
      router.push('/mobile');
    }
  };

  const handleBackToDesktop = () => {
    // Navigate back to desktop dashboard
    router.push('/home');
  };

  const handleNavigate = (href: string) => {
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(5);
    }
    router.push(href);
  };

  return (
    <MobileToastProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden">
        {/* Status Bar */}
        <StatusBar />

        {/* Header */}
        <Header
          title={getPageTitle()}
          showBack={showBackButton}
          onBack={handleBack}
          onBackToDesktop={handleBackToDesktop}
        />

        {/* Main Content */}
        <main 
          className="flex-1 overflow-y-auto overflow-x-hidden"
          style={{ 
            paddingBottom: `calc(80px + ${MOBILE_TOKENS.safeArea.bottom})`,
            // Prevent iOS rubber-band scrolling issues
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <Suspense fallback={<LoadingFallback />}>
            <div className="max-w-lg mx-auto w-full">
              {children}
            </div>
          </Suspense>
        </main>

        {/* Bottom Navigation */}
        <BottomNav pathname={pathname} onNavigate={handleNavigate} />

        {/* Global Styles */}
        <style jsx global>{`
          /* Prevent text selection on touch */
          .mobile-no-select {
            -webkit-user-select: none;
            user-select: none;
          }
          
          /* Smooth scrolling */
          .mobile-scroll {
            -webkit-overflow-scrolling: touch;
            scroll-behavior: smooth;
          }
          
          /* Remove tap highlight on iOS */
          * {
            -webkit-tap-highlight-color: transparent;
          }
          
          /* Fix iOS input zoom */
          input, select, textarea {
            font-size: 16px !important;
          }
          
          /* Hide scrollbar but allow scrolling */
          .mobile-hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          .mobile-hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
        `}</style>
      </div>
    </MobileToastProvider>
  );
}
