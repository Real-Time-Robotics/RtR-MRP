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
import { PeggingTree } from "@/components/mrp/pegging-tree";
import { Loader2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { clientLogger } from '@/lib/client-logger';

interface Part {
  id: string;
  partNumber: string;
  name: string;
}

export default function PeggingPage() {
  const { toast } = useToast();
  const [parts, setParts] = useState<Part[]>([]);
  const [selectedPartId, setSelectedPartId] = useState<string>("");
  const [horizon, setHorizon] = useState(90);
  const [peggingData, setPeggingData] = useState<{
    demands: [];
    supplies: [];
    summary: {
      onHand: number;
      totalDemand: number;
      totalSupply: number;
      projected: number;
      shortages: number;
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

  const generatePegging = async () => {
    if (!selectedPartId) {
      toast({ title: "Please select a part", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/mrp/pegging?partId=${selectedPartId}&horizon=${horizon}&generate=true`
      );
      if (response.ok) {
        const data = await response.json();
        setPeggingData(data);
        toast({ title: "Pegging generated successfully" });
      } else {
        throw new Error("Failed to generate pegging");
      }
    } catch (error) {
      clientLogger.error("Failed to generate pegging:", error);
      toast({ title: "Failed to generate pegging", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedPart = parts.find((p) => p.id === selectedPartId);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pegging Analysis</h1>
          <p className="text-muted-foreground">
            Trace demand-supply relationships for parts
          </p>
        </div>
      </div>

      {/* Search Controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Select Part</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
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
            <div className="w-[150px] space-y-2">
              <Label>Horizon (days)</Label>
              <Input
                type="number"
                value={horizon}
                onChange={(e) => setHorizon(parseInt(e.target.value) || 90)}
                min={7}
                max={365}
              />
            </div>
            <Button onClick={generatePegging} disabled={isLoading || !selectedPartId}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Generate Pegging
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pegging Results */}
      {peggingData && selectedPart && (
        <PeggingTree
          partNumber={selectedPart.partNumber}
          demands={peggingData.demands}
          supplies={peggingData.supplies}
          summary={peggingData.summary}
        />
      )}

      {!peggingData && !isLoading && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Select a part and click &quot;Generate Pegging&quot; to view demand-supply traceability
          </CardContent>
        </Card>
      )}
    </div>
  );
}
