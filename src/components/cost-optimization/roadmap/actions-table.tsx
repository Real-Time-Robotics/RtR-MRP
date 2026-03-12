"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Factory,
  ArrowRightLeft,
  Handshake,
  Wrench,
  Pencil,
  MapPin,
  ChevronRight,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface ActionRow {
  id: string;
  description: string;
  type: string;
  part?: { partNumber: string } | null;
  savingsPerUnit: number;
  annualSavings: number;
  status: string;
  progressPercent: number;
  owner: { name: string };
  targetCompletionDate: string;
}

interface ActionsTableProps {
  targetId: string;
  phaseId?: string;
  actions: ActionRow[];
}

const TYPE_CONFIG: Record<
  string,
  { icon: React.ElementType; label: string; color: string }
> = {
  MAKE_VS_BUY: { icon: Factory, label: "Make/Buy", color: "text-blue-600" },
  SUBSTITUTE: { icon: ArrowRightLeft, label: "Substitute", color: "text-green-600" },
  SUPPLIER_OPTIMIZE: { icon: Handshake, label: "Supplier", color: "text-purple-600" },
  PROCESS_IMPROVE: { icon: Wrench, label: "Process", color: "text-orange-600" },
  DESIGN_CHANGE: { icon: Pencil, label: "Design", color: "text-pink-600" },
  LOCALIZE: { icon: MapPin, label: "Localize", color: "text-teal-600" },
};

const STATUS_BADGE: Record<string, string> = {
  IDEA: "bg-gray-100 text-gray-700",
  APPROVED: "bg-blue-100 text-blue-700",
  IN_PROGRESS_ACTION: "bg-yellow-100 text-yellow-700",
  TESTING_ACTION: "bg-purple-100 text-purple-700",
  COMPLETED_ACTION: "bg-green-100 text-green-700",
  CANCELLED_ACTION: "bg-red-100 text-red-700",
  ON_HOLD: "bg-gray-100 text-gray-700",
};

function formatStatusLabel(status: string): string {
  return status
    .replace("_ACTION", "")
    .replace(/_/g, " ");
}

export function ActionsTable({ targetId, phaseId, actions }: ActionsTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filtered = actions.filter((a) => {
    const matchesSearch =
      a.description.toLowerCase().includes(search.toLowerCase()) ||
      (a.part?.partNumber &&
        a.part.partNumber.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === "all" || a.status === statusFilter;
    const matchesType = typeFilter === "all" || a.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const totalSavings = filtered.reduce((sum, a) => sum + a.annualSavings, 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 flex-wrap">
        <div className="relative w-48 lg:w-56">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Tim kiem actions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-auto min-w-[100px] text-xs gap-1 px-2.5">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tat ca status</SelectItem>
            <SelectItem value="IDEA">Idea</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="IN_PROGRESS_ACTION">In Progress</SelectItem>
            <SelectItem value="TESTING_ACTION">Testing</SelectItem>
            <SelectItem value="COMPLETED_ACTION">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-8 w-auto min-w-[100px] text-xs gap-1 px-2.5">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tat ca types</SelectItem>
            <SelectItem value="MAKE_VS_BUY">Make/Buy</SelectItem>
            <SelectItem value="SUBSTITUTE">Substitute</SelectItem>
            <SelectItem value="SUPPLIER_OPTIMIZE">Supplier</SelectItem>
            <SelectItem value="PROCESS_IMPROVE">Process</SelectItem>
            <SelectItem value="DESIGN_CHANGE">Design</SelectItem>
            <SelectItem value="LOCALIZE">Localize</SelectItem>
          </SelectContent>
        </Select>
        <Button asChild>
          <Link
            href={`/cost-optimization/roadmap/${targetId}/actions/new${
              phaseId ? `?phaseId=${phaseId}` : ""
            }`}
          >
            <Plus className="w-4 h-4 mr-1" />
            Them Action
          </Link>
        </Button>
      </div>

      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
        <span className="text-sm text-muted-foreground">
          {filtered.length} actions
        </span>
        <span className="text-sm font-medium">
          Tong savings:{" "}
          <span className="text-green-600">{formatCurrency(totalSavings)}/nam</span>
        </span>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Action</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Savings</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Chua co action nao
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((action) => {
                const typeConfig =
                  TYPE_CONFIG[action.type] || TYPE_CONFIG.PROCESS_IMPROVE;
                const TypeIcon = typeConfig.icon;

                return (
                  <TableRow key={action.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{action.description}</div>
                        {action.part && (
                          <div className="text-xs text-muted-foreground font-mono">
                            {action.part.partNumber}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <TypeIcon
                          className={cn("w-4 h-4", typeConfig.color)}
                        />
                        <span className="text-sm">{typeConfig.label}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="font-medium text-green-600">
                        {formatCurrency(action.savingsPerUnit)}/unit
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatCurrency(action.annualSavings)}/nam
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          STATUS_BADGE[action.status] || "bg-gray-100 text-gray-700"
                        }
                      >
                        {formatStatusLabel(action.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 w-24">
                        <Progress
                          value={action.progressPercent}
                          className="h-2"
                        />
                        <span className="text-xs w-8">
                          {action.progressPercent}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{action.owner.name}</span>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link
                          href={`/cost-optimization/roadmap/${targetId}/actions/${action.id}`}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
