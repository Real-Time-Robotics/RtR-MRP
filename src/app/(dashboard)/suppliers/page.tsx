import { Star, CheckCircle } from "lucide-react";
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
import { SuppliersHeader, SuppliersStatsCards, SuppliersTableHeader, SuppliersNoData } from "@/components/suppliers/suppliers-content";
import prisma from "@/lib/prisma";

async function getSuppliers() {
  const suppliers = await prisma.supplier.findMany({
    where: { status: "active" },
    orderBy: { name: "asc" },
  });

  return suppliers;
}

export default async function SuppliersPage() {
  const suppliers = await getSuppliers();
  const avgLeadTime = suppliers.length > 0
    ? Math.round(suppliers.reduce((sum, s) => sum + s.leadTimeDays, 0) / suppliers.length)
    : 0;

  return (
    <div className="space-y-6">
      <SuppliersHeader />

      {/* Summary */}
      <SuppliersStatsCards
        stats={{
          total: suppliers.length,
          ndaaCompliant: suppliers.filter((s) => s.ndaaCompliant).length,
          avgLeadTime,
        }}
      />

      {/* Suppliers Table */}
      <Card>
        <SuppliersTableHeader />
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-center">Lead Time</TableHead>
                <TableHead className="text-center">Rating</TableHead>
                <TableHead className="text-center">NDAA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <SuppliersNoData />
                  </TableCell>
                </TableRow>
              ) : (
                suppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-mono font-medium">
                      {supplier.code}
                    </TableCell>
                    <TableCell className="font-medium">{supplier.name}</TableCell>
                    <TableCell>{supplier.country}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{supplier.category || "General"}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {supplier.leadTimeDays} days
                    </TableCell>
                    <TableCell className="text-center">
                      {supplier.rating && (
                        <div className="flex items-center justify-center gap-1">
                          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                          <span>{supplier.rating.toFixed(1)}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {supplier.ndaaCompliant ? (
                        <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
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
