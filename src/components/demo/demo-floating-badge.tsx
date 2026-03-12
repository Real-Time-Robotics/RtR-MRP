'use client';

import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { clientLogger } from '@/lib/client-logger';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  UserRole,
  roleLabels,
  roleColors,
  rolePermissions,
} from '@/lib/auth/auth-types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Play,
  Shield,
  Users,
  Eye,
  Settings,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  Sparkles,
  CheckCircle,
  XCircle,
  Info,
} from 'lucide-react';

// =============================================================================
// DEMO FLOATING BADGE
// Floating badge showing demo mode with role switcher
// =============================================================================

const DEMO_ACCOUNTS = [
  {
    role: 'admin' as UserRole,
    email: 'admin@demo.rtr-mrp.com',
    password: 'Admin@Demo2026!',
    label: 'Admin',
    icon: Shield,
    description: 'Toàn quyền quản trị hệ thống',
    color: 'bg-red-500',
  },
  {
    role: 'manager' as UserRole,
    email: 'manager@demo.rtr-mrp.com',
    password: 'Manager@Demo2026!',
    label: 'Manager',
    icon: Users,
    description: 'Quản lý, phê duyệt, không xóa',
    color: 'bg-blue-500',
  },
  {
    role: 'operator' as UserRole,
    email: 'operator@demo.rtr-mrp.com',
    password: 'Operator@Demo2026!',
    label: 'Operator',
    icon: Settings,
    description: 'Vận hành, tạo/sửa dữ liệu',
    color: 'bg-green-500',
  },
  {
    role: 'viewer' as UserRole,
    email: 'viewer@demo.rtr-mrp.com',
    password: 'Viewer@Demo2026!',
    label: 'Viewer',
    icon: Eye,
    description: 'Chỉ xem, không thao tác',
    color: 'bg-gray-500',
  },
];

interface DemoFloatingBadgeProps {
  /** Position of the badge */
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  /** Show reset button (admin only) */
  showReset?: boolean;
  /** On reset callback */
  onReset?: () => void;
}

