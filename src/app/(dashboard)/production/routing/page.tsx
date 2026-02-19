"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Loader2, GitBranch, CheckCircle, Clock, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { clientLogger } from '@/lib/client-logger';

interface Routing {
  id: string;
  routingNumber: string;
  name: string;
  description: string | null;
  version: number;
  status: string;
  totalSetupTime: number | null;
  totalRunTime: number | null;
  totalCost: number | null;
  product: {
    sku: string;
    name: string;
  };
  _count: {
    operations: number;
  };
}

export default function RoutingPage() {
  const [routings, setRoutings] = useState<Routing[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchRoutings();
  }, [statusFilter]);

  const fetchRoutings = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/production/routing?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRoutings(data);
      }
    } catch (error) {
      clientLogger.error("Failed to fetch routings:", error);
    } finally {
      setLoading(false);
    }
  };

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800",
    active: "bg-green-100 text-green-800",
    obsolete: "bg-red-100 text-red-800",
  };

  const statusIcons: Record<string, React.ElementType> = {
    draft: Clock,
    active: CheckCircle,
    obsolete: Archive,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Routing"
        description="Define operation sequences for products"
        actions={
          <Button asChild>
            <Link href="/production/routing/new">
              <Plus className="h-4 w-4 mr-2" />
              New Routing
            </Link>
          </Button>
        }
      />

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="obsolete">Obsolete</SelectItem>
            </SelectContent>
          </Select>

          <Badge variant="secondary" className="ml-auto">
            {routings.length} routings
          </Badge>
        </div>
      </Card>

      {/* Routing List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : routings.length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No routings found</p>
            <p className="text-sm">
              Routings define the sequence of operations for manufacturing
            </p>
            <Button asChild className="mt-4">
              <Link href="/production/routing/new">
                <Plus className="h-4 w-4 mr-2" />
                New Routing
              </Link>
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {routings.map((routing) => {
            const StatusIcon = statusIcons[routing.status] || Clock;
            return (
              <Link key={routing.id} href={`/production/routing/${routing.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-lg">
                          {routing.routingNumber}
                        </CardTitle>
                        <Badge className="text-xs">v{routing.version}</Badge>
                        <Badge
                          className={
                            statusColors[routing.status] || statusColors.draft
                          }
                        >
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {routing.status}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {routing._count.operations} operations
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="font-medium">{routing.name}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span>
                        Product: {routing.product.sku} - {routing.product.name}
                      </span>
                      {routing.totalRunTime && (
                        <span>Run Time: {routing.totalRunTime} min/unit</span>
                      )}
                      {routing.totalCost && (
                        <span>Cost: ${routing.totalCost.toFixed(2)}/unit</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
