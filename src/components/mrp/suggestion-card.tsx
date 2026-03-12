"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  X,
  ShoppingCart,
  AlertTriangle,
  Package,
  TrendingDown,
  ChevronDown,
  ChevronRight,
  Layers,
} from "lucide-react";
import { format } from "date-fns";
import { EntityTooltip } from "@/components/entity-tooltip";

interface BomChild {
  partId: string;
  partNumber: string;
  name: string;
  quantity: number;
  unit: string;
  stock: number;
  onOrder: number;
  isCritical: boolean;
  totalDemandAll?: number;
  children?: BomChild[];
}

interface SuggestionProps {
  suggestion: {
    id: string;
    partId?: string;
    partNumber: string;
    partName: string;
    actionType: string;
    priority: string;
    suggestedQty?: number | null;
    suggestedDate?: Date | string | null;
    reason: string | null;
    supplierName?: string | null;
    estimatedCost?: number | null;
    status: string;
    onOrder?: number;
    bomChildren?: BomChild[];
  };
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onCreatePO: (id: string) => void;
}

const priorityColors: Record<string, string> = {
  CRITICAL: "bg-purple-100 text-purple-800",
  HIGH: "bg-red-100 text-red-800",
  MEDIUM: "bg-amber-100 text-amber-800",
  LOW: "bg-green-100 text-green-800",
};

/** Parse reason string into structured data.
 * Latest: "Gross: 50, Stock: 10, OnOrder: 30, SS: 0, MOQ: 1, OrderMultiple: 10, Type: PURCHASE"
 * Previous: "Gross: 50, Stock: 10, OnOrder: 30, SS: 0, MOQ: 1"
 * Old: "Gross: 50, Stock: 10, SS: 0, MOQ: 1"
 */
function parseReason(reason: string | null) {
  if (!reason) return null;
  // Try latest format with OnOrder + OrderMultiple
  const matchLatest = reason.match(
    /Gross:\s*(\d+),\s*Stock:\s*(-?\d+),\s*OnOrder:\s*(\d+),\s*SS:\s*(\d+),\s*MOQ:\s*(\d+),\s*OrderMultiple:\s*(\d+)/
  );
  if (matchLatest) {
    const gross = parseInt(matchLatest[1], 10);
    const stock = parseInt(matchLatest[2], 10);
    const onOrder = parseInt(matchLatest[3], 10);
    const safetyStock = parseInt(matchLatest[4], 10);
    const moq = parseInt(matchLatest[5], 10);
    const orderMultiple = parseInt(matchLatest[6], 10);
    const shortage = Math.max(0, gross + safetyStock - stock - onOrder);
    return { gross, stock, onOrder, safetyStock, moq, orderMultiple, shortage };
  }
  // Try format with OnOrder (no OrderMultiple)
  const matchNew = reason.match(
    /Gross:\s*(\d+),\s*Stock:\s*(-?\d+),\s*OnOrder:\s*(\d+),\s*SS:\s*(\d+),\s*MOQ:\s*(\d+)/
  );
  if (matchNew) {
    const gross = parseInt(matchNew[1], 10);
    const stock = parseInt(matchNew[2], 10);
    const onOrder = parseInt(matchNew[3], 10);
    const safetyStock = parseInt(matchNew[4], 10);
    const moq = parseInt(matchNew[5], 10);
    const shortage = Math.max(0, gross + safetyStock - stock - onOrder);
    return { gross, stock, onOrder, safetyStock, moq, orderMultiple: 1, shortage };
  }
  // Fallback: old format without OnOrder
  const matchOld = reason.match(
    /Gross:\s*(\d+),\s*Stock:\s*(-?\d+),\s*SS:\s*(\d+),\s*MOQ:\s*(\d+)/
  );
  if (!matchOld) return null;
  const gross = parseInt(matchOld[1], 10);
  const stock = parseInt(matchOld[2], 10);
  const safetyStock = parseInt(matchOld[3], 10);
  const moq = parseInt(matchOld[4], 10);
  const shortage = Math.max(0, gross + safetyStock - stock);
  return { gross, stock, onOrder: 0, safetyStock, moq, orderMultiple: 1, shortage };
}

/** Build URL for PO creation pre-filled with parts */
function buildCreatePOUrl(
  parts: Array<{ partId: string; partNumber: string; quantity: number }>
) {
  const params = new URLSearchParams();
  // Encode parts as JSON array in URL param
  params.set(
    "parts",
    JSON.stringify(parts.map((p) => ({ id: p.partId, pn: p.partNumber, qty: p.quantity })))
  );
  return `/purchasing/new?${params.toString()}`;
}

