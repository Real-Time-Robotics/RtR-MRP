"use client";

import { useState, useEffect } from "react";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import {
  Activity,
  ShoppingCart,
  Package,
  AlertTriangle,
  Brain,
  CheckCircle,
  Loader2,
  RefreshCw,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { clientLogger } from '@/lib/client-logger';
import { ActivityTimeline } from '@/components/activity-timeline';

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description?: string;
  icon?: string;
  color?: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

const activityIcons: Record<string, React.ElementType> = {
  order_created: ShoppingCart,
  stock_alert: AlertTriangle,
  po_received: Package,
  mrp_complete: Brain,
  wo_complete: CheckCircle,
};

const activityColors: Record<string, string> = {
  order_created: "bg-green-100 text-green-600",
  stock_alert: "bg-amber-100 text-amber-600",
  po_received: "bg-blue-100 text-blue-600",
  mrp_complete: "bg-purple-100 text-purple-600",
  wo_complete: "bg-green-100 text-green-600",
};

export default function ActivityPage() {
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [typeFilter, setTypeFilter] = useState("all");
  const [daysFilter, setDaysFilter] = useState("7");

  useEffect(() => {
    fetchActivities();
  }, [typeFilter, daysFilter]);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type: typeFilter,
        days: daysFilter,
        limit: "100",
      });
      const res = await fetch(`/api/activity?${params}`);
      if (res.ok) {
        const data = await res.json();
        setActivities(data.activities || []);
      }
    } catch (error) {
      clientLogger.error("Failed to fetch activities:", error);
    } finally {
      setLoading(false);
    }
  };

  // Group activities by date
  const groupedActivities = activities.reduce(
    (acc, activity) => {
      const date = new Date(activity.createdAt);
      let dateKey: string;

      if (isToday(date)) {
        dateKey = "Today";
      } else if (isYesterday(date)) {
        dateKey = "Yesterday";
      } else {
        dateKey = format(date, "MMMM d, yyyy");
      }

      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(activity);
      return acc;
    },
    {} as Record<string, ActivityItem[]>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity Log"
        description="Track recent activities and system events"
        actions={
          <Button variant="outline" onClick={fetchActivities} disabled={loading}>
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        }
      />

      <Tabs defaultValue="timeline" className="w-full">
        <TabsList>
          <TabsTrigger value="timeline">Work Session Timeline</TabsTrigger>
          <TabsTrigger value="system">System Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="mt-4">
          <ActivityTimeline />
        </TabsContent>

        <TabsContent value="system" className="mt-4 space-y-6">

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="order_created">Orders</SelectItem>
              <SelectItem value="stock_alert">Stock Alerts</SelectItem>
              <SelectItem value="po_received">Receiving</SelectItem>
              <SelectItem value="mrp_complete">MRP</SelectItem>
              <SelectItem value="wo_complete">Production</SelectItem>
            </SelectContent>
          </Select>

          <Select value={daysFilter} onValueChange={setDaysFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 24 hours</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>

          <Badge variant="secondary" className="ml-auto">
            {activities.length} activities
          </Badge>
        </div>
      </Card>

      {/* Activity Feed */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : activities.length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No activity found</p>
            <p className="text-sm">
              Activities will appear here as you use the system
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedActivities).map(([dateKey, items]) => (
            <Card key={dateKey}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {dateKey}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-4">
                  {items.map((activity) => {
                    const Icon =
                      activityIcons[activity.type] || Activity;
                    const colorClass =
                      activityColors[activity.type] ||
                      "bg-gray-100 text-gray-600";

                    return (
                      <div
                        key={activity.id}
                        className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => {
                          if (activity.link) {
                            window.location.href = activity.link;
                          }
                        }}
                      >
                        <div className={`p-2 rounded-lg ${colorClass}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{activity.title}</p>
                          {activity.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {activity.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            {format(new Date(activity.createdAt), "h:mm a")} •{" "}
                            {formatDistanceToNow(new Date(activity.createdAt), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                        {activity.link && (
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

        </TabsContent>
      </Tabs>
    </div>
  );
}
