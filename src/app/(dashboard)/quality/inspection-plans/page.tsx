"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Loader2, ClipboardList } from "lucide-react";
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
import { InspectionTypeBadge } from "@/components/quality/inspection-type-badge";

interface InspectionPlan {
  id: string;
  planNumber: string;
  name: string;
  type: string;
  status: string;
  part?: { partNumber: string; name: string } | null;
  product?: { sku: string; name: string } | null;
  supplier?: { code: string; name: string } | null;
  _count: { characteristics: number; inspections: number };
}

export default function InspectionPlansPage() {
  const [plans, setPlans] = useState<InspectionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");

  useEffect(() => {
    fetchPlans();
  }, [typeFilter, statusFilter]);

  const fetchPlans = async () => {
    try {
      const params = new URLSearchParams();
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/quality/inspection-plans?${params}`);
      if (res.ok) {
        const result = await res.json();
        // API returns { data: [...], pagination: {...} }
        setPlans(Array.isArray(result) ? result : (result.data || []));
      }
    } catch (error) {
      console.error("Failed to fetch inspection plans:", error);
    } finally {
      setLoading(false);
    }
  };

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800",
    active: "bg-green-100 text-green-800",
    obsolete: "bg-red-100 text-red-800",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inspection Plans"
        description="Define inspection criteria and characteristics"
        actions={
          <Button asChild>
            <Link href="/quality/inspection-plans/new">
              <Plus className="h-4 w-4 mr-2" />
              New Plan
            </Link>
          </Button>
        }
      />

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="RECEIVING">Receiving</SelectItem>
              <SelectItem value="IN_PROCESS">In-Process</SelectItem>
              <SelectItem value="FINAL">Final</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="obsolete">Obsolete</SelectItem>
            </SelectContent>
          </Select>

          <Badge variant="secondary" className="ml-auto">
            {plans.length} plans
          </Badge>
        </div>
      </Card>

      {/* Plans List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : plans.length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No inspection plans found</p>
            <p className="text-sm">Create your first inspection plan to get started</p>
            <Button asChild className="mt-4">
              <Link href="/quality/inspection-plans/new">
                <Plus className="h-4 w-4 mr-2" />
                Create Plan
              </Link>
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => (
            <Link key={plan.id} href={`/quality/inspection-plans/${plan.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <InspectionTypeBadge type={plan.type} />
                      <CardTitle className="text-lg">{plan.planNumber}</CardTitle>
                    </div>
                    <Badge className={statusColors[plan.status] || statusColors.draft}>
                      {plan.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">{plan.name}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    {plan.part && (
                      <span>Part: {plan.part.partNumber}</span>
                    )}
                    {plan.product && (
                      <span>Product: {plan.product.sku}</span>
                    )}
                    {plan.supplier && (
                      <span>Supplier: {plan.supplier.name}</span>
                    )}
                    <span>{plan._count.characteristics} characteristics</span>
                    <span>{plan._count.inspections} inspections</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
