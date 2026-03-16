"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { Eye, ArrowRight, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BOMHeader, BOMTableHeader } from "@/components/bom/bom-content";
import { DataTable, Column } from "@/components/ui-v2/data-table";
import { EntityTooltip } from "@/components/entity-tooltip";
import { clientLogger } from '@/lib/client-logger';
import { toast } from "sonner";

interface ProductWithBOM {
  id: string;
  sku: string;
  name: string;
  basePrice: number;
  status: string;
  bomVersion: string;
  bomStatus: string | null;
  bomHeaderId: string | null;
  totalParts: number;
  hasBom: boolean;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function BOMPage() {
  const [products, setProducts] = useState<ProductWithBOM[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/bom/products");
      const data = await res.json();
      setProducts(data.data || []);
    } catch (error) {
      clientLogger.error("Failed to fetch products:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleDelete = useCallback(async (row: ProductWithBOM) => {
    const label = row.hasBom
      ? `Xóa BOM "${row.bomVersion}" và product "${row.sku}"?`
      : `Xóa product "${row.sku}"?`;
    if (!confirm(`${label} Thao tác này không thể hoàn tác.`)) return;

    setDeletingId(row.id);
    try {
      // Step 1: Delete BOM if exists
      if (row.bomHeaderId) {
        const bomRes = await fetch(`/api/bom/${row.bomHeaderId}`, { method: "DELETE" });
        if (!bomRes.ok) {
          const err = await bomRes.json().catch(() => null);
          toast.error(err?.error || "Không thể xóa BOM");
          return;
        }
      }

      // Step 2: Delete product
      const productRes = await fetch(`/api/products/${row.id}`, { method: "DELETE" });
      if (productRes.ok) {
        toast.success(`Đã xóa ${row.sku}`);
      } else {
        // Product may have other BOMs — still show success for BOM delete
        if (row.bomHeaderId) {
          toast.success(`Đã xóa BOM của ${row.sku}`);
        }
      }

      await fetchProducts();
    } catch {
      toast.error("Lỗi kết nối");
    } finally {
      setDeletingId(null);
    }
  }, [fetchProducts]);

  // Column definitions for DataTable
  const columns: Column<ProductWithBOM>[] = useMemo(() => [
    {
      key: 'sku',
      header: 'SKU',
      width: '120px',
      sortable: true,
      render: (value, row) => (
        <EntityTooltip type="product" id={row.id}>
          <span className="font-mono font-medium cursor-help">{value}</span>
        </EntityTooltip>
      ),
    },
    {
      key: 'name',
      header: 'Product Name',
      width: '200px',
      sortable: true,
    },
    {
      key: 'bomVersion',
      header: 'BOM Version',
      width: '120px',
      render: (value, row) => row.hasBom
        ? <span>{value} {row.bomStatus === 'draft' ? <span className="text-orange-500 text-[10px]">(Draft)</span> : ''}</span>
        : 'No BOM',
      cellClassName: (_, row) =>
        row.hasBom
          ? 'bg-blue-50 dark:bg-blue-950/30'
          : 'bg-gray-50 dark:bg-gray-950/30',
    },
    {
      key: 'totalParts',
      header: 'Parts',
      width: '80px',
      sortable: true,
    },
    {
      key: 'basePrice',
      header: 'Base Price',
      width: '100px',
      type: 'currency',
      sortable: true,
      render: (value) => <span className="font-mono">{formatCurrency(value)}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '160px',
      render: (_, row) => {
        const canDelete = !row.hasBom || row.bomStatus === "draft";
        const isDeleting = deletingId === row.id;
        return (
          <div className="flex items-center justify-end gap-1">
            <Link href={`/bom/${row.id}`}>
              <Button variant="ghost" size="sm" className="h-6 text-[10px]">
                <Eye className="h-3 w-3 mr-1" />
                View
              </Button>
            </Link>
            {row.hasBom && (
              <Link href={`/bom/${row.id}/explode`}>
                <Button variant="outline" size="sm" className="h-6 text-[10px]">
                  Explode
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={() => handleDelete(row)}
                disabled={isDeleting}
                title={row.hasBom ? "Xóa BOM & Product" : "Xóa Product"}
              >
                {isDeleting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
              </Button>
            )}
          </div>
        );
      },
    },
  ], [deletingId, handleDelete]);

  return (
    // COMPACT: space-y-6 → space-y-3
    <div className="space-y-3">
      <BOMHeader />

      <Card className="border-gray-200 dark:border-mrp-border">
        <BOMTableHeader />
        <CardContent className="p-0">
          <DataTable
            data={products}
            columns={columns}
            keyField="id"
            loading={loading}
            emptyMessage="No products found. Create a product first."
            pagination
            pageSize={20}
            searchable={true}
            searchColumns={['sku', 'name', 'bomVersion']}
            stickyHeader
            excelMode={{
              enabled: true,
              showRowNumbers: true,
              columnHeaderStyle: 'field-names',
              gridBorders: true,
              showFooter: true,
              sheetName: 'BOM Products',
              compactMode: true,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
