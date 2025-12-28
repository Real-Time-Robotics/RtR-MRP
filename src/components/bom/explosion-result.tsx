"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

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
}

interface ExplosionResultProps {
  results: ExplosionResultItem[];
  summary: {
    totalParts: number;
    totalCost: number;
    canBuild: number;
    shortageCount: number;
  };
  buildQuantity: number;
}

export function ExplosionResult({
  results,
  summary,
  buildQuantity,
}: ExplosionResultProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const shortageItems = results.filter((r) => r.status === "SHORTAGE");
  const okItems = results.filter((r) => r.status === "OK");

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Parts</p>
            <p className="text-2xl font-bold">{summary.totalParts} types</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Can Build</p>
            <p className="text-2xl font-bold">
              {summary.canBuild}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                / {buildQuantity} units
              </span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Shortage Items</p>
            <p
              className={cn(
                "text-2xl font-bold",
                summary.shortageCount > 0 && "text-red-600"
              )}
            >
              {summary.shortageCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Estimated Cost</p>
            <p className="text-2xl font-bold">{formatCurrency(summary.totalCost)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Shortage Items */}
      {shortageItems.length > 0 && (
        <Card className="border-red-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Shortage Items ({shortageItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Part #</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Needed</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead className="text-right">Shortage</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shortageItems.map((item) => (
                  <TableRow key={item.partId}>
                    <TableCell className="font-mono">{item.partNumber}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell className="text-right">{item.needed}</TableCell>
                    <TableCell className="text-right">{item.available}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="destructive">-{item.shortage}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(item.unitCost)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* OK Items */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            Available Items ({okItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Part #</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Needed</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead className="text-right">Status</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {okItems.map((item) => (
                <TableRow key={item.partId}>
                  <TableCell className="font-mono">{item.partNumber}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell className="text-right">{item.needed}</TableCell>
                  <TableCell className="text-right">{item.available}</TableCell>
                  <TableCell className="text-right">
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                      OK
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(item.unitCost)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
