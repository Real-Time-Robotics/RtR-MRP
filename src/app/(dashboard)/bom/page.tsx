import Link from "next/link";
import { Eye, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BOMHeader, BOMTableHeader, BOMNoProducts } from "@/components/bom/bom-content";
import prisma from "@/lib/prisma";

async function getProducts() {
  const products = await prisma.product.findMany({
    where: { status: "active" },
    include: {
      bomHeaders: {
        where: { status: "active" },
        include: {
          bomLines: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return products.map((product) => {
    const activeBom = product.bomHeaders[0];
    const totalParts = activeBom?.bomLines.length || 0;

    return {
      id: product.id,
      sku: product.sku,
      name: product.name,
      basePrice: product.basePrice || 0,
      status: product.status,
      bomVersion: activeBom?.version || "N/A",
      totalParts,
      hasBom: !!activeBom,
    };
  });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function BOMPage() {
  const products = await getProducts();

  return (
    <div className="space-y-6">
      <BOMHeader />

      <Card>
        <BOMTableHeader />
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead>BOM Version</TableHead>
                <TableHead className="text-center">Parts</TableHead>
                <TableHead className="text-right">Base Price</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <BOMNoProducts />
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-mono font-medium">
                      {product.sku}
                    </TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>
                      {product.hasBom ? (
                        <Badge variant="secondary">{product.bomVersion}</Badge>
                      ) : (
                        <Badge variant="outline">No BOM</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {product.totalParts}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(product.basePrice)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/bom/${product.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </Link>
                        <Link href={`/bom/${product.id}/explode`}>
                          <Button variant="outline" size="sm">
                            Explode
                            <ArrowRight className="h-4 w-4 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
