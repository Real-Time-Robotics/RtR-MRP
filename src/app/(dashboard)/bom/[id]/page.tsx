import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: 'Chi tiết BOM',
  description: 'Xem chi tiết cấu trúc BOM - Bill of Materials',
};
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/page-header";
import { BomTree } from "@/components/bom/bom-tree";
import { BomLineManager } from "@/components/bom/bom-line-manager";
import { BomDiscussions } from "@/components/bom/bom-discussions";
import { CreateBomHeaderButton } from "@/components/bom/create-bom-header-button";
import { BOMExportButton } from "@/components/bom/bom-export-button";
import { BomStatusSwitcher } from "@/components/bom/bom-status-switcher";
import prisma from "@/lib/prisma";
import { formatCurrency } from "@/lib/currency";

interface BOMDetailPageProps {
  params: Promise<{ id: string }>;
}

async function getProductWithBOM(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      bomHeaders: {
        where: { status: { in: ["active", "draft"] } },
        orderBy: [
          { status: "asc" }, // "active" before "draft" alphabetically
          { createdAt: "desc" },
        ],
        include: {
          bomLines: {
            include: {
              part: {
                include: {
                  costs: true,
                }
              },
            },
            orderBy: [{ moduleCode: "asc" }, { lineNumber: "asc" }],
          },
        },
      },
    },
  });

  if (!product) return null;

  // Use the first BOM (active preferred, then draft)
  const bom = product.bomHeaders[0];

  // Fetch sub-BOMs: find products whose SKU matches a part number in this BOM
  const partNumbers = bom?.bomLines.map((l) => l.part.partNumber) || [];
  const subProducts = partNumbers.length > 0
    ? await prisma.product.findMany({
        where: {
          sku: { in: partNumbers },
          bomHeaders: { some: { status: { in: ["active", "draft"] } } },
        },
        include: {
          bomHeaders: {
            where: { status: { in: ["active", "draft"] } },
            orderBy: [{ status: "asc" }, { createdAt: "desc" }],
            take: 1,
            include: {
              bomLines: {
                include: { part: { include: { costs: true } } },
                orderBy: [{ moduleCode: "asc" }, { lineNumber: "asc" }],
              },
            },
          },
        },
      })
    : [];

  // Collect all child part numbers from sub-BOMs to check for sub-sub-BOMs
  const childPartNumbers: string[] = [];
  for (const sp of subProducts) {
    const subBom = sp.bomHeaders[0];
    if (!subBom) continue;
    for (const sl of subBom.bomLines) {
      childPartNumbers.push(sl.part.partNumber);
    }
  }

  // Fetch sub-sub-BOM products with their BOM lines
  const subSubProducts = childPartNumbers.length > 0
    ? await prisma.product.findMany({
        where: {
          sku: { in: childPartNumbers },
          bomHeaders: { some: { status: { in: ["active", "draft"] } } },
        },
        include: {
          bomHeaders: {
            where: { status: { in: ["active", "draft"] } },
            orderBy: [{ status: "asc" }, { createdAt: "desc" }],
            take: 1,
            include: {
              bomLines: {
                include: { part: { include: { costs: true } } },
                orderBy: [{ moduleCode: "asc" }, { lineNumber: "asc" }],
              },
            },
          },
        },
      })
    : [];
  const subSubProductMap = new Map(subSubProducts.map((p) => [p.sku, p.id]));

  // Build sub-sub-BOM children map: partNumber → lines
  const subSubBomMap = new Map<string, Array<{
    id: string;
    lineNumber: number;
    partNumber: string;
    name: string;
    quantity: number;
    unit: string;
    unitCost: number;
    isCritical: boolean;
    subBomProductId?: string;
  }>>();
  for (const ssp of subSubProducts) {
    const ssBom = ssp.bomHeaders[0];
    if (!ssBom || ssBom.bomLines.length === 0) continue;
    subSubBomMap.set(
      ssp.sku,
      ssBom.bomLines.map((sl) => ({
        id: sl.id,
        partId: sl.part.id,
        lineNumber: sl.lineNumber,
        partNumber: sl.part.partNumber,
        name: sl.part.name,
        quantity: sl.quantity,
        unit: sl.unit,
        unitCost: sl.part.costs?.[0]?.unitCost || 0,
        isCritical: sl.isCritical,
      }))
    );
  }

  // Build a map: partNumber → sub-BOM children (with their own children if any)
  const subBomMap = new Map<string, Array<{
    id: string;
    lineNumber: number;
    partNumber: string;
    name: string;
    quantity: number;
    unit: string;
    unitCost: number;
    isCritical: boolean;
    moduleCode: string;
    moduleName: string;
    subBomProductId?: string;
    children?: Array<{
      id: string;
      lineNumber: number;
      partNumber: string;
      name: string;
      quantity: number;
      unit: string;
      unitCost: number;
      isCritical: boolean;
      subBomProductId?: string;
    }>;
  }>>();

  for (const sp of subProducts) {
    const subBom = sp.bomHeaders[0];
    if (!subBom) continue;
    subBomMap.set(
      sp.sku,
      subBom.bomLines.map((sl) => ({
        id: sl.id,
        partId: sl.part.id,
        lineNumber: sl.lineNumber,
        partNumber: sl.part.partNumber,
        name: sl.part.name,
        quantity: sl.quantity,
        unit: sl.unit,
        unitCost: sl.part.costs?.[0]?.unitCost || 0,
        isCritical: sl.isCritical,
        moduleCode: sl.moduleCode || "MISC",
        moduleName: sl.moduleName || "Miscellaneous",
        subBomProductId: subSubProductMap.get(sl.part.partNumber),
        children: subSubBomMap.get(sl.part.partNumber) || undefined,
      }))
    );
  }

  // BomLineItem shape matching the client component interface
  interface BomLineData {
    id: string;
    partId?: string;
    lineNumber: number;
    partNumber: string;
    name: string;
    quantity: number;
    unit: string;
    unitCost: number;
    isCritical: boolean;
    children?: BomLineData[];
    subBomProductId?: string;
  }

  // Group lines by module
  const moduleMap = new Map<
    string,
    {
      moduleCode: string;
      moduleName: string;
      lines: BomLineData[];
      totalCost: number;
    }
  >();

  bom?.bomLines.forEach((line) => {
    const code = line.moduleCode || "MISC";
    const name = line.moduleName || "Miscellaneous";

    if (!moduleMap.has(code)) {
      moduleMap.set(code, {
        moduleCode: code,
        moduleName: name,
        lines: [],
        totalCost: 0,
      });
    }

    const bomModule = moduleMap.get(code)!;
    const unitCost = line.part.costs?.[0]?.unitCost || 0;
    const lineCost = line.quantity * unitCost;

    // Check for sub-BOM children
    const children = subBomMap.get(line.part.partNumber);
    const subProduct = subProducts.find((sp) => sp.sku === line.part.partNumber);

    bomModule.lines.push({
      id: line.id,
      partId: line.part.id,
      lineNumber: line.lineNumber,
      partNumber: line.part.partNumber,
      name: line.part.name,
      quantity: line.quantity,
      unit: line.unit,
      unitCost: unitCost,
      isCritical: line.isCritical,
      children: children || undefined,
      subBomProductId: subProduct?.id,
    });
    bomModule.totalCost += lineCost;
  });

  const modules = Array.from(moduleMap.values());
  const totalCost = modules.reduce((sum, m) => sum + m.totalCost, 0);

  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    description: product.description,
    basePrice: product.basePrice || 0,
    status: product.status,
    bomHeaderId: bom?.id || null,
    bomVersion: bom?.version || "N/A",
    bomStatus: bom?.status || "N/A",
    totalParts: bom?.bomLines.length || 0,
    totalCost,
    modules,
  };
}

