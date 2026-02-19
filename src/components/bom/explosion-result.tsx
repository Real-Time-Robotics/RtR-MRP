"use client";

import { useState } from "react";
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
import { CheckCircle, XCircle, ChevronDown, ChevronRight, Layers } from "lucide-react";
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
  level: number;
  isSubAssembly: boolean;
  parentPartNumber?: string;
  children?: ExplosionResultItem[];
  quantityPer: number;
}

interface ExplosionResultProps {
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
  buildQuantity: number;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

function hasShortageInTree(item: ExplosionResultItem): boolean {
  if (!item.isSubAssembly) return item.status === "SHORTAGE";
  if (!item.children) return false;
  return item.children.some((c) => hasShortageInTree(c));
}

function SubAssemblyExplosionRows({
  item,
  expandedSubs,
  toggleSub,
  depth,
  variant,
}: {
  item: ExplosionResultItem;
  expandedSubs: Set<string>;
  toggleSub: (id: string) => void;
  depth: number;
  variant: "shortage" | "ok";
}) {
  const hasChildren = item.isSubAssembly && item.children && item.children.length > 0;
  const isExpanded = expandedSubs.has(`${variant}-${item.partId}-${depth}`);
  const toggleKey = `${variant}-${item.partId}-${depth}`;

  if (item.isSubAssembly && hasChildren) {
    // Filter children based on variant
    const relevantChildren =
      variant === "shortage"
        ? item.children!.filter((c) => hasShortageInTree(c))
        : item.children!.filter((c) => !hasShortageInTree(c));

    if (relevantChildren.length === 0 && variant === "shortage") return null;
    if (relevantChildren.length === 0 && variant === "ok" && !hasShortageInTree(item)) {
      // Show the sub-assembly itself as OK
    }

    return (
      <>
        {/* Sub-assembly header row */}
        <TableRow className={cn("bg-blue-50/30 hover:bg-blue-50/50")}>
          <TableCell className={cn(depth > 0 && "pl-12")}>
            <div className="flex items-center gap-2">
              {hasChildren && (
                <button
                  onClick={() => toggleSub(toggleKey)}
                  className="p-0.5 hover:bg-blue-200 rounded"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5 text-blue-600" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-blue-600" />
                  )}
                </button>
              )}
              {depth > 0 && <span className="text-muted-foreground">└</span>}
              <span className="font-mono">{item.partNumber}</span>
              <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">
                <Layers className="h-3 w-3 mr-1" />
                Sub-BOM
              </Badge>
            </div>
          </TableCell>
          <TableCell className="text-blue-800 font-medium">{item.name}</TableCell>
          <TableCell className="text-right text-blue-700">{item.needed}</TableCell>
          <TableCell className="text-right text-blue-700">{item.available}</TableCell>
          <TableCell className="text-right">
            {variant === "shortage" ? (
              <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                {relevantChildren.length} items
              </Badge>
            ) : (
              <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                {relevantChildren.length} items
              </Badge>
            )}
          </TableCell>
          <TableCell className="text-right font-mono text-blue-700">
            {formatCurrency(item.unitCost)}
          </TableCell>
        </TableRow>

        {/* Children rows */}
        {isExpanded &&
          relevantChildren.map((child, idx) => (
            <SubAssemblyExplosionRows
              key={`${child.partId}-${idx}`}
              item={child}
              expandedSubs={expandedSubs}
              toggleSub={toggleSub}
              depth={depth + 1}
              variant={variant}
            />
          ))}
      </>
    );
  }

  // Leaf part row
  return (
    <TableRow className={cn(depth > 0 && "bg-blue-50/20 hover:bg-blue-50/30")}>
      <TableCell className={cn(depth > 0 ? "pl-12" : "")}>
        <div className="flex items-center gap-2">
          {depth > 0 && <span className="text-muted-foreground">└</span>}
          <span className="font-mono">{item.partNumber}</span>
        </div>
      </TableCell>
      <TableCell className={cn(depth > 0 && "text-muted-foreground")}>{item.name}</TableCell>
      <TableCell className="text-right">{item.needed}</TableCell>
      <TableCell className="text-right">{item.available}</TableCell>
      <TableCell className="text-right">
        {variant === "shortage" ? (
          <Badge variant="destructive">-{item.shortage}</Badge>
        ) : (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">OK</Badge>
        )}
      </TableCell>
      <TableCell className="text-right font-mono">{formatCurrency(item.unitCost)}</TableCell>
    </TableRow>
  );
}

export function ExplosionResult({
  results,
  tree,
  summary,
  buildQuantity,
}: ExplosionResultProps) {
  // Auto-expand sub-assemblies that have shortages
  const defaultExpanded = new Set<string>();
  function findShortageSubAssemblies(items: ExplosionResultItem[], depth: number) {
    for (const item of items) {
      if (item.isSubAssembly && item.children && hasShortageInTree(item)) {
        defaultExpanded.add(`shortage-${item.partId}-${depth}`);
        findShortageSubAssemblies(item.children, depth + 1);
      }
    }
  }
  findShortageSubAssemblies(tree, 0);

  const [expandedSubs, setExpandedSubs] = useState<Set<string>>(defaultExpanded);

  const toggleSub = (key: string) => {
    setExpandedSubs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Separate tree items into shortage and OK
  const shortageTreeItems = tree.filter((item) => hasShortageInTree(item));
  const okTreeItems = tree.filter((item) => !hasShortageInTree(item));

  // For non-sub-assembly leaf items at root that are OK but also have shortage siblings
  // we need items that are purely shortage or purely OK
  const shortageLeafItems = tree.filter(
    (item) => !item.isSubAssembly && item.status === "SHORTAGE"
  );
  const okLeafItems = tree.filter((item) => !item.isSubAssembly && item.status === "OK");
  const shortageSubItems = tree.filter(
    (item) => item.isSubAssembly && hasShortageInTree(item)
  );
  const okSubItems = tree.filter(
    (item) => item.isSubAssembly && !hasShortageInTree(item)
  );

  const allShortageItems = [...shortageLeafItems, ...shortageSubItems];
  const allOkItems = [...okLeafItems, ...okSubItems];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
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
        {summary.totalSubAssemblies > 0 && (
          <>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Sub-Assemblies</p>
                <p className="text-2xl font-bold text-blue-600">
                  {summary.totalSubAssemblies}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">BOM Levels</p>
                <p className="text-2xl font-bold text-blue-600">{summary.totalLevels}</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Shortage Items */}
      {allShortageItems.length > 0 && (
        <Card className="border-red-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Shortage Items ({summary.shortageCount})
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
                {allShortageItems.map((item, idx) => (
                  <SubAssemblyExplosionRows
                    key={`shortage-${item.partId}-${idx}`}
                    item={item}
                    expandedSubs={expandedSubs}
                    toggleSub={toggleSub}
                    depth={0}
                    variant="shortage"
                  />
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
            Available Items ({allOkItems.length})
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
              {allOkItems.map((item, idx) => (
                <SubAssemblyExplosionRows
                  key={`ok-${item.partId}-${idx}`}
                  item={item}
                  expandedSubs={expandedSubs}
                  toggleSub={toggleSub}
                  depth={0}
                  variant="ok"
                />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
