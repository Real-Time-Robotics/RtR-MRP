"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Eye, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
      align: 'center',
      render: (value, row) => (
        row.hasBom ? (
          <Badge variant="secondary">{value}</Badge>
        ) : (
          <Badge variant="outline">No BOM</Badge>
        )
      ),
    },
    {
      key: 'totalParts',
      header: 'Parts',
      width: '80px',
      align: 'center',
      sortable: true,
    },
    {
      key: 'basePrice',
      header: 'Base Price',
      width: '100px',
      align: 'right',
      type: 'currency',
      sortable: true,
      render: (value) => <span className="font-mono">{formatCurrency(value)}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '150px',
      align: 'right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-2">
          <Link href={`/bom/${row.id}`}>
            <Button variant="ghost" size="sm">
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
          </Link>
          <Link href={`/bom/${row.id}/explode`}>
            <Button variant="outline" size="sm">
              Explode
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
      ),
    },
  ], []);

  return (
    <div className="space-y-6">
      <BOMHeader />

      <Card>
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
            searchable={false}
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
