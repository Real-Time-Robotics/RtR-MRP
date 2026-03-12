'use client';

// src/components/import/import-history.tsx
// Import History Component - Shows past import sessions with rollback support

import { useState, useEffect, useCallback } from 'react';
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
  Search,
  MoreHorizontal,
  Eye,
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
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ImportDetailDialog } from './import-detail-dialog';
import { toast } from 'sonner';

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
  COMPLETED_WITH_ERRORS: { label: 'Có lỗi', icon: AlertCircle, color: 'text-amber-600 bg-amber-50' },
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
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Rollback state
  const [rollbackSession, setRollbackSession] = useState<ImportSession | null>(null);
  const [isRollingBack, setIsRollingBack] = useState(false);

  // Detail dialog state
  const [detailSessionId, setDetailSessionId] = useState<string | null>(null);

  // Action dropdown state
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  // Fetch import history
  const fetchHistory = useCallback(async () => {
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
        let filteredSessions = data.data.sessions;
        // Client-side search by file name
        if (searchQuery.trim()) {
          filteredSessions = filteredSessions.filter((s: ImportSession) =>
            s.fileName.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }
        setSessions(filteredSessions);
        setTotalPages(data.data.totalPages);
        setTotalCount(data.data.total);
      } else {
        setError(data.error);
      }
    } catch {
      setError('Không thể tải lịch sử import');
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter, entityFilter]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Handle rollback
  const handleRollback = async () => {
    if (!rollbackSession) return;

    setIsRollingBack(true);
    try {
      const res = await fetch('/api/import/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: rollbackSession.id }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(`Đã hoàn tác ${data.data.recordsDeleted} bản ghi`);
        setRollbackSession(null);
        fetchHistory(); // Refresh list
      } else {
        toast.error(data.error || 'Hoàn tác thất bại');
      }
    } catch {
      toast.error('Hoàn tác thất bại');
    } finally {
      setIsRollingBack(false);
    }
  };

  const canRollback = (status: string) => {
    return status === 'COMPLETED' || status === 'COMPLETED_WITH_ERRORS';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Compute stats from current page (clearly labeled)
  const stats = {
    total: totalCount,
    successRate: sessions.length > 0
      ? Math.round((sessions.filter(s => s.status === 'COMPLETED' || s.status === 'COMPLETED_WITH_ERRORS').length / sessions.length) * 100)
      : 0,
    totalRowsImported: sessions.reduce((acc, s) => acc + (s.successRows || 0), 0),
    failedImports: sessions.filter(s => s.status === 'FAILED').length,
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
      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-2xl font-bold text-blue-700">{stats.total}</div>
          <div className="text-sm text-blue-600">Tổng imports</div>
        </div>
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="text-2xl font-bold text-green-700">{stats.successRate}%</div>
          <div className="text-sm text-green-600">Tỉ lệ thành công</div>
        </div>
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="text-2xl font-bold text-purple-700">{stats.totalRowsImported}</div>
          <div className="text-sm text-purple-600">Dòng đã import</div>
        </div>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-2xl font-bold text-red-700">{stats.failedImports}</div>
          <div className="text-sm text-red-600">Import lỗi</div>
        </div>
      </div>

      {/* Toolbar: Search + Filters */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <div className="relative w-48 lg:w-56">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Tìm theo tên file..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="h-8 w-auto min-w-[100px] text-xs gap-1 px-2.5">
            <SelectValue placeholder="Trang thai" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="COMPLETED">Hoàn thành</SelectItem>
            <SelectItem value="FAILED">Thất bại</SelectItem>
            <SelectItem value="IMPORTING">Đang import</SelectItem>
            <SelectItem value="ROLLED_BACK">Đã hoàn tác</SelectItem>
          </SelectContent>
        </Select>
        <Select value={entityFilter} onValueChange={(v) => { setEntityFilter(v); setPage(1); }}>
          <SelectTrigger className="h-8 w-auto min-w-[100px] text-xs gap-1 px-2.5">
            <SelectValue placeholder="Loai du lieu" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả loại</SelectItem>
            <SelectItem value="PARTS">Linh kiện</SelectItem>
            <SelectItem value="SUPPLIERS">Nhà cung cấp</SelectItem>
            <SelectItem value="BOM">BOM</SelectItem>
            <SelectItem value="INVENTORY">Tồn kho</SelectItem>
            <SelectItem value="PRODUCTS">Sản phẩm</SelectItem>
            <SelectItem value="CUSTOMERS">Khách hàng</SelectItem>
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
                className="flex items-center gap-4 p-4 bg-white border rounded-lg hover:border-blue-300 transition-colors"
              >
                {/* File icon */}
                <div className="flex-shrink-0 w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                  <FileSpreadsheet className="w-6 h-6 text-blue-600" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setDetailSessionId(session.id)}>
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
                {(session.status === 'COMPLETED' || session.status === 'COMPLETED_WITH_ERRORS') && (
                  <div className="hidden sm:flex items-center gap-3 text-sm">
                    <div className="text-center">
                      <div className="text-green-600 font-medium">{session.successRows}</div>
                      <div className="text-xs text-muted-foreground">OK</div>
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

                {/* Actions dropdown */}
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setOpenActionId(openActionId === session.id ? null : session.id)}
                    onKeyDown={(e) => { if (e.key === 'Escape') setOpenActionId(null); }}
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>

                  {openActionId === session.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setOpenActionId(null)} onKeyDown={(e) => { if (e.key === 'Escape') setOpenActionId(null); }} />
                      <div className="absolute right-0 top-full mt-1 z-20 bg-white border rounded-lg shadow-lg py-1 min-w-[160px]">
                        <button
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-50"
                          onClick={() => {
                            setDetailSessionId(session.id);
                            setOpenActionId(null);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                          Xem chi tiết
                        </button>
                        {canRollback(session.status) && (
                          <button
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                            onClick={() => {
                              setRollbackSession(session);
                              setOpenActionId(null);
                            }}
                          >
                            <RotateCcw className="w-4 h-4" />
                            Hoàn tác (Rollback)
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
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

      {/* Rollback Confirm Dialog */}
      <ConfirmDialog
        isOpen={rollbackSession !== null}
        onClose={() => setRollbackSession(null)}
        onConfirm={handleRollback}
        title="Hoàn tác Import"
        description={
          rollbackSession
            ? `Thao tác này sẽ xoá ${rollbackSession.successRows} bản ghi đã import từ file "${rollbackSession.fileName}". Không thể hoàn tác sau khi thực hiện.`
            : ''
        }
        confirmLabel="Hoàn tác"
        variant="danger"
        isLoading={isRollingBack}
      />

      {/* Detail Dialog */}
      <ImportDetailDialog
        isOpen={detailSessionId !== null}
        sessionId={detailSessionId}
        onClose={() => setDetailSessionId(null)}
      />
    </div>
  );
}
