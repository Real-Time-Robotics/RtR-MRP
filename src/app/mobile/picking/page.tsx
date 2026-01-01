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
  ClipboardList,
  Package,
  Scan,
  Check,
  ChevronRight,
  Search,
  Loader2,
  MapPin,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/mobile/haptics";

interface PickList {
  id: string;
  soNumber: string;
  customer: string;
  priority: "high" | "normal" | "low";
  status: "pending" | "in_progress" | "completed";
  totalItems: number;
  pickedItems: number;
  dueDate: string;
}

interface PickLine {
  id: string;
  partNumber: string;
  partName: string;
  quantity: number;
  picked: boolean;
  location: string;
  bin: string;
}

// Mock data
const mockPickLists: PickList[] = [
  {
    id: "1",
    soNumber: "SO-2024-001",
    customer: "Tech Corp",
    priority: "high",
    status: "pending",
    totalItems: 4,
    pickedItems: 0,
    dueDate: "2024-01-15",
  },
  {
    id: "2",
    soNumber: "SO-2024-002",
    customer: "ABC Company",
    priority: "normal",
    status: "in_progress",
    totalItems: 3,
    pickedItems: 1,
    dueDate: "2024-01-16",
  },
];

const mockPickLines: PickLine[] = [
  {
    id: "1",
    partNumber: "DRN-001",
    partName: "Drone Frame X500",
    quantity: 2,
    picked: false,
    location: "A-01",
    bin: "A-01-01",
  },
  {
    id: "2",
    partNumber: "MTR-001",
    partName: "Brushless Motor 2207",
    quantity: 8,
    picked: false,
    location: "B-02",
    bin: "B-02-03",
  },
  {
    id: "3",
    partNumber: "ESC-002",
    partName: "ESC 30A",
    quantity: 4,
    picked: false,
    location: "B-03",
    bin: "B-03-01",
  },
  {
    id: "4",
    partNumber: "PROP-003",
    partName: "Propeller 5x4.5",
    quantity: 16,
    picked: false,
    location: "C-01",
    bin: "C-01-02",
  },
];

export default function PickingPage() {
  const [view, setView] = useState<"list" | "pick">("list");
  const [selectedPickList, setSelectedPickList] = useState<PickList | null>(null);
  const [pickLines, setPickLines] = useState<PickLine[]>(mockPickLines);
  const [showScanner, setShowScanner] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);

  const filteredPickLists = mockPickLists.filter(
    (pl) =>
      pl.soNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pl.customer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentLine = pickLines[currentLineIndex];
  const pickedCount = pickLines.filter((l) => l.picked).length;

  const handleSelectPickList = (pickList: PickList) => {
    haptic("selection");
    setSelectedPickList(pickList);
    setPickLines(mockPickLines.map((l) => ({ ...l, picked: false })));
    setCurrentLineIndex(0);
    setView("pick");
  };

  const handleScan = (result: any) => {
    haptic("success");
    setShowScanner(false);

    // Check if scanned code matches current line's location or part
    if (currentLine) {
      if (
        result.value === currentLine.partNumber ||
        result.value === currentLine.bin
      ) {
        handlePickItem(currentLineIndex);
      }
    }
  };

  const handlePickItem = (index: number) => {
    haptic("medium");
    setPickLines((prev) =>
      prev.map((line, i) =>
        i === index ? { ...line, picked: !line.picked } : line
      )
    );

    // Move to next unpicked item
    const nextUnpicked = pickLines.findIndex(
      (l, i) => i > index && !l.picked
    );
    if (nextUnpicked !== -1) {
      setCurrentLineIndex(nextUnpicked);
    }
  };

  const handleCompletePicking = async () => {
    setIsSubmitting(true);
    haptic("medium");

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // TODO: Call actual API
      haptic("success");
      setView("list");
      setSelectedPickList(null);
    } catch (error) {
      haptic("error");
      console.error("Failed to complete picking:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    haptic("selection");
    setView("list");
    setSelectedPickList(null);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "normal":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "low":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
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

  // Picking view
  if (view === "pick" && selectedPickList) {
    return (
      <div className="min-h-screen">
        <MobileHeader
          title={selectedPickList.soNumber}
          subtitle={`${pickedCount}/${pickLines.length} items picked`}
          showBack
          onBack={handleBack}
        />

        <div className="p-4 space-y-4">
          {/* Current item to pick */}
          {currentLine && !currentLine.picked && (
            <Card className="border-2 border-primary">
              <CardHeader className="pb-2 bg-primary/5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Next Item</CardTitle>
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
                  <p className="font-mono text-lg font-bold">
                    {currentLine.partNumber}
                  </p>
                  <p className="text-muted-foreground">{currentLine.partName}</p>
                </div>

                <div className="flex gap-4">
                  <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    <span className="font-mono font-medium">
                      {currentLine.location} / {currentLine.bin}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg">
                    <Package className="h-4 w-4 text-green-600" />
                    <span className="font-mono font-medium">
                      Qty: {currentLine.quantity}
                    </span>
                  </div>
                </div>

                <Button
                  className="w-full h-14 text-lg"
                  onClick={() => handlePickItem(currentLineIndex)}
                >
                  <Check className="h-5 w-5 mr-2" />
                  Mark as Picked
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Pick list */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">
              ALL ITEMS
            </h3>
            <div className="space-y-2">
              {pickLines.map((line, index) => (
                <Card
                  key={line.id}
                  className={cn(
                    "cursor-pointer transition-all",
                    line.picked && "bg-green-50 dark:bg-green-900/20 border-green-200",
                    index === currentLineIndex &&
                      !line.picked &&
                      "ring-2 ring-primary"
                  )}
                  onClick={() => {
                    setCurrentLineIndex(index);
                    if (!line.picked) {
                      handlePickItem(index);
                    }
                  }}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={line.picked}
                        onCheckedChange={() => handlePickItem(index)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p
                            className={cn(
                              "font-medium truncate",
                              line.picked && "line-through text-muted-foreground"
                            )}
                          >
                            {line.partNumber}
                          </p>
                          <span className="text-sm font-mono">
                            x{line.quantity}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {line.partName}
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          📍 {line.location} / {line.bin}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Complete button */}
          {pickedCount === pickLines.length && (
            <Button
              className="w-full h-14 text-lg bg-green-600 hover:bg-green-700"
              onClick={handleCompletePicking}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Check className="h-5 w-5 mr-2" />
                  Complete Picking
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Pick list view (default)
  return (
    <div className="min-h-screen">
      <MobileHeader
        title="Picking"
        subtitle="Pick Sales Orders"
        showBack
        backHref="/mobile"
      />

      <div className="p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search SO or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12"
          />
        </div>

        {/* Pick Lists */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">
            PICK LISTS ({filteredPickLists.length})
          </h3>
          <div className="space-y-2">
            {filteredPickLists.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No pick lists found</p>
                </CardContent>
              </Card>
            ) : (
              filteredPickLists.map((pl) => (
                <Card
                  key={pl.id}
                  className="cursor-pointer active:scale-[0.98] transition-transform"
                  onClick={() => handleSelectPickList(pl)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                          <ClipboardList className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{pl.soNumber}</p>
                            <Badge className={getPriorityColor(pl.priority)}>
                              {pl.priority}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="h-3 w-3" />
                            {pl.customer}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {pl.pickedItems}/{pl.totalItems}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Due: {pl.dueDate}
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
