"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Package, Layers, Plus, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { EntityTooltip } from "@/components/entity-tooltip";

interface BomLineItem {
  id: string;
  partId?: string;
  lineNumber: number;
  partNumber: string;
  name: string;
  quantity: number;
  unit: string;
  unitCost: number;
  isCritical: boolean;
  children?: BomLineItem[];
  subBomProductId?: string;
}

interface BomModule {
  moduleCode: string;
  moduleName: string;
  lines: BomLineItem[];
  totalCost: number;
}

interface BomTreeProps {
  modules: BomModule[];
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

function SubAssemblyRows({
  line,
  depth = 0,
  expandedSubs,
  toggleSub,
  onCreateSubBom,
  creatingSubBomFor,
}: {
  line: BomLineItem;
  depth?: number;
  expandedSubs: Set<string>;
  toggleSub: (id: string) => void;
  onCreateSubBom: (line: BomLineItem) => void;
  creatingSubBomFor: string | null;
}) {
  const hasChildren = line.children && line.children.length > 0;
  const hasSubBom = hasChildren || !!line.subBomProductId;
  const isExpanded = expandedSubs.has(line.id);
  const isCreating = creatingSubBomFor === line.id;
  const isNested = depth > 0;

  // Indentation: 16px base + 32px per depth level
  const indent = 16 + depth * 32;

  return (
    <>
      <tr className={`border-t text-sm ${isNested ? "bg-blue-50/20 hover:bg-blue-50/30" : "hover:bg-gray-50"}`}>
        <td className="py-2" style={{ paddingLeft: `${indent}px`, paddingRight: 16 }}>
          <div className="flex items-center gap-2">
            {isNested && <span className="text-muted-foreground text-xs">└</span>}
            {hasChildren ? (
              <button
                onClick={() => toggleSub(line.id)}
                className="p-0.5 hover:bg-gray-200 rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </button>
            ) : !isNested ? (
              <span className="w-4" />
            ) : null}
            {line.partId ? (
              <EntityTooltip type="part" id={line.partId}>
                <span className={`font-mono cursor-help ${isNested ? "text-xs" : ""}`}>{line.partNumber}</span>
              </EntityTooltip>
            ) : (
              <span className={`font-mono ${isNested ? "text-xs" : ""}`}>{line.partNumber}</span>
            )}
            {line.isCritical && (
              <Badge variant="destructive" className="text-xs">
                Critical
              </Badge>
            )}
            {hasSubBom && line.subBomProductId && (
              <Link href={`/bom/${line.subBomProductId}`}>
                <Badge variant="outline" className={`cursor-pointer hover:bg-primary/10 ${isNested ? "text-[10px]" : "text-xs"}`}>
                  <Layers className={`${isNested ? "h-2.5 w-2.5" : "h-3 w-3"} mr-0.5`} />
                  Sub-BOM
                </Badge>
              </Link>
            )}
            {!hasSubBom && (
              <button
                onClick={() => onCreateSubBom(line)}
                disabled={isCreating}
                className={`inline-flex items-center gap-0.5 font-medium rounded-full border border-dashed border-primary/40 text-primary hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isNested ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs gap-1"}`}
              >
                {isCreating ? (
                  <Loader2 className={`${isNested ? "h-2.5 w-2.5" : "h-3 w-3"} animate-spin`} />
                ) : (
                  <Plus className={isNested ? "h-2.5 w-2.5" : "h-3 w-3"} />
                )}
                Sub-BOM
              </button>
            )}
          </div>
        </td>
        <td className={`px-4 py-2 ${isNested ? "text-muted-foreground" : ""}`}>{line.name}</td>
        <td className={`px-4 py-2 text-right ${isNested ? "text-muted-foreground" : ""}`}>
          {line.quantity} {line.unit}
        </td>
        <td className={`px-4 py-2 text-right font-mono ${isNested ? "text-muted-foreground" : ""}`}>
          {formatCurrency(line.unitCost)}
        </td>
        <td className={`px-4 py-2 text-right font-mono ${isNested ? "text-muted-foreground" : "font-medium"}`}>
          {formatCurrency(line.quantity * line.unitCost)}
        </td>
      </tr>
      {/* Sub-BOM children — recursive */}
      {hasChildren && isExpanded && (
        <>
          <tr className="bg-blue-50/50">
            <td colSpan={5} className="py-1.5" style={{ paddingLeft: `${indent + 24}px` }}>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Layers className="h-3.5 w-3.5 text-blue-500" />
                <span className="font-medium text-blue-700">
                  Sub-BOM: {line.partNumber} - {line.name}
                </span>
                <span>({line.children!.length} items)</span>
              </div>
            </td>
          </tr>
          {line.children!.map((child) => (
            <SubAssemblyRows
              key={child.id}
              line={child}
              depth={depth + 1}
              expandedSubs={expandedSubs}
              toggleSub={toggleSub}
              onCreateSubBom={onCreateSubBom}
              creatingSubBomFor={creatingSubBomFor}
            />
          ))}
        </>
      )}
    </>
  );
}

export function BomTree({ modules }: BomTreeProps) {
  const router = useRouter();
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set(modules.map((m) => m.moduleCode))
  );
  const [expandedSubs, setExpandedSubs] = useState<Set<string>>(new Set());
  const [creatingSubBomFor, setCreatingSubBomFor] = useState<string | null>(null);

