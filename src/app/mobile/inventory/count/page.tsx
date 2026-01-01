"use client";

import { useState } from "react";
import { MobileHeader } from "@/components/mobile/mobile-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Scanner } from "@/components/mobile/scanner";
import { QuantityInput } from "@/components/mobile/quantity-input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Scan,
  Check,
  Package,
  Loader2,
  Search,
  MapPin,
  Calculator,
  ChevronRight,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/mobile/haptics";

interface CountSession {
  id: string;
  name: string;
  location: string;
  status: "pending" | "in_progress" | "completed";
  totalItems: number;
  countedItems: number;
  dueDate: string;
}

interface CountItem {
  id: string;
  sku: string;
  name: string;
  expectedQty: number;
  countedQty: number | null;
  location: string;
  bin: string;
  counted: boolean;
  variance: number | null;
}

// Mock data
const mockSessions: CountSession[] = [
  {
    id: "1",
    name: "Weekly Cycle Count - Zone A",
    location: "A-01",
    status: "in_progress",
    totalItems: 5,
    countedItems: 2,
    dueDate: "2024-01-15",
  },
  {
    id: "2",
    name: "Monthly Full Count",
    location: "All",
    status: "pending",
    totalItems: 25,
    countedItems: 0,
    dueDate: "2024-01-20",
  },
];

const mockCountItems: CountItem[] = [
  {
    id: "1",
    sku: "MTR-001",
    name: "Brushless Motor 2207",
    expectedQty: 150,
    countedQty: 148,
    location: "A-01",
    bin: "A-01-01",
    counted: true,
    variance: -2,
  },
  {
    id: "2",
    sku: "ESC-002",
    name: "ESC 30A",
    expectedQty: 75,
    countedQty: 75,
    location: "A-01",
    bin: "A-01-02",
    counted: true,
    variance: 0,
  },
  {
    id: "3",
    sku: "PROP-003",
    name: "Propeller 5x4.5",
    expectedQty: 200,
    countedQty: null,
    location: "A-01",
    bin: "A-01-03",
    counted: false,
    variance: null,
  },
  {
    id: "4",
    sku: "FRM-001",
    name: "Drone Frame X500",
    expectedQty: 30,
    countedQty: null,
    location: "A-01",
    bin: "A-01-01",
    counted: false,
    variance: null,
  },
  {
    id: "5",
    sku: "BAT-002",
    name: "LiPo Battery 4S 5000mAh",
    expectedQty: 50,
    countedQty: null,
    location: "A-01",
    bin: "A-01-02",
    counted: false,
    variance: null,
  },
];

