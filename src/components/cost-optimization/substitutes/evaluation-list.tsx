"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Plus, Search, FileText, ExternalLink, ShieldCheck, ShieldAlert,
} from "lucide-react";
import { useSubstituteList } from "@/hooks/cost-optimization/use-substitutes";

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  IDENTIFIED: { label: "Da tim thay", variant: "outline" },
  EVALUATING: { label: "Dang danh gia", variant: "secondary" },
  SUB_TESTING: { label: "Dang test", variant: "default" },
  SUB_APPROVED: { label: "Da duyet", variant: "default" },
  SUB_REJECTED: { label: "Tu choi", variant: "destructive" },
  IMPLEMENTED: { label: "Da trien khai", variant: "default" },
};

const riskColors: Record<string, string> = {
  LOW: "bg-green-100 text-green-800",
  MEDIUM: "bg-yellow-100 text-yellow-800",
  HIGH: "bg-orange-100 text-orange-800",
  CRITICAL: "bg-red-100 text-red-800",
};

export function EvaluationList() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useSubstituteList({
    page,
    pageSize: 20,
    status: statusFilter !== "all" ? statusFilter : undefined,
    search: search || undefined,
  });

  const evaluations = data?.data || [];
  const pagination = data?.pagination;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Danh sach danh gia thay the
          </CardTitle>
          <Link href="/cost-optimization/substitutes/new">
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Tim thay the
            </Button>
          </Link>
        </div>
        <div className="flex items-center gap-1.5 mt-1.5">
          <div className="relative w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Tim theo part number..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="h-8 w-auto min-w-[100px] text-xs gap-1 px-2.5">
              <SelectValue placeholder="Trang thai" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tat ca</SelectItem>
              <SelectItem value="IDENTIFIED">Da tim thay</SelectItem>
              <SelectItem value="EVALUATING">Dang danh gia</SelectItem>
              <SelectItem value="SUB_TESTING">Dang test</SelectItem>
              <SelectItem value="SUB_APPROVED">Da duyet</SelectItem>
              <SelectItem value="SUB_REJECTED">Tu choi</SelectItem>
              <SelectItem value="IMPLEMENTED">Da trien khai</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground">Dang tai...</div>
        ) : evaluations.length === 0 ? (
          <div className="py-12 text-center">
            <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Chua co danh gia nao</p>
            <Link href="/cost-optimization/substitutes/new">
              <Button variant="outline" className="mt-3" size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Tim linh kien thay the
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Original</TableHead>
                  <TableHead>Thay the</TableHead>
                  <TableHead className="text-right">Tiet kiem</TableHead>
                  <TableHead className="text-center">Tuong thich</TableHead>
                  <TableHead className="text-center">NDAA</TableHead>
                  <TableHead>Rui ro</TableHead>
                  <TableHead>Trang thai</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {evaluations.map((e) => {
                  const st = statusLabels[e.status] || { label: e.status, variant: "outline" as const };
                  return (
                    <TableRow key={e.id}>
                      <TableCell>
                        <span className="font-mono text-xs">{e.originalPart.partNumber}</span>
                        <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                          {e.originalPart.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs">{e.substitutePart.partNumber}</span>
                        <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                          {e.substitutePart.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-mono text-sm font-bold ${
                          e.savingsPercent > 0 ? "text-green-600" : "text-red-600"
                        }`}>
                          {e.savingsPercent.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {e.compatibilityScore}%
                      </TableCell>
                      <TableCell className="text-center">
                        {e.ndaaCompliant ? (
                          <ShieldCheck className="w-4 h-4 text-green-500 mx-auto" />
                        ) : (
                          <ShieldAlert className="w-4 h-4 text-red-400 mx-auto" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={riskColors[e.riskLevel] || ""}>
                          {e.riskLevel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <Link href={`/cost-optimization/substitutes/${e.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <span className="text-sm text-muted-foreground">{pagination.total} ket qua</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    Truoc
                  </Button>
                  <span className="text-sm">{page}/{pagination.totalPages}</span>
                  <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>
                    Sau
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
