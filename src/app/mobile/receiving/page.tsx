"use client";

import { useState, useEffect } from "react";
import { MobileHeader } from "@/components/mobile/mobile-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Scanner } from "@/components/mobile/scanner";
import { QuantityInput } from "@/components/mobile/quantity-input";
import {
  Truck,
  Package,
  Scan,
  Check,
  X,
  ChevronRight,
  Search,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/mobile/haptics";

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplier: string;
  expectedDate: string;
  status: "pending" | "partial" | "received";
  totalItems: number;
  receivedItems: number;
}

interface POLine {
  id: string;
  partNumber: string;
  partName: string;
  orderedQty: number;
  receivedQty: number;
  remainingQty: number;
  unit: string;
}

// Mock data - replace with API calls
const mockPOs: PurchaseOrder[] = [
  {
    id: "1",
    poNumber: "PO-2024-001",
    supplier: "ABC Electronics",
    expectedDate: "2024-01-15",
    status: "pending",
    totalItems: 5,
    receivedItems: 0,
  },
  {
    id: "2",
    poNumber: "PO-2024-002",
    supplier: "XYZ Components",
    expectedDate: "2024-01-16",
    status: "partial",
    totalItems: 3,
    receivedItems: 1,
  },
];

const mockPOLines: POLine[] = [
  {
    id: "1",
    partNumber: "MTR-001",
    partName: "Brushless Motor 2207",
    orderedQty: 100,
    receivedQty: 0,
    remainingQty: 100,
    unit: "pcs",
  },
  {
    id: "2",
    partNumber: "ESC-002",
    partName: "ESC 30A",
    orderedQty: 50,
    receivedQty: 0,
    remainingQty: 50,
    unit: "pcs",
  },
  {
    id: "3",
    partNumber: "PROP-003",
    partName: "Propeller 5x4.5",
    orderedQty: 200,
    receivedQty: 0,
    remainingQty: 200,
    unit: "pcs",
  },
];

export default function ReceivingPage() {
  const [view, setView] = useState<"list" | "detail" | "receive">("list");
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [selectedLine, setSelectedLine] = useState<POLine | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [receiveQty, setReceiveQty] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredPOs = mockPOs.filter(
    (po) =>
      po.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      po.supplier.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectPO = (po: PurchaseOrder) => {
    haptic("selection");
    setSelectedPO(po);
    setView("detail");
  };

  const handleSelectLine = (line: POLine) => {
    haptic("selection");
    setSelectedLine(line);
    setReceiveQty(line.remainingQty);
    setView("receive");
  };

  const handleScan = (result: any) => {
    haptic("success");
    setShowScanner(false);
    // Find PO or line by scanned code
    const foundPO = mockPOs.find((po) => po.poNumber === result.value);
    if (foundPO) {
      handleSelectPO(foundPO);
    }
  };

  const handleReceive = async () => {
    if (!selectedLine || receiveQty <= 0) return;

    setIsSubmitting(true);
    haptic("medium");

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // TODO: Call actual API
      // await fetch('/api/mobile/receiving', {
      //   method: 'POST',
      //   body: JSON.stringify({
      //     poId: selectedPO?.id,
      //     lineId: selectedLine.id,
      //     quantity: receiveQty,
      //   }),
      // });

      haptic("success");
      setView("detail");
      setSelectedLine(null);
    } catch (error) {
      haptic("error");
      console.error("Failed to receive:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    haptic("selection");
    if (view === "receive") {
      setView("detail");
      setSelectedLine(null);
    } else if (view === "detail") {
      setView("list");
      setSelectedPO(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "partial":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "received":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

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

  // Receive quantity view
  if (view === "receive" && selectedLine) {
    return (
      <div className="min-h-screen">
        <MobileHeader
          title="Receive Item"
          subtitle={selectedLine.partNumber}
          showBack
          onBack={handleBack}
        />

        <div className="p-4 space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Part</p>
                <p className="font-medium">{selectedLine.partName}</p>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Ordered</p>
                  <p className="text-lg font-semibold">{selectedLine.orderedQty}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Received</p>
                  <p className="text-lg font-semibold text-green-600">
                    {selectedLine.receivedQty}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Remaining</p>
                  <p className="text-lg font-semibold text-orange-600">
                    {selectedLine.remainingQty}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Quantity to Receive</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <QuantityInput
                value={receiveQty}
                onChange={setReceiveQty}
                min={0}
                max={selectedLine.remainingQty}
              />

              <Button
                className="w-full h-14 text-lg"
                onClick={handleReceive}
                disabled={receiveQty <= 0 || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Check className="h-5 w-5 mr-2" />
                    Confirm Receipt
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // PO detail view
  if (view === "detail" && selectedPO) {
    return (
      <div className="min-h-screen">
        <MobileHeader
          title={selectedPO.poNumber}
          subtitle={selectedPO.supplier}
          showBack
          onBack={handleBack}
        />

        <div className="p-4 space-y-4">
          {/* PO Summary */}
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <Badge className={getStatusColor(selectedPO.status)}>
                    {selectedPO.status}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-2">
                    Expected: {selectedPO.expectedDate}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">
                    {selectedPO.receivedItems}/{selectedPO.totalItems}
                  </p>
                  <p className="text-xs text-muted-foreground">Items received</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line items */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">
              LINE ITEMS
            </h3>
            <div className="space-y-2">
              {mockPOLines.map((line) => (
                <Card
                  key={line.id}
                  className="cursor-pointer active:scale-[0.98] transition-transform"
                  onClick={() => handleSelectLine(line)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{line.partNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          {line.partName}
                        </p>
                        <div className="flex gap-4 mt-2 text-xs">
                          <span>
                            Ordered: <strong>{line.orderedQty}</strong>
                          </span>
                          <span className="text-green-600">
                            Received: <strong>{line.receivedQty}</strong>
                          </span>
                          <span className="text-orange-600">
                            Remaining: <strong>{line.remainingQty}</strong>
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // PO list view (default)
  return (
    <div className="min-h-screen">
      <MobileHeader
        title="Receiving"
        subtitle="Receive PO Items"
        showBack
        backHref="/mobile"
      />

      <div className="p-4 space-y-4">
        {/* Search and Scan */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search PO or supplier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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

        {/* PO List */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">
            PENDING RECEIPTS ({filteredPOs.length})
          </h3>
          <div className="space-y-2">
            {filteredPOs.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No pending POs found</p>
                </CardContent>
              </Card>
            ) : (
              filteredPOs.map((po) => (
                <Card
                  key={po.id}
                  className="cursor-pointer active:scale-[0.98] transition-transform"
                  onClick={() => handleSelectPO(po)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                          <Truck className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                          <p className="font-medium">{po.poNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            {po.supplier}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={getStatusColor(po.status)}>
                          {po.receivedItems}/{po.totalItems}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {po.expectedDate}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