export default function InventoryCountPage() {
  const [view, setView] = useState<"sessions" | "count">("sessions");
  const [selectedSession, setSelectedSession] = useState<CountSession | null>(
    null
  );
  const [countItems, setCountItems] = useState<CountItem[]>(mockCountItems);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [showScanner, setShowScanner] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [countQty, setCountQty] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentItem = countItems[currentItemIndex];
  const countedCount = countItems.filter((i) => i.counted).length;

  const filteredSessions = mockSessions.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectSession = (session: CountSession) => {
    haptic("selection");
    setSelectedSession(session);
    setCountItems(mockCountItems.map((i) => ({ ...i })));
    setCurrentItemIndex(countItems.findIndex((i) => !i.counted));
    setView("count");
  };

  const handleScan = (result: any) => {
    haptic("success");
    setShowScanner(false);

    // Find item by scanned barcode
    const foundIndex = countItems.findIndex(
      (i) => i.sku === result.value || i.bin === result.value
    );
    if (foundIndex !== -1) {
      setCurrentItemIndex(foundIndex);
      setCountQty(0);
    }
  };

  const handleCountItem = () => {
    if (!currentItem) return;

    haptic("medium");
    const variance = countQty - currentItem.expectedQty;

    setCountItems((prev) =>
      prev.map((item, idx) =>
        idx === currentItemIndex
          ? { ...item, countedQty: countQty, counted: true, variance }
          : item
      )
    );

    // Move to next uncounted item
    const nextUncounted = countItems.findIndex(
      (i, idx) => idx > currentItemIndex && !i.counted
    );
    if (nextUncounted !== -1) {
      setCurrentItemIndex(nextUncounted);
      setCountQty(0);
    }
  };

  const handleCompleteCount = async () => {
    setIsSubmitting(true);
    haptic("medium");

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // TODO: Call actual API
      haptic("success");
      setView("sessions");
      setSelectedSession(null);
    } catch (error) {
      haptic("error");
      console.error("Failed to complete count:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    haptic("selection");
    setView("sessions");
    setSelectedSession(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "in_progress":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "completed":
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

  // Count view
  if (view === "count" && selectedSession) {
    return (
      <div className="min-h-screen">
        <MobileHeader
          title={selectedSession.name}
          subtitle={`${countedCount}/${countItems.length} items counted`}
          showBack
          onBack={handleBack}
        />

        <div className="p-4 space-y-4">
          {/* Current item to count */}
          {currentItem && !currentItem.counted && (
            <Card className="border-2 border-primary">
              <CardHeader className="pb-2 bg-primary/5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Count Item</CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowScanner(true)}
                  >
                    <Scan className="h-4 w-4 mr-1" />
                    Scan
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div>
                  <p className="font-mono text-lg font-bold">{currentItem.sku}</p>
                  <p className="text-muted-foreground">{currentItem.name}</p>
                </div>

                <div className="flex gap-4">
                  <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    <span className="font-mono font-medium">{currentItem.bin}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg">
                    <Package className="h-4 w-4 text-gray-600" />
                    <span className="font-mono">
                      Expected: {currentItem.expectedQty}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Counted Quantity
                  </label>
                  <QuantityInput
                    value={countQty}
                    onChange={setCountQty}
                    min={0}
                    max={99999}
                  />
                </div>

                <Button
                  className="w-full h-14 text-lg"
                  onClick={handleCountItem}
                  disabled={countQty < 0}
                >
                  <Check className="h-5 w-5 mr-2" />
                  Record Count
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Count list */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">
              ALL ITEMS
            </h3>
            <div className="space-y-2">
              {countItems.map((item, index) => (
                <Card
                  key={item.id}
                  className={cn(
                    "cursor-pointer transition-all",
                    item.counted &&
                      "bg-green-50 dark:bg-green-900/20 border-green-200",
                    index === currentItemIndex &&
                      !item.counted &&
                      "ring-2 ring-primary"
                  )}
                  onClick={() => {
                    setCurrentItemIndex(index);
                    if (!item.counted) {
                      setCountQty(0);
                    }
                  }}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <Checkbox checked={item.counted} disabled />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p
                            className={cn(
                              "font-medium truncate",
                              item.counted && "line-through text-muted-foreground"
                            )}
                          >
                            {item.sku}
                          </p>
                          {item.counted && item.variance !== null && (
                            <Badge
                              variant={
                                item.variance === 0 ? "secondary" : "destructive"
                              }
                              className="ml-2"
                            >
                              {item.variance >= 0 ? "+" : ""}
                              {item.variance}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {item.name}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs">
                          <span className="text-blue-600">
                            <MapPin className="h-3 w-3 inline mr-1" />
                            {item.bin}
                          </span>
                          <span>Expected: {item.expectedQty}</span>
                          {item.counted && (
                            <span className="text-green-600">
                              Counted: {item.countedQty}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Complete button */}
          {countedCount === countItems.length && (
            <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Review Variances</p>
                    <p className="text-sm text-muted-foreground">
                      {countItems.filter((i) => i.variance !== 0).length} items
                      have quantity variances
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {countedCount === countItems.length && (
            <Button
              className="w-full h-14 text-lg bg-green-600 hover:bg-green-700"
              onClick={handleCompleteCount}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Check className="h-5 w-5 mr-2" />
                  Complete Count
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Session list view (default)
  return (
    <div className="min-h-screen">
      <MobileHeader
        title="Cycle Count"
        subtitle="Inventory counting sessions"
        showBack
        backHref="/mobile/inventory"
      />

      <div className="p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search count sessions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12"
          />
        </div>

        {/* Count Sessions */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">
            COUNT SESSIONS ({filteredSessions.length})
          </h3>
          <div className="space-y-2">
            {filteredSessions.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Calculator className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No count sessions found</p>
                </CardContent>
              </Card>
            ) : (
              filteredSessions.map((session) => (
                <Card
                  key={session.id}
                  className="cursor-pointer active:scale-[0.98] transition-transform"
                  onClick={() => handleSelectSession(session)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
                          <Calculator className="h-5 w-5 text-yellow-600" />
                        </div>
                        <div>
                          <p className="font-medium">{session.name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {session.location}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={getStatusColor(session.status)}>
                          {session.countedItems}/{session.totalItems}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {session.dueDate}
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
