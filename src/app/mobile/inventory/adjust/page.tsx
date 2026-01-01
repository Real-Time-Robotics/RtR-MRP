"use client";

import { useState } from "react";
import { MobileHeader } from "@/components/mobile/mobile-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Scanner } from "@/components/mobile/scanner";
import { QuantityInput } from "@/components/mobile/quantity-input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Scan,
  Check,
  Package,
  Plus,
  Minus,
  Loader2,
  Search,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/mobile/haptics";

interface SelectedPart {
  id: string;
  sku: string;
  name: string;
  currentQty: number;
  uom: string;
  location: string;
}

// Mock data
const mockParts: SelectedPart[] = [
  {
    id: "1",
    sku: "MTR-001",
    name: "Brushless Motor 2207",
    currentQty: 150,
    uom: "pcs",
    location: "A-01-01",
  },
  {
    id: "2",
    sku: "ESC-002",
    name: "ESC 30A",
    currentQty: 75,
    uom: "pcs",
    location: "B-02-03",
  },
  {
    id: "3",
    sku: "PROP-003",
    name: "Propeller 5x4.5",
    currentQty: 500,
    uom: "pcs",
    location: "C-01-02",
  },
];

export default function InventoryAdjustPage() {
  const [showScanner, setShowScanner] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPart, setSelectedPart] = useState<SelectedPart | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<"add" | "remove">("add");
  const [adjustmentQty, setAdjustmentQty] = useState(0);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchResults, setSearchResults] = useState<SelectedPart[]>([]);

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    haptic("selection");
    const results = mockParts.filter(
      (p) =>
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setSearchResults(results);
  };

  const handleScan = (result: any) => {
    haptic("success");
    setShowScanner(false);
    const found = mockParts.find((p) => p.sku === result.value);
    if (found) {
      setSelectedPart(found);
      setAdjustmentQty(0);
    }
  };

  const handleSelectPart = (part: SelectedPart) => {
    haptic("selection");
    setSelectedPart(part);
    setSearchResults([]);
    setSearchQuery("");
    setAdjustmentQty(0);
  };

  const handleSubmit = async () => {
    if (!selectedPart || adjustmentQty <= 0) return;

    setIsSubmitting(true);
    haptic("medium");

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // TODO: Call actual API
      haptic("success");
      setSelectedPart(null);
      setAdjustmentQty(0);
      setReason("");
    } catch (error) {
      haptic("error");
      console.error("Failed to submit adjustment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const newQty =
    adjustmentType === "add"
      ? (selectedPart?.currentQty || 0) + adjustmentQty
      : (selectedPart?.currentQty || 0) - adjustmentQty;

  // Scanner view
  if (showScanner) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <Scanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
          continuous={false}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <MobileHeader
        title="Adjust Inventory"
        subtitle="Add or remove stock"
        showBack
        backHref="/mobile/inventory"
      />

      <div className="p-4 space-y-4">
        {/* Part selection */}
        {!selectedPart ? (
          <>
            {/* Search and Scan */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search part number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-10 h-12"
                />
              </div>
              <Button
                size="lg"
                variant="outline"
                className="h-12 w-12 p-0"
                onClick={() => setShowScanner(true)}
              >
                <Scan className="h-5 w-5" />
              </Button>
            </div>

            <Button onClick={handleSearch} className="w-full">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>

            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  SELECT PART
                </h3>
                {searchResults.map((part) => (
                  <Card
                    key={part.id}
                    className="cursor-pointer active:scale-[0.98] transition-transform"
                    onClick={() => handleSelectPart(part)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <Package className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-mono font-bold">{part.sku}</p>
                          <p className="text-sm text-muted-foreground">
                            {part.name}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{part.currentQty}</p>
                          <p className="text-xs text-muted-foreground">
                            {part.uom}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Empty state */}
            {searchResults.length === 0 && !searchQuery && (
              <Card>
                <CardContent className="p-8 text-center">
                  <Scan className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">
                    Scan a barcode or search for a part
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <>
            {/* Selected part info */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Package className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-mono font-bold">{selectedPart.sku}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedPart.name}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedPart(null)}
                  >
                    Change
                  </Button>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Location:</span>
                  <span className="font-mono">{selectedPart.location}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Current Qty:</span>
                  <span className="font-semibold">
                    {selectedPart.currentQty} {selectedPart.uom}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Adjustment type */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Adjustment Type</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={adjustmentType}
                  onValueChange={(v: "add" | "remove") => {
                    haptic("selection");
                    setAdjustmentType(v);
                  }}
                  className="flex gap-4"
                >
                  <div
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-colors cursor-pointer",
                      adjustmentType === "add"
                        ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                        : "border-transparent bg-muted"
                    )}
                    onClick={() => {
                      haptic("selection");
                      setAdjustmentType("add");
                    }}
                  >
                    <RadioGroupItem value="add" id="add" className="sr-only" />
                    <Plus className="h-5 w-5 text-green-600" />
                    <Label htmlFor="add" className="font-medium cursor-pointer">
                      Add
                    </Label>
                  </div>
                  <div
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-colors cursor-pointer",
                      adjustmentType === "remove"
                        ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                        : "border-transparent bg-muted"
                    )}
                    onClick={() => {
                      haptic("selection");
                      setAdjustmentType("remove");
                    }}
                  >
                    <RadioGroupItem
                      value="remove"
                      id="remove"
                      className="sr-only"
                    />
                    <Minus className="h-5 w-5 text-red-600" />
                    <Label
                      htmlFor="remove"
                      className="font-medium cursor-pointer"
                    >
                      Remove
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Quantity */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Quantity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <QuantityInput
                  value={adjustmentQty}
                  onChange={setAdjustmentQty}
                  min={0}
                  max={
                    adjustmentType === "remove"
                      ? selectedPart.currentQty
                      : 99999
                  }
                />

                {/* Preview */}
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm text-muted-foreground">
                    New Quantity:
                  </span>
                  <span
                    className={cn(
                      "text-lg font-bold",
                      newQty < 0 && "text-red-600"
                    )}
                  >
                    {newQty} {selectedPart.uom}
                  </span>
                </div>

                {newQty < 0 && (
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    Cannot remove more than current quantity
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Reason */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Reason</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Enter reason for adjustment..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                />
              </CardContent>
            </Card>

            {/* Submit */}
            <Button
              className={cn(
                "w-full h-14 text-lg",
                adjustmentType === "add"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              )}
              onClick={handleSubmit}
              disabled={
                isSubmitting ||
                adjustmentQty <= 0 ||
                newQty < 0 ||
                !reason.trim()
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Check className="h-5 w-5 mr-2" />
                  Confirm Adjustment
                </>
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
