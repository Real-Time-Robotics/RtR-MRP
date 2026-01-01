"use client";

import { useState } from "react";
import { MobileHeader } from "@/components/mobile/mobile-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Scanner } from "@/components/mobile/scanner";
import { QuantityInput } from "@/components/mobile/quantity-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Scan,
  Check,
  Package,
  ArrowRight,
  Loader2,
  Search,
  MapPin,
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

interface Location {
  id: string;
  name: string;
  bins: string[];
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

const mockLocations: Location[] = [
  { id: "1", name: "A-01", bins: ["A-01-01", "A-01-02", "A-01-03"] },
  { id: "2", name: "A-02", bins: ["A-02-01", "A-02-02"] },
  { id: "3", name: "B-01", bins: ["B-01-01", "B-01-02", "B-01-03"] },
  { id: "4", name: "B-02", bins: ["B-02-01", "B-02-02", "B-02-03"] },
  { id: "5", name: "C-01", bins: ["C-01-01", "C-01-02"] },
];

export default function InventoryTransferPage() {
  const [showScanner, setShowScanner] = useState(false);
  const [scanTarget, setScanTarget] = useState<"part" | "destination">("part");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPart, setSelectedPart] = useState<SelectedPart | null>(null);
  const [destLocation, setDestLocation] = useState("");
  const [destBin, setDestBin] = useState("");
  const [transferQty, setTransferQty] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchResults, setSearchResults] = useState<SelectedPart[]>([]);

  const selectedDestLocation = mockLocations.find((l) => l.name === destLocation);

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

    if (scanTarget === "part") {
      const found = mockParts.find((p) => p.sku === result.value);
      if (found) {
        setSelectedPart(found);
        setTransferQty(0);
      }
    } else {
      // Scan destination - try to parse location/bin from barcode
      const scannedValue = result.value;
      const loc = mockLocations.find(
        (l) => l.name === scannedValue || l.bins.includes(scannedValue)
      );
      if (loc) {
        setDestLocation(loc.name);
        if (loc.bins.includes(scannedValue)) {
          setDestBin(scannedValue);
        }
      }
    }
  };

  const handleSelectPart = (part: SelectedPart) => {
    haptic("selection");
    setSelectedPart(part);
    setSearchResults([]);
    setSearchQuery("");
    setTransferQty(0);
  };

  const handleSubmit = async () => {
    if (!selectedPart || transferQty <= 0 || !destLocation || !destBin) return;

    setIsSubmitting(true);
    haptic("medium");

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // TODO: Call actual API
      haptic("success");
      setSelectedPart(null);
      setTransferQty(0);
      setDestLocation("");
      setDestBin("");
    } catch (error) {
      haptic("error");
      console.error("Failed to submit transfer:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openScanner = (target: "part" | "destination") => {
    setScanTarget(target);
    setShowScanner(true);
  };

  const isSameLocation =
    selectedPart && destBin && selectedPart.location === destBin;

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
        title="Transfer Stock"
        subtitle="Move between locations"
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
                onClick={() => openScanner("part")}
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
                  SELECT PART TO TRANSFER
                </h3>
                {searchResults.map((part) => (
                  <Card
                    key={part.id}
                    className="cursor-pointer active:scale-[0.98] transition-transform"
                    onClick={() => handleSelectPart(part)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                          <Package className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-mono font-bold">{part.sku}</p>
                          <p className="text-sm text-muted-foreground">
                            {part.name}
                          </p>
                          <p className="text-xs text-blue-600 mt-1">
                            <MapPin className="h-3 w-3 inline mr-1" />
                            {part.location}
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
                    Scan a barcode or search for a part to transfer
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <>
            {/* Selected part info */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">From Location</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedPart(null)}
                  >
                    Change
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Package className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-mono font-bold">{selectedPart.sku}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedPart.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    <span className="font-mono">{selectedPart.location}</span>
                  </div>
                  <span className="font-semibold">
                    {selectedPart.currentQty} {selectedPart.uom}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Transfer quantity */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Transfer Quantity</CardTitle>
              </CardHeader>
              <CardContent>
                <QuantityInput
                  value={transferQty}
                  onChange={setTransferQty}
                  min={0}
                  max={selectedPart.currentQty}
                />
              </CardContent>
            </Card>

            {/* Arrow indicator */}
            <div className="flex justify-center">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <ArrowRight className="h-5 w-5 text-muted-foreground rotate-90" />
              </div>
            </div>

            {/* Destination */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">To Location</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openScanner("destination")}
                  >
                    <Scan className="h-4 w-4 mr-1" />
                    Scan
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Select value={destLocation} onValueChange={setDestLocation}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockLocations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.name}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {destLocation && selectedDestLocation && (
                  <div className="space-y-2">
                    <Label>Bin</Label>
                    <Select value={destBin} onValueChange={setDestBin}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select bin" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedDestLocation.bins.map((bin) => (
                          <SelectItem key={bin} value={bin}>
                            {bin}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {destBin && (
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-green-600" />
                      <span className="font-mono">{destBin}</span>
                    </div>
                  </div>
                )}

                {isSameLocation && (
                  <div className="flex items-center gap-2 text-yellow-600 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    Source and destination are the same
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Submit */}
            <Button
              className="w-full h-14 text-lg bg-green-600 hover:bg-green-700"
              onClick={handleSubmit}
              disabled={
                isSubmitting ||
                transferQty <= 0 ||
                !destLocation ||
                !destBin ||
                !!isSameLocation
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
                  Confirm Transfer
                </>
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
