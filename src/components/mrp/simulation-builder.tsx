"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Play, TrendingUp, TrendingDown, Loader2 } from "lucide-react";

interface DemandChange {
  partId?: string;
  category?: string;
  changeType: "PERCENT" | "ABSOLUTE";
  changeValue: number;
}

interface SupplyChange {
  partId?: string;
  supplierId?: string;
  changeType: "DELAY_DAYS" | "REDUCE_PERCENT" | "CANCEL";
  changeValue: number;
}

interface SimulationBuilderProps {
  parts?: Array<{ id: string; partNumber: string; name: string }>;
  onSubmit: (data: {
    name: string;
    description?: string;
    simulationType: string;
    demandChanges: DemandChange[];
    supplyChanges: SupplyChange[];
    dateRange: { start: Date; end: Date };
  }) => void;
  isLoading?: boolean;
}

export function SimulationBuilder({
  parts = [],
  onSubmit,
  isLoading,
}: SimulationBuilderProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [simulationType, setSimulationType] = useState("COMBINED");
  const [dateStart, setDateStart] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [dateEnd, setDateEnd] = useState(
    new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [demandChanges, setDemandChanges] = useState<DemandChange[]>([]);
  const [supplyChanges, setSupplyChanges] = useState<SupplyChange[]>([]);

  const addDemandChange = () => {
    setDemandChanges([
      ...demandChanges,
      { changeType: "PERCENT", changeValue: 0 },
    ]);
  };

  const removeDemandChange = (index: number) => {
    setDemandChanges(demandChanges.filter((_, i) => i !== index));
  };

  const updateDemandChange = (index: number, field: keyof DemandChange, value: string | number) => {
    const updated = [...demandChanges];
    updated[index] = { ...updated[index], [field]: value };
    setDemandChanges(updated);
  };

  const addSupplyChange = () => {
    setSupplyChanges([
      ...supplyChanges,
      { changeType: "DELAY_DAYS", changeValue: 0 },
    ]);
  };

  const removeSupplyChange = (index: number) => {
    setSupplyChanges(supplyChanges.filter((_, i) => i !== index));
  };

  const updateSupplyChange = (index: number, field: keyof SupplyChange, value: string | number) => {
    const updated = [...supplyChanges];
    updated[index] = { ...updated[index], [field]: value };
    setSupplyChanges(updated);
  };

  const handleSubmit = () => {
    onSubmit({
      name,
      description: description || undefined,
      simulationType,
      demandChanges,
      supplyChanges,
      dateRange: {
        start: new Date(dateStart),
        end: new Date(dateEnd),
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* Basic Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Simulation Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Simulation Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Q1 Demand Increase Scenario"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Simulation Type</Label>
              <Select value={simulationType} onValueChange={setSimulationType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MRP">MRP Only</SelectItem>
                  <SelectItem value="DEMAND">Demand Changes</SelectItem>
                  <SelectItem value="SUPPLY">Supply Changes</SelectItem>
                  <SelectItem value="CAPACITY">Capacity Changes</SelectItem>
                  <SelectItem value="COMBINED">Combined</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this simulation is testing..."
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateStart">Start Date</Label>
              <Input
                id="dateStart"
                type="date"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateEnd">End Date</Label>
              <Input
                id="dateEnd"
                type="date"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Demand Changes */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-orange-500" />
            Demand Changes
          </CardTitle>
          <Button variant="outline" size="sm" onClick={addDemandChange}>
            <Plus className="h-4 w-4 mr-1" /> Add Change
          </Button>
        </CardHeader>
        <CardContent>
          {demandChanges.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No demand changes configured. Click &quot;Add Change&quot; to add one.
            </div>
          ) : (
            <div className="space-y-3">
              {demandChanges.map((change, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                >
                  <Select
                    value={change.partId || "all"}
                    onValueChange={(v) =>
                      updateDemandChange(index, "partId", v === "all" ? "" : v)
                    }
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="All Parts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Parts</SelectItem>
                      {parts.map((part) => (
                        <SelectItem key={part.id} value={part.id}>
                          {part.partNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={change.changeType}
                    onValueChange={(v) =>
                      updateDemandChange(index, "changeType", v)
                    }
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERCENT">Percent Change</SelectItem>
                      <SelectItem value="ABSOLUTE">Absolute Change</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={change.changeValue}
                      onChange={(e) =>
                        updateDemandChange(
                          index,
                          "changeValue",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-[100px]"
                    />
                    <span className="text-sm text-muted-foreground">
                      {change.changeType === "PERCENT" ? "%" : "units"}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDemandChange(index)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Supply Changes */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-blue-500" />
            Supply Changes
          </CardTitle>
          <Button variant="outline" size="sm" onClick={addSupplyChange}>
            <Plus className="h-4 w-4 mr-1" /> Add Change
          </Button>
        </CardHeader>
        <CardContent>
          {supplyChanges.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No supply changes configured. Click &quot;Add Change&quot; to add one.
            </div>
          ) : (
            <div className="space-y-3">
              {supplyChanges.map((change, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                >
                  <Select
                    value={change.partId || "all"}
                    onValueChange={(v) =>
                      updateSupplyChange(index, "partId", v === "all" ? "" : v)
                    }
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="All Parts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Parts</SelectItem>
                      {parts.map((part) => (
                        <SelectItem key={part.id} value={part.id}>
                          {part.partNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={change.changeType}
                    onValueChange={(v) =>
                      updateSupplyChange(index, "changeType", v)
                    }
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DELAY_DAYS">Delay (Days)</SelectItem>
                      <SelectItem value="REDUCE_PERCENT">Reduce (%)</SelectItem>
                      <SelectItem value="CANCEL">Cancel</SelectItem>
                    </SelectContent>
                  </Select>
                  {change.changeType !== "CANCEL" && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={change.changeValue}
                        onChange={(e) =>
                          updateSupplyChange(
                            index,
                            "changeValue",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-[100px]"
                      />
                      <span className="text-sm text-muted-foreground">
                        {change.changeType === "DELAY_DAYS" ? "days" : "%"}
                      </span>
                    </div>
                  )}
                  {change.changeType === "CANCEL" && (
                    <Badge variant="destructive">Cancel All</Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSupplyChange(index)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end gap-3">
        <Button
          size="lg"
          onClick={handleSubmit}
          disabled={!name || isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Đang tạo...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Create & Run Simulation
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
