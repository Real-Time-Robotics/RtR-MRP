"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, Loader2, AlertTriangle, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { NCRStatusBadge } from "@/components/quality/ncr-status-badge";
import { PriorityBadge } from "@/components/quality/priority-badge";
import { format } from "date-fns";
import { clientLogger } from '@/lib/client-logger';

interface NCR {
  id: string;
  ncrNumber: string;
  status: string;
  priority: string;
  title: string;
  source: string;
  lotNumber: string | null;
  quantityAffected: number;
  part?: { partNumber: string; name: string } | null;
  product?: { sku: string; name: string } | null;
  createdAt: string;
}

export default function NCRListPage() {
  const [ncrs, setNCRs] = useState<NCR[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const fetchNCRs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search) params.set("search", search);

      const res = await fetch(`/api/quality/ncr?${params}`);
      if (res.ok) {
        const result = await res.json();
        setNCRs(Array.isArray(result) ? result : (result.data || []));
      }
    } catch (error) {
      clientLogger.error("Failed to fetch NCRs:", error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchNCRs();
    }, search ? 300 : 0);
    return () => clearTimeout(timeoutId);
  }, [search, statusFilter, fetchNCRs]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Báo cáo không phù hợp (NCR)"
        description="Theo dõi và quản lý các lỗi chất lượng"
        actions={
          <Button asChild>
            <Link href="/quality/ncr/new">
              <Plus className="h-4 w-4 mr-2" />
              Tạo NCR
            </Link>
          </Button>
        }
      />

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Tìm kiếm..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
            {search && (
              <button onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="open">Mở</SelectItem>
              <SelectItem value="under_review">Đang xem xét</SelectItem>
              <SelectItem value="pending_disposition">Chờ xử lý</SelectItem>
              <SelectItem value="disposition_approved">Đã duyệt</SelectItem>
              <SelectItem value="in_rework">Đang sửa</SelectItem>
              <SelectItem value="completed">Hoàn thành</SelectItem>
              <SelectItem value="closed">Đã đóng</SelectItem>
            </SelectContent>
          </Select>

          <Badge variant="secondary" className="ml-auto">
            {ncrs.length} NCR
          </Badge>
        </div>
      </Card>

      {/* NCR List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : ncrs.length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Chưa có NCR nào</p>
            <p className="text-sm">NCR sẽ hiển thị khi có báo cáo lỗi chất lượng</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {ncrs.map((ncr) => (
            <Link key={ncr.id} href={`/quality/ncr/${ncr.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-lg">{ncr.ncrNumber}</CardTitle>
                      <PriorityBadge priority={ncr.priority} />
                    </div>
                    <NCRStatusBadge status={ncr.status} />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">{ncr.title}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span>Source: {ncr.source}</span>
                    {ncr.part && <span>Part: {ncr.part.partNumber}</span>}
                    {ncr.product && <span>Product: {ncr.product.sku}</span>}
                    {ncr.lotNumber && <span>Lot: {ncr.lotNumber}</span>}
                    <span>Qty: {ncr.quantityAffected}</span>
                    <span>{format(new Date(ncr.createdAt), "MMM d, yyyy")}</span>
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
