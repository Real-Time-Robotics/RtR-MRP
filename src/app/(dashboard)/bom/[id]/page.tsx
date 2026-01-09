import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/page-header";
import { BomTree } from "@/components/bom/bom-tree";
import prisma from "@/lib/prisma";

interface BOMDetailPageProps {
  params: Promise<{ id: string }>;
}

async function getProductWithBOM(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      bomHeaders: {
        where: { status: "active" },
        include: {
          bomLines: {
            include: {
              part: {
                include: {
                  cost: true,
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

  const activeBom = product.bomHeaders[0];

  // Group lines by module
  const moduleMap = new Map<
    string,
    {
      moduleCode: string;
      moduleName: string;
      lines: Array<{
        id: string;
        lineNumber: number;
        partNumber: string;
        name: string;
        quantity: number;
        unit: string;
        unitCost: number;
        isCritical: boolean;
      }>;
      totalCost: number;
    }
  >();

  activeBom?.bomLines.forEach((line) => {
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
    const unitCost = line.part.cost?.unitCost || 0;
    const lineCost = line.quantity * unitCost;

    bomModule.lines.push({
      id: line.id,
      lineNumber: line.lineNumber,
      partNumber: line.part.partNumber,
      name: line.part.name,
      quantity: line.quantity,
      unit: line.unit,
      unitCost: unitCost,
      isCritical: line.isCritical,
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
    bomVersion: activeBom?.version || "N/A",
    bomStatus: activeBom?.status || "N/A",
    totalParts: activeBom?.bomLines.length || 0,
    totalCost,
    modules,
  };
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function BOMDetailPage({ params }: BOMDetailPageProps) {
  const { id } = await params;
  const product = await getProductWithBOM(id);

  if (!product) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={product.name}
        description={product.description || `SKU: ${product.sku}`}
        backHref="/bom"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
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
              <Badge variant="outline">{product.bomStatus}</Badge>
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

      {/* BOM Structure */}
      <Tabs defaultValue="structure" className="w-full">
        <TabsList>
          <TabsTrigger value="structure">Structure</TabsTrigger>
          <TabsTrigger value="cost">Cost Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="structure" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>BOM Structure</CardTitle>
            </CardHeader>
            <CardContent>
              {product.modules.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No BOM lines found
                </p>
              ) : (
                <BomTree modules={product.modules} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

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
                        {((module.totalCost / product.totalCost) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between p-4 border-2 border-primary rounded-lg bg-primary/5">
                  <p className="font-bold">Total Material Cost</p>
                  <p className="font-mono font-bold text-lg">
                    {formatCurrency(product.totalCost)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
