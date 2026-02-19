"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, Calendar, Play, AlertTriangle, BarChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { clientLogger } from '@/lib/client-logger';

interface ScheduledOperation {
  id: string;
  workOrderNumber: string;
  operationName: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: string;
  hasConflict: boolean;
}

interface WorkCenterSchedule {
  workCenterId: string;
  workCenterName: string;
  operations: ScheduledOperation[];
}

export default function SchedulerPage() {
  const [schedule, setSchedule] = useState<WorkCenterSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoScheduling, setAutoScheduling] = useState(false);

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    try {
      const res = await fetch("/api/production/scheduler");
      if (res.ok) {
        const data = await res.json();
        setSchedule(data);
      }
    } catch (error) {
      clientLogger.error("Failed to fetch schedule:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoSchedule = async () => {
    setAutoScheduling(true);
    try {
      const res = await fetch("/api/production/scheduler/auto-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (res.ok) {
        const result = await res.json();
        toast.info(
          `Scheduled ${result.scheduled} work orders. ${result.failed} failed.`
        );
        fetchSchedule();
      }
    } catch (error) {
      clientLogger.error("Failed to auto-schedule:", error);
    } finally {
      setAutoScheduling(false);
    }
  };

  const totalOps = schedule.reduce(
    (sum, wc) => sum + wc.operations.length,
    0
  );
  const conflictCount = schedule.reduce(
    (sum, wc) => sum + wc.operations.filter((op) => op.hasConflict).length,
    0
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Production Scheduler"
        description="Schedule and manage production operations"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/production/scheduler/gantt">
                <BarChart className="h-4 w-4 mr-2" />
                Gantt Chart
              </Link>
            </Button>
            <Button onClick={handleAutoSchedule} disabled={autoScheduling}>
              {autoScheduling ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Auto-Schedule
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Work Centers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{schedule.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Scheduled Ops
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOps}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Conflicts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {conflictCount > 0 && (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              )}
              <span
                className={`text-2xl font-bold ${
                  conflictCount > 0 ? "text-red-600" : ""
                }`}
              >
                {conflictCount}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Period
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <span className="text-lg font-medium">This Week</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Schedule by Work Center */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : schedule.length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No scheduled operations</p>
            <p className="text-sm">
              Use Auto-Schedule to schedule pending work orders
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {schedule.map((wc) => (
            <Card key={wc.workCenterId}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{wc.workCenterName}</CardTitle>
                  <Badge variant="secondary">
                    {wc.operations.length} operations
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {wc.operations.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No scheduled operations
                  </p>
                ) : (
                  <div className="space-y-2">
                    {wc.operations.map((op) => (
                      <div
                        key={op.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          op.hasConflict ? "border-red-300 bg-red-50" : ""
                        }`}
                      >
                        <div>
                          <p className="font-medium">{op.workOrderNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            {op.operationName}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm">
                            {format(
                              new Date(op.scheduledStart),
                              "MMM d, h:mm a"
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            to {format(new Date(op.scheduledEnd), "h:mm a")}
                          </p>
                        </div>
                        <Badge
                          className={
                            op.status === "completed"
                              ? "bg-green-100 text-green-800"
                              : op.status === "in_progress"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                          }
                        >
                          {op.status}
                        </Badge>
                        {op.hasConflict && (
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
