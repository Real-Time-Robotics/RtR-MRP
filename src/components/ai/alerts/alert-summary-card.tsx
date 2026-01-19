'use client';

import { AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertPriority } from '@/lib/ai/alerts';

interface AlertSummaryCardProps {
  counts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
    unread: number;
    pendingAction: number;
    escalated: number;
  };
  onFilterByPriority?: (priority: AlertPriority) => void;
}

export function AlertSummaryCard({ counts, onFilterByPriority }: AlertSummaryCardProps) {
  const summaryItems = [
    {
      priority: AlertPriority.CRITICAL,
      label: 'Khẩn cấp',
      count: counts.critical,
      icon: AlertTriangle,
      color: 'text-red-500',
      bgColor: 'bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50',
      borderColor: 'border-red-200 dark:border-red-800',
    },
    {
      priority: AlertPriority.HIGH,
      label: 'Cao',
      count: counts.high,
      icon: AlertCircle,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/30 dark:hover:bg-orange-950/50',
      borderColor: 'border-orange-200 dark:border-orange-800',
    },
    {
      priority: AlertPriority.MEDIUM,
      label: 'Trung bình',
      count: counts.medium,
      icon: Info,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-950/30 dark:hover:bg-yellow-950/50',
      borderColor: 'border-yellow-200 dark:border-yellow-800',
    },
    {
      priority: AlertPriority.LOW,
      label: 'Thấp',
      count: counts.low,
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-50 hover:bg-green-100 dark:bg-green-950/30 dark:hover:bg-green-950/50',
      borderColor: 'border-green-200 dark:border-green-800',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {summaryItems.map((item) => (
        <Card
          key={item.priority}
          className={`${item.bgColor} ${item.borderColor} cursor-pointer transition-all`}
          onClick={() => onFilterByPriority?.(item.priority)}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <item.icon className={`h-8 w-8 ${item.color}`} />
              <div>
                <p className="text-2xl font-bold">{item.count}</p>
                <p className="text-sm text-muted-foreground">{item.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default AlertSummaryCard;
