"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ParsedBarcode } from "@/lib/mobile/barcode-parser";
import {
  Package,
  MapPin,
  ClipboardList,
  ShoppingCart,
  Truck,
  Tag,
  Hash,
  Box,
  ChevronRight,
  Copy,
} from "lucide-react";
import { haptic } from "@/lib/mobile/haptics";

interface ScanResultCardProps {
  result: ParsedBarcode;
  onAction?: (action: string) => void;
  showActions?: boolean;
  className?: string;
}

const ENTITY_ICONS = {
  PART: Package,
  LOCATION: MapPin,
  WORK_ORDER: ClipboardList,
  PURCHASE_ORDER: Truck,
  SALES_ORDER: ShoppingCart,
  LOT: Tag,
  SERIAL: Hash,
  CONTAINER: Box,
  LABEL: Tag,
  UNKNOWN: Package,
};

const ENTITY_COLORS = {
  PART: "bg-blue-500",
  LOCATION: "bg-green-500",
  WORK_ORDER: "bg-purple-500",
  PURCHASE_ORDER: "bg-orange-500",
  SALES_ORDER: "bg-pink-500",
  LOT: "bg-yellow-500",
  SERIAL: "bg-cyan-500",
  CONTAINER: "bg-gray-500",
  LABEL: "bg-indigo-500",
  UNKNOWN: "bg-gray-400",
};

const ENTITY_ACTIONS: Record<string, Array<{ id: string; label: string }>> = {
  PART: [
    { id: "view", label: "View Details" },
    { id: "adjust", label: "Adjust Inventory" },
    { id: "transfer", label: "Transfer" },
    { id: "count", label: "Cycle Count" },
  ],
  LOCATION: [
    { id: "view", label: "View Contents" },
    { id: "transfer", label: "Transfer To" },
    { id: "count", label: "Cycle Count" },
  ],
  WORK_ORDER: [
    { id: "view", label: "View Details" },
    { id: "status", label: "Update Status" },
    { id: "time", label: "Log Time" },
    { id: "inspect", label: "Quality Check" },
  ],
  PURCHASE_ORDER: [
    { id: "view", label: "View Details" },
    { id: "receive", label: "Receive Items" },
  ],
  SALES_ORDER: [
    { id: "view", label: "View Details" },
    { id: "pick", label: "Pick Items" },
  ],
  LOT: [
    { id: "view", label: "View Details" },
    { id: "trace", label: "Traceability" },
  ],
  SERIAL: [
    { id: "view", label: "View Details" },
    { id: "trace", label: "Traceability" },
  ],
};

export function ScanResultCard({
  result,
  onAction,
  showActions = true,
  className,
}: ScanResultCardProps) {
  const Icon = ENTITY_ICONS[result.entityType];
  const colorClass = ENTITY_COLORS[result.entityType];
  const actions = ENTITY_ACTIONS[result.entityType] || [
    { id: "view", label: "View" },
  ];

  const handleCopy = async () => {
    haptic("selection");
    await navigator.clipboard.writeText(result.raw);
  };

  const handleAction = (actionId: string) => {
    haptic("light");
    onAction?.(actionId);
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b">
          <div
            className={cn(
              "w-12 h-12 rounded-lg flex items-center justify-center",
              colorClass
            )}
          >
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {result.entityType.replace("_", " ")}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {result.format}
              </span>
            </div>
            <p className="font-mono font-semibold truncate mt-1">
              {result.raw}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleCopy} aria-label="Sao chép">
            <Copy className="h-4 w-4" />
          </Button>
        </div>

        {/* Details */}
        <div className="p-4 space-y-2 bg-gray-50 dark:bg-neutral-900">
          {result.partNumber && (
            <DetailRow label="Part Number" value={result.partNumber} />
          )}
          {result.locationCode && (
            <DetailRow label="Location" value={result.locationCode} />
          )}
          {result.workOrderNumber && (
            <DetailRow label="Work Order" value={result.workOrderNumber} />
          )}
          {result.purchaseOrderNumber && (
            <DetailRow label="PO Number" value={result.purchaseOrderNumber} />
          )}
          {result.salesOrderNumber && (
            <DetailRow label="SO Number" value={result.salesOrderNumber} />
          )}
          {result.lotNumber && (
            <DetailRow label="Lot Number" value={result.lotNumber} />
          )}
          {result.serialNumber && (
            <DetailRow label="Serial Number" value={result.serialNumber} />
          )}
          {result.quantity && (
            <DetailRow label="Quantity" value={result.quantity.toString()} />
          )}
          <DetailRow
            label="Confidence"
            value={`${Math.round(result.confidence * 100)}%`}
          />
        </div>

        {/* Actions */}
        {showActions && (
          <div className="p-2 border-t bg-white dark:bg-neutral-800">
            <div className="grid grid-cols-2 gap-2">
              {actions.slice(0, 4).map((action) => (
                <Button
                  key={action.id}
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction(action.id)}
                  className="justify-between"
                >
                  {action.label}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
