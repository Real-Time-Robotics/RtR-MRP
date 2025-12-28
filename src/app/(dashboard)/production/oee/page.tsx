"use client";

import { useState, useEffect } from "react";
import { Loader2, Activity, TrendingUp, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { OEEGauge } from "@/components/production/oee-gauge";

interface OEEDashboard {
  overallOEE: number;
  avgAvailability: number;
  avgPerformance: number;
  avgQuality: number;
  workCenters: Array<{
    id: string;
    code: string;
    name: string;
    oee: number;
    availability: number;
    performance: number;
    quality: number;
    status: "world_class" | "good" | "average" | "poor";
  }>;
  topLosses: Array<{
    category: string;
    minutes: number;
    percentage: number;
  }>;
}

export default function OEEDashboardPage() {
  const [data, setData] = useState<OEEDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOEE();
  }, []);

  const fetchOEE = async () => {
    try {
      const res = await fetch("/api/production/oee");
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (error) {
      console.error("Failed to fetch OEE:", error);
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
        <p className="text-muted-foreground">Failed to load OEE data</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "world_class":
        return "text-green-600";
      case "good":
        return "text-blue-600";
      case "average":
        return "text-yellow-600";
      default:
        return "text-red-600";
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="OEE Dashboard"
        description="Overall Equipment Effectiveness metrics"
      />

      {/* Overall Stats */}
      <div className="grid grid-cols-4 gap-6">
        <Card className="col-span-1">
          <CardContent className="pt-6">
            <OEEGauge
              oee={data.overallOEE}
              availability={data.avgAvailability}
              performance={data.avgPerformance}
              quality={data.avgQuality}
              size="lg"
            />
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              OEE Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Availability</span>
                  <span className="text-2xl font-bold">
                    {data.avgAvailability}%
                  </span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{ width: `${data.avgAvailability}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Run Time / Planned Production Time
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Performance</span>
                  <span className="text-2xl font-bold">
                    {data.avgPerformance}%
                  </span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all"
                    style={{ width: `${data.avgPerformance}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  (Ideal Cycle Time x Total Count) / Run Time
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Quality</span>
                  <span className="text-2xl font-bold">{data.avgQuality}%</span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 transition-all"
                    style={{ width: `${data.avgQuality}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Good Count / Total Count
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Work Center OEE */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Work Center OEE (This Week)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.workCenters.map((wc) => (
                <div
                  key={wc.id}
                  className="flex items-center gap-4 p-3 rounded-lg border"
                >
                  <div className="flex-1">
                    <p className="font-medium">{wc.code}</p>
                    <p className="text-sm text-muted-foreground">{wc.name}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${getStatusColor(wc.status)}`}>
                      {wc.oee}%
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {wc.status.replace("_", " ")}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-center">
                    <div>
                      <p className="font-medium">{wc.availability}%</p>
                      <p className="text-muted-foreground">A</p>
                    </div>
                    <div>
                      <p className="font-medium">{wc.performance}%</p>
                      <p className="text-muted-foreground">P</p>
                    </div>
                    <div>
                      <p className="font-medium">{wc.quality}%</p>
                      <p className="text-muted-foreground">Q</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Losses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Top Losses (Pareto)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.topLosses.map((loss, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{loss.category}</span>
                    <span className="text-sm text-muted-foreground">
                      {loss.minutes} min ({loss.percentage}%)
                    </span>
                  </div>
                  <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        index === 0
                          ? "bg-red-500"
                          : index === 1
                          ? "bg-orange-500"
                          : "bg-yellow-500"
                      }`}
                      style={{ width: `${loss.percentage}%` }}
                    />
                  </div>
                </div>
              ))}

              <div className="pt-4 border-t mt-4">
                <p className="text-sm text-muted-foreground">
                  Focus Area: Reduce the top loss category to improve OEE
                  significantly
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* OEE Reference */}
      <Card>
        <CardHeader>
          <CardTitle>OEE Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="p-4 rounded-lg bg-red-50 border border-red-200">
              <p className="text-2xl font-bold text-red-600">&lt; 50%</p>
              <p className="text-sm text-red-700">Poor</p>
              <p className="text-xs text-red-600 mt-1">Significant improvement needed</p>
            </div>
            <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
              <p className="text-2xl font-bold text-yellow-600">50-70%</p>
              <p className="text-sm text-yellow-700">Average</p>
              <p className="text-xs text-yellow-600 mt-1">Room for improvement</p>
            </div>
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
              <p className="text-2xl font-bold text-blue-600">70-85%</p>
              <p className="text-sm text-blue-700">Good</p>
              <p className="text-xs text-blue-600 mt-1">Typical for discrete manufacturers</p>
            </div>
            <div className="p-4 rounded-lg bg-green-50 border border-green-200">
              <p className="text-2xl font-bold text-green-600">&gt; 85%</p>
              <p className="text-sm text-green-700">World Class</p>
              <p className="text-xs text-green-600 mt-1">Best-in-class performance</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
