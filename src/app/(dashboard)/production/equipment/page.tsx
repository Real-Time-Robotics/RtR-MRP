"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  Loader2,
  Wrench,
  Settings2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Zap,
  ThermometerSun,
  Gauge,
  Calendar,
  Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Equipment {
  id: string;
  code: string;
  name: string;
  type: string;
  status: "running" | "idle" | "maintenance" | "offline";
  workCenterId?: string;
  workCenterName?: string;
  lastMaintenance?: string;
  nextMaintenance?: string;
  hoursRunning: number;
  efficiency: number;
}

const statusConfig = {
  running: { label: "Running", color: "bg-green-500", icon: Zap, textColor: "text-green-700" },
  idle: { label: "Idle", color: "bg-yellow-500", icon: Clock, textColor: "text-yellow-700" },
  maintenance: { label: "Maintenance", color: "bg-orange-500", icon: Wrench, textColor: "text-orange-700" },
  offline: { label: "Offline", color: "bg-red-500", icon: AlertTriangle, textColor: "text-red-700" },
};

const typeConfig: Record<string, string> = {
  CNC: "CNC Machine",
  WELDING: "Welding",
  DRILL: "Drill Press",
  PACKAGING: "Packaging",
  ASSEMBLY: "Assembly",
  TESTING: "Testing",
};

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchEquipment() {
      try {
        const res = await fetch('/api/equipment?pageSize=100');
        if (!res.ok) throw new Error('Không thể tải danh sách thiết bị');
        const json = await res.json();
        const items: Equipment[] = (json.data || []).map((e: { id: string; code: string; name: string; type?: string; status?: string; workCenterId?: string; workCenter?: { id?: string; name?: string }; totalDowntimeHours?: number; currentOee?: number; targetOee?: number }) => {
          // Map API status to UI status
          const statusMap: Record<string, Equipment['status']> = {
            operational: 'running',
            running: 'running',
            active: 'running',
            idle: 'idle',
            standby: 'idle',
            down: 'offline',
            breakdown: 'offline',
            failed: 'offline',
            maintenance: 'maintenance',
            under_maintenance: 'maintenance',
          };
          return {
            id: e.id,
            code: e.code,
            name: e.name,
            type: (e.type || 'General').toUpperCase(),
            status: statusMap[e.status?.toLowerCase() || ''] || 'idle',
            workCenterId: e.workCenterId || e.workCenter?.id,
            workCenterName: e.workCenter?.name,
            hoursRunning: Math.round(e.totalDowntimeHours || 0),
            efficiency: Math.round(e.currentOee || e.targetOee || 0),
          };
        });
        setEquipment(items);
      } catch (err) {
        toast.error('Lỗi tải danh sách thiết bị');
      } finally {
        setLoading(false);
      }
    }
    fetchEquipment();
  }, []);

  const filteredEquipment = equipment.filter((eq) => {
    const matchesType = typeFilter === "all" || eq.type === typeFilter;
    const matchesStatus = statusFilter === "all" || eq.status === statusFilter;
    const matchesSearch =
      searchQuery === "" ||
      eq.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eq.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesStatus && matchesSearch;
  });

  const stats = {
    total: equipment.length,
    running: equipment.filter((e) => e.status === "running").length,
    idle: equipment.filter((e) => e.status === "idle").length,
    maintenance: equipment.filter((e) => e.status === "maintenance").length,
    offline: equipment.filter((e) => e.status === "offline").length,
    avgEfficiency:
      equipment.filter(e => e.status === "running").length > 0
        ? Math.round(
            equipment
              .filter(e => e.status === "running")
              .reduce((sum, e) => sum + e.efficiency, 0) /
              equipment.filter(e => e.status === "running").length
          )
        : 0,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Equipment Management"
        description="Track and manage all machines and equipment"
        actions={
          <Button asChild>
            <Link href="/production/equipment/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Equipment
            </Link>
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-bold">{stats.total}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Running</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold text-green-600">{stats.running}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Idle</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <span className="text-2xl font-bold text-yellow-600">{stats.idle}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Maintenance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-orange-600" />
              <span className="text-2xl font-bold text-orange-600">{stats.maintenance}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Offline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="text-2xl font-bold text-red-600">{stats.offline}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Avg Efficiency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Gauge className="h-5 w-5 text-purple-600" />
              <span className="text-2xl font-bold">{stats.avgEfficiency}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search equipment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="CNC">CNC Machine</SelectItem>
              <SelectItem value="WELDING">Welding</SelectItem>
              <SelectItem value="DRILL">Drill Press</SelectItem>
              <SelectItem value="PACKAGING">Packaging</SelectItem>
              <SelectItem value="ASSEMBLY">Assembly</SelectItem>
              <SelectItem value="TESTING">Testing</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="idle">Idle</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Equipment Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredEquipment.length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <Settings2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No equipment found</p>
            <p className="text-sm">Add your first equipment to get started</p>
            <Button asChild className="mt-4">
              <Link href="/production/equipment/new">
                <Plus className="h-4 w-4 mr-2" />
                Add Equipment
              </Link>
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEquipment.map((eq) => {
            const status = statusConfig[eq.status];
            const StatusIcon = status.icon;

            return (
              <Card key={eq.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{eq.name}</CardTitle>
                      <p className="text-sm text-muted-foreground font-mono">{eq.code}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn("flex items-center gap-1", status.textColor)}
                    >
                      <span className={cn("h-2 w-2 rounded-full", status.color)} />
                      {status.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Type & Work Center */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Type</span>
                    <span className="font-medium">{typeConfig[eq.type] || eq.type}</span>
                  </div>

                  {eq.workCenterName && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Work Center</span>
                      <Link
                        href={`/production/work-centers/${eq.workCenterId}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {eq.workCenterName}
                      </Link>
                    </div>
                  )}

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                    <div className="text-center p-2 bg-muted/50 rounded">
                      <div className="text-xs text-muted-foreground">Hours Running</div>
                      <div className="font-semibold">{eq.hoursRunning.toLocaleString()}h</div>
                    </div>
                    <div className="text-center p-2 bg-muted/50 rounded">
                      <div className="text-xs text-muted-foreground">Efficiency</div>
                      <div className={cn(
                        "font-semibold",
                        eq.efficiency >= 90 ? "text-green-600" :
                        eq.efficiency >= 70 ? "text-yellow-600" : "text-red-600"
                      )}>
                        {eq.efficiency}%
                      </div>
                    </div>
                  </div>

                  {/* Maintenance Info */}
                  <div className="flex items-center justify-between text-sm pt-2 border-t">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Next Maintenance</span>
                    </div>
                    <span className={cn(
                      "font-medium",
                      eq.nextMaintenance && new Date(eq.nextMaintenance) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                        ? "text-orange-600"
                        : ""
                    )}>
                      {eq.nextMaintenance ? new Date(eq.nextMaintenance).toLocaleDateString() : "N/A"}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1" asChild>
                      <Link href={`/production/equipment/${eq.id}`}>
                        View Details
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/production/equipment/${eq.id}/maintenance`}>
                        <Wrench className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
