"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { WorkCenterStatus } from "@/components/production/work-center-status";
import { CapacityBar } from "@/components/production/capacity-bar";
import { format } from "date-fns";
import { clientLogger } from '@/lib/client-logger';

interface WorkCenterData {
  id: string;
  code: string;
  name: string;
  type: string;
  status: string;
  currentJob: {
    woNumber: string;
    operationName: string;
    scheduledStart: string;
    scheduledEnd: string;
    progress: number;
  } | null;
  downtime: {
    reason: string;
    type: string;
    startTime: string;
  } | null;
  utilization: number;
  queueCount: number;
}

interface ShopFloorData {
  workCenters: WorkCenterData[];
  metrics: {
    completedOps: number;
    inProgressOps: number;
    pendingOps: number;
    totalUnits: number;
    scrapUnits: number;
    scrapRate: number;
  };
}

export default function ShopFloorPage() {
  const [data, setData] = useState<ShopFloorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/production/shop-floor");
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (error) {
      clientLogger.error("Failed to fetch shop floor data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Failed to load shop floor data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shop Floor Dashboard"
        description="Real-time production status"
        actions={
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw
              className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        }
      />

      {/* Today's Metrics */}
      <div className="grid grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {data.metrics.completedOps}
            </div>
            <p className="text-xs text-muted-foreground">operations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {data.metrics.inProgressOps}
            </div>
            <p className="text-xs text-muted-foreground">operations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Waiting
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.metrics.pendingOps}</div>
            <p className="text-xs text-muted-foreground">operations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Units Produced
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.metrics.totalUnits}</div>
            <p className="text-xs text-muted-foreground">today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Scrap
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {data.metrics.scrapUnits}
            </div>
            <p className="text-xs text-muted-foreground">
              ({data.metrics.scrapRate.toFixed(1)}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{format(new Date(), "h:mm")}</div>
            <p className="text-xs text-muted-foreground">
              {format(new Date(), "a")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Work Center Status Grid */}
      <div className="grid grid-cols-3 gap-4">
        {data?.workCenters?.map((wc) => (
          <Card
            key={wc.id}
            className={
              wc.status === "down"
                ? "border-red-300"
                : wc.status === "running"
                ? "border-green-300"
                : ""
            }
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{wc.code}</CardTitle>
                <WorkCenterStatus status={wc.status} />
              </div>
              <p className="text-sm text-muted-foreground">{wc.name}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {wc.status === "down" && wc.downtime ? (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">{wc.downtime.type}</span>
                  </div>
                  <p className="text-sm text-red-600 mt-1">
                    {wc.downtime.reason}
                  </p>
                  <p className="text-xs text-red-500 mt-1">
                    Since {format(new Date(wc.downtime.startTime), "h:mm a")}
                  </p>
                </div>
              ) : wc.currentJob ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{wc.currentJob.woNumber}</span>
                    <span className="text-muted-foreground">
                      {wc.currentJob.progress}%
                    </span>
                  </div>
                  <CapacityBar
                    utilization={wc.currentJob.progress}
                    showLabel={false}
                    height="sm"
                  />
                  <p className="text-sm text-muted-foreground">
                    {wc.currentJob.operationName}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No active job
                </p>
              )}

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Queue:</span>
                <span className="font-medium">{wc.queueCount} jobs</span>
              </div>

              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link href={`/production/shop-floor/${wc.id}`}>
                  View Queue
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
