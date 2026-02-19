"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ATPGrid } from "@/components/mrp/atp-grid";
import { Loader2, Calculator, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { clientLogger } from '@/lib/client-logger';

interface Part {
  id: string;
  partNumber: string;
  name: string;
}

export default function ATPPage() {
  const { toast } = useToast();
  const [parts, setParts] = useState<Part[]>([]);
  const [selectedPartId, setSelectedPartId] = useState<string>("");
  const [quantity, setQuantity] = useState(100);
  const [requestedDate, setRequestedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [horizon] = useState(90);
  const [atpResult, setAtpResult] = useState<{
    partNumber: string;
    requestedQty: number;
    requestedDate: Date;
    atpQty: number;
    atpDate: Date | null;
    ctpQty: number;
    ctpDate: Date | null;
    grid: [];
    ctpDetails?: {
      canProduce: boolean;
      startDate: Date;
      completionDate: Date;
      productionQty: number;
      capacityAvailable: boolean;
      totalProductionHours: number;
      componentsAvailable: [];
    };
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingParts, setIsLoadingParts] = useState(true);

  useEffect(() => {
    fetchParts();
  }, []);

  const fetchParts = async () => {
    try {
      const response = await fetch("/api/parts?limit=500");
      if (response.ok) {
        const data = await response.json();
        setParts(data);
      }
    } catch (error) {
      clientLogger.error("Failed to fetch parts:", error);
    } finally {
      setIsLoadingParts(false);
    }
  };

  const calculateATP = async () => {
    if (!selectedPartId) {
      toast({ title: "Please select a part", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/mrp/atp?partId=${selectedPartId}&quantity=${quantity}&date=${requestedDate}&horizon=${horizon}`
      );
      if (response.ok) {
        const data = await response.json();
        setAtpResult(data);
        toast({ title: "ATP calculated successfully" });
      } else {
        throw new Error("Failed to calculate ATP");
      }
    } catch (error) {
      clientLogger.error("Failed to calculate ATP:", error);
      toast({ title: "Failed to calculate ATP", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">ATP/CTP Analysis</h1>
          <p className="text-muted-foreground">
            Available to Promise & Capable to Promise calculations
          </p>
        </div>
      </div>

      {/* Search Controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            ATP Check
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-end">
            <div className="col-span-2 space-y-2">
              <Label>Part</Label>
              <Select
                value={selectedPartId}
                onValueChange={setSelectedPartId}
                disabled={isLoadingParts}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a part..." />
                </SelectTrigger>
                <SelectContent>
                  {parts.map((part) => (
                    <SelectItem key={part.id} value={part.id}>
                      {part.partNumber} - {part.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                min={1}
              />
            </div>
            <div className="space-y-2">
              <Label>Requested Date</Label>
              <Input
                type="date"
                value={requestedDate}
                onChange={(e) => setRequestedDate(e.target.value)}
              />
            </div>
            <Button
              onClick={calculateATP}
              disabled={isLoading || !selectedPartId}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <Package className="h-4 w-4 mr-2" />
                  Check ATP
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ATP Results */}
      {atpResult && (
        <ATPGrid
          partNumber={atpResult.partNumber}
          requestedQty={atpResult.requestedQty}
          requestedDate={new Date(atpResult.requestedDate)}
          atpQty={atpResult.atpQty}
          atpDate={atpResult.atpDate ? new Date(atpResult.atpDate) : null}
          ctpQty={atpResult.ctpQty}
          ctpDate={atpResult.ctpDate ? new Date(atpResult.ctpDate) : null}
          grid={atpResult.grid}
          ctpDetails={atpResult.ctpDetails}
        />
      )}

      {!atpResult && !isLoading && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p>Select a part and enter quantity to check availability</p>
            <p className="text-sm mt-2">
              ATP shows inventory available to promise, CTP shows production capability
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
