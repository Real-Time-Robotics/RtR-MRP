"use client";

import { useState } from "react";
import { MobileHeader } from "@/components/mobile/mobile-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Scanner } from "@/components/mobile/scanner";
import { QuantityInput } from "@/components/mobile/quantity-input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Scan,
  Check,
  ChevronRight,
  Search,
  Loader2,
  Camera,
  FileText,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/mobile/haptics";

interface Inspection {
  id: string;
  type: "receiving" | "in_process" | "final";
  reference: string;
  partNumber: string;
  partName: string;
  quantity: number;
  status: "pending" | "in_progress" | "passed" | "failed";
  priority: "high" | "normal";
  createdAt: string;
}

// Mock data
const mockInspections: Inspection[] = [
  {
    id: "1",
    type: "receiving",
    reference: "PO-2024-001",
    partNumber: "MTR-001",
    partName: "Brushless Motor 2207",
    quantity: 100,
    status: "pending",
    priority: "high",
    createdAt: "2024-01-15",
  },
  {
    id: "2",
    type: "in_process",
    reference: "WO-2024-005",
    partNumber: "DRN-001",
    partName: "Drone Frame X500",
    quantity: 10,
    status: "pending",
    priority: "normal",
    createdAt: "2024-01-15",
  },
  {
    id: "3",
    type: "final",
    reference: "WO-2024-003",
    partNumber: "QUAD-001",
    partName: "Quadcopter Assembly",
    quantity: 5,
    status: "in_progress",
    priority: "high",
    createdAt: "2024-01-14",
  },
];

interface InspectionResult {
  result: "pass" | "fail" | "conditional";
  acceptedQty: number;
  rejectedQty: number;
  notes: string;
}

