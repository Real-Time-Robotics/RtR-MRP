'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  History,
  ChevronDown,
  ChevronRight,
  User,
  Clock,
  RefreshCw,
  AlertTriangle,
  Plus,
  Pencil,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  FileText,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ChangeComparisonDialog } from './change-comparison-dialog';

interface AuditHistoryEntry {
  id: string;
  action: string;
  userName: string | null;
  userId: string | null;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  changeSummary: string | null;
  timestamp: string;
  ipAddress: string | null;
}

export interface EntityAuditHistoryProps {
  entityType: string;
  entityId: string;
  maxEntries?: number;
  className?: string;
  title?: string;
  showTitle?: boolean;
}

const actionConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  CREATE: { icon: Plus, color: 'text-green-600 bg-green-100', label: 'Tạo mới' },
  UPDATE: { icon: Pencil, color: 'text-blue-600 bg-blue-100', label: 'Cập nhật' },
  DELETE: { icon: Trash2, color: 'text-red-600 bg-red-100', label: 'Xóa' },
  READ: { icon: Eye, color: 'text-gray-600 bg-gray-100', label: 'Xem' },
  APPROVE: { icon: CheckCircle, color: 'text-green-600 bg-green-100', label: 'Phê duyệt' },
  REJECT: { icon: XCircle, color: 'text-red-600 bg-red-100', label: 'Từ chối' },
  STATUS_CHANGE: { icon: RefreshCw, color: 'text-purple-600 bg-purple-100', label: 'Đổi trạng thái' },
};

export function EntityAuditHistory({
  entityType,
  entityId,
  maxEntries = 10,
  className,
  title,
  showTitle = true,
}: EntityAuditHistoryProps) {
  const [entries, setEntries] = useState<AuditHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [comparisonEntry, setComparisonEntry] = useState<AuditHistoryEntry | null>(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        action: 'history',
        entityType,
        entityId,
      });
      const res = await fetch(`/api/compliance/audit?${params}`);
      if (!res.ok) throw new Error('Failed to load history');

      const data = await res.json();
      const historyEntries = (data.entries || []).slice(0, maxEntries);
      setEntries(historyEntries);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId, maxEntries]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const toggleEntry = (id: string) => {
    setExpandedEntries((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'S';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const hasChanges = (entry: AuditHistoryEntry) => {
    return entry.oldValue || entry.newValue;
  };

  if (loading) {
    return (
      <Card className={className}>
        {showTitle && (
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="w-4 h-4" />
              {title || 'Lịch sử thay đổi'}
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        {showTitle && (
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="w-4 h-4" />
              {title || 'Lịch sử thay đổi'}
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-500" />
            <p className="text-sm">{error}</p>
            <Button variant="outline" size="sm" onClick={loadHistory} className="mt-2">
              Thử lại
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        {showTitle && (
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="w-4 h-4" />
                {title || 'Lịch sử thay đổi'}
                {entries.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {entries.length}
                  </Badge>
                )}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={loadHistory}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
        )}
        <CardContent>
          {entries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Chưa có lịch sử thay đổi</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-4 bottom-4 w-px bg-border" />

              {/* Timeline entries */}
              <div className="space-y-4">
                {entries.map((entry, index) => {
                  const config = actionConfig[entry.action] || {
                    icon: RefreshCw,
                    color: 'text-gray-600 bg-gray-100',
                    label: entry.action,
                  };
                  const Icon = config.icon;
                  const isExpanded = expandedEntries.has(entry.id);
                  const showExpand = hasChanges(entry);

                  return (
                    <div key={entry.id} className="relative flex gap-3 ml-1">
                      {/* Timeline dot */}
                      <div
                        className={cn(
                          'relative z-10 flex items-center justify-center w-8 h-8 rounded-full',
                          config.color
                        )}
                      >
                        <Icon className="w-4 h-4" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pb-2">
                        <Collapsible open={isExpanded}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="text-xs">
                                  {config.label}
                                </Badge>
                                {entry.fieldName && (
                                  <span className="text-sm text-muted-foreground">
                                    • {entry.fieldName}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm mt-1">
                                {entry.changeSummary || `${config.label} ${entityType}`}
                              </p>
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Avatar className="w-4 h-4">
                                    <AvatarFallback className="text-[8px]">
                                      {getInitials(entry.userName)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span>{entry.userName || 'System'}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span title={format(new Date(entry.timestamp), 'dd/MM/yyyy HH:mm:ss')}>
                                    {formatDistanceToNow(new Date(entry.timestamp), {
                                      addSuffix: true,
                                      locale: vi,
                                    })}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {showExpand && (
                              <CollapsibleTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleEntry(entry.id)}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="w-4 h-4" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4" />
                                  )}
                                </Button>
                              </CollapsibleTrigger>
                            )}
                          </div>

                          <CollapsibleContent>
                            {showExpand && (
                              <div className="mt-3 p-3 bg-muted rounded-lg space-y-2">
                                {entry.oldValue && (
                                  <div>
                                    <span className="text-xs font-medium text-muted-foreground">
                                      Giá trị cũ:
                                    </span>
                                    <pre className="mt-1 text-xs bg-red-50 dark:bg-red-950 p-2 rounded overflow-x-auto">
                                      {formatValue(entry.oldValue)}
                                    </pre>
                                  </div>
                                )}
                                {entry.newValue && (
                                  <div>
                                    <span className="text-xs font-medium text-muted-foreground">
                                      Giá trị mới:
                                    </span>
                                    <pre className="mt-1 text-xs bg-green-50 dark:bg-green-950 p-2 rounded overflow-x-auto">
                                      {formatValue(entry.newValue)}
                                    </pre>
                                  </div>
                                )}
                                {entry.oldValue && entry.newValue && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-2"
                                    onClick={() => setComparisonEntry(entry)}
                                  >
                                    So sánh chi tiết
                                  </Button>
                                )}
                              </div>
                            )}
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comparison Dialog */}
      <ChangeComparisonDialog
        open={!!comparisonEntry}
        onOpenChange={() => setComparisonEntry(null)}
        oldValue={comparisonEntry?.oldValue || null}
        newValue={comparisonEntry?.newValue || null}
        fieldName={comparisonEntry?.fieldName || undefined}
        timestamp={comparisonEntry?.timestamp}
        userName={comparisonEntry?.userName || undefined}
      />
    </>
  );
}

function formatValue(value: string): string {
  try {
    const parsed = JSON.parse(value);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return value;
  }
}

export default EntityAuditHistory;
