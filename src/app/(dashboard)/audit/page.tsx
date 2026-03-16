'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Search,
  Download,
  Shield,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Filter,
  CheckCircle,
  XCircle,
  FileText,
  User,
  Clock,
  AlertTriangle,
  Activity,
} from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { EntityTooltip } from '@/components/entity-tooltip';
import { clientLogger } from '@/lib/client-logger';

const ENTITY_TYPE_TO_TOOLTIP: Record<string, 'part' | 'supplier' | 'po' | 'so' | 'wo' | 'customer'> = {
  PART: 'part',
  PURCHASE_ORDER: 'po',
  SALES_ORDER: 'so',
  WORK_ORDER: 'wo',
  CUSTOMER: 'customer',
  SUPPLIER: 'supplier',
};

interface AuditEntry {
  id: string;
  userId: string | null;
  userName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  changeSummary: string | null;
  ipAddress: string | null;
  timestamp: string;
  isSecurityEvent: boolean;
  isComplianceEvent: boolean;
  entryHash: string;
  chainHash: string;
}

interface IntegrityResult {
  valid: boolean;
  entriesChecked: number;
  brokenAt?: string;
  error?: string;
}

const ACTIONS = [
  { value: 'all', label: 'Tất cả hành động' },
  { value: 'CREATE', label: 'Tạo mới' },
  { value: 'READ', label: 'Xem' },
  { value: 'UPDATE', label: 'Cập nhật' },
  { value: 'DELETE', label: 'Xóa' },
  { value: 'EXPORT', label: 'Xuất file' },
  { value: 'LOGIN', label: 'Đăng nhập' },
  { value: 'LOGOUT', label: 'Đăng xuất' },
  { value: 'LOGIN_FAILED', label: 'Đăng nhập thất bại' },
  { value: 'PASSWORD_CHANGE', label: 'Đổi mật khẩu' },
];

const ENTITY_TYPES = [
  { value: 'all', label: 'Tất cả loại' },
  { value: 'PURCHASE_ORDER', label: 'Đơn mua hàng' },
  { value: 'SALES_ORDER', label: 'Đơn bán hàng' },
  { value: 'WORK_ORDER', label: 'Lệnh sản xuất' },
  { value: 'PART', label: 'Vật tư' },
  { value: 'INVENTORY', label: 'Tồn kho' },
  { value: 'NCR', label: 'NCR' },
  { value: 'CAPA', label: 'CAPA' },
  { value: 'USER', label: 'Người dùng' },
  { value: 'Security', label: 'Bảo mật' },
];

