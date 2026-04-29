'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wrench } from 'lucide-react';
import Link from 'next/link';

interface UpcomingMaintenance {
  id: string;
  code: string;
  name: string;
  nextMaintenanceDate: string;
  workCenter?: { id: string; code: string; name: string } | null;
}

interface MaintenanceWeekWidgetProps {
  days?: number;
}

export function MaintenanceWeekWidget({ days = 7 }: MaintenanceWeekWidgetProps) {
  const [items, setItems] = useState<UpcomingMaintenance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/production/maintenance-schedule?days=${days}`)
      .then((res) => res.json())
      .then((data) => setItems(data.upcoming || []))
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Wrench className="h-4 w-4" /> Bảo trì sắp tới
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Đang tải...</p>
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Wrench className="h-4 w-4" /> Bảo trì sắp tới
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Không có bảo trì trong {days} ngày tới.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Wrench className="h-4 w-4" /> Bảo trì sắp tới ({items.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => {
          const dateStr = new Date(item.nextMaintenanceDate).toLocaleDateString('vi-VN', {
            weekday: 'short',
            day: '2-digit',
            month: '2-digit',
          });
          return (
            <Link
              key={item.id}
              href={`/dashboard/production/equipment?highlight=${item.id}`}
              className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors"
            >
              <div>
                <span className="text-sm font-medium">{item.code}</span>
                <span className="text-xs text-muted-foreground ml-2">{item.name}</span>
              </div>
              <div className="flex items-center gap-2">
                {item.workCenter && (
                  <Badge variant="outline" className="text-xs">
                    {item.workCenter.code}
                  </Badge>
                )}
                <Badge variant="secondary" className="text-xs">
                  {dateStr}
                </Badge>
              </div>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
