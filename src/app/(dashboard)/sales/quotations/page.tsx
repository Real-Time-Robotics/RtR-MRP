'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-500',
  sent: 'bg-blue-500',
  accepted: 'bg-green-500',
  rejected: 'bg-red-500',
  expired: 'bg-yellow-500',
  converted: 'bg-purple-500',
};

const statusLabels: Record<string, string> = {
  draft: 'Nháp',
  sent: 'Đã gửi',
  accepted: 'Chấp nhận',
  rejected: 'Từ chối',
  expired: 'Hết hạn',
  converted: 'Đã chuyển đổi',
};

export default function QuotationsPage() {
  const router = useRouter();
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 0,
  });

  const fetchQuotations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
      });
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/quotations?${params}`);
      const data = await res.json();

      if (data.data) {
        setQuotations(data.data);
        setPagination((prev) => ({
          ...prev,
          totalItems: data.pagination?.totalItems ?? 0,
          totalPages: data.pagination?.totalPages ?? 0,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch quotations:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, search, statusFilter]);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Báo giá</h1>
        <Button onClick={() => router.push('/sales/quotations/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Tạo báo giá
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 flex gap-2">
          <Input
            placeholder="Tìm kiếm theo mã, khách hàng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button variant="outline" onClick={handleSearch}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="draft">Nháp</SelectItem>
            <SelectItem value="sent">Đã gửi</SelectItem>
            <SelectItem value="accepted">Chấp nhận</SelectItem>
            <SelectItem value="rejected">Từ chối</SelectItem>
            <SelectItem value="expired">Hết hạn</SelectItem>
            <SelectItem value="converted">Đã chuyển đổi</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã báo giá</TableHead>
              <TableHead>Khách hàng</TableHead>
              <TableHead className="text-right">Tổng tiền</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Hiệu lực đến</TableHead>
              <TableHead>Ngày tạo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Đang tải...
                </TableCell>
              </TableRow>
            ) : quotations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Không có báo giá nào
                </TableCell>
              </TableRow>
            ) : (
              quotations.map((q) => (
                <TableRow
                  key={q.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/sales/quotations/${q.id}`)}
                >
                  <TableCell className="font-medium">{q.quoteNumber}</TableCell>
                  <TableCell>{q.customer?.name}</TableCell>
                  <TableCell className="text-right">{formatCurrency(q.totalAmount)}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[q.status]}>
                      {statusLabels[q.status] || q.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(q.validUntil)}</TableCell>
                  <TableCell>{formatDate(q.createdAt)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Trang {pagination.page} / {pagination.totalPages || 1} ({pagination.totalItems} báo giá)
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page <= 1}
            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
          >
            Trước
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
          >
            Sau
          </Button>
        </div>
      </div>
    </div>
  );
}