export default async function BOMDetailPage({ params }: BOMDetailPageProps) {
  const { id } = await params;
  const product = await getProductWithBOM(id);

  if (!product) {
    notFound();
  }

  const isEditable = product.bomStatus === "draft" || product.bomStatus === "active";

  return (
    <div className="space-y-6">
      <PageHeader
        title={product.name}
        description={product.description || `SKU: ${product.sku}`}
        backHref="/bom"
        actions={
          <div className="flex items-center gap-2">
            <BOMExportButton
              productSku={product.sku}
              productName={product.name}
              bomVersion={product.bomVersion}
              lines={product.modules.flatMap(m => m.lines.map(l => ({
                lineNumber: l.lineNumber,
                partNumber: l.partNumber,
                name: l.name,
                quantity: l.quantity,
                unit: l.unit,
                unitCost: l.unitCost,
                isCritical: l.isCritical,
                moduleCode: m.moduleCode,
                moduleName: m.moduleName,
              })))}
            />
            <Link href={`/bom/${product.id}/explode`}>
              <Button>
                Explode BOM
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        }
      />

      {/* Product Info */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">SKU</p>
            <p className="text-lg font-mono font-medium">{product.sku}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">BOM Version</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge>{product.bomVersion}</Badge>
              {product.bomHeaderId ? (
                <BomStatusSwitcher
                  bomHeaderId={product.bomHeaderId}
                  currentStatus={product.bomStatus}
                />
              ) : (
                <Badge variant="outline">{product.bomStatus}</Badge>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Parts</p>
            <p className="text-lg font-medium">{product.totalParts} items</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Material Cost</p>
            <p className="text-lg font-mono font-medium">
              {formatCurrency(product.totalCost)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* No BOM Header - show create prompt */}
      {!product.bomHeaderId && (
        <Card>
          <CardContent>
            <CreateBomHeaderButton productId={product.id} productName={product.name} />
          </CardContent>
        </Card>
      )}

      {/* BOM Structure - only show tabs when BOM header exists */}
      {product.bomHeaderId && (
      <Tabs defaultValue={product.totalParts === 0 ? "edit" : "structure"} className="w-full">
        <TabsList>
          <TabsTrigger value="structure">Structure</TabsTrigger>
          {isEditable && (
            <TabsTrigger value="edit">Edit BOM</TabsTrigger>
          )}
          <TabsTrigger value="cost">Cost Analysis</TabsTrigger>
          <TabsTrigger value="discussions">Discussions</TabsTrigger>
        </TabsList>

        <TabsContent value="structure" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>BOM Structure</CardTitle>
            </CardHeader>
            <CardContent>
              {product.modules.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-2">
                    No BOM lines found
                  </p>
                  {isEditable && (
                    <p className="text-sm text-muted-foreground">
                      Go to the <span className="font-medium">Edit BOM</span> tab to add component parts.
                    </p>
                  )}
                </div>
              ) : (
                <BomTree modules={product.modules} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {isEditable && (
          <TabsContent value="edit" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Edit BOM Lines</CardTitle>
              </CardHeader>
              <CardContent>
                <BomLineManager bomHeaderId={product.bomHeaderId!} />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="cost" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Cost Analysis by Module</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {product.modules.map((module) => (
                  <div
                    key={module.moduleCode}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {module.moduleCode}: {module.moduleName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {module.lines.length} parts
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-medium">
                        {formatCurrency(module.totalCost)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {product.totalCost > 0
                          ? ((module.totalCost / product.totalCost) * 100).toFixed(1)
                          : "0"}%
                      </p>
                    </div>
                  </div>
                ))}
                {product.modules.length > 0 && (
                  <div className="flex items-center justify-between p-4 border-2 border-primary rounded-lg bg-primary/5">
                    <p className="font-bold">Total Material Cost</p>
                    <p className="font-mono font-bold text-lg">
                      {formatCurrency(product.totalCost)}
                    </p>
                  </div>
                )}
                {product.modules.length === 0 && (
                  <p className="text-center py-8 text-muted-foreground">
                    No cost data available. Add parts to the BOM first.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="discussions" className="mt-4">
          <BomDiscussions
            bomId={product.id}
            bomTitle={`BOM ${product.sku} - ${product.name}`}
          />
        </TabsContent>
      </Tabs>
      )}
    </div>
  );
}
