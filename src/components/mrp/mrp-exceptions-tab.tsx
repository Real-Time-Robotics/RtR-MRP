'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  FileEdit,
  Package,
  Clock,
  Users,
  AlertOctagon,
} from 'lucide-react';
import Link from 'next/link';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface MRPExceptionItem {
  id: string;
  partId: string | null;
  partNumber: string | null;
  partDescription: string | null;
  details: {
    status: string;
    quantity: number | null;
    currentDate: string | null;
    suggestedDate: string | null;
  };
}

interface MRPExceptionGroup {
  type: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  message: string;
  suggestedAction: string | null;
  items: MRPExceptionItem[];
}

interface MRPExceptionsData {
  byType: MRPExceptionGroup[];
  total: number;
  counts: {
    critical: number;
    warning: number;
    info: number;
  };
}

interface MRPExceptionsTabProps {
  mrpRunId: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════════════════

const severityConfig = {
  CRITICAL: {
    icon: AlertOctagon,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-800',
    badgeColor: 'bg-red-500 hover:bg-red-600',
    iconColor: 'text-red-500',
    label: 'Nghiêm trọng',
  },
  WARNING: {
    icon: AlertTriangle,
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-800',
    badgeColor: 'bg-amber-500 hover:bg-amber-600',
    iconColor: 'text-amber-500',
    label: 'Cảnh báo',
  },
  INFO: {
    icon: Info,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-800',
    badgeColor: 'bg-blue-500 hover:bg-blue-600',
    iconColor: 'text-blue-500',
    label: 'Thông tin',
  },
};

const exceptionTypeConfig: Record<
  string,
  {
    label: string;
    icon: typeof Package;
    action?: string;
    actionLink?: (partId: string) => string;
  }
> = {
  MISSING_LEAD_TIME: {
    label: 'Thiếu Lead Time',
    icon: Clock,
    action: 'Cập nhật Part Planning',
    actionLink: (partId) => `/parts/${partId}?tab=planning`,
  },
  MAKE_NO_BOM: {
    label: 'MAKE item không có BOM',
    icon: Package,
    action: 'Tạo BOM',
    actionLink: (partId) => `/bom/new?productId=${partId}`,
  },
  DRAFT_BOM_ONLY: {
    label: 'BOM chưa release',
    icon: FileEdit,
    action: 'Release BOM',
  },
  CYCLE_DETECTED: {
    label: 'Phát hiện vòng lặp BOM',
    icon: AlertOctagon,
    action: 'Kiểm tra BOM',
  },
  NO_SUPPLIER: {
    label: 'Không có nhà cung cấp',
    icon: Users,
    action: 'Gán nhà cung cấp',
    actionLink: (partId) => `/parts/${partId}?tab=suppliers`,
  },
  SINGLE_SOURCE: {
    label: 'Rủi ro single source',
    icon: AlertTriangle,
    action: 'Tìm NCC thay thế',
  },
  INACTIVE_SUPPLIER: {
    label: 'NCC không hoạt động',
    icon: Users,
    action: 'Kiểm tra NCC',
  },
  EXPEDITE_REQUIRED: {
    label: 'Cần đẩy nhanh',
    icon: Clock,
  },
  STOCK_BLOCKED: {
    label: 'Tồn kho bị block',
    icon: Package,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

export function MRPExceptionsTab({ mrpRunId }: MRPExceptionsTabProps) {
  const [data, setData] = useState<MRPExceptionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchExceptions() {
      try {
        setLoading(true);
        const res = await fetch(`/api/mrp/${mrpRunId}/exceptions`);
        if (!res.ok) {
          throw new Error('Failed to fetch exceptions');
        }
        const json = await res.json();
        setData(json);

        // Auto-expand critical exceptions
        const criticalTypes = json.byType
          .filter((g: MRPExceptionGroup) => g.severity === 'CRITICAL')
          .map((g: MRPExceptionGroup) => g.type);
        setExpandedTypes(new Set(criticalTypes));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchExceptions();
  }, [mrpRunId]);

  const toggleExpand = (type: string) => {
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          <p className="text-sm text-muted-foreground">Đang tải exceptions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-3 text-red-500" />
          <p className="text-red-800 font-medium">Lỗi tải dữ liệu</p>
          <p className="text-sm text-red-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.total === 0) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-8 text-center">
          <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-500" />
          <p className="text-xl font-semibold text-green-800">
            Không có exception
          </p>
          <p className="text-sm text-green-600 mt-1">
            MRP run hoàn thành không phát hiện vấn đề nào
          </p>
        </CardContent>
      </Card>
    );
  }

  const criticalGroups = data.byType.filter((g) => g.severity === 'CRITICAL');
  const warningGroups = data.byType.filter((g) => g.severity === 'WARNING');
  const infoGroups = data.byType.filter((g) => g.severity === 'INFO');

  return (
    <div className="space-y-6">
      {/* Summary Bar */}
      <div className="flex flex-wrap gap-4 p-4 bg-muted/50 rounded-lg border">
        <div className="flex items-center gap-2">
          <AlertOctagon className="h-5 w-5 text-red-500" />
          <span className="font-medium">{data.counts.critical}</span>
          <span className="text-sm text-muted-foreground">Nghiêm trọng</span>
        </div>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <span className="font-medium">{data.counts.warning}</span>
          <span className="text-sm text-muted-foreground">Cảnh báo</span>
        </div>
        <div className="flex items-center gap-2">
          <Info className="h-5 w-5 text-blue-500" />
          <span className="font-medium">{data.counts.info}</span>
          <span className="text-sm text-muted-foreground">Thông tin</span>
        </div>
        <div className="ml-auto text-sm text-muted-foreground">
          Tổng: <span className="font-medium">{data.total}</span> exception(s)
        </div>
      </div>

      {/* Critical Exceptions */}
      {criticalGroups.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-red-700 flex items-center gap-2">
            <AlertOctagon className="h-4 w-4" />
            NGHIÊM TRỌNG ({data.counts.critical})
          </h3>
          {criticalGroups.map((group) => (
            <ExceptionGroupCard
              key={group.type}
              group={group}
              expanded={expandedTypes.has(group.type)}
              onToggle={() => toggleExpand(group.type)}
            />
          ))}
        </div>
      )}

      {/* Warning Exceptions */}
      {warningGroups.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-amber-700 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            CẢNH BÁO ({data.counts.warning})
          </h3>
          {warningGroups.map((group) => (
            <ExceptionGroupCard
              key={group.type}
              group={group}
              expanded={expandedTypes.has(group.type)}
              onToggle={() => toggleExpand(group.type)}
            />
          ))}
        </div>
      )}

      {/* Info Exceptions */}
      {infoGroups.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-blue-700 flex items-center gap-2">
            <Info className="h-4 w-4" />
            THÔNG TIN ({data.counts.info})
          </h3>
          {infoGroups.map((group) => (
            <ExceptionGroupCard
              key={group.type}
              group={group}
              expanded={expandedTypes.has(group.type)}
              onToggle={() => toggleExpand(group.type)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════════════════════

interface ExceptionGroupCardProps {
  group: MRPExceptionGroup;
  expanded: boolean;
  onToggle: () => void;
}

function ExceptionGroupCard({
  group,
  expanded,
  onToggle,
}: ExceptionGroupCardProps) {
  const config = severityConfig[group.severity];
  const typeConfig = exceptionTypeConfig[group.type] || {
    label: group.type,
    icon: AlertCircle,
  };
  const TypeIcon = typeConfig.icon;

  return (
    <Card className={`border-2 ${config.borderColor} ${config.bgColor}`}>
      <Collapsible open={expanded} onOpenChange={onToggle}>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="pb-2 cursor-pointer hover:bg-black/5 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TypeIcon className={`h-5 w-5 ${config.iconColor}`} />
                <div className="text-left">
                  <CardTitle className={`text-base ${config.textColor}`}>
                    {typeConfig.label}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground font-mono">
                    {group.type}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={config.badgeColor}>
                  {group.items.length} item(s)
                </Badge>
                {expanded ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-3">
            {/* Message */}
            <p className={`text-sm ${config.textColor}`}>{group.message}</p>

            {/* Parts List */}
            <div className="bg-white/60 rounded-lg p-3 border border-white">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Parts liên quan:
              </p>
              <div className="flex flex-wrap gap-2">
                {group.items.slice(0, 10).map((item) => (
                  <Link
                    key={item.id}
                    href={item.partId ? `/parts/${item.partId}` : '#'}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Badge
                      variant="secondary"
                      className="cursor-pointer hover:bg-secondary/80 transition-colors"
                    >
                      {item.partNumber || 'N/A'}
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Badge>
                  </Link>
                ))}
                {group.items.length > 10 && (
                  <Badge variant="outline">
                    +{group.items.length - 10} more
                  </Badge>
                )}
              </div>
            </div>

            {/* Suggested Action */}
            {(group.suggestedAction || typeConfig.action) && (
              <div className="flex items-center gap-2 pt-2 border-t border-white/50">
                <span className="text-xs text-muted-foreground">
                  Đề xuất:
                </span>
                {typeConfig.actionLink && group.items[0]?.partId ? (
                  <Link href={typeConfig.actionLink(group.items[0].partId)}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <FileEdit className="h-3 w-3 mr-1" />
                      {typeConfig.action || group.suggestedAction}
                    </Button>
                  </Link>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    disabled
                  >
                    <FileEdit className="h-3 w-3 mr-1" />
                    {typeConfig.action || group.suggestedAction}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export default MRPExceptionsTab;
