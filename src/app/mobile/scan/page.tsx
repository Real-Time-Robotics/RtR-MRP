"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Scanner } from "@/components/mobile/scanner";
import { ScanResultCard } from "@/components/mobile/scan-result-card";
import { MobileHeader } from "@/components/mobile/mobile-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ParsedBarcode } from "@/lib/mobile/barcode-parser";
import { addScanHistory } from "@/lib/mobile";
import { Camera, Keyboard, Search } from "lucide-react";

export default function ScanPage() {
  const router = useRouter();
  const [scanResult, setScanResult] = useState<ParsedBarcode | null>(null);
  const [manualInput, setManualInput] = useState("");
  const [activeTab, setActiveTab] = useState<"camera" | "manual">("camera");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleScan = useCallback(async (result: ParsedBarcode) => {
    setScanResult(result);

    // Log scan to history
    try {
      await addScanHistory({
        barcode: result.raw,
        barcodeType: result.format,
        entityType: result.entityType,
        entityId: result.entityId,
      });
    } catch (error) {
      console.error("Failed to log scan:", error);
    }
  }, []);

  const handleManualSearch = async () => {
    if (!manualInput.trim()) return;

    setIsProcessing(true);
    try {
      // Import parseBarcode dynamically to avoid SSR issues
      const { parseBarcode } = await import("@/lib/mobile/barcode-parser");
      const result = parseBarcode(manualInput.trim(), "MANUAL");
      handleScan(result);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAction = async (action: string) => {
    if (!scanResult) return;

    switch (action) {
      case "view":
        // Navigate to detail page based on entity type
        switch (scanResult.entityType) {
          case "PART":
            router.push(`/mobile/inventory/${scanResult.entityId || scanResult.partNumber}`);
            break;
          case "LOCATION":
            router.push(`/mobile/inventory/location/${scanResult.entityId || scanResult.locationCode}`);
            break;
          case "WORK_ORDER":
            router.push(`/mobile/work-orders/${scanResult.workOrderNumber}`);
            break;
          case "PURCHASE_ORDER":
            router.push(`/mobile/receiving/${scanResult.purchaseOrderNumber}`);
            break;
          case "SALES_ORDER":
            router.push(`/mobile/picking/${scanResult.salesOrderNumber}`);
            break;
          default:
            router.push(`/mobile/inventory/search?q=${encodeURIComponent(scanResult.raw)}`);
        }
        break;

      case "adjust":
        router.push(`/mobile/inventory/adjust?part=${encodeURIComponent(scanResult.partNumber || scanResult.raw)}`);
        break;

      case "transfer":
        router.push(`/mobile/inventory/transfer?part=${encodeURIComponent(scanResult.partNumber || scanResult.raw)}`);
        break;

      case "count":
        router.push(`/mobile/inventory/count?location=${encodeURIComponent(scanResult.locationCode || scanResult.raw)}`);
        break;

      case "receive":
        router.push(`/mobile/receiving/${scanResult.purchaseOrderNumber}`);
        break;

      case "pick":
        router.push(`/mobile/picking/${scanResult.salesOrderNumber}`);
        break;

      case "status":
        router.push(`/mobile/work-orders/${scanResult.workOrderNumber}/status`);
        break;

      case "time":
        router.push(`/mobile/work-orders/${scanResult.workOrderNumber}/time`);
        break;

      case "inspect":
        router.push(`/mobile/quality/inspect?wo=${encodeURIComponent(scanResult.workOrderNumber || "")}`);
        break;

      case "trace":
        router.push(`/mobile/quality/trace?lot=${encodeURIComponent(scanResult.lotNumber || scanResult.serialNumber || "")}`);
        break;

      default:
        console.log("Unknown action:", action);
    }
  };

  const clearResult = () => {
    setScanResult(null);
    setManualInput("");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <MobileHeader
        title="Scan"
        subtitle="Scan barcode or enter manually"
        showBack
        backHref="/mobile"
      />

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "camera" | "manual")}
        className="flex-1 flex flex-col"
      >
        <TabsList className="grid grid-cols-2 mx-4 mt-4">
          <TabsTrigger value="camera" className="gap-2">
            <Camera className="h-4 w-4" />
            Camera
          </TabsTrigger>
          <TabsTrigger value="manual" className="gap-2">
            <Keyboard className="h-4 w-4" />
            Manual
          </TabsTrigger>
        </TabsList>

        <TabsContent value="camera" className="flex-1 flex flex-col m-0 p-4">
          {!scanResult ? (
            <Scanner
              onScan={handleScan}
              continuous={false}
              showPreview
              className="flex-1 rounded-lg overflow-hidden min-h-[300px]"
            />
          ) : (
            <div className="space-y-4">
              <ScanResultCard result={scanResult} onAction={handleAction} />
              <Button
                variant="outline"
                onClick={clearResult}
                className="w-full"
              >
                Scan Another
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="manual" className="flex-1 m-0 p-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter barcode or part number..."
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
                  className="flex-1"
                />
                <Button
                  onClick={handleManualSearch}
                  disabled={!manualInput.trim() || isProcessing}
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Enter a part number, location code, work order number, or any
                barcode value
              </p>
            </CardContent>
          </Card>

          {scanResult && (
            <div className="mt-4 space-y-4">
              <ScanResultCard result={scanResult} onAction={handleAction} />
              <Button
                variant="outline"
                onClick={clearResult}
                className="w-full"
              >
                Clear
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
