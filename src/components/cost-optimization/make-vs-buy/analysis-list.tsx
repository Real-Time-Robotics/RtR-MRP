"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Plus, Search, FileText, ExternalLink } from "lucide-react";
import { useMakeVsBuyList } from "@/hooks/cost-optimization/use-make-vs-buy";

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ANALYSIS_DRAFT: { label: "Nhap", variant: "outline" },
  ANALYSIS_SUBMITTED: { label: "Da nop", variant: "secondary" },
  ANALYSIS_UNDER_REVIEW: { label: "Dang xem xet", variant: "default" },
  ANALYSIS_DECIDED: { label: "Da quyet dinh", variant: "default" },
  ANALYSIS_ARCHIVED: { label: "Luu tru", variant: "secondary" },
};

const recommendationColors: Record<string, string> = {
  STRONG_MAKE: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  CONSIDER_MAKE: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  NEUTRAL: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  CONSIDER_BUY: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  STRONG_BUY: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const recommendationLabels: Record<string, string> = {
  STRONG_MAKE: "Tu san xuat",
  CONSIDER_MAKE: "Can nhac tu lam",
  NEUTRAL: "Trung lap",
  CONSIDER_BUY: "Can nhac mua",
  STRONG_BUY: "Mua ngoai",
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function AnalysisList() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useMakeVsBuyList({
    page,
    pageSize: 20,
    status: statusFilter !== "all" ? statusFilter : undefined,
    search: search || undefined,
  });

  const analyses = data?.data || [];
  const pagination = data?.pagination;

  return (
    <Card>
      <CardHeader className="pb-2 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <CardTitle className="text-sm font-medium flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            Danh sach phan tich
          </CardTitle>
          <div className="flex-1" />
          <div className="relative w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Tim theo part number, ten..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-auto min-w-[100px] text-xs gap-1 px-2.5">
              <SelectValue placeholder="Trang thai" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tat ca</SelectItem>
              <SelectItem value="ANALYSIS_DRAFT">Nhap</SelectItem>
              <SelectItem value="ANALYSIS_SUBMITTED">Da nop</SelectItem>
              <SelectItem value="ANALYSIS_UNDER_REVIEW">Dang xem xet</SelectItem>
              <SelectItem value="ANALYSIS_DECIDED">Da quyet dinh</SelectItem>
            </SelectContent>
          </Select>
          <Link href="/cost-optimization/make-vs-buy/new">
            <Button size="sm" className="h-8 text-xs px-3">
              <Plus className="w-3.5 h-3.5 mr-1" />
              Tao moi
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground">Dang tai...</div>
        ) : analyses.length === 0 ? (
          <div className="py-12 text-center">
            <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Chua co phan tich nao</p>
            <Link href="/cost-optimization/make-vs-buy/new">
              <Button variant="outline" className="mt-3" size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Tao phan tich dau tien
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Part</TableHead>
                  <TableHead className="text-right">Gia mua</TableHead>
                  <TableHead className="text-right">Chi phi tu lam</TableHead>
                  <TableHead className="text-right">Tiet kiem</TableHead>
                  <TableHead className="text-center">Diem</TableHead>
                  <TableHead>Khuyen nghi</TableHead>
                  <TableHead>Trang thai</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {analyses.map((a) => {
                  const st = statusLabels[a.status] || { label: a.status, variant: "outline" as const };
                  return (
                    <TableRow key={a.id}>
                      <TableCell>
                        <div>
                          <span className="font-mono text-xs">{a.part.partNumber}</span>
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {a.part.name}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatCurrency(a.buyPrice)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatCurrency(a.makeCostEstimate)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`font-mono text-sm ${
                            a.savingsPerUnit > 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {formatCurrency(a.savingsPerUnit)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-semibold">{a.overallScore.toFixed(1)}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={recommendationColors[a.recommendation] || ""}>
                          {recommendationLabels[a.recommendation] || a.recommendation}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <Link href={`/cost-optimization/make-vs-buy/${a.id}`}>
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

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <span className="text-sm text-muted-foreground">
                  {pagination.total} ket qua
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Truoc
                  </Button>
                  <span className="text-sm">
                    {page}/{pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage(page + 1)}
                  >
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
