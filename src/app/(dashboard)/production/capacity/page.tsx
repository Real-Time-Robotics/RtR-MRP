"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, BarChart3, AlertTriangle, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { CapacityBar } from "@/components/production/capacity-bar";
import { clientLogger } from '@/lib/client-logger';

interface CapacitySummary {
  totalWorkCenters: number;
  avgUtilization: number;
  overCapacityCount: number;
  underUtilizedCount: number;
  workCenters: Array<{
    id: string;
    code: string;
    name: string;
    type: string;
    status: string;
    availableHours: number;
    scheduledHours: number;
    utilization: number;
    utilizationStatus: "under" | "optimal" | "over";
  }>;
}

export default function CapacityPage() {
  const [data, setData] = useState<CapacitySummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCapacity();
  }, []);

  const fetchCapacity = async () => {
    try {
      const res = await fetch("/api/production/capacity");
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (error) {
      clientLogger.error("Failed to fetch capacity:", error);
    } finally {
      setLoading(false);
    }
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
        <p className="text-muted-foreground">Failed to load capacity data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Capacity Overview"
        description="Work center capacity and utilization"
        actions={
          <Button asChild>
            <Link href="/production/capacity/planning">
              <BarChart3 className="h-4 w-4 mr-2" />
              RCCP Planning
            </Link>
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Work Centers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalWorkCenters}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Avg Utilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-bold">{data.avgUtilization}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Over Capacity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {data.overCapacityCount > 0 ? (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              ) : null}
              <span
                className={`text-2xl font-bold ${
                  data.overCapacityCount > 0 ? "text-red-600" : ""
                }`}
              >
                {data.overCapacityCount}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Under Utilized
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {data.underUtilizedCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Work Center Capacity Table */}
      <Card>
        <CardHeader>
          <CardTitle>Work Center Utilization (This Week)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data?.workCenters?.map((wc) => (
              <div
                key={wc.id}
                className="flex items-center gap-4 p-3 rounded-lg border"
              >
                <div className="w-32">
                  <p className="font-medium">{wc.code}</p>
                  <p className="text-sm text-muted-foreground">{wc.name}</p>
                </div>
                <div className="w-24 text-sm text-muted-foreground">
                  {wc.type}
                </div>
                <div className="flex-1">
                  <CapacityBar utilization={wc.utilization} />
                </div>
                <div className="w-32 text-right text-sm">
                  <p className="font-medium">
                    {wc.scheduledHours.toFixed(1)}h /{" "}
                    {wc.availableHours.toFixed(1)}h
                  </p>
                  <p
                    className={
                      wc.utilizationStatus === "over"
                        ? "text-red-600"
                        : wc.utilizationStatus === "optimal"
                        ? "text-green-600"
                        : "text-muted-foreground"
                    }
                  >
                    {wc.utilizationStatus === "over"
                      ? "Over capacity"
                      : wc.utilizationStatus === "optimal"
                      ? "Optimal"
                      : "Under-utilized"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
