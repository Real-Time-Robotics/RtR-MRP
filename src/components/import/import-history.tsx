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
  ANALYZING: { label: 'Dang phan tich', icon: Clock, color: 'text-blue-600 bg-blue-50' },
  MAPPED: { label: 'Da mapping', icon: CheckCircle, color: 'text-purple-600 bg-purple-50' },
  VALIDATING: { label: 'Dang kiem tra', icon: Clock, color: 'text-amber-600 bg-amber-50' },
  IMPORTING: { label: 'Dang import', icon: Loader2, color: 'text-blue-600 bg-blue-50' },
  COMPLETED: { label: 'Hoan thanh', icon: CheckCircle, color: 'text-green-600 bg-green-50' },
  COMPLETED_WITH_ERRORS: { label: 'Co loi', icon: AlertCircle, color: 'text-amber-600 bg-amber-50' },
  FAILED: { label: 'That bai', icon: XCircle, color: 'text-red-600 bg-red-50' },
  ROLLED_BACK: { label: 'Da hoan tac', icon: RotateCcw, color: 'text-orange-600 bg-orange-50' },
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  PARTS: 'Linh kien',
  SUPPLIERS: 'Nha cung cap',
  INVENTORY: 'Ton kho',
  BOM: 'BOM',
  PRODUCTS: 'San pham',
  CUSTOMERS: 'Khach hang',
  PURCHASE_ORDERS: 'Don mua hang',
  UNKNOWN: 'Khong xac dinh',
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
      setError('Khong the tai lich su import');
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter, entityFilter, searchQuery]);

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
        toast.success(`Da hoan tac ${data.data.recordsDeleted} ban ghi`);
        setRollbackSession(null);
        fetchHistory(); // Refresh list
      } else {
        toast.error(data.error || 'Hoan tac that bai');
      }
    } catch {
      toast.error('Hoan tac that bai');
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

  // Compute stats
  const stats = {
    total: totalCount,
    successRate: totalCount > 0
      ? Math.round((sessions.filter(s => s.status === 'COMPLETED').length / Math.max(sessions.length, 1)) * 100)
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
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-2xl font-bold text-blue-700">{stats.total}</div>
          <div className="text-sm text-blue-600">Tong imports</div>
        </div>
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="text-2xl font-bold text-green-700">{stats.successRate}%</div>
          <div className="text-sm text-green-600">Ti le thanh cong</div>
        </div>
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="text-2xl font-bold text-purple-700">{stats.totalRowsImported}</div>
          <div className="text-sm text-purple-600">Dong da import</div>
        </div>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-2xl font-bold text-red-700">{stats.failedImports}</div>
          <div className="text-sm text-red-600">Import loi</div>
        </div>
      </div>

      {/* Toolbar: Search + Filters */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Tim theo ten file..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Trang thai" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tat ca trang thai</SelectItem>
              <SelectItem value="COMPLETED">Hoan thanh</SelectItem>
              <SelectItem value="FAILED">That bai</SelectItem>
              <SelectItem value="IMPORTING">Dang import</SelectItem>
              <SelectItem value="ROLLED_BACK">Da hoan tac</SelectItem>
            </SelectContent>
          </Select>
          <Select value={entityFilter} onValueChange={(v) => { setEntityFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Loai du lieu" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tat ca loai</SelectItem>
              <SelectItem value="PARTS">Linh kien</SelectItem>
              <SelectItem value="SUPPLIERS">Nha cung cap</SelectItem>
              <SelectItem value="BOM">BOM</SelectItem>
              <SelectItem value="INVENTORY">Ton kho</SelectItem>
              <SelectItem value="PRODUCTS">San pham</SelectItem>
              <SelectItem value="CUSTOMERS">Khach hang</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Session List */}
      {sessions.length === 0 ? (
        <div className="text-center py-12">
          <FileSpreadsheet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Chua co lich su import</h3>
          <p className="text-muted-foreground">
            Cac phien import cua ban se hien thi tai day
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
                    <span>{session.totalRows} dong</span>
                    <span>
                      {format(new Date(session.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                {(session.status === 'COMPLETED' || session.status === 'COMPLETED_WITH_ERRORS') && (
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-green-600 font-medium">{session.successRows}</div>
                      <div className="text-xs text-muted-foreground">OK</div>
                    </div>
                    {session.failedRows > 0 && (
                      <div className="text-center">
                        <div className="text-red-600 font-medium">{session.failedRows}</div>
                        <div className="text-xs text-muted-foreground">Loi</div>
                      </div>
                    )}
                    {session.skippedRows > 0 && (
                      <div className="text-center">
                        <div className="text-amber-600 font-medium">{session.skippedRows}</div>
                        <div className="text-xs text-muted-foreground">Bo qua</div>
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
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>

                  {openActionId === session.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setOpenActionId(null)} />
                      <div className="absolute right-0 top-full mt-1 z-20 bg-white border rounded-lg shadow-lg py-1 min-w-[160px]">
                        <button
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-50"
                          onClick={() => {
                            setDetailSessionId(session.id);
                            setOpenActionId(null);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                          Xem chi tiet
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
                            Hoan tac (Rollback)
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
            Truoc
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
        title="Hoan tac Import"
        description={
          rollbackSession
            ? `Thao tac nay se xoa ${rollbackSession.successRows} ban ghi da import tu file "${rollbackSession.fileName}". Khong the hoan tac sau khi thuc hien.`
            : ''
        }
        confirmLabel="Hoan tac"
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
