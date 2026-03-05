'use client';

// src/components/import/import-detail-dialog.tsx
// Import Detail Dialog - Shows session metadata and row-level logs

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  X,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  GitMerge,
  SkipForward,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ImportLog {
  id: string;
  rowNumber: number;
  status: string;
  entityType: string;
  entityId: string | null;
  data: Record<string, unknown>;
  errors: string[];
  createdAt: string;
}

interface ImportSessionDetail {
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
  columnMapping: Record<string, string>;
  createdAt: string;
  completedAt: string | null;
  startedAt: string | null;
  rollbackAt: string | null;
  logs: ImportLog[];
}

interface ImportDetailDialogProps {
  isOpen: boolean;
  sessionId: string | null;
  onClose: () => void;
}

const LOG_STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  SUCCESS: { label: 'Thanh cong', icon: CheckCircle, color: 'text-green-600 bg-green-50' },
  FAILED: { label: 'Loi', icon: XCircle, color: 'text-red-600 bg-red-50' },
  SKIPPED: { label: 'Bo qua', icon: SkipForward, color: 'text-amber-600 bg-amber-50' },
  DUPLICATE: { label: 'Trung lap', icon: AlertTriangle, color: 'text-orange-600 bg-orange-50' },
  MERGED: { label: 'Da gop', icon: GitMerge, color: 'text-purple-600 bg-purple-50' },
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

export function ImportDetailDialog({ isOpen, sessionId, onClose }: ImportDetailDialogProps) {
  const [session, setSession] = useState<ImportSessionDetail | null>(null);
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(1);
  const [logsStatusFilter, setLogsStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (!isOpen || !sessionId) return;

    const fetchSession = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/import/history?sessionId=${sessionId}`);
        const data = await res.json();
        if (data.success) {
          setSession(data.data);
          setLogs(data.data.logs || []);
        }
      } catch {
        // Error handled silently
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();
  }, [isOpen, sessionId]);

  // Fetch logs with pagination/filter
  useEffect(() => {
    if (!isOpen || !sessionId) return;

    const fetchLogs = async () => {
      const params = new URLSearchParams({
        sessionId,
        logsOnly: 'true',
        page: String(logsPage),
        pageSize: '50',
      });
      if (logsStatusFilter !== 'all') {
        params.append('status', logsStatusFilter);
      }

      try {
        const res = await fetch(`/api/import/history?${params}`);
        const data = await res.json();
        if (data.success) {
          setLogs(data.data.logs);
          setLogsTotalPages(data.data.totalPages);
        }
      } catch {
        // Error handled silently
      }
    };

    fetchLogs();
  }, [isOpen, sessionId, logsPage, logsStatusFilter]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        role="presentation"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">
                  {session?.fileName || 'Chi tiet Import'}
                </h2>
                {session && (
                  <p className="text-sm text-muted-foreground">
                    {ENTITY_TYPE_LABELS[session.detectedType] || session.detectedType}
                    {' · '}
                    {formatFileSize(session.fileSize)}
                    {' · '}
                    {format(new Date(session.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Dong"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : session ? (
            <>
              {/* Stats */}
              <div className="grid grid-cols-4 gap-4 p-6 border-b">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-700">{session.totalRows}</div>
                  <div className="text-xs text-blue-600">Tong dong</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-700">{session.successRows}</div>
                  <div className="text-xs text-green-600">Thanh cong</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-700">{session.failedRows}</div>
                  <div className="text-xs text-red-600">Loi</div>
                </div>
                <div className="text-center p-3 bg-amber-50 rounded-lg">
                  <div className="text-2xl font-bold text-amber-700">{session.skippedRows}</div>
                  <div className="text-xs text-amber-600">Bo qua</div>
                </div>
              </div>

              {/* Logs section */}
              <div className="flex-1 overflow-hidden flex flex-col p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Chi tiet theo dong</h3>
                  <Select value={logsStatusFilter} onValueChange={(v) => { setLogsStatusFilter(v); setLogsPage(1); }}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Trang thai" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tat ca</SelectItem>
                      <SelectItem value="SUCCESS">Thanh cong</SelectItem>
                      <SelectItem value="FAILED">Loi</SelectItem>
                      <SelectItem value="SKIPPED">Bo qua</SelectItem>
                      <SelectItem value="DUPLICATE">Trung lap</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Logs table */}
                <div className="flex-1 overflow-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-left px-4 py-2 font-medium">Dong</th>
                        <th className="text-left px-4 py-2 font-medium">Trang thai</th>
                        <th className="text-left px-4 py-2 font-medium">Entity ID</th>
                        <th className="text-left px-4 py-2 font-medium">Du lieu</th>
                        <th className="text-left px-4 py-2 font-medium">Loi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {logs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-8 text-muted-foreground">
                            Khong co du lieu
                          </td>
                        </tr>
                      ) : (
                        logs.map((log) => {
                          const statusConfig = LOG_STATUS_CONFIG[log.status] || LOG_STATUS_CONFIG.FAILED;
                          const StatusIcon = statusConfig.icon;
                          const dataPreview = Object.entries(log.data || {})
                            .slice(0, 3)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(', ');

                          return (
                            <tr key={log.id} className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-xs">#{log.rowNumber}</td>
                              <td className="px-4 py-2">
                                <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs', statusConfig.color)}>
                                  <StatusIcon className="w-3 h-3" />
                                  {statusConfig.label}
                                </span>
                              </td>
                              <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                                {log.entityId || '-'}
                              </td>
                              <td className="px-4 py-2 text-xs text-muted-foreground max-w-[200px] truncate">
                                {dataPreview || '-'}
                              </td>
                              <td className="px-4 py-2 text-xs text-red-600 max-w-[200px]">
                                {log.errors?.length > 0 ? log.errors.join('; ') : '-'}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Logs pagination */}
                {logsTotalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLogsPage((p) => Math.max(1, p - 1))}
                      disabled={logsPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Trang {logsPage} / {logsTotalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLogsPage((p) => Math.min(logsTotalPages, p + 1))}
                      disabled={logsPage === logsTotalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              Khong tim thay phien import
            </div>
          )}
        </div>
      </div>
    </>
  );
}
