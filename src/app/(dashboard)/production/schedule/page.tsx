"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { WOStatusBadge } from "@/components/production/wo-status-badge";
import {
  addDays,
  startOfWeek,
  endOfWeek,
  format,
  isSameDay,
  isWithinInterval,
} from "date-fns";

interface WorkOrder {
  id: string;
  woNumber: string;
  quantity: number;
  priority: string;
  status: string;
  plannedStart: string | null;
  plannedEnd: string | null;
  completedQty: number;
  product: {
    sku: string;
    name: string;
  };
}

export default function ProductionSchedulePage() {
  const router = useRouter();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  useEffect(() => {
    fetchWorkOrders();
  }, []);

  const fetchWorkOrders = async () => {
    try {
      const res = await fetch("/api/production");
      const data = await res.json();
      setWorkOrders(data);
    } catch (error) {
      console.error("Failed to fetch work orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const goToPreviousWeek = () => setWeekStart(addDays(weekStart, -7));
  const goToNextWeek = () => setWeekStart(addDays(weekStart, 7));
  const goToToday = () => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const getOrdersForDay = (day: Date) => {
    return workOrders.filter((wo) => {
      if (!wo.plannedStart && !wo.plannedEnd) return false;

      const start = wo.plannedStart ? new Date(wo.plannedStart) : null;
      const end = wo.plannedEnd ? new Date(wo.plannedEnd) : null;

      if (start && end) {
        return isWithinInterval(day, { start, end }) || isSameDay(day, start) || isSameDay(day, end);
      }
      if (start) return isSameDay(day, start);
      if (end) return isSameDay(day, end);
      return false;
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-500";
      case "high":
        return "bg-orange-500";
      case "medium":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  const unscheduledOrders = workOrders.filter(
    (wo) => !wo.plannedStart && !wo.plannedEnd && wo.status !== "completed"
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Production Schedule"
        description="Visual timeline of work orders"
        backHref="/production"
      />

      {/* Week Navigation */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={goToNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={goToToday}>
              Today
            </Button>
          </div>
          <h2 className="text-lg font-semibold">
            {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
          </h2>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-500" />
              <span>Urgent</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-orange-500" />
              <span>High</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-500" />
              <span>Medium</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-gray-500" />
              <span>Low</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-7 divide-x">
              {days.map((day, index) => {
                const isToday = isSameDay(day, new Date());
                const ordersForDay = getOrdersForDay(day);

                return (
                  <div key={index} className="min-h-[200px]">
                    <div
                      className={`p-3 text-center border-b ${
                        isToday ? "bg-primary text-white" : "bg-gray-50"
                      }`}
                    >
                      <p className="text-sm font-medium">{format(day, "EEE")}</p>
                      <p className="text-lg font-bold">{format(day, "d")}</p>
                    </div>
                    <div className="p-2 space-y-2">
                      {ordersForDay.map((wo) => (
                        <div
                          key={wo.id}
                          className={`p-2 rounded text-white text-xs cursor-pointer hover:opacity-80 ${getPriorityColor(
                            wo.priority
                          )}`}
                          onClick={() => router.push(`/production/${wo.id}`)}
                        >
                          <p className="font-medium truncate">{wo.woNumber}</p>
                          <p className="truncate opacity-90">{wo.product.name}</p>
                          <p className="opacity-75">Qty: {wo.quantity}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unscheduled Orders */}
      {unscheduledOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Unscheduled Work Orders
              <Badge variant="secondary">{unscheduledOrders.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              {unscheduledOrders.map((wo) => (
                <div
                  key={wo.id}
                  className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/production/${wo.id}`)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm">{wo.woNumber}</span>
                    <WOStatusBadge status={wo.status} />
                  </div>
                  <p className="font-medium truncate">{wo.product.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Qty: {wo.quantity}
                  </p>
                  <Badge
                    variant="outline"
                    className={`mt-2 ${
                      wo.priority === "urgent"
                        ? "border-red-500 text-red-500"
                        : wo.priority === "high"
                        ? "border-orange-500 text-orange-500"
                        : ""
                    }`}
                  >
                    {wo.priority}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
