"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { format } from "date-fns";

interface ShortageItem {
  id: string;
  partNumber: string;
  partName: string;
  currentStock: number;
  safetyStock: number;
  requiredQty: number;
  shortfallQty: number;
  earliestNeed: string;
  affectedOrders: number;
  priority: string;
  supplier: string | null;
  leadTimeDays: number;
}

export default function ShortagesPage() {
  const [shortages, setShortages] = useState<ShortageItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchShortages();
  }, []);

  const fetchShortages = async () => {
    try {
      const res = await fetch("/api/mrp/shortages");
      const data = await res.json();
      setShortages(data);
    } catch (error) {
      console.error("Failed to fetch shortages:", error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "destructive";
      case "high":
        return "default";
      case "medium":
        return "secondary";
      default:
        return "outline";
    }
  };

  const totalShortfall = shortages.reduce((sum, s) => sum + s.shortfallQty, 0);
  const criticalCount = shortages.filter((s) => s.priority === "critical").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shortage Report"
        description="Parts with insufficient inventory to meet demand"
        backHref="/mrp"
        actions={
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{shortages.length}</p>
              <p className="text-sm text-muted-foreground">Total Shortages</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div>
            <p className="text-2xl font-bold text-red-600">{criticalCount}</p>
            <p className="text-sm text-muted-foreground">Critical</p>
          </div>
        </Card>
        <Card className="p-4">
          <div>
            <p className="text-2xl font-bold">{totalShortfall}</p>
            <p className="text-sm text-muted-foreground">Total Shortfall Units</p>
          </div>
        </Card>
        <Card className="p-4">
          <div>
            <p className="text-2xl font-bold">
              {shortages.reduce((sum, s) => sum + s.affectedOrders, 0)}
            </p>
            <p className="text-sm text-muted-foreground">Affected Orders</p>
          </div>
        </Card>
      </div>

      {/* Shortages Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Shortage Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : shortages.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <p className="text-lg font-medium">No Shortages Detected</p>
              <p className="text-muted-foreground">
                All parts have sufficient inventory to meet current demand
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-sm text-muted-foreground">
                    <th className="text-left py-3 px-4">Part</th>
                    <th className="text-right py-3 px-4">Current</th>
                    <th className="text-right py-3 px-4">Safety</th>
                    <th className="text-right py-3 px-4">Required</th>
                    <th className="text-right py-3 px-4 text-red-600">Shortfall</th>
                    <th className="text-left py-3 px-4">Earliest Need</th>
                    <th className="text-left py-3 px-4">Supplier</th>
                    <th className="text-center py-3 px-4">Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {shortages.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{item.partNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.partName}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">{item.currentStock}</td>
                      <td className="py-3 px-4 text-right">{item.safetyStock}</td>
                      <td className="py-3 px-4 text-right">{item.requiredQty}</td>
                      <td className="py-3 px-4 text-right font-bold text-red-600">
                        -{item.shortfallQty}
                      </td>
                      <td className="py-3 px-4">
                        {format(new Date(item.earliestNeed), "MMM dd, yyyy")}
                      </td>
                      <td className="py-3 px-4">
                        {item.supplier ? (
                          <div>
                            <p>{item.supplier}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.leadTimeDays} days lead time
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={getPriorityColor(item.priority)}>
                          {item.priority}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
