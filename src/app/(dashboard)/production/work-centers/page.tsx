"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Loader2, Factory, Settings2, Wrench } from "lucide-react";
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
import { WorkCenterCard } from "@/components/production/work-center-card";
import { clientLogger } from '@/lib/client-logger';

interface WorkCenter {
  id: string;
  code: string;
  name: string;
  type: string;
  status: string;
  currentJob: string | null;
  utilization: number;
  scheduledHours: number;
  availableHours: number;
}

export default function WorkCentersPage() {
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchWorkCenters();
  }, [typeFilter, statusFilter]);

  const fetchWorkCenters = async () => {
    try {
      const params = new URLSearchParams();
      params.set("includeUtilization", "true");
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/production/work-centers?${params}`);
      if (res.ok) {
        const data = await res.json();
        setWorkCenters(data);
      }
    } catch (error) {
      clientLogger.error("Failed to fetch work centers:", error);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: workCenters.length,
    active: workCenters.filter((w) => w.status === "active").length,
    busy: workCenters.filter((w) => w.currentJob).length,
    maintenance: workCenters.filter((w) => w.status === "maintenance").length,
    avgUtilization:
      workCenters.length > 0
        ? Math.round(
            workCenters.reduce((sum, w) => sum + w.utilization, 0) /
              workCenters.length
          )
        : 0,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Work Centers"
        description="Manage machines, assembly stations, and labor pools"
        actions={
          <Button asChild>
            <Link href="/production/work-centers/new">
              <Plus className="h-4 w-4 mr-2" />
              New Work Center
            </Link>
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Factory className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-bold">{stats.total}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span className="text-2xl font-bold">{stats.active}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Running
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-blue-600 animate-spin" />
              <span className="text-2xl font-bold">{stats.busy}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Maintenance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-red-600" />
              <span className="text-2xl font-bold">{stats.maintenance}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Avg Utilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgUtilization}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="MACHINE">Machine</SelectItem>
              <SelectItem value="ASSEMBLY">Assembly</SelectItem>
              <SelectItem value="TESTING">Testing</SelectItem>
              <SelectItem value="PACKAGING">Packaging</SelectItem>
              <SelectItem value="LABOR_ONLY">Labor Only</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Work Centers Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : workCenters.length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <Factory className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No work centers found</p>
            <p className="text-sm">
              Create your first work center to get started
            </p>
            <Button asChild className="mt-4">
              <Link href="/production/work-centers/new">
                <Plus className="h-4 w-4 mr-2" />
                New Work Center
              </Link>
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {workCenters.map((wc) => (
            <WorkCenterCard
              key={wc.id}
              id={wc.id}
              code={wc.code}
              name={wc.name}
              type={wc.type}
              status={wc.status}
              currentJob={wc.currentJob}
              utilization={wc.utilization}
              queueCount={0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
