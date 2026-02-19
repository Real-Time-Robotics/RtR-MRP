'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  BellDot,
  CheckCheck,
  MessageSquare,
  AtSign,
  AlertCircle,
  Loader2,
  X,
  Package,
  ClipboardList,
  ShoppingCart,
  Filter,
  Search,
  AlertTriangle,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/date';
import { useNotifications, Notification } from '@/hooks/use-notifications';

type NotificationFilter = 'all' | 'mentions' | 'replies' | 'alerts' | 'system';

const FILTER_OPTIONS: { value: NotificationFilter; label: string; icon: React.ElementType }[] = [
  { value: 'all', label: 'Tất cả', icon: Bell },
  { value: 'mentions', label: 'Đề cập', icon: AtSign },
  { value: 'replies', label: 'Phản hồi', icon: MessageSquare },
  { value: 'alerts', label: 'Cảnh báo', icon: AlertTriangle },
  { value: 'system', label: 'Hệ thống', icon: Settings },
];

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    refresh,
  } = useNotifications({ pollInterval: 30000 });

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    let filtered = notifications;

    // Apply type filter
    if (filter !== 'all') {
      filtered = filtered.filter((n) => {
        switch (filter) {
          case 'mentions':
            return n.type === 'MENTION' || n.type === 'user_mention';
          case 'replies':
            return n.type === 'REPLY';
          case 'alerts':
            return n.type === 'ALERT' || n.type === 'stock_alert' || n.priority === 'urgent' || n.priority === 'high';
          case 'system':
            return n.type === 'SYSTEM' || n.type === 'APPROVAL_REQUEST' || n.type === 'REMINDER';
          default:
            return true;
        }
      });
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (n) =>
          n.title.toLowerCase().includes(query) ||
          n.message.toLowerCase().includes(query) ||
          (n.mentionedByName && n.mentionedByName.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [notifications, filter, searchQuery]);

  const handleNotificationClick = useCallback(
    async (notification: Notification) => {
      // Mark as read
      if (!notification.isRead) {
        await markAsRead(notification.id);
      }

      // Navigate to the link if present
      if (notification.link) {
        setIsOpen(false);
        router.push(notification.link);
      }
    },
    [markAsRead, router]
  );

  const handleMarkAllAsRead = useCallback(async () => {
    await markAllAsRead();
  }, [markAllAsRead]);

  const selectedFilterOption = FILTER_OPTIONS.find((f) => f.value === filter);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('relative', className)}
          aria-label="Thông báo"
        >
          {unreadCount > 0 ? (
            <>
              <BellDot className="h-5 w-5" />
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 min-w-[1.25rem] px-1 text-[10px] font-bold"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            </>
          ) : (
            <Bell className="h-5 w-5" />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[400px] p-0"
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="font-semibold">Thông báo</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} mới
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {/* Search Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn('h-7 w-7', showSearch && 'bg-muted')}
                  onClick={() => {
                    setShowSearch(!showSearch);
                    if (showSearch) setSearchQuery('');
                  }}
                  aria-label="Tìm kiếm"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Tìm kiếm</TooltipContent>
            </Tooltip>

            {/* Filter Dropdown */}
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn('h-7 w-7', filter !== 'all' && 'bg-muted')}
                      aria-label="Lọc thông báo"
                    >
                      <Filter className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Lọc thông báo</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end">
                {FILTER_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  return (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => setFilter(option.value)}
                      className={cn(
                        'flex items-center gap-2',
                        filter === option.value && 'bg-muted'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {option.label}
                      {filter === option.value && (
                        <span className="ml-auto text-xs text-muted-foreground">✓</span>
                      )}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mark All Read */}
            {unreadCount > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleMarkAllAsRead}
                    aria-label="Đánh dấu tất cả đã đọc"
                  >
                    <CheckCheck className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Đánh dấu tất cả đã đọc</TooltipContent>
              </Tooltip>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsOpen(false)}
              aria-label="Đóng"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        {showSearch && (
          <div className="px-4 py-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm thông báo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-sm"
                aria-label="Tìm kiếm thông báo"
                autoFocus
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                  onClick={() => setSearchQuery('')}
                  aria-label="Xóa tìm kiếm"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Active Filter Badge */}
        {(filter !== 'all' || searchQuery) && (
          <div className="px-4 py-2 border-b bg-muted/50 flex items-center gap-2">
            {filter !== 'all' && selectedFilterOption && (
              <Badge variant="secondary" className="text-xs">
                {React.createElement(selectedFilterOption.icon, { className: 'h-3 w-3 mr-1' })}
                {selectedFilterOption.label}
              </Badge>
            )}
            {searchQuery && (
              <Badge variant="secondary" className="text-xs">
                "{searchQuery}"
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1 text-xs ml-auto"
              onClick={() => {
                setFilter('all');
                setSearchQuery('');
              }}
            >
              Xóa bộ lọc
            </Button>
          </div>
        )}

        {/* Content */}
        <ScrollArea className="max-h-[350px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
              <AlertCircle className="h-6 w-6" />
              <span className="text-sm">Không thể tải thông báo</span>
              <Button variant="outline" size="sm" onClick={refresh}>
                Thử lại
              </Button>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
              <Bell className="h-8 w-8" />
              <span className="text-sm">
                {filter !== 'all' || searchQuery
                  ? 'Không có thông báo phù hợp'
                  : 'Chưa có thông báo nào'}
              </span>
            </div>
          ) : (
            <div className="divide-y">
              {filteredNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onClick={() => handleNotificationClick(notification)}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t px-4 py-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground"
              onClick={() => {
                setIsOpen(false);
                router.push('/notifications');
              }}
            >
              Xem tất cả thông báo
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// Individual notification item
interface NotificationItemProps {
  notification: Notification;
  onClick: () => void;
}

function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const getIcon = () => {
    switch (notification.type) {
      case 'MENTION':
      case 'user_mention':
        return <AtSign className="h-4 w-4 text-blue-500" />;
      case 'REPLY':
        return <MessageSquare className="h-4 w-4 text-green-500" />;
      case 'stock_alert':
      case 'ALERT':
        return <Package className="h-4 w-4 text-orange-500" />;
      case 'order_update':
        return <ClipboardList className="h-4 w-4 text-purple-500" />;
      case 'po_received':
        return <ShoppingCart className="h-4 w-4 text-emerald-500" />;
      case 'APPROVAL_REQUEST':
        return <ClipboardList className="h-4 w-4 text-blue-500" />;
      case 'REMINDER':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getPriorityColor = () => {
    switch (notification.priority) {
      case 'urgent':
        return 'border-l-red-500';
      case 'high':
        return 'border-l-orange-500';
      default:
        return 'border-l-transparent';
    }
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full px-4 py-3 text-left transition-colors hover:bg-muted/50 border-l-2',
        getPriorityColor(),
        !notification.isRead && 'bg-primary/5'
      )}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <span
              className={cn(
                'text-sm line-clamp-1',
                !notification.isRead && 'font-medium'
              )}
            >
              {notification.title}
            </span>
            {!notification.isRead && (
              <span className="flex-shrink-0 h-2 w-2 rounded-full bg-primary" />
            )}
          </div>

          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {notification.message}
          </p>

          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-muted-foreground">
              {formatRelativeTime(notification.createdAt)}
            </span>
            {notification.mentionedByName && (
              <>
                <span className="text-[10px] text-muted-foreground">•</span>
                <span className="text-[10px] text-muted-foreground">
                  bởi {notification.mentionedByName}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