/** Collect all shortage items recursively (for bulk PO) */
function collectShortageItems(
  children: BomChild[],
  parentMultiplier: number
): Array<BomChild & { totalNeeded: number; shortage: number }> {
  const result: Array<BomChild & { totalNeeded: number; shortage: number }> = [];
  for (const child of children) {
    const totalNeeded = child.quantity * parentMultiplier;
    const totalDemandAll = child.totalDemandAll ?? totalNeeded;
    const aggregateShortage = Math.max(0, totalDemandAll - child.stock - (child.onOrder || 0));
    const perCardShortage = Math.max(0, totalNeeded - child.stock - (child.onOrder || 0));
    // Use aggregate to determine IF there's a shortage, but per-card qty for PO
    if (aggregateShortage > 0 && perCardShortage > 0) {
      result.push({ ...child, totalNeeded, shortage: perCardShortage });
    }
    if (child.children && child.children.length > 0) {
      result.push(...collectShortageItems(child.children, totalNeeded));
    }
  }
  return result;
}

export function SuggestionCard({
  suggestion,
  onApprove,
  onReject,
  onCreatePO,
}: SuggestionProps) {
  const parsed = parseReason(suggestion.reason);
  const [childrenExpanded, setChildrenExpanded] = useState(false);
  const [expandedSubIds, setExpandedSubIds] = useState<Set<string>>(new Set());

  const hasChildren =
    suggestion.bomChildren && suggestion.bomChildren.length > 0;

  // Calculate required qty for each child based on suggestedQty
  const parentQty = suggestion.suggestedQty ?? parsed?.shortage ?? 0;

  // Compute all shortage children recursively for "Tạo PO tất cả" button
  const shortageChildren = hasChildren
    ? collectShortageItems(suggestion.bomChildren!, parentQty)
    : [];

  const toggleSubExpand = (partNumber: string) => {
    setExpandedSubIds((prev) => {
      const next = new Set(prev);
      if (next.has(partNumber)) next.delete(partNumber);
      else next.add(partNumber);
      return next;
    });
  };

  /** Render a child row + its sub-children recursively */
  const renderChildRow = (
    child: BomChild,
    multiplier: number,
    depth: number
  ): React.ReactNode => {
    const totalNeeded = child.quantity * multiplier;
    const onOrder = child.onOrder || 0;
    const perCardShortage = Math.max(0, totalNeeded - child.stock - onOrder);
    const totalDemandAll = child.totalDemandAll ?? totalNeeded;
    const aggregateShortage = Math.max(0, totalDemandAll - child.stock - onOrder);
    const isSharedDemand = totalDemandAll > totalNeeded;
    const isShort = aggregateShortage > 0;
    const hasSub = child.children && child.children.length > 0;
    const isSubExpanded = expandedSubIds.has(child.partNumber);
    const indent = depth * 20;

    return [
      <tr
        key={child.partNumber}
        className={`border-b last:border-b-0 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 ${
          depth > 0 ? "bg-indigo-50/20 dark:bg-indigo-950/10" : ""
        }`}
      >
        <td className="px-4 py-2" style={{ paddingLeft: `${16 + indent}px` }}>
          <div className="flex items-center gap-1.5">
            {depth > 0 && (
              <span className="text-muted-foreground text-xs">└</span>
            )}
            {hasSub && (
              <button
                onClick={() => toggleSubExpand(child.partNumber)}
                className="p-0.5 hover:bg-gray-200 rounded"
              >
                {isSubExpanded ? (
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                )}
              </button>
            )}
            <EntityTooltip type="part" id={child.partId}>
              <span className={`font-mono cursor-help ${depth > 0 ? "text-[11px]" : "text-xs"}`}>
                {child.partNumber}
              </span>
            </EntityTooltip>
            {child.isCritical && (
              <Badge
                variant="destructive"
                className="text-[10px] px-1 py-0"
              >
                Critical
              </Badge>
            )}
            {hasSub && (
              <Badge variant="outline" className="text-[10px] px-1 py-0">
                <Layers className="h-2.5 w-2.5 mr-0.5" />
                Sub-BOM
              </Badge>
            )}
          </div>
        </td>
        <td className={`px-4 py-2 ${depth > 0 ? "text-muted-foreground text-xs" : "text-muted-foreground"}`}>
          {child.name}
        </td>
        <td className={`px-4 py-2 text-right ${depth > 0 ? "text-xs" : ""}`}>
          {child.quantity} {child.unit}
        </td>
        <td className={`px-4 py-2 text-right font-medium ${depth > 0 ? "text-xs" : ""}`}>
          {totalNeeded}
        </td>
        <td className={`px-4 py-2 text-right font-mono ${depth > 0 ? "text-xs" : ""}`}>
          {child.stock}
        </td>
        <td className={`px-4 py-2 text-right ${depth > 0 ? "text-xs" : ""}`}>
          {onOrder > 0 ? (
            <span className="font-medium text-blue-600 dark:text-blue-400">
              {onOrder}
            </span>
          ) : (
            <span className="text-muted-foreground">0</span>
          )}
        </td>
        <td className={`px-4 py-2 text-right ${depth > 0 ? "text-xs" : ""}`}>
          {isShort ? (
            <div>
              <span className="font-semibold text-red-600 dark:text-red-400">
                -{aggregateShortage}
              </span>
              {isSharedDemand && (
                <div className="text-[10px] text-orange-600 dark:text-orange-400 whitespace-nowrap">
                  Tổng cầu: {totalDemandAll}
                </div>
              )}
            </div>
          ) : (
            <span className="text-green-600 dark:text-green-400">Đủ</span>
          )}
        </td>
        <td className="px-4 py-2 text-right">
          {isShort && perCardShortage > 0 && (
            <Link
              href={buildCreatePOUrl([
                {
                  partId: child.partId,
                  partNumber: child.partNumber,
                  quantity: perCardShortage,
                },
              ])}
            >
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-[10px] text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
              >
                <ShoppingCart className="h-3 w-3 mr-1" />
                Tạo PO
              </Button>
            </Link>
          )}
        </td>
      </tr>,
      // Sub-children header + rows
      ...(hasSub && isSubExpanded
        ? [
            <tr
              key={`${child.partNumber}-sub-header`}
              className="bg-indigo-50/40 dark:bg-indigo-950/20"
            >
              <td
                colSpan={8}
                className="py-1.5 text-xs"
                style={{ paddingLeft: `${32 + indent}px` }}
              >
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Layers className="h-3 w-3 text-indigo-500" />
                  <span className="font-medium text-indigo-700 dark:text-indigo-400">
                    Sub-BOM: {child.partNumber}
                  </span>
                  <span>({child.children!.length} items)</span>
                </div>
              </td>
            </tr>,
            ...child.children!.flatMap((subChild) =>
              renderChildRow(subChild, totalNeeded, depth + 1)
            ),
          ]
        : []),
    ];
  };

  return (
    <Card className="overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Header: Priority + Action Type */}
            <div className="flex items-center gap-2 mb-2">
              <Badge
                className={
                  priorityColors[suggestion.priority] || priorityColors.MEDIUM
                }
              >
                {suggestion.priority}
              </Badge>
              <span className="text-lg font-medium">
                {suggestion.actionType}
              </span>
            </div>

            {/* Part info */}
            {suggestion.partId ? (
              <EntityTooltip type="part" id={suggestion.partId}>
                <h3 className="font-semibold cursor-help">{suggestion.partNumber}</h3>
              </EntityTooltip>
            ) : (
              <h3 className="font-semibold">{suggestion.partNumber}</h3>
            )}
            <p className="text-sm text-muted-foreground">
              {suggestion.partName}
            </p>

            {/* Structured breakdown */}
            {parsed ? (
              <div className="mt-3 space-y-2">
                {/* Quantity breakdown row */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <span className="text-muted-foreground">
                    Nhu cầu:{" "}
                    <span className="font-medium text-foreground">
                      {parsed.gross}
                    </span>
                  </span>
                  <span className="text-muted-foreground">
                    Tồn kho:{" "}
                    <span className="font-medium text-foreground">
                      {parsed.stock}
                    </span>
                  </span>
                  {(parsed.onOrder > 0 || (suggestion.onOrder ?? 0) > 0) && (
                    <span className="text-muted-foreground">
                      Đang đặt:{" "}
                      <span className="font-medium text-blue-600 dark:text-blue-400">
                        {parsed.onOrder || suggestion.onOrder || 0}
                      </span>
                    </span>
                  )}
                  {parsed.safetyStock > 0 && (
                    <span className="text-muted-foreground">
                      An toàn:{" "}
                      <span className="font-medium text-foreground">
                        {parsed.safetyStock}
                      </span>
                    </span>
                  )}
                </div>

                {/* Shortage highlight */}
                <div className="flex items-center gap-2 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 px-3 py-2">
                  <TrendingDown className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <span className="text-sm font-medium text-red-700 dark:text-red-400">
                    Thiếu: {parsed.shortage} units
                  </span>
                  <span className="text-red-300 dark:text-red-700">|</span>
                  <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                  <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                    Cần đặt: {suggestion.suggestedQty ?? parsed.shortage}
                    {parsed.moq > 1 && (
                      <span className="font-normal text-muted-foreground ml-1">
                        (MOQ: {parsed.moq})
                      </span>
                    )}
                  </span>
                </div>

                {/* Order date + cost */}
                {(suggestion.suggestedDate || suggestion.estimatedCost) && (
                  <div className="flex items-center gap-4 text-sm">
                    {suggestion.suggestedDate && (
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Package className="h-3.5 w-3.5" />
                        Đặt trước:{" "}
                        <span className="font-medium text-foreground">
                          {format(
                            new Date(suggestion.suggestedDate),
                            "dd/MM/yyyy"
                          )}
                        </span>
                      </span>
                    )}
                    {suggestion.estimatedCost && (
                      <span className="text-muted-foreground">
                        Chi phí:{" "}
                        <span className="font-mono font-medium text-foreground">
                          ${suggestion.estimatedCost.toLocaleString()}
                        </span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Fallback: show raw reason if parsing fails */}
                <p className="text-sm mt-2">{suggestion.reason}</p>
                {suggestion.suggestedQty && (
                  <div className="mt-2 text-sm">
                    <span className="font-medium">
                      Qty: {suggestion.suggestedQty}
                    </span>
                    {suggestion.suggestedDate && (
                      <span className="ml-4">
                        Order by:{" "}
                        {format(new Date(suggestion.suggestedDate), "MMM dd")}
                      </span>
                    )}
                    {suggestion.estimatedCost && (
                      <span className="ml-4">
                        Est. Cost: ${suggestion.estimatedCost.toLocaleString()}
                      </span>
                    )}
                  </div>
                )}
              </>
            )}

            {suggestion.supplierName && (
              <p className="text-sm text-muted-foreground mt-1">
                Nhà cung cấp: {suggestion.supplierName}
              </p>
            )}
          </div>

          {suggestion.status === "pending" && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onReject(suggestion.id)}
              >
                <X className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={() => onApprove(suggestion.id)}>
                <Check className="h-4 w-4 mr-1" /> Approve
              </Button>
              {suggestion.actionType === "PURCHASE" && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => onCreatePO(suggestion.id)}
                >
                  <ShoppingCart className="h-4 w-4 mr-1" /> Create PO
                </Button>
              )}
            </div>
          )}

          {suggestion.status !== "pending" && (
            <div className="flex items-center gap-2">
              <Badge
                className={
                  suggestion.status === "approved"
                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                    : suggestion.status === "converted"
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                    : suggestion.status === "rejected"
                    ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                    : ""
                }
              >
                {suggestion.status === "approved"
                  ? "Đã duyệt"
                  : suggestion.status === "converted"
                  ? "Đã tạo PO"
                  : suggestion.status === "rejected"
                  ? "Đã từ chối"
                  : suggestion.status}
              </Badge>
              {suggestion.status === "approved" && suggestion.actionType === "PURCHASE" && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => onCreatePO(suggestion.id)}
                >
                  <ShoppingCart className="h-4 w-4 mr-1" /> Tạo PO
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* BOM Children dropdown */}
      {hasChildren && (
        <div className="border-t">
          <button
            onClick={() => setChildrenExpanded(!childrenExpanded)}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            {childrenExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <Layers className="h-4 w-4 text-blue-500" />
            <span className="font-medium text-blue-700 dark:text-blue-400">
              BOM Components
            </span>
            <Badge variant="secondary" className="text-xs ml-1">
              {suggestion.bomChildren!.length} items
            </Badge>
            {shortageChildren.length > 0 && (
              <Badge variant="destructive" className="text-xs ml-1">
                {shortageChildren.length} thiếu
              </Badge>
            )}
          </button>

          {childrenExpanded && (
            <div className="border-t bg-blue-50/30 dark:bg-blue-950/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b bg-blue-50/50 dark:bg-blue-950/20">
                    <th className="px-4 py-2 text-left font-medium">
                      Part #
                    </th>
                    <th className="px-4 py-2 text-left font-medium">Tên</th>
                    <th className="px-4 py-2 text-right font-medium">SL/đv</th>
                    <th className="px-4 py-2 text-right font-medium">
                      Cần cho {parentQty} đv
                    </th>
                    <th className="px-4 py-2 text-right font-medium">
                      Tồn kho
                    </th>
                    <th className="px-4 py-2 text-right font-medium">
                      Đang đặt
                    </th>
                    <th className="px-4 py-2 text-right font-medium">Thiếu</th>
                    <th className="px-4 py-2 text-right font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {suggestion.bomChildren!.map((child) =>
                    renderChildRow(child, parentQty, 0)
                  )}
                </tbody>
              </table>

              {/* Bulk create PO for all shortage children */}
              {shortageChildren.length > 1 && (
                <div className="flex justify-end px-4 py-2.5 border-t bg-red-50/50 dark:bg-red-950/10">
                  <Link
                    href={buildCreatePOUrl(
                      shortageChildren.map((c) => ({
                        partId: c.partId,
                        partNumber: c.partNumber,
                        quantity: c.shortage,
                      }))
                    )}
                  >
                    <Button
                      size="sm"
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      <ShoppingCart className="h-4 w-4 mr-1.5" />
                      Tạo PO tất cả thiếu ({shortageChildren.length} items)
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
