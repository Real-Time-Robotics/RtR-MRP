'use client';

import { useState, useMemo } from 'react';
import { useActivityTimeline } from '@/hooks/use-activity-timeline';
import { ActivityItem } from './activity-item';
import { ActivityFilters } from './activity-filters';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { History, Loader2, RefreshCw } from 'lucide-react';

export function ActivityTimeline() {
  const [entityType, setEntityType] = useState('all');
  const [dateRange, setDateRange] = useState('7days');

  const dateFrom = useMemo(() => {
    const now = new Date();
    switch (dateRange) {
      case 'today':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case '3days':
        return new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      case '7days':
        return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      case '30days':
        return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }
  }, [dateRange]);

  const { activities, total, hasMore, isLoading, loadMore, refresh } =
    useActivityTimeline({
      limit: 20,
      entityType: entityType === 'all' ? undefined : entityType,
      dateFrom,
    });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <History className="w-5 h-5 text-muted-foreground" />
          Lich su hoat dong
        </CardTitle>
        <div className="flex items-center gap-2">
          <ActivityFilters
            entityType={entityType}
            onEntityTypeChange={setEntityType}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
          <Button variant="ghost" size="sm" onClick={refresh}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Chua co hoat dong nao trong khoang thoi gian nay
          </p>
        ) : (
          <>
            <div className="space-y-0">
              {activities.map((activity, index) => (
                <ActivityItem
                  key={activity.id}
                  activity={activity}
                  isLast={index === activities.length - 1}
                />
              ))}
            </div>

            {hasMore && (
              <div className="text-center pt-4">
                <Button variant="outline" size="sm" onClick={loadMore}>
                  Xem them ({total - activities.length} con lai)
                </Button>
              </div>
            )}

            <p className="text-xs text-muted-foreground text-center mt-4">
              Hien thi {activities.length} / {total} hoat dong
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