  const toggleModule = (moduleCode: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleCode)) {
      newExpanded.delete(moduleCode);
    } else {
      newExpanded.add(moduleCode);
    }
    setExpandedModules(newExpanded);
  };

  const toggleSub = (lineId: string) => {
    const newExpanded = new Set(expandedSubs);
    if (newExpanded.has(lineId)) {
      newExpanded.delete(lineId);
    } else {
      newExpanded.add(lineId);
    }
    setExpandedSubs(newExpanded);
  };

  const handleCreateSubBom = async (line: BomLineItem) => {
    setCreatingSubBomFor(line.id);
    try {
      // Step 1: Create product (or find existing one by SKU)
      let productId: string;

      const productRes = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku: line.partNumber, name: line.name }),
      });

      if (productRes.status === 201) {
        const product = await productRes.json();
        productId = product.id;
      } else if (productRes.status === 400) {
        // SKU may already exist — find the existing product
        const productErr = await productRes.json().catch(() => null);
        const searchRes = await fetch(
          `/api/products?search=${encodeURIComponent(line.partNumber)}`
        );
        const searchData = await searchRes.json();
        const existing = searchData.data?.find(
          (p: { sku: string }) => p.sku === line.partNumber
        );
        if (!existing) {
          toast.error(productErr?.error || "Không thể tạo sản phẩm");
          return;
        }
        productId = existing.id;
      } else {
        toast.error("Không thể tạo sản phẩm");
        return;
      }

      // Step 2: Create BOM header for that product (or skip if already exists)
      const bomRes = await fetch("/api/bom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          version: "1.0",
          status: "draft",
        }),
      });

      if (bomRes.ok) {
        toast.success(`Đã tạo Sub-BOM cho ${line.partNumber}`);
      } else {
        // BOM already exists for this product — still navigate
        toast.info(`Sub-BOM đã tồn tại cho ${line.partNumber}`);
      }

      router.push(`/bom/${productId}`);
    } catch {
      toast.error("Lỗi kết nối");
    } finally {
      setCreatingSubBomFor(null);
    }
  };

  return (
    <div className="space-y-2">
      {modules.map((module) => {
        const isExpanded = expandedModules.has(module.moduleCode);
        const hasSubBoms = module.lines.some((l) => l.children && l.children.length > 0);
        return (
          <div key={module.moduleCode} className="border rounded-lg">
            {/* Module Header */}
            <button
              onClick={() => toggleModule(module.moduleCode)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
                <Package className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <p className="font-medium">
                    {module.moduleCode}: {module.moduleName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {module.lines.length} parts
                    {hasSubBoms && (
                      <span className="ml-2 text-blue-600">
                        (contains sub-assemblies)
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium">{formatCurrency(module.totalCost)}</p>
              </div>
            </button>

            {/* Module Lines */}
            {isExpanded && (
              <div className="border-t">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr className="text-xs text-muted-foreground">
                      <th className="px-4 py-2 text-left font-medium">Part #</th>
                      <th className="px-4 py-2 text-left font-medium">Name</th>
                      <th className="px-4 py-2 text-right font-medium">Qty</th>
                      <th className="px-4 py-2 text-right font-medium">Unit Cost</th>
                      <th className="px-4 py-2 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {module.lines.map((line) => (
                      <SubAssemblyRows
                        key={line.id}
                        line={line}
                        expandedSubs={expandedSubs}
                        toggleSub={toggleSub}
                        onCreateSubBom={handleCreateSubBom}
                        creatingSubBomFor={creatingSubBomFor}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
