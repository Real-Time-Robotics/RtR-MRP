"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Eye, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BOMHeader, BOMTableHeader } from "@/components/bom/bom-content";
import { DataTable, Column } from "@/components/ui-v2/data-table";

interface ProductWithBOM {
  id: string;
  sku: string;
  name: string;
  basePrice: number;
  status: string;
  bomVersion: string;
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

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch("/api/bom/products");
        const data = await res.json();
        setProducts(data.data || []);
      } catch (error) {
        console.error("Failed to fetch products:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  // Column definitions for DataTable
  const columns: Column<ProductWithBOM>[] = useMemo(() => [
    {
      key: 'sku',
      header: 'SKU',
      width: '120px',
      sortable: true,
      render: (value) => <span className="font-mono font-medium">{value}</span>,
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
      width: '100px',
      render: (value, row) => row.hasBom ? value : 'No BOM',
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
      width: '150px',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Link href={`/bom/${row.id}`}>
            <Button variant="ghost" size="sm" className="h-6 text-[10px]">
              <Eye className="h-3 w-3 mr-1" />
              View
            </Button>
          </Link>
          <Link href={`/bom/${row.id}/explode`}>
            <Button variant="outline" size="sm" className="h-6 text-[10px]">
              Explode
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
      ),
    },
  ], []);

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
