"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Download, ShoppingCart, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/layout/page-header";
import { ExplosionResult } from "@/components/bom/explosion-result";
import { Skeleton } from "@/components/ui/skeleton";

interface ExplosionResultItem {
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
  level: number;
  isSubAssembly: boolean;
  parentPartNumber?: string;
  children?: ExplosionResultItem[];
  quantityPer: number;
}

interface ExplosionData {
  product: {
    id: string;
    sku: string;
    name: string;
  };
  results: ExplosionResultItem[];
  tree: ExplosionResultItem[];
  summary: {
    totalParts: number;
    totalCost: number;
    canBuild: number;
    shortageCount: number;
    totalSubAssemblies: number;
    totalLevels: number;
  };
}

export default function BOMExplodePage() {
  const params = useParams();
  const id = params.id as string;
  const [buildQuantityStr, setBuildQuantityStr] = useState("10");
  const buildQuantity = Math.max(1, parseInt(buildQuantityStr) || 1);
  const [data, setData] = useState<ExplosionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creatingPOs, setCreatingPOs] = useState(false);

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

  // Collect leaf parts with shortages from flat results
  const shortageItems = data?.results
    .filter((r) => r.shortage > 0 && !r.isSubAssembly)
    .map((r) => ({ partId: r.partId, quantity: r.shortage })) ?? [];

  const handleCreatePOs = async () => {
    if (shortageItems.length === 0) return;
    setCreatingPOs(true);
    try {
      const response = await fetch(`/api/bom/${id}/create-pos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shortageItems }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || result.message || "Failed to create POs");
      }
      const { created, unmatched, summary } = result.data;
      const poNumbers = created.map((po: { poNumber: string }) => po.poNumber).join(", ");
      toast.success(
        `Created ${summary.totalPOs} draft PO(s): ${poNumbers}`,
        {
          description: unmatched.length > 0
            ? `${unmatched.length} part(s) had no supplier and were skipped`
            : undefined,
          duration: 8000,
          action: {
            label: "View POs",
            onClick: () => {
              window.location.href = "/purchasing";
            },
          },
        }
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create POs");
    } finally {
      setCreatingPOs(false);
    }
  };

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
            <Button
              onClick={handleCreatePOs}
              disabled={creatingPOs || shortageItems.length === 0}
            >
              {creatingPOs ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ShoppingCart className="h-4 w-4 mr-2" />
              )}
              {creatingPOs ? "Creating POs..." : "Create POs"}
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
                value={buildQuantityStr}
                onChange={(e) => setBuildQuantityStr(e.target.value)}
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
          tree={data.tree}
          summary={data.summary}
          buildQuantity={buildQuantity}
        />
      )}
    </div>
  );
}
