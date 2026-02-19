'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  Clock,
  X,
  ChevronRight,
  ExternalLink,
  Lightbulb,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertPriority,
  AlertStatus,
  AlertActionType,
  AlertType,
  AlertSource,
  getTypeLabel,
  getSourceLabel,
} from '@/lib/ai/alerts';
import Link from 'next/link';

interface AlertCardProps {
  alert: {
    id: string;
    type: string;
    priority: AlertPriority;
    source: string;
    status: AlertStatus;
    title: string;
    message: string;
    aiSuggestion?: string;
    entities: Array<{ type: string; id: string; name?: string; code?: string }>;
    actions: Array<{
      id: string;
      label: string;
      type: AlertActionType;
      url?: string;
      isPrimary?: boolean;
    }>;
    createdAt: Date | string;
    isEscalated: boolean;
  };
  onAction?: (alertId: string, actionId: string) => void;
  onDismiss?: (alertId: string) => void;
  onSnooze?: (alertId: string) => void;
  isCompact?: boolean;
}

export function AlertCard({
  alert,
  onAction,
  onDismiss,
  onSnooze,
  isCompact = false,
}: AlertCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const getPriorityIcon = (priority: AlertPriority) => {
    switch (priority) {
      case AlertPriority.CRITICAL:
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case AlertPriority.HIGH:
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      case AlertPriority.MEDIUM:
        return <Info className="h-5 w-5 text-yellow-500" />;
      case AlertPriority.LOW:
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: AlertPriority) => {
    switch (priority) {
      case AlertPriority.CRITICAL:
        return 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800';
      case AlertPriority.HIGH:
        return 'bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800';
      case AlertPriority.MEDIUM:
        return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800';
      case AlertPriority.LOW:
        return 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getPriorityBadge = (priority: AlertPriority) => {
    const variants: Record<AlertPriority, 'destructive' | 'default' | 'secondary' | 'outline'> = {
      [AlertPriority.CRITICAL]: 'destructive',
      [AlertPriority.HIGH]: 'default',
      [AlertPriority.MEDIUM]: 'secondary',
      [AlertPriority.LOW]: 'outline',
    };

    const labels: Record<AlertPriority, string> = {
      [AlertPriority.CRITICAL]: 'Khẩn cấp',
      [AlertPriority.HIGH]: 'Cao',
      [AlertPriority.MEDIUM]: 'Trung bình',
      [AlertPriority.LOW]: 'Thấp',
    };

    return (
      <Badge variant={variants[priority]} className="text-xs">
        {labels[priority]}
      </Badge>
    );
  };

  const handleAction = async (actionId: string) => {
    if (!onAction) return;
    setIsLoading(actionId);
    try {
      await onAction(alert.id, actionId);
    } finally {
      setIsLoading(null);
    }
  };

  const timeAgo = formatDistanceToNow(new Date(alert.createdAt), {
    addSuffix: true,
    locale: vi,
  });

  const primaryAction = alert.actions.find(a => a.isPrimary);
  const secondaryActions = alert.actions.filter(a => !a.isPrimary && a.type !== AlertActionType.DISMISS && a.type !== AlertActionType.SNOOZE);

  if (isCompact) {
    return (
      <div
        className={`flex items-center gap-3 p-3 rounded-lg border ${getPriorityColor(alert.priority)} cursor-pointer hover:bg-opacity-80 transition-colors`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {getPriorityIcon(alert.priority)}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{alert.title}</p>
          <p className="text-xs text-muted-foreground">{timeAgo}</p>
        </div>
        {primaryAction && (
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              if (primaryAction.url) {
                window.location.href = primaryAction.url;
              } else {
                handleAction(primaryAction.id);
              }
            }}
          >
            {primaryAction.label}
          </Button>
        )}
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card className={`${getPriorityColor(alert.priority)} transition-all hover:shadow-md`}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            {getPriorityIcon(alert.priority)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {getPriorityBadge(alert.priority)}
              <Badge variant="outline" className="text-xs">
                {getTypeLabel(alert.type as AlertType)}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {getSourceLabel(alert.source as AlertSource)}
              </span>
              {alert.isEscalated && (
                <Badge variant="destructive" className="text-xs">
                  Đã Escalate
                </Badge>
              )}
            </div>

            <h4 className="font-semibold text-base">{alert.title}</h4>

            <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>

            {/* AI Suggestion */}
            {alert.aiSuggestion && (
              <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-950/30 rounded-md border border-blue-200 dark:border-blue-800">
                <div className="flex gap-2">
                  <Lightbulb className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {alert.aiSuggestion}
                  </p>
                </div>
              </div>
            )}

            {/* Entities */}
            {alert.entities.length > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {alert.entities.slice(0, 3).map((entity, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {entity.name || entity.code || entity.id}
                  </Badge>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              {primaryAction && (
                primaryAction.url ? (
                  <Link href={primaryAction.url}>
                    <Button size="sm" className="gap-1">
                      {primaryAction.label}
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </Link>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleAction(primaryAction.id)}
                    disabled={isLoading === primaryAction.id}
                  >
                    {isLoading === primaryAction.id ? 'Đang xử lý...' : primaryAction.label}
                  </Button>
                )
              )}

              {secondaryActions.slice(0, 2).map((action) => (
                action.url ? (
                  <Link key={action.id} href={action.url}>
                    <Button size="sm" variant="outline" className="gap-1">
                      {action.label}
                    </Button>
                  </Link>
                ) : (
                  <Button
                    key={action.id}
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction(action.id)}
                    disabled={isLoading === action.id}
                  >
                    {action.label}
                  </Button>
                )
              ))}

              <div className="flex-1" />

              {onSnooze && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onSnooze(alert.id)}
                  title="Tạm ẩn 4 giờ"
                >
                  <Clock className="h-4 w-4" />
                </Button>
              )}

              {onDismiss && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDismiss(alert.id)}
                  title="Bỏ qua"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="text-xs text-muted-foreground whitespace-nowrap">
            {timeAgo}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default AlertCard;
