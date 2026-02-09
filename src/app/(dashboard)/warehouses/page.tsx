"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Warehouse, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";

// Types for API responses
interface WarehouseData {
  id: string;
  code: string;
  name: string;
  location?: string;
  type?: string;
  status: string;
}

interface InventoryItem {
  id: string;
  partNumber: string;
  name: string;
  quantity: number;
  reserved: number;
  available: number;
  status: string;
  isCritical: boolean;
}

interface WarehouseWithStats extends WarehouseData {
  itemCount: number;
  totalQuantity: number;
  criticalCount: number;
}

// Color config by warehouse type
const typeColors: Record<string, { border: string; bg: string; text: string; badge: string }> = {
  MAIN: {
    border: "border-l-green-500",
    bg: "bg-green-50 dark:bg-green-950/20",
    text: "text-green-700 dark:text-green-400",
    badge: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  },
  RECEIVING: {
    border: "border-l-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950/20",
    text: "text-blue-700 dark:text-blue-400",
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  },
  QUARANTINE: {
    border: "border-l-red-500",
    bg: "bg-red-50 dark:bg-red-950/20",
    text: "text-red-700 dark:text-red-400",
    badge: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  },
  HOLD: {
    border: "border-l-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950/20",
    text: "text-amber-700 dark:text-amber-400",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  },
  SCRAP: {
    border: "border-l-gray-500",
    bg: "bg-gray-50 dark:bg-gray-950/20",
    text: "text-gray-700 dark:text-gray-400",
    badge: "bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300",
  },
};

function getTypeColor(type?: string) {
  return typeColors[type || "MAIN"] || typeColors.MAIN;
}

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<WarehouseWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // 1. Fetch all warehouses
        const whRes = await fetch("/api/warehouses");
        const whJson = await whRes.json();
        if (!whJson.success) throw new Error("Failed to fetch warehouses");

        const warehouseList: WarehouseData[] = whJson.data;

        // 2. Fetch inventory for each warehouse in parallel
        const inventoryPromises = warehouseList.map((wh) =>
          fetch(`/api/inventory?warehouseId=${wh.id}`)
            .then((r) => r.json())
            .then((json) => ({
              warehouseId: wh.id,
              items: (json.data || []) as InventoryItem[],
            }))
        );

        const inventoryResults = await Promise.all(inventoryPromises);

        // 3. Merge stats
        const merged: WarehouseWithStats[] = warehouseList.map((wh) => {
          const inv = inventoryResults.find((r) => r.warehouseId === wh.id);
          const items = inv?.items || [];
          return {
            ...wh,
            itemCount: items.length,
            totalQuantity: items.reduce((sum, i) => sum + i.quantity, 0),
            criticalCount: items.filter(
              (i) => i.status === "CRITICAL" || i.status === "OUT_OF_STOCK"
            ).length,
          };
        });

        setWarehouses(merged);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Lỗi tải dữ liệu");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Summary stats
  const totalSKU = warehouses.reduce((s, w) => s + w.itemCount, 0);
  const totalQuantity = warehouses.reduce((s, w) => s + w.totalQuantity, 0);
  const totalAlerts = warehouses.reduce((s, w) => s + w.criticalCount, 0);
  const warehouseCount = warehouses.length;

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <PageHeader title="Quản lý Kho" description="Tổng quan hệ thống kho hàng" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2" />
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse h-48">
              <CardContent className="p-6">
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-4" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-6">
        <PageHeader title="Quản lý Kho" description="Tổng quan hệ thống kho hàng" />
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardContent className="p-6 text-center text-red-600 dark:text-red-400">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
            <p>{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Quản lý Kho" description="Tổng quan hệ thống kho hàng" />

      {/* Summary Stats - compact style giống InventoryTable */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Card className="border-gray-200 dark:border-mrp-border">
          <CardContent className="p-3">
            <div className="text-lg font-semibold font-mono">{totalSKU}</div>
            <p className="text-[10px] text-gray-500 dark:text-mrp-text-muted">Tổng SKU</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200 dark:border-mrp-border">
          <CardContent className="p-3">
            <div className="text-lg font-semibold font-mono">{totalQuantity.toLocaleString()}</div>
            <p className="text-[10px] text-gray-500 dark:text-mrp-text-muted">Tổng số lượng</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200 dark:border-mrp-border">
          <CardContent className="p-3">
            <div className="text-lg font-semibold font-mono text-red-600">{totalAlerts}</div>
            <p className="text-[10px] text-gray-500 dark:text-mrp-text-muted">Cảnh báo</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200 dark:border-mrp-border">
          <CardContent className="p-3">
            <div className="text-lg font-semibold font-mono">{warehouseCount}</div>
            <p className="text-[10px] text-gray-500 dark:text-mrp-text-muted">Số kho</p>
          </CardContent>
        </Card>
      </div>

      {/* Warehouse Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {warehouses.map((wh) => {
          const colors = getTypeColor(wh.type);
          return (
            <Link key={wh.id} href={`/warehouses/${wh.id}`}>
              <Card
                className={`border-l-4 ${colors.border} hover:shadow-md transition-shadow cursor-pointer`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold">
                      {wh.name}
                    </CardTitle>
                    <Badge variant="secondary" className={colors.badge}>
                      {wh.type || "MAIN"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    {wh.code}
                    {wh.location && ` — ${wh.location}`}
                  </p>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-3 gap-4 mt-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Items</p>
                      <p className="text-lg font-bold">{wh.itemCount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Số lượng</p>
                      <p className="text-lg font-bold">
                        {wh.totalQuantity.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Cấp bách</p>
                      <p
                        className={`text-lg font-bold ${
                          wh.criticalCount > 0
                            ? "text-red-600 dark:text-red-400"
                            : "text-green-600 dark:text-green-400"
                        }`}
                      >
                        {wh.criticalCount}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
