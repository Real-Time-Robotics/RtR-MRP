'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Bell,
  Search,
  Filter,
  CheckCheck,
  Trash2,
  Archive,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  MoreHorizontal,
  AtSign,
  MessageSquare,
  AlertTriangle,
  Settings,
  Calendar as CalendarIcon,
  Package,
  ClipboardList,
  ShoppingCart,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format, formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useNotifications, Notification } from '@/hooks/use-notifications';

type NotificationFilterType = 'all' | 'mentions' | 'replies' | 'alerts' | 'approvals' | 'system';
type NotificationFilterStatus = 'all' | 'unread' | 'read';
type NotificationFilterPriority = 'all' | 'urgent' | 'high' | 'normal' | 'low';

const NOTIFICATION_TYPES: { value: NotificationFilterType; label: string; icon: React.ElementType }[] = [
  { value: 'all', label: 'Tất cả', icon: Bell },
  { value: 'mentions', label: 'Đề cập', icon: AtSign },
  { value: 'replies', label: 'Phản hồi', icon: MessageSquare },
  { value: 'alerts', label: 'Cảnh báo', icon: AlertTriangle },
  { value: 'approvals', label: 'Phê duyệt', icon: ClipboardList },
  { value: 'system', label: 'Hệ thống', icon: Settings },
];

const PRIORITY_OPTIONS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'urgent', label: 'Khẩn cấp' },
  { value: 'high', label: 'Cao' },
  { value: 'normal', label: 'Bình thường' },
  { value: 'low', label: 'Thấp' },
];

