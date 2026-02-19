'use client';

import { useState, useEffect } from 'react';
import { clientLogger } from '@/lib/client-logger';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Bell, CheckCircle, AlertTriangle, Clock, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';

interface WorkflowNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  actionUrl: string | null;
  readAt: string | null;
  createdAt: string;
  instance: {
    id: string;
    entityType: string;
    workflow: {
      name: string;
      code: string;
    };
  };
}

interface NotificationBellProps {
  userId: string;
}

const typeIcons: Record<string, React.ElementType> = {
  APPROVAL_REQUEST: Clock,
  REMINDER: AlertTriangle,
  ESCALATION: AlertTriangle,
  COMPLETED: CheckCircle,
  REJECTED: AlertTriangle,
};

export function NotificationBell({ userId }: NotificationBellProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<WorkflowNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const res = await fetch(`/api/workflows/notifications?userId=${userId}&unreadOnly=true&limit=10`);
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        }
      } catch (error) {
        clientLogger.error('Failed to load notifications', error);
      }
    };

    loadNotifications();

    // Refresh every minute
    const interval = setInterval(loadNotifications, 60 * 1000);
    return () => clearInterval(interval);
  }, [userId]);

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch('/api/workflows/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      });

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      clientLogger.error('Failed to mark as read', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/workflows/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, markAll: true }),
      });

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (error) {
      clientLogger.error('Failed to mark all as read', error);
    }
  };

  const handleNotificationClick = (notification: WorkflowNotification) => {
    if (!notification.readAt) {
      markAsRead(notification.id);
    }
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative" aria-label="Thông báo">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="font-medium">Notifications</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-auto py-1 px-2 text-xs" onClick={markAllAsRead}>
              <Check className="w-3 h-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No new notifications</p>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {notifications.map((notification) => {
              const Icon = typeIcons[notification.type] || Bell;
              const isUnread = !notification.readAt;

              return (
                <DropdownMenuItem
                  key={notification.id}
                  className={`flex items-start gap-3 p-3 cursor-pointer ${isUnread ? 'bg-blue-50 dark:bg-blue-950/30' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div
                    className={`p-1.5 rounded-full ${
                      notification.type === 'COMPLETED'
                        ? 'bg-green-100 text-green-600'
                        : notification.type === 'REJECTED'
                        ? 'bg-red-100 text-red-600'
                        : notification.type === 'ESCALATION' || notification.type === 'REMINDER'
                        ? 'bg-orange-100 text-orange-600'
                        : 'bg-blue-100 text-blue-600'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${isUnread ? 'font-medium' : ''}`}>
                      {notification.title}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  {isUnread && (
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                  )}
                </DropdownMenuItem>
              );
            })}
          </div>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-center justify-center text-sm text-muted-foreground"
          onClick={() => {
            router.push('/approvals');
            setOpen(false);
          }}
        >
          View all notifications
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default NotificationBell;