export default function QualityPage() {
  const [view, setView] = useState<"list" | "inspect">("list");
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(
    null
  );
  const [showScanner, setShowScanner] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "receiving" | "in_process" | "final">(
    "all"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [inspectionResult, setInspectionResult] = useState<InspectionResult>({
    result: "pass",
    acceptedQty: 0,
    rejectedQty: 0,
    notes: "",
  });

  const filteredInspections = mockInspections.filter((insp) => {
    const matchesSearch =
      insp.partNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      insp.reference.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === "all" || insp.type === filter;
    return matchesSearch && matchesFilter;
  });

  const handleSelectInspection = (inspection: Inspection) => {
    haptic("selection");
    setSelectedInspection(inspection);
    setInspectionResult({
      result: "pass",
      acceptedQty: inspection.quantity,
      rejectedQty: 0,
      notes: "",
    });
    setView("inspect");
  };

  const handleScan = (result: any) => {
    haptic("success");
    setShowScanner(false);
    const found = mockInspections.find(
      (i) => i.partNumber === result.value || i.reference === result.value
    );
    if (found) {
      handleSelectInspection(found);
    }
  };

  const handleSubmitInspection = async () => {
    if (!selectedInspection) return;

    setIsSubmitting(true);
    haptic("medium");

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // TODO: Call actual API
      haptic("success");
      setView("list");
      setSelectedInspection(null);
    } catch (error) {
      haptic("error");
      console.error("Failed to submit inspection:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    haptic("selection");
    setView("list");
    setSelectedInspection(null);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "receiving":
        return "📦";
      case "in_process":
        return "⚙️";
      case "final":
        return "✅";
      default:
        return "📋";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "receiving":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "in_process":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "final":
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

  // Inspection form view
  if (view === "inspect" && selectedInspection) {
    return (
      <div className="min-h-screen">
        <MobileHeader
          title="Quality Inspection"
          subtitle={selectedInspection.reference}
          showBack
          onBack={handleBack}
        />

        <div className="p-4 space-y-4">
          {/* Item info */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <Badge className={getTypeColor(selectedInspection.type)}>
                  {getTypeIcon(selectedInspection.type)}{" "}
                  {selectedInspection.type.replace("_", " ")}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Qty: {selectedInspection.quantity}
                </span>
              </div>
              <p className="font-mono font-bold">{selectedInspection.partNumber}</p>
              <p className="text-muted-foreground">{selectedInspection.partName}</p>
            </CardContent>
          </Card>

          {/* Inspection result */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Inspection Result</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup
                value={inspectionResult.result}
                onValueChange={(value: "pass" | "fail" | "conditional") => {
                  haptic("selection");
                  setInspectionResult((prev) => ({
                    ...prev,
                    result: value,
                    acceptedQty:
                      value === "pass" ? selectedInspection.quantity : prev.acceptedQty,
                    rejectedQty:
                      value === "fail" ? selectedInspection.quantity : prev.rejectedQty,
                  }));
                }}
                className="space-y-3"
              >
                <div
                  className={cn(
                    "flex items-center space-x-3 p-3 rounded-lg border-2 transition-colors",
                    inspectionResult.result === "pass"
                      ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                      : "border-transparent"
                  )}
                >
                  <RadioGroupItem value="pass" id="pass" />
                  <Label
                    htmlFor="pass"
                    className="flex items-center gap-2 cursor-pointer flex-1"
                  >
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium">Pass</span>
                  </Label>
                </div>

                <div
                  className={cn(
                    "flex items-center space-x-3 p-3 rounded-lg border-2 transition-colors",
                    inspectionResult.result === "conditional"
                      ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20"
                      : "border-transparent"
                  )}
                >
                  <RadioGroupItem value="conditional" id="conditional" />
                  <Label
                    htmlFor="conditional"
                    className="flex items-center gap-2 cursor-pointer flex-1"
                  >
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <span className="font-medium">Conditional</span>
                  </Label>
                </div>

                <div
                  className={cn(
                    "flex items-center space-x-3 p-3 rounded-lg border-2 transition-colors",
                    inspectionResult.result === "fail"
                      ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                      : "border-transparent"
                  )}
                >
                  <RadioGroupItem value="fail" id="fail" />
                  <Label
                    htmlFor="fail"
                    className="flex items-center gap-2 cursor-pointer flex-1"
                  >
                    <XCircle className="h-5 w-5 text-red-600" />
                    <span className="font-medium">Fail</span>
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Quantities (if conditional) */}
          {inspectionResult.result === "conditional" && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Quantities</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm text-green-600">Accepted</Label>
                  <QuantityInput
                    value={inspectionResult.acceptedQty}
                    onChange={(v) =>
                      setInspectionResult((prev) => ({
                        ...prev,
                        acceptedQty: v,
                        rejectedQty: selectedInspection.quantity - v,
                      }))
                    }
                    min={0}
                    max={selectedInspection.quantity}
                  />
                </div>
                <div>
                  <Label className="text-sm text-red-600">Rejected</Label>
                  <QuantityInput
                    value={inspectionResult.rejectedQty}
                    onChange={(v) =>
                      setInspectionResult((prev) => ({
                        ...prev,
                        rejectedQty: v,
                        acceptedQty: selectedInspection.quantity - v,
                      }))
                    }
                    min={0}
                    max={selectedInspection.quantity}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Add inspection notes..."
                value={inspectionResult.notes}
                onChange={(e) =>
                  setInspectionResult((prev) => ({
                    ...prev,
                    notes: e.target.value,
                  }))
                }
                rows={3}
              />
              <div className="flex gap-2 mt-3">
                <Button variant="outline" size="sm" className="gap-1">
                  <Camera className="h-4 w-4" />
                  Photo
                </Button>
                <Button variant="outline" size="sm" className="gap-1">
                  <FileText className="h-4 w-4" />
                  Attach
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <Button
            className={cn(
              "w-full h-14 text-lg",
              inspectionResult.result === "pass" &&
                "bg-green-600 hover:bg-green-700",
              inspectionResult.result === "fail" && "bg-red-600 hover:bg-red-700",
              inspectionResult.result === "conditional" &&
                "bg-yellow-600 hover:bg-yellow-700"
            )}
            onClick={handleSubmitInspection}
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
                Submit Inspection
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Inspection list view (default)
  return (
    <div className="min-h-screen">
      <MobileHeader
        title="Quality"
        subtitle="Inspections & Checks"
        showBack
        backHref="/mobile"
      />

      <div className="p-4 space-y-4">
        {/* Search and Scan */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search part or reference..."
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

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            { value: "all", label: "All" },
            { value: "receiving", label: "📦 Receiving" },
            { value: "in_process", label: "⚙️ In-Process" },
            { value: "final", label: "✅ Final" },
          ].map((tab) => (
            <Button
              key={tab.value}
              variant={filter === tab.value ? "default" : "outline"}
              size="sm"
              onClick={() => {
                haptic("selection");
                setFilter(tab.value as any);
              }}
              className="whitespace-nowrap"
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Inspection list */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">
            PENDING INSPECTIONS ({filteredInspections.length})
          </h3>
          <div className="space-y-2">
            {filteredInspections.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No pending inspections</p>
                </CardContent>
              </Card>
            ) : (
              filteredInspections.map((insp) => (
                <Card
                  key={insp.id}
                  className="cursor-pointer active:scale-[0.98] transition-transform"
                  onClick={() => handleSelectInspection(insp)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={getTypeColor(insp.type)}>
                            {getTypeIcon(insp.type)} {insp.type.replace("_", " ")}
                          </Badge>
                          {insp.priority === "high" && (
                            <Badge variant="destructive">Priority</Badge>
                          )}
                        </div>
                        <p className="font-medium">{insp.partNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          {insp.partName}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>{insp.reference}</span>
                          <span>Qty: {insp.quantity}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {insp.createdAt}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
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