export default function NotificationsPage() {
  const router = useRouter();
  const {
    notifications: allNotifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refresh,
  } = useNotifications({ pollInterval: 30000 });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<NotificationFilterType>('all');
  const [statusFilter, setStatusFilter] = useState<NotificationFilterStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<NotificationFilterPriority>('all');
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    let filtered = allNotifications;

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter((n) => {
        switch (typeFilter) {
          case 'mentions':
            return n.type === 'MENTION' || n.type === 'user_mention';
          case 'replies':
            return n.type === 'REPLY';
          case 'alerts':
            return n.type === 'ALERT' || n.type === 'stock_alert' || n.type === 'REMINDER';
          case 'approvals':
            return n.type === 'APPROVAL_REQUEST' || n.type === 'COMPLETED' || n.type === 'REJECTED';
          case 'system':
            return n.type === 'SYSTEM' || n.type === 'ESCALATION';
          default:
            return true;
        }
      });
    }

    // Status filter
    if (statusFilter === 'unread') {
      filtered = filtered.filter((n) => !n.isRead);
    } else if (statusFilter === 'read') {
      filtered = filtered.filter((n) => n.isRead);
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter((n) => n.priority === priorityFilter);
    }

    // Date filter
    if (fromDate) {
      filtered = filtered.filter((n) => new Date(n.createdAt) >= fromDate);
    }
    if (toDate) {
      const endOfDay = new Date(toDate);
      endOfDay.setHours(23, 59, 59, 999);
      filtered = filtered.filter((n) => new Date(n.createdAt) <= endOfDay);
    }

    // Search filter
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
  }, [allNotifications, typeFilter, statusFilter, priorityFilter, fromDate, toDate, searchQuery]);

  // Paginated notifications
  const paginatedNotifications = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredNotifications.slice(start, start + pageSize);
  }, [filteredNotifications, page, pageSize]);

  const totalPages = Math.ceil(filteredNotifications.length / pageSize);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [typeFilter, statusFilter, priorityFilter, fromDate, toDate, searchQuery]);

  const handleNotificationClick = useCallback(
    async (notification: Notification) => {
      if (!notification.isRead) {
        await markAsRead(notification.id);
      }
      if (notification.link) {
        router.push(notification.link);
      }
    },
    [markAsRead, router]
  );

  const handleMarkSelectedAsRead = async () => {
    for (const id of selectedIds) {
      await markAsRead(id);
    }
    setSelectedIds(new Set());
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedNotifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedNotifications.map((n) => n.id)));
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setStatusFilter('all');
    setPriorityFilter('all');
    setFromDate(undefined);
    setToDate(undefined);
  };

  const hasActiveFilters = searchQuery || typeFilter !== 'all' || statusFilter !== 'all' || priorityFilter !== 'all' || fromDate || toDate;

  const getNotificationIcon = (notification: Notification) => {
    switch (notification.type) {
      case 'MENTION':
      case 'user_mention':
        return <AtSign className="h-4 w-4 text-primary-500" />;
      case 'REPLY':
        return <MessageSquare className="h-4 w-4 text-success-500" />;
      case 'stock_alert':
      case 'ALERT':
        return <Package className="h-4 w-4 text-orange-500" />;
      case 'APPROVAL_REQUEST':
        return <ClipboardList className="h-4 w-4 text-primary-500" />;
      case 'REMINDER':
        return <AlertTriangle className="h-4 w-4 text-warning-500" />;
      case 'po_received':
        return <ShoppingCart className="h-4 w-4 text-success-500" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="destructive" className="text-xs">Khẩn cấp</Badge>;
      case 'high':
        return <Badge className="text-xs bg-orange-500">Cao</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="w-6 h-6" />
            Thông báo
          </h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : 'Tất cả thông báo đã đọc'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={refresh}>
            <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
            Làm mới
          </Button>
          {unreadCount > 0 && (
            <Button variant="outline" onClick={markAllAsRead}>
              <CheckCheck className="w-4 h-4 mr-2" />
              Đánh dấu tất cả đã đọc
            </Button>
          )}
          <Button onClick={() => router.push('/settings/notifications')}>
            <Settings className="w-4 h-4 mr-2" />
            Cài đặt
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Bộ lọc
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Search */}
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm thông báo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Type */}
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as NotificationFilterType)}>
              <SelectTrigger>
                <SelectValue placeholder="Loại" />
              </SelectTrigger>
              <SelectContent>
                {NOTIFICATION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <span className="flex items-center gap-2">
                      <type.icon className="w-4 h-4" />
                      {type.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status */}
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as NotificationFilterStatus)}>
              <SelectTrigger>
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="unread">Chưa đọc</SelectItem>
                <SelectItem value="read">Đã đọc</SelectItem>
              </SelectContent>
            </Select>

            {/* Priority */}
            <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as NotificationFilterPriority)}>
              <SelectTrigger>
                <SelectValue placeholder="Ưu tiên" />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Range */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {fromDate && toDate
                    ? `${format(fromDate, 'dd/MM')} - ${format(toDate, 'dd/MM')}`
                    : fromDate
                    ? format(fromDate, 'dd/MM/yyyy')
                    : 'Ngày'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={fromDate}
                  onSelect={(date) => setFromDate(date)}
                  initialFocus
                />
                <div className="border-t p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setFromDate(undefined);
                      setToDate(undefined);
                    }}
                  >
                    Xóa ngày
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {hasActiveFilters && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t">
              <span className="text-sm text-muted-foreground">Đang lọc:</span>
              {typeFilter !== 'all' && (
                <Badge variant="secondary">
                  {NOTIFICATION_TYPES.find((t) => t.value === typeFilter)?.label}
                </Badge>
              )}
              {statusFilter !== 'all' && (
                <Badge variant="secondary">
                  {statusFilter === 'unread' ? 'Chưa đọc' : 'Đã đọc'}
                </Badge>
              )}
              {priorityFilter !== 'all' && (
                <Badge variant="secondary">
                  {PRIORITY_OPTIONS.find((p) => p.value === priorityFilter)?.label}
                </Badge>
              )}
              {searchQuery && <Badge variant="secondary">"{searchQuery}"</Badge>}
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-1" />
                Xóa bộ lọc
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <Card className="border-primary">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                Đã chọn {selectedIds.size} thông báo
              </span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={handleMarkSelectedAsRead}>
                  <CheckCheck className="w-4 h-4 mr-1" />
                  Đánh dấu đã đọc
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Bỏ chọn
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notifications List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {filteredNotifications.length} thông báo
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Không có thông báo</p>
              <p className="text-sm">
                {hasActiveFilters
                  ? 'Thử thay đổi bộ lọc để xem thêm'
                  : 'Chưa có thông báo nào'}
              </p>
            </div>
          ) : (
            <>
              {/* Select All */}
              <div className="flex items-center gap-2 pb-3 mb-3 border-b">
                <Checkbox
                  checked={selectedIds.size === paginatedNotifications.length && paginatedNotifications.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-sm text-muted-foreground">
                  Chọn tất cả trang này
                </span>
              </div>

              {/* Notification Items */}
              <div className="space-y-2">
                {paginatedNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer',
                      !notification.isRead && 'bg-primary/5 border-primary/20',
                      selectedIds.has(notification.id) && 'border-primary bg-primary/10',
                      'hover:bg-muted/50'
                    )}
                  >
                    <Checkbox
                      checked={selectedIds.has(notification.id)}
                      onCheckedChange={() => toggleSelection(notification.id)}
                      onClick={(e) => e.stopPropagation()}
                    />

                    <div
                      className="flex-1 min-w-0"
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {getNotificationIcon(notification)}
                          <span
                            className={cn(
                              'text-sm line-clamp-1',
                              !notification.isRead && 'font-medium'
                            )}
                          >
                            {notification.title}
                          </span>
                          {getPriorityBadge(notification.priority)}
                          {!notification.isRead && (
                            <span className="flex-shrink-0 h-2 w-2 rounded-full bg-primary" />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                            locale: vi,
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      {notification.mentionedByName && (
                        <p className="text-xs text-muted-foreground mt-1">
                          bởi {notification.mentionedByName}
                        </p>
                      )}
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => e.stopPropagation()}
                          aria-label="Menu"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!notification.isRead && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                          >
                            <CheckCheck className="w-4 h-4 mr-2" />
                            Đánh dấu đã đọc
                          </DropdownMenuItem>
                        )}
                        {notification.link && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(notification.link!);
                            }}
                          >
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Xem chi tiết
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Trang {page} / {totalPages} ({filteredNotifications.length} thông báo)
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Trước
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Sau
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
