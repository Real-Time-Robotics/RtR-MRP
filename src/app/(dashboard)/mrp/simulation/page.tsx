"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SimulationBuilder } from "@/components/mrp/simulation-builder";
import { Loader2, Play, Trash2, Eye, FlaskConical } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { clientLogger } from '@/lib/client-logger';

interface Simulation {
  id: string;
  name: string;
  description?: string;
  simulationType: string;
  status: string;
  createdAt: Date;
  completedAt?: Date;
  resultsSummary?: {
    totalPlannedOrders?: number;
    totalSpend?: number;
    shortageCount?: number;
  };
}

interface Part {
  id: string;
  partNumber: string;
  name: string;
}

export default function SimulationPage() {
  const { toast } = useToast();
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [activeTab, setActiveTab] = useState("list");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);

  useEffect(() => {
    fetchSimulations();
    fetchParts();
  }, []);

  const fetchSimulations = async () => {
    try {
      const response = await fetch("/api/mrp/simulation");
      if (response.ok) {
        const data = await response.json();
        setSimulations(data);
      }
    } catch (error) {
      clientLogger.error("Failed to fetch simulations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchParts = async () => {
    try {
      const response = await fetch("/api/parts?limit=500");
      if (response.ok) {
        const data = await response.json();
        setParts(data);
      }
    } catch (error) {
      clientLogger.error("Failed to fetch parts:", error);
    }
  };

  const handleCreate = async (data: {
    name: string;
    description?: string;
    simulationType: string;
    demandChanges: Array<{ partId?: string; category?: string; changeType: string; changeValue: number }>;
    supplyChanges: Array<{ partId?: string; supplierId?: string; changeType: string; changeValue: number }>;
    dateRange: { start: Date; end: Date };
  }) => {
    setIsCreating(true);
    try {
      const response = await fetch("/api/mrp/simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const result = await response.json();
        toast({ title: "Simulation created successfully" });

        // Run the simulation
        setRunningId(result.simulationId);
        const runResponse = await fetch("/api/mrp/simulation/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ simulationId: result.simulationId }),
        });

        if (runResponse.ok) {
          toast({ title: "Simulation completed" });
        } else {
          toast({ title: "Simulation failed to run", variant: "destructive" });
        }

        fetchSimulations();
        setActiveTab("list");
      } else {
        throw new Error("Failed to create simulation");
      }
    } catch (error) {
      clientLogger.error("Failed to create simulation:", error);
      toast({ title: "Failed to create simulation", variant: "destructive" });
    } finally {
      setIsCreating(false);
      setRunningId(null);
    }
  };

  const handleRun = async (simulationId: string) => {
    setRunningId(simulationId);
    try {
      const response = await fetch("/api/mrp/simulation/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ simulationId }),
      });

      if (response.ok) {
        toast({ title: "Simulation completed" });
        fetchSimulations();
      } else {
        throw new Error("Failed to run simulation");
      }
    } catch (error) {
      clientLogger.error("Failed to run simulation:", error);
      toast({ title: "Failed to run simulation", variant: "destructive" });
    } finally {
      setRunningId(null);
    }
  };

  const handleDelete = async (simulationId: string) => {
    try {
      const response = await fetch(`/api/mrp/simulation?id=${simulationId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({ title: "Simulation deleted" });
        fetchSimulations();
      } else {
        throw new Error("Failed to delete simulation");
      }
    } catch (error) {
      clientLogger.error("Failed to delete simulation:", error);
      toast({ title: "Failed to delete simulation", variant: "destructive" });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-100 text-green-800";
      case "RUNNING":
        return "bg-blue-100 text-blue-800";
      case "FAILED":
        return "bg-red-100 text-red-800";
      case "DRAFT":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">What-If Simulation</h1>
          <p className="text-muted-foreground">
            Test scenarios without affecting production data
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list">Simulations</TabsTrigger>
          <TabsTrigger value="create">Create New</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="text-3xl font-bold">{simulations.length}</div>
                <div className="text-sm text-muted-foreground">Total Simulations</div>
              </CardContent>
            </Card>
            <Card className="bg-green-50">
              <CardContent className="pt-4">
                <div className="text-3xl font-bold text-green-700">
                  {simulations.filter((s) => s.status === "COMPLETED").length}
                </div>
                <div className="text-sm text-green-600">Completed</div>
              </CardContent>
            </Card>
            <Card className="bg-blue-50">
              <CardContent className="pt-4">
                <div className="text-3xl font-bold text-blue-700">
                  {simulations.filter((s) => s.status === "RUNNING").length}
                </div>
                <div className="text-sm text-blue-600">Running</div>
              </CardContent>
            </Card>
            <Card className="bg-gray-50">
              <CardContent className="pt-4">
                <div className="text-3xl font-bold text-gray-700">
                  {simulations.filter((s) => s.status === "DRAFT").length}
                </div>
                <div className="text-sm text-gray-600">Draft</div>
              </CardContent>
            </Card>
          </div>

          {/* Simulations Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5" />
                Simulations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-8 text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  Loading simulations...
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Results</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {simulations.map((sim) => (
                      <TableRow key={sim.id}>
                        <TableCell>
                          <div className="font-medium">{sim.name}</div>
                          {sim.description && (
                            <div className="text-sm text-muted-foreground truncate max-w-[300px]">
                              {sim.description}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{sim.simulationType}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(sim.status)}>
                            {sim.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(sim.createdAt), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>
                          {sim.resultsSummary ? (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Orders:</span>{" "}
                              {sim.resultsSummary.totalPlannedOrders || 0}
                              {" | "}
                              <span className="text-muted-foreground">Shortages:</span>{" "}
                              {sim.resultsSummary.shortageCount || 0}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {sim.status === "DRAFT" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRun(sim.id)}
                                disabled={runningId === sim.id}
                              >
                                {runningId === sim.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Play className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(sim.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {simulations.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No simulations created yet. Click &quot;Create New&quot; to get started.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create">
          <SimulationBuilder
            parts={parts}
            onSubmit={handleCreate}
            isLoading={isCreating}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
