"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Package } from "lucide-react";
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

export function BomTree({ modules }: BomTreeProps) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set(modules.map((m) => m.moduleCode))
  );

  const toggleModule = (moduleCode: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleCode)) {
      newExpanded.delete(moduleCode);
    } else {
      newExpanded.add(moduleCode);
    }
    setExpandedModules(newExpanded);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-2">
      {modules.map((module) => {
        const isExpanded = expandedModules.has(module.moduleCode);
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
                      <tr
                        key={line.id}
                        className="border-t hover:bg-gray-50 text-sm"
                      >
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono">{line.partNumber}</span>
                            {line.isCritical && (
                              <Badge variant="destructive" className="text-xs">
                                Critical
                              </Badge>
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
