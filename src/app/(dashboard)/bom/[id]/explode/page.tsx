"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Download, ShoppingCart, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/layout/page-header";
import { ExplosionResult } from "@/components/bom/explosion-result";
import { Skeleton } from "@/components/ui/skeleton";

interface ExplosionData {
  product: {
    id: string;
    sku: string;
    name: string;
  };
  results: Array<{
    partId: string;
    partNumber: string;
    name: string;
    needed: number;
    available: number;
    shortage: number;
    unit: string;
    unitCost: number;
    totalCost: number;
    status: "OK" | "SHORTAGE";
    moduleCode?: string;
    moduleName?: string;
  }>;
  summary: {
    totalParts: number;
    totalCost: number;
    canBuild: number;
    shortageCount: number;
  };
}

export default function BOMExplodePage() {
  const params = useParams();
  const id = params.id as string;
  const [buildQuantity, setBuildQuantity] = useState(10);
  const [data, setData] = useState<ExplosionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExplosion = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/bom/${id}/explode?quantity=${buildQuantity}`);
      if (!response.ok) {
        throw new Error("Failed to explode BOM");
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [id, buildQuantity]);

  useEffect(() => {
    fetchExplosion();
  }, [fetchExplosion]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="BOM Explosion"
        description={data?.product?.name || "Loading..."}
        backHref={`/bom/${id}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Shortage
            </Button>
            <Button>
              <ShoppingCart className="h-4 w-4 mr-2" />
              Create POs
            </Button>
          </div>
        }
      />

      {/* Build Quantity Input */}
      <Card>
        <CardHeader>
          <CardTitle>Build Quantity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Number of units to build</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={buildQuantity}
                onChange={(e) => setBuildQuantity(parseInt(e.target.value) || 1)}
                className="w-32"
              />
            </div>
            <Button onClick={fetchExplosion} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Calculate
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {error && (
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardContent className="pt-6">
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      )}

      {!loading && data && (
        <ExplosionResult
          results={data.results}
          summary={data.summary}
          buildQuantity={buildQuantity}
        />
      )}
    </div>
  );
}