export function DemoFloatingBadge({
  position = 'bottom-left',
  showReset = true,
  onReset,
}: DemoFloatingBadgeProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    // Remember minimized state
    if (typeof window !== 'undefined') {
      return localStorage.getItem('demo-badge-minimized') === 'true';
    }
    return false;
  });

  // Check if current user is a demo user
  const userEmail = session?.user?.email || '';
  const isDemo = userEmail.includes('@demo.rtr-mrp.com') || userEmail.includes('@demo.');
  const userRole = (session?.user as { role?: string })?.role as UserRole | undefined;

  // Environment gate: only show demo badge when demo mode is enabled
  const isDemoModeEnabled = process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || process.env.NODE_ENV !== 'production';

  // Don't show if not a demo user or demo mode is disabled
  if (!isDemo || status !== 'authenticated' || !isDemoModeEnabled) {
    return null;
  }

  const currentAccount = DEMO_ACCOUNTS.find(a => a.email === userEmail);
  const CurrentIcon = currentAccount?.icon || Play;

  const positionClasses = {
    'bottom-left': 'bottom-20 left-4', // Moved up to avoid covering bottom nav
    'bottom-right': 'bottom-20 right-4',
    'top-left': 'top-16 left-4',
    'top-right': 'top-16 right-4',
  };

  const handleSwitchRole = async (account: typeof DEMO_ACCOUNTS[0]) => {
    if (account.email === userEmail) return;

    setSwitching(true);
    try {
      // Sign out current user
      await signOut({ redirect: false });

      // Redirect to login with demo credentials
      const params = new URLSearchParams({
        demo: account.email,
        role: account.role,
      });
      router.push(`/login?${params.toString()}`);
    } catch (error) {
      clientLogger.error('Failed to switch role', error);
      setSwitching(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Bạn có chắc muốn reset tất cả dữ liệu demo về trạng thái ban đầu?')) {
      return;
    }

    setResetting(true);
    try {
      const response = await fetch('/api/demo/reset', {
        method: 'POST',
      });

      if (response.ok) {
        toast.success('Dữ liệu demo đã được reset thành công!');
        router.refresh();
        onReset?.();
      } else {
        const data = await response.json();
        toast.error(`Lỗi: ${data.message || 'Không thể reset dữ liệu demo'}`);
      }
    } catch (error) {
      clientLogger.error('Failed to reset demo data', error);
      toast.error('Đã xảy ra lỗi khi reset dữ liệu demo');
    } finally {
      setResetting(false);
    }
  };

  const permissionCount = userRole ? rolePermissions[userRole]?.length || 0 : 0;

  const toggleMinimized = () => {
    const newState = !isMinimized;
    setIsMinimized(newState);
    if (typeof window !== 'undefined') {
      localStorage.setItem('demo-badge-minimized', String(newState));
    }
  };

  // Minimized view - just a small icon
  if (isMinimized) {
    return (
      <div className={cn('fixed z-50', positionClasses[position])}>
        <button
          onClick={toggleMinimized}
          className={cn(
            'w-8 h-8 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110',
            'bg-amber-500 text-white border-2 border-amber-400'
          )}
          title="Mở Demo Panel"
          aria-label="Mở Demo Panel"
        >
          <Sparkles className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className={cn('fixed z-50', positionClasses[position])}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'gap-1.5 shadow-lg border-2 transition-all duration-300 h-7 px-2',
              'bg-white dark:bg-gray-800 hover:scale-105',
              currentAccount?.color.replace('bg-', 'border-'),
              isOpen && 'ring-2 ring-offset-2'
            )}
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <Badge
              variant="secondary"
              className={cn(
                'px-1 py-0 text-[10px] font-semibold text-white',
                currentAccount?.color
              )}
            >
              {currentAccount?.label || userRole}
            </Badge>
            {isOpen ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronUp className="h-3 w-3" />
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent
          side="top"
          align="start"
          className="w-72 p-0"
          sideOffset={8}
        >
          {/* Header */}
          <div className="px-3 py-2 border-b bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <div>
                  <h4 className="font-semibold text-xs">Demo Mode</h4>
                  <p className="text-[10px] text-gray-500">
                    Chuyển đổi vai trò
                  </p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMinimized();
                  setIsOpen(false);
                }}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                title="Thu nhỏ"
                aria-label="Thu nhỏ Demo Panel"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Current Role Info */}
          <div className="px-4 py-3 border-b bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CurrentIcon className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium">Vai trò hiện tại:</span>
              </div>
              <Badge className={cn('text-white', currentAccount?.color)}>
                {roleLabels[userRole || 'viewer']}
              </Badge>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {permissionCount} quyền hạn được cấp
            </p>
          </div>

          {/* Role Switcher */}
          <div className="p-2">
            <p className="px-2 py-1 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Chuyển vai trò
            </p>
            {DEMO_ACCOUNTS.map((account) => {
              const isActive = account.email === userEmail;
              const AccountIcon = account.icon;

              return (
                <button
                  key={account.email}
                  onClick={() => handleSwitchRole(account)}
                  disabled={isActive || switching}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
                    'text-left text-sm',
                    isActive
                      ? 'bg-gray-100 dark:bg-gray-700 cursor-default'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/50',
                    switching && 'opacity-50 cursor-wait'
                  )}
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-white',
                      account.color
                    )}
                  >
                    <AccountIcon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{account.label}</span>
                      {isActive && (
                        <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {account.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Permissions Preview (Expandable) */}
          <div className="border-t">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full flex items-center justify-between px-4 py-2 text-xs text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50"
            >
              <span className="flex items-center gap-1">
                <Info className="h-3 w-3" />
                Xem quyền hạn
              </span>
              {isExpanded ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>

            {isExpanded && userRole && (
              <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-t max-h-40 overflow-y-auto">
                <div className="grid grid-cols-2 gap-1">
                  {rolePermissions[userRole]?.map((permission) => (
                    <div
                      key={permission}
                      className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400"
                    >
                      <CheckCircle className="h-2.5 w-2.5 text-green-500 flex-shrink-0" />
                      <span className="truncate">{permission}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Reset Button (Admin only) */}
          {showReset && userRole === 'admin' && (
            <div className="p-3 border-t bg-red-50 dark:bg-red-900/10">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={resetting}
                className="w-full border-red-200 text-red-600 hover:bg-red-100 dark:border-red-800 dark:text-red-400"
              >
                {resetting ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Reset Demo Data
              </Button>
              <p className="text-xs text-red-500 mt-1 text-center">
                Khôi phục dữ liệu về trạng thái ban đầu
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="px-4 py-2 border-t text-center">
            <p className="text-xs text-gray-400">
              Dữ liệu demo tự động reset lúc 00:00 UTC
            </p>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// =============================================================================
// DEMO MODE PROVIDER
// Wrapper to add demo badge to the app
// =============================================================================

interface DemoModeProviderProps {
  children: React.ReactNode;
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
}

export function DemoModeProvider({
  children,
  position = 'bottom-left',
}: DemoModeProviderProps) {
  return (
    <>
      {children}
      <DemoFloatingBadge position={position} />
    </>
  );
}

export default DemoFloatingBadge;
