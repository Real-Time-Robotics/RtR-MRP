'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Bell,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  Clock,
  ExternalLink,
  Lightbulb,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, format } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  Alert,
  AlertPriority,
  AlertActionType,
  AlertType,
  AlertSource,
  UrgencyPrediction,
  getTypeLabel,
  getSourceLabel,
  getPriorityLabel,
} from '@/lib/ai/alerts';
import { clientLogger } from '@/lib/client-logger';

interface PageProps {
  params: Promise<{ alertId: string }>;
}

export default function AlertDetailPage({ params }: PageProps) {
  const { alertId } = use(params);
  const router = useRouter();
  const { toast } = useToast();

  const [alert, setAlert] = useState<Alert | null>(null);
  const [urgency, setUrgency] = useState<UrgencyPrediction | null>(null);
  const [relatedAlerts, setRelatedAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchAlertDetail();
  }, [alertId]);

  const fetchAlertDetail = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/ai/alerts/${alertId}`);
      const data = await response.json();

      if (data.success) {
        setAlert(data.data.alert);
        setUrgency(data.data.urgency);
        setRelatedAlerts(data.data.relatedAlerts || []);
      } else {
        toast({
          title: 'Lỗi',
          description: 'Không tìm thấy cảnh báo',
          variant: 'destructive',
        });
        router.push('/ai/alerts');
      }
    } catch (error) {
      clientLogger.error('Failed to fetch alert:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tải thông tin cảnh báo',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (actionId: string) => {
    try {
      setActionLoading(actionId);
      const response = await fetch('/api/ai/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'execute',
          alertId,
          actionId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Thành công',
          description: data.data.message,
        });
        fetchAlertDetail();
      } else {
        toast({
          title: 'Lỗi',
          description: data.data?.error || 'Không thể thực hiện hành động',
          variant: 'destructive',
        });
      }
    } catch (error) {
      clientLogger.error('Failed to execute action:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDismiss = async () => {
    try {
      await fetch('/api/ai/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'dismiss',
          alertId,
        }),
      });
      toast({
        title: 'Đã bỏ qua',
        description: 'Cảnh báo đã được bỏ qua',
      });
      router.push('/ai/alerts');
    } catch (error) {
      clientLogger.error('Failed to dismiss:', error);
    }
  };

  const getPriorityIcon = (priority: AlertPriority) => {
    switch (priority) {
      case AlertPriority.CRITICAL:
        return <AlertTriangle className="h-6 w-6 text-red-500" />;
      case AlertPriority.HIGH:
        return <AlertCircle className="h-6 w-6 text-orange-500" />;
      case AlertPriority.MEDIUM:
        return <Info className="h-6 w-6 text-yellow-500" />;
      case AlertPriority.LOW:
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      default:
        return <Info className="h-6 w-6 text-gray-500" />;
    }
  };

  const getPriorityBadgeVariant = (priority: AlertPriority) => {
    switch (priority) {
      case AlertPriority.CRITICAL: return 'destructive' as const;
      case AlertPriority.HIGH: return 'default' as const;
      case AlertPriority.MEDIUM: return 'secondary' as const;
      case AlertPriority.LOW: return 'outline' as const;
      default: return 'outline' as const;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (!alert) {
    return (
      <div className="text-center py-12">
        <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold">Không tìm thấy cảnh báo</h2>
        <Link href="/ai/alerts">
          <Button className="mt-4">Quay lại</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Quay lại">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            {getPriorityIcon(alert.priority)}
            <h1 className="text-2xl font-bold">{alert.title}</h1>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={getPriorityBadgeVariant(alert.priority)}>
              {getPriorityLabel(alert.priority)}
            </Badge>
            <Badge variant="outline">{getTypeLabel(alert.type as AlertType)}</Badge>
            <Badge variant="secondary">{getSourceLabel(alert.source as AlertSource)}</Badge>
            {alert.isEscalated && (
              <Badge variant="destructive">Đã Escalate</Badge>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Alert Details */}
          <Card>
            <CardHeader>
              <CardTitle>Chi tiết cảnh báo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">{alert.message}</p>

              {alert.aiSuggestion && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex gap-3">
                    <Lightbulb className="h-5 w-5 text-blue-500 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-blue-700 dark:text-blue-300">
                        AI Gợi ý
                      </p>
                      <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                        {alert.aiSuggestion}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              {/* Entities */}
              {alert.entities.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Liên quan đến:</p>
                  <div className="flex flex-wrap gap-2">
                    {alert.entities.map((entity, idx) => (
                      <Badge key={idx} variant="secondary">
                        {entity.type}: {entity.name || entity.code || entity.id}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Tạo lúc</p>
                  <p className="font-medium">
                    {format(new Date(alert.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true, locale: vi })}
                  </p>
                </div>
                {alert.expiresAt && (
                  <div>
                    <p className="text-muted-foreground">Hết hạn</p>
                    <p className="font-medium">
                      {format(new Date(alert.expiresAt), 'dd/MM/yyyy HH:mm', { locale: vi })}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Hành động</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {alert.actions.map((action) => (
                  action.url ? (
                    <Link key={action.id} href={action.url}>
                      <Button variant={action.isPrimary ? 'default' : 'outline'}>
                        {action.label}
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  ) : action.type === AlertActionType.DISMISS ? (
                    <Button
                      key={action.id}
                      variant="outline"
                      onClick={handleDismiss}
                    >
                      {action.label}
                    </Button>
                  ) : (
                    <Button
                      key={action.id}
                      variant={action.isPrimary ? 'default' : 'outline'}
                      onClick={() => handleAction(action.id)}
                      disabled={actionLoading === action.id}
                    >
                      {actionLoading === action.id ? 'Đang xử lý...' : action.label}
                    </Button>
                  )
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Related Alerts */}
          {relatedAlerts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Cảnh báo liên quan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {relatedAlerts.map((related) => (
                    <Link
                      key={related.id}
                      href={`/ai/alerts/${related.id}`}
                      className="block p-3 rounded-lg border hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {getPriorityIcon(related.priority)}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{related.title}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {related.message}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Urgency */}
          {urgency && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Mức độ khẩn cấp
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Thời gian còn lại</p>
                  <p className="text-2xl font-bold">
                    {urgency.hoursUntilCritical < 24
                      ? `${urgency.hoursUntilCritical} giờ`
                      : `${Math.ceil(urgency.hoursUntilCritical / 24)} ngày`}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Mức độ ảnh hưởng</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          urgency.impactScore >= 80 ? 'bg-red-500' :
                          urgency.impactScore >= 60 ? 'bg-orange-500' :
                          urgency.impactScore >= 40 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${urgency.impactScore}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{urgency.impactScore}%</span>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Dự đoán ảnh hưởng</p>
                  <p className="text-sm">{urgency.impactDescription}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Đề xuất hành động</p>
                  <p className="text-sm font-medium">{urgency.recommendedAction}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle>Trạng thái</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Trạng thái</span>
                <Badge variant="outline">{alert.status}</Badge>
              </div>
              {alert.readAt && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Đã đọc</span>
                  <span className="text-sm">
                    {format(new Date(alert.readAt), 'HH:mm dd/MM', { locale: vi })}
                  </span>
                </div>
              )}
              {alert.isEscalated && alert.escalatedAt && (
                <>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Escalated lúc</span>
                    <span className="text-sm">
                      {format(new Date(alert.escalatedAt), 'HH:mm dd/MM', { locale: vi })}
                    </span>
                  </div>
                  {alert.escalatedTo && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Escalated đến</span>
                      <span className="text-sm">{alert.escalatedTo}</span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
