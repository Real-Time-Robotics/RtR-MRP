"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Package, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BomLineItem {
  id: string;
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
  expandedSubs,
  toggleSub,
}: {
  line: BomLineItem;
  expandedSubs: Set<string>;
  toggleSub: (id: string) => void;
}) {
  const hasChildren = line.children && line.children.length > 0;
  const isExpanded = expandedSubs.has(line.id);

  return (
    <>
      <tr className="border-t hover:bg-gray-50 text-sm">
        <td className="px-4 py-2">
          <div className="flex items-center gap-2">
            {hasChildren && (
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
            )}
            <span className="font-mono">{line.partNumber}</span>
            {line.isCritical && (
              <Badge variant="destructive" className="text-xs">
                Critical
              </Badge>
            )}
            {hasChildren && (
              <Link href={`/bom/${line.subBomProductId}`}>
                <Badge variant="outline" className="text-xs cursor-pointer hover:bg-primary/10">
                  <Layers className="h-3 w-3 mr-1" />
                  Sub-BOM
                </Badge>
              </Link>
            )}
          </div>
        </td>
        <td className="px-4 py-2">{line.name}</td>
        <td className="px-4 py-2 text-right">
          {line.quantity} {line.unit}
        </td>
        <td className="px-4 py-2 text-right font-mono">
          {formatCurrency(line.unitCost)}
        </td>
        <td className="px-4 py-2 text-right font-mono font-medium">
          {formatCurrency(line.quantity * line.unitCost)}
        </td>
      </tr>
      {/* Sub-BOM children rows */}
      {hasChildren && isExpanded && (
        <>
          <tr className="bg-blue-50/50">
            <td colSpan={5} className="px-4 py-1.5">
              <div className="flex items-center gap-2 pl-6 text-xs text-muted-foreground">
                <Layers className="h-3.5 w-3.5 text-blue-500" />
                <span className="font-medium text-blue-700">
                  Sub-BOM: {line.partNumber} - {line.name}
                </span>
                <span>({line.children!.length} items)</span>
              </div>
            </td>
          </tr>
          {line.children!.map((child) => (
            <tr
              key={child.id}
              className="border-t hover:bg-blue-50/30 text-sm bg-blue-50/20"
            >
              <td className="px-4 py-2 pl-12">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">└</span>
                  <span className="font-mono text-xs">{child.partNumber}</span>
                  {child.isCritical && (
                    <Badge variant="destructive" className="text-xs">
                      Critical
                    </Badge>
                  )}
                </div>
              </td>
              <td className="px-4 py-2 text-muted-foreground">{child.name}</td>
              <td className="px-4 py-2 text-right text-muted-foreground">
                {child.quantity} {child.unit}
              </td>
              <td className="px-4 py-2 text-right font-mono text-muted-foreground">
                {formatCurrency(child.unitCost)}
              </td>
              <td className="px-4 py-2 text-right font-mono text-muted-foreground">
                {formatCurrency(child.quantity * child.unitCost)}
              </td>
            </tr>
          ))}
        </>
      )}
    </>
  );
}

export function BomTree({ modules }: BomTreeProps) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set(modules.map((m) => m.moduleCode))
  );
  const [expandedSubs, setExpandedSubs] = useState<Set<string>>(new Set());

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