const actionColors: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  READ: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  UPDATE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  DELETE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  EXPORT: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  LOGIN: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  LOGOUT: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  LOGIN_FAILED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  PASSWORD_CHANGE: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
};

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  // Filters
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityTypeFilter, setEntityTypeFilter] = useState('all');
  const [securityOnly, setSecurityOnly] = useState(false);
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();

  // Integrity
  const [integrityResult, setIntegrityResult] = useState<IntegrityResult | null>(null);
  const [verifying, setVerifying] = useState(false);

  // Export
  const [exporting, setExporting] = useState(false);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (actionFilter !== 'all') params.set('actionFilter', actionFilter);
      if (entityTypeFilter !== 'all') params.set('entityType', entityTypeFilter);
      if (securityOnly) params.set('isSecurityEvent', 'true');
      if (fromDate) params.set('fromDate', fromDate.toISOString());
      if (toDate) params.set('toDate', toDate.toISOString());
      params.set('limit', pageSize.toString());
      params.set('offset', ((page - 1) * pageSize).toString());

      const res = await fetch(`/api/compliance/audit?${params}`);
      if (!res.ok) throw new Error('Failed to fetch audit entries');

      const data = await res.json();
      setEntries(data.entries || []);
      setTotal(data.total || 0);
    } catch (error) {
      clientLogger.error('Failed to load audit entries:', error);
    } finally {
      setLoading(false);
    }
  }, [search, actionFilter, entityTypeFilter, securityOnly, fromDate, toDate, page, pageSize]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const verifyIntegrity = async () => {
    setVerifying(true);
    try {
      const params = new URLSearchParams({ action: 'verify' });
      if (fromDate) params.set('fromDate', fromDate.toISOString());
      if (toDate) params.set('toDate', toDate.toISOString());

      const res = await fetch(`/api/compliance/audit?${params}`);
      if (!res.ok) throw new Error('Verification failed');

      const result = await res.json();
      setIntegrityResult(result);
    } catch (error) {
      setIntegrityResult({
        valid: false,
        entriesChecked: 0,
        error: error instanceof Error ? error.message : 'Verification failed',
      });
    } finally {
      setVerifying(false);
    }
  };

  const exportCSV = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (actionFilter !== 'all') params.set('actionFilter', actionFilter);
      if (entityTypeFilter !== 'all') params.set('entityType', entityTypeFilter);
      if (securityOnly) params.set('isSecurityEvent', 'true');
      if (fromDate) params.set('fromDate', fromDate.toISOString());
      if (toDate) params.set('toDate', toDate.toISOString());
      params.set('limit', '10000'); // Export up to 10k records
      params.set('offset', '0');

      const res = await fetch(`/api/compliance/audit?${params}`);
      if (!res.ok) throw new Error('Export failed');

      const data = await res.json();
      const allEntries: AuditEntry[] = data.entries || [];

      // Generate CSV
      const headers = [
        'Thời gian',
        'Người dùng',
        'Hành động',
        'Loại đối tượng',
        'ID đối tượng',
        'Tóm tắt',
        'IP',
        'Sự kiện bảo mật',
        'Entry Hash',
      ];

      const rows = allEntries.map(entry => [
        format(new Date(entry.timestamp), 'yyyy-MM-dd HH:mm:ss'),
        entry.userName || entry.userId || 'System',
        entry.action,
        entry.entityType,
        entry.entityId || '',
        entry.changeSummary || '',
        entry.ipAddress || '',
        entry.isSecurityEvent ? 'Yes' : 'No',
        entry.entryHash,
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-log-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      clientLogger.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6" />
            Audit Log
          </h1>
          <p className="text-muted-foreground">
            Theo dõi và kiểm tra tất cả hoạt động trong hệ thống
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={verifyIntegrity}
            disabled={verifying}
          >
            {verifying ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Shield className="w-4 h-4 mr-2" />
            )}
            Kiểm tra tính toàn vẹn
          </Button>
          <Button
            onClick={exportCSV}
            disabled={exporting}
          >
            {exporting ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Xuất CSV
          </Button>
        </div>
      </div>

      {/* Integrity Status */}
      {integrityResult && (
        <Card className={cn(
          'border-2',
          integrityResult.valid
            ? 'border-success-500 bg-success-50 dark:bg-success-950'
            : 'border-danger-500 bg-danger-50 dark:bg-danger-950'
        )}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              {integrityResult.valid ? (
                <>
                  <ShieldCheck className="w-8 h-8 text-success-600" />
                  <div>
                    <p className="font-semibold text-success-700 dark:text-success-300">
                      Audit Trail toàn vẹn
                    </p>
                    <p className="text-sm text-success-600 dark:text-success-400">
                      Đã kiểm tra {integrityResult.entriesChecked.toLocaleString()} bản ghi - Không phát hiện thay đổi
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-8 h-8 text-danger-600" />
                  <div>
                    <p className="font-semibold text-danger-700 dark:text-danger-300">
                      Phát hiện vấn đề toàn vẹn
                    </p>
                    <p className="text-sm text-danger-600 dark:text-danger-400">
                      {integrityResult.error || `Lỗi tại bản ghi: ${integrityResult.brokenAt}`}
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Bộ lọc
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>

            {/* Action Filter */}
            <Select
              value={actionFilter}
              onValueChange={(v) => {
                setActionFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Hành động" />
              </SelectTrigger>
              <SelectContent>
                {ACTIONS.map((action) => (
                  <SelectItem key={action.value} value={action.value}>
                    {action.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Entity Type Filter */}
            <Select
              value={entityTypeFilter}
              onValueChange={(v) => {
                setEntityTypeFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Loại đối tượng" />
              </SelectTrigger>
              <SelectContent>
                {ENTITY_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Range */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {fromDate ? format(fromDate, 'dd/MM/yyyy', { locale: vi }) : 'Từ ngày'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={fromDate}
                  onSelect={(date) => {
                    setFromDate(date);
                    setPage(1);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {toDate ? format(toDate, 'dd/MM/yyyy', { locale: vi }) : 'Đến ngày'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={toDate}
                  onSelect={(date) => {
                    setToDate(date);
                    setPage(1);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Quick filters */}
          <div className="flex items-center gap-2 mt-4">
            <Button
              variant={securityOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setSecurityOnly(!securityOnly);
                setPage(1);
              }}
            >
              <Shield className="w-4 h-4 mr-1" />
              Sự kiện bảo mật
            </Button>
            {(search || actionFilter !== 'all' || entityTypeFilter !== 'all' || fromDate || toDate || securityOnly) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setActionFilter('all');
                  setEntityTypeFilter('all');
                  setSecurityOnly(false);
                  setFromDate(undefined);
                  setToDate(undefined);
                  setPage(1);
                }}
              >
                Xóa bộ lọc
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Kết quả ({total.toLocaleString()} bản ghi)
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={loadEntries} disabled={loading}>
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Không có bản ghi nào phù hợp</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[160px]">Thời gian</TableHead>
                      <TableHead className="w-[120px]">Người dùng</TableHead>
                      <TableHead className="w-[100px]">Hành động</TableHead>
                      <TableHead className="w-[120px]">Đối tượng</TableHead>
                      <TableHead>Tóm tắt</TableHead>
                      <TableHead className="w-[100px]">Trạng thái</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-mono text-sm">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            {format(new Date(entry.timestamp), 'dd/MM HH:mm:ss')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3 text-muted-foreground" />
                            <span className="truncate max-w-[100px]">
                              {entry.userName || 'System'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn('text-xs', actionColors[entry.action] || 'bg-gray-100')}>
                            {entry.action}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <span className="font-medium">{entry.entityType}</span>
                            {entry.entityId && ENTITY_TYPE_TO_TOOLTIP[entry.entityType] ? (
                              <EntityTooltip type={ENTITY_TYPE_TO_TOOLTIP[entry.entityType]} id={entry.entityId}>
                                <span className="text-muted-foreground block text-xs truncate max-w-[100px] cursor-help">
                                  {entry.entityId}
                                </span>
                              </EntityTooltip>
                            ) : entry.entityId ? (
                              <span className="text-muted-foreground block text-xs truncate max-w-[100px]">
                                {entry.entityId}
                              </span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm truncate max-w-[300px]">
                            {entry.changeSummary || '-'}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {entry.isSecurityEvent && (
                              <Badge variant="outline" className="text-xs border-orange-500 text-orange-600">
                                <Shield className="w-3 h-3 mr-1" />
                                Security
                              </Badge>
                            )}
                            {entry.isComplianceEvent && (
                              <Badge variant="outline" className="text-xs border-primary-500 text-primary-600">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Compliance
                              </Badge>
                            )}
                            {!entry.isSecurityEvent && !entry.isComplianceEvent && (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Trang {page} / {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Trước
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Sau
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
