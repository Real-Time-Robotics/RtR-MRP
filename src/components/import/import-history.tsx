'use client';

// src/components/import/import-history.tsx
// Import History Component - Shows past import sessions

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ChevronRight,
  RotateCcw,
  Loader2,
  Filter,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface ImportSession {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  detectedType: string;
  confidence: number;
  status: string;
  totalRows: number;
  successRows: number;
  failedRows: number;
  skippedRows: number;
  createdAt: string;
  completedAt: string | null;
  _count?: { logs: number };
}

interface ImportHistoryProps {
  onViewSession?: (sessionId: string) => void;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  ANALYZING: { label: 'Đang phân tích', icon: Clock, color: 'text-blue-600 bg-blue-50' },
  MAPPED: { label: 'Đã mapping', icon: CheckCircle, color: 'text-purple-600 bg-purple-50' },
  VALIDATING: { label: 'Đang kiểm tra', icon: Clock, color: 'text-amber-600 bg-amber-50' },
  IMPORTING: { label: 'Đang import', icon: Loader2, color: 'text-blue-600 bg-blue-50' },
  COMPLETED: { label: 'Hoàn thành', icon: CheckCircle, color: 'text-green-600 bg-green-50' },
  FAILED: { label: 'Thất bại', icon: XCircle, color: 'text-red-600 bg-red-50' },
  ROLLED_BACK: { label: 'Đã hoàn tác', icon: RotateCcw, color: 'text-orange-600 bg-orange-50' },
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  PARTS: 'Linh kiện',
  SUPPLIERS: 'Nhà cung cấp',
  INVENTORY: 'Tồn kho',
  BOM: 'BOM',
  PRODUCTS: 'Sản phẩm',
  CUSTOMERS: 'Khách hàng',
  PURCHASE_ORDERS: 'Đơn mua hàng',
  UNKNOWN: 'Không xác định',
};

export function ImportHistory({ onViewSession }: ImportHistoryProps) {
  const [sessions, setSessions] = useState<ImportSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');

  // Fetch import history
  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: '10',
        });

        if (statusFilter !== 'all') {
          params.append('status', statusFilter);
        }
        if (entityFilter !== 'all') {
          params.append('entityType', entityFilter);
        }

        const res = await fetch(`/api/import/history?${params}`);
        const data = await res.json();

        if (data.success) {
          setSessions(data.data.sessions);
          setTotalPages(data.data.totalPages);
        } else {
          setError(data.error);
        }
      } catch (err) {
        setError('Không thể tải lịch sử import');
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [page, statusFilter, entityFilter]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isLoading && sessions.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        <AlertCircle className="w-5 h-5" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Lọc:</span>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="COMPLETED">Hoàn thành</SelectItem>
            <SelectItem value="FAILED">Thất bại</SelectItem>
            <SelectItem value="IMPORTING">Đang import</SelectItem>
            <SelectItem value="ROLLED_BACK">Đã hoàn tác</SelectItem>
          </SelectContent>
        </Select>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Loại dữ liệu" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả loại</SelectItem>
            <SelectItem value="PARTS">Linh kiện</SelectItem>
            <SelectItem value="SUPPLIERS">Nhà cung cấp</SelectItem>
            <SelectItem value="BOM">BOM</SelectItem>
            <SelectItem value="INVENTORY">Tồn kho</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Session List */}
      {sessions.length === 0 ? (
        <div className="text-center py-12">
          <FileSpreadsheet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Chưa có lịch sử import</h3>
          <p className="text-muted-foreground">
            Các phiên import của bạn sẽ hiển thị tại đây
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => {
            const statusConfig = STATUS_CONFIG[session.status] || STATUS_CONFIG.ANALYZING;
            const StatusIcon = statusConfig.icon;

            return (
              <div
                key={session.id}
                className="flex items-center gap-4 p-4 bg-white border rounded-lg hover:border-blue-300 transition-colors cursor-pointer"
                onClick={() => onViewSession?.(session.id)}
              >
                {/* File icon */}
                <div className="flex-shrink-0 w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                  <FileSpreadsheet className="w-6 h-6 text-blue-600" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium truncate">{session.fileName}</h4>
                    <Badge variant="outline" className="text-xs">
                      {ENTITY_TYPE_LABELS[session.detectedType] || session.detectedType}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    <span>{formatFileSize(session.fileSize)}</span>
                    <span>{session.totalRows} dòng</span>
                    <span>
                      {format(new Date(session.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                {session.status === 'COMPLETED' && (
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-green-600 font-medium">{session.successRows}</div>
                      <div className="text-xs text-muted-foreground">Thành công</div>
                    </div>
                    {session.failedRows > 0 && (
                      <div className="text-center">
                        <div className="text-red-600 font-medium">{session.failedRows}</div>
                        <div className="text-xs text-muted-foreground">Lỗi</div>
                      </div>
                    )}
                    {session.skippedRows > 0 && (
                      <div className="text-center">
                        <div className="text-amber-600 font-medium">{session.skippedRows}</div>
                        <div className="text-xs text-muted-foreground">Bỏ qua</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Status badge */}
                <div
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm',
                    statusConfig.color
                  )}
                >
                  <StatusIcon
                    className={cn(
                      'w-4 h-4',
                      session.status === 'IMPORTING' && 'animate-spin'
                    )}
                  />
                  <span>{statusConfig.label}</span>
                </div>

                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || isLoading}
          >
            Trước
          </Button>
          <span className="text-sm text-muted-foreground">
            Trang {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || isLoading}
          >
            Sau
          </Button>
        </div>
      )}
    </div>
  );
}
