"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, ShieldCheck, ShieldAlert } from "lucide-react";
import { AutonomyPart } from "@/hooks/cost-optimization/use-autonomy";

interface PartsTableProps {
  parts: AutonomyPart[];
}

const statusConfig: Record<string, { label: string; color: string }> = {
  MAKE: {
    label: "Tu SX",
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  IN_DEVELOPMENT: {
    label: "Dang PT",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  EVALUATE: {
    label: "Danh gia",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  BUY_STRATEGIC: {
    label: "Mua CL",
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  },
  BUY_REQUIRED: {
    label: "Phai mua",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
};

const sourceLabels: Record<string, string> = {
  MAKE_SOURCE: "Tu lam",
  BUY_SOURCE: "Mua",
  HYBRID: "Ket hop",
};

export function PartsTable({ parts }: PartsTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    let result = parts;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.partNumber.toLowerCase().includes(q) ||
          p.partName.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      result = result.filter((p) => p.status === statusFilter);
    }
    return result;
  }, [parts, search, statusFilter]);

  return (
    <Card>
      <CardHeader className="pb-2 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <CardTitle className="text-sm font-medium">Chi tiet parts</CardTitle>
          <div className="flex-1" />
          <div className="relative w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Tim part..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-auto min-w-[100px] text-xs gap-1 px-2.5">
              <SelectValue placeholder="Trang thai" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tat ca</SelectItem>
              <SelectItem value="MAKE">Tu san xuat</SelectItem>
              <SelectItem value="IN_DEVELOPMENT">Dang phat trien</SelectItem>
              <SelectItem value="EVALUATE">Danh gia</SelectItem>
              <SelectItem value="BUY_STRATEGIC">Mua chien luoc</SelectItem>
              <SelectItem value="BUY_REQUIRED">Phai mua</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Part</TableHead>
              <TableHead>Trang thai</TableHead>
              <TableHead>Nguon</TableHead>
              <TableHead className="text-right">Chi phi</TableHead>
              <TableHead className="text-center">Nang luc %</TableHead>
              <TableHead className="text-center">R&D %</TableHead>
              <TableHead className="text-center">NDAA</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Khong co du lieu
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => {
                const sc = statusConfig[p.status] || {
                  label: p.status,
                  color: "",
                };
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div>
                        <span className="font-mono text-xs">{p.partNumber}</span>
                        <div className="text-xs text-muted-foreground truncate max-w-[180px]">
                          {p.partName}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={sc.color}>{sc.label}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {sourceLabels[p.currentSource] || p.currentSource}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      ${p.currentCost.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center gap-1 justify-center">
                        <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${p.makeCapabilityPercent}%` }}
                          />
                        </div>
                        <span className="text-xs">{p.makeCapabilityPercent}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {p.rdProgressPercent != null ? (
                        <span className="text-xs">{p.rdProgressPercent}%</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {p.ndaaCompliant ? (
                        <ShieldCheck className="w-4 h-4 text-green-500 mx-auto" />
                      ) : (
                        <ShieldAlert className="w-4 h-4 text-red-400 mx-auto" />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
