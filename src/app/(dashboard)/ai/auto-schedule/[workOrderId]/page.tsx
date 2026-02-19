'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Package,
  Factory,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  Loader2,
  Save,
  RotateCcw,
  Sparkles,
  ChevronRight,
  History,
  Settings,
  Edit2,
} from 'lucide-react';
import { format, addDays, differenceInDays, startOfWeek } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from 'sonner';

// =============================================================================
// TYPES
// =============================================================================

interface WorkOrderDetail {
  id: string;
  workOrderNumber: string;
  productName: string;
  productCode: string;
  quantity: number;
  unit: string;
  workCenterId: string;
  workCenterName: string;
  startDate: Date;
  endDate: Date;
  dueDate: Date;
  status: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'delayed';
  priority: number;
  progress: number;
  estimatedHours: number;
  actualHours?: number;
  hasConflict: boolean;
  conflicts: ConflictInfo[];
  history: ScheduleHistory[];
  alternatives: ScheduleAlternative[];
}

interface ConflictInfo {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  relatedWorkOrders: Array<{ id: string; workOrderNumber: string }>;
  suggestedAction: string;
}

interface ScheduleHistory {
  id: string;
  timestamp: Date;
  action: string;
  changedBy: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
}

interface ScheduleAlternative {
  id: string;
  workCenterId: string;
  workCenterName: string;
  startDate: Date;
  endDate: Date;
  utilization: number;
  impact: {
    onTimeRisk: number;
    conflictRisk: number;
    efficiencyGain: number;
  };
  aiScore: number;
  recommended: boolean;
}

// =============================================================================
// MOCK DATA
// =============================================================================

const generateMockWorkOrder = (id: string): WorkOrderDetail => {
  const startDate = addDays(new Date(), -2);
  const endDate = addDays(startDate, 4);
  const dueDate = addDays(startDate, 5);

  return {
    id,
    workOrderNumber: `WO-2026-${id.replace('wo-', '').padStart(4, '0')}`,
    productName: 'Bánh quy bơ cao cấp',
    productCode: 'BQB-001',
    quantity: 500,
    unit: 'thùng',
    workCenterId: 'wc-1',
    workCenterName: 'Dây chuyền 1',
    startDate,
    endDate,
    dueDate,
    status: 'scheduled',
    priority: 85,
    progress: 35,
    estimatedHours: 32,
    actualHours: 12,
    hasConflict: true,
    conflicts: [
      {
        id: 'conflict-1',
        type: 'overlap',
        severity: 'high',
        description: 'Chồng chéo với WO-2026-0005 trên cùng dây chuyền từ 21/01 - 23/01',
        relatedWorkOrders: [{ id: 'wo-5', workOrderNumber: 'WO-2026-0005' }],
        suggestedAction: 'Di chuyển sang Dây chuyền 2 hoặc delay 2 ngày',
      },
      {
        id: 'conflict-2',
        type: 'material_shortage',
        severity: 'medium',
        description: 'Nguyên liệu bơ có thể thiếu từ ngày 22/01',
        relatedWorkOrders: [],
        suggestedAction: 'Kiểm tra inventory hoặc đặt hàng gấp',
      },
    ],
    history: [
      {
        id: 'hist-1',
        timestamp: addDays(new Date(), -5),
        action: 'Tạo mới',
        changedBy: 'Nguyễn Văn A',
        newValue: 'Pending',
      },
      {
        id: 'hist-2',
        timestamp: addDays(new Date(), -3),
        action: 'Lên lịch',
        changedBy: 'Hệ thống Auto-Schedule',
        oldValue: 'Pending',
        newValue: 'Scheduled',
        reason: 'Thuật toán Hybrid AI',
      },
      {
        id: 'hist-3',
        timestamp: addDays(new Date(), -1),
        action: 'Thay đổi dây chuyền',
        changedBy: 'Trần Văn B',
        oldValue: 'Dây chuyền 3',
        newValue: 'Dây chuyền 1',
        reason: 'Dây chuyền 3 bảo trì',
      },
    ],
    alternatives: [
      {
        id: 'alt-1',
        workCenterId: 'wc-2',
        workCenterName: 'Dây chuyền 2',
        startDate: addDays(new Date(), 0),
        endDate: addDays(new Date(), 4),
        utilization: 78,
        impact: {
          onTimeRisk: 5,
          conflictRisk: 0,
          efficiencyGain: 8,
        },
        aiScore: 92,
        recommended: true,
      },
      {
        id: 'alt-2',
        workCenterId: 'wc-1',
        workCenterName: 'Dây chuyền 1',
        startDate: addDays(new Date(), 2),
        endDate: addDays(new Date(), 6),
        utilization: 85,
        impact: {
          onTimeRisk: 15,
          conflictRisk: 0,
          efficiencyGain: -2,
        },
        aiScore: 78,
        recommended: false,
      },
      {
        id: 'alt-3',
        workCenterId: 'wc-3',
        workCenterName: 'Dây chuyền 3',
        startDate: addDays(new Date(), 1),
        endDate: addDays(new Date(), 5),
        utilization: 65,
        impact: {
          onTimeRisk: 8,
          conflictRisk: 5,
          efficiencyGain: 12,
        },
        aiScore: 85,
        recommended: false,
      },
    ],
  };
};

// =============================================================================
// DETAIL PAGE COMPONENT
// =============================================================================

export default function WorkOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workOrderId = params.workOrderId as string;

  // State
  const [workOrder, setWorkOrder] = useState<WorkOrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedAlternative, setSelectedAlternative] = useState<string | null>(null);
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Edited values
  const [editedWorkCenter, setEditedWorkCenter] = useState<string>('');
  const [editedPriority, setEditedPriority] = useState<number>(0);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 600));
        const data = generateMockWorkOrder(workOrderId);
        setWorkOrder(data);
        setEditedWorkCenter(data.workCenterId);
        setEditedPriority(data.priority);
      } catch (error) {
        toast.error('Không thể tải thông tin work order');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [workOrderId]);

  // Apply alternative schedule
  const applyAlternative = async () => {
    if (!selectedAlternative || !workOrder) return;

    setIsSaving(true);
    setShowApplyDialog(false);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const alternative = workOrder.alternatives.find(a => a.id === selectedAlternative);
      if (alternative) {
        setWorkOrder(prev => prev ? {
          ...prev,
          workCenterId: alternative.workCenterId,
          workCenterName: alternative.workCenterName,
          startDate: alternative.startDate,
          endDate: alternative.endDate,
          hasConflict: false,
          conflicts: [],
        } : null);
      }

      toast.success('Đã áp dụng lịch trình mới');
      setSelectedAlternative(null);
    } catch (error) {
      toast.error('Không thể áp dụng lịch trình');
    } finally {
      setIsSaving(false);
    }
  };

  // Save changes
  const saveChanges = async () => {
    if (!workOrder) return;

    setIsSaving(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      toast.success('Đã lưu thay đổi');
    } catch (error) {
      toast.error('Không thể lưu thay đổi');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Đang tải thông tin...</p>
        </div>
      </div>
    );
  }

  if (!workOrder) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
        <XCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold">Không tìm thấy Work Order</h2>
        <p className="text-muted-foreground mb-4">ID: {workOrderId}</p>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Quay lại
        </Button>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      pending: { variant: 'outline', label: 'Chờ xử lý' },
      scheduled: { variant: 'secondary', label: 'Đã lên lịch' },
      in_progress: { variant: 'default', label: 'Đang thực hiện' },
      completed: { variant: 'default', label: 'Hoàn thành' },
      delayed: { variant: 'destructive', label: 'Trễ hạn' },
    };
    const { variant, label } = config[status] || { variant: 'outline', label: status };
    return <Badge variant={variant}>{label}</Badge>;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Quay lại">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{workOrder.workOrderNumber}</h1>
              {getStatusBadge(workOrder.status)}
              {workOrder.hasConflict && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Có xung đột
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              {workOrder.productName} • {workOrder.productCode}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push('/ai/auto-schedule')}>
            Xem Gantt Chart
          </Button>
          <Button onClick={saveChanges} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Lưu thay đổi
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Package className="h-4 w-4" />
                  <span className="text-sm">Số lượng</span>
                </div>
                <p className="text-xl font-bold">{workOrder.quantity.toLocaleString()} {workOrder.unit}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Thời gian</span>
                </div>
                <p className="text-xl font-bold">{workOrder.estimatedHours}h</p>
                {workOrder.actualHours && (
                  <p className="text-sm text-muted-foreground">Thực tế: {workOrder.actualHours}h</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm">Độ ưu tiên</span>
                </div>
                <p className="text-xl font-bold">{workOrder.priority}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">Tiến độ</span>
                </div>
                <p className="text-xl font-bold">{workOrder.progress}%</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Card>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <CardHeader className="pb-0">
                <TabsList>
                  <TabsTrigger value="overview">Tổng quan</TabsTrigger>
                  <TabsTrigger value="conflicts">
                    Xung đột ({workOrder.conflicts.length})
                  </TabsTrigger>
                  <TabsTrigger value="alternatives">
                    <Sparkles className="h-4 w-4 mr-1" />
                    Đề xuất AI
                  </TabsTrigger>
                  <TabsTrigger value="history">Lịch sử</TabsTrigger>
                </TabsList>
              </CardHeader>

              <CardContent className="pt-6">
                {/* Overview Tab */}
                <TabsContent value="overview" className="mt-0 space-y-6">
                  {/* Schedule Timeline */}
                  <div>
                    <h3 className="font-medium mb-3">Lịch trình</h3>
                    <div className="relative">
                      <div className="absolute left-4 top-6 bottom-6 w-0.5 bg-gray-200" />
                      <div className="space-y-4">
                        <div className="flex gap-4">
                          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center z-10">
                            <Calendar className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <p className="font-medium">Bắt đầu</p>
                            <p className="text-muted-foreground">
                              {format(workOrder.startDate, 'EEEE, dd/MM/yyyy', { locale: vi })}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-4">
                          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center z-10">
                            <CheckCircle className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <p className="font-medium">Kết thúc dự kiến</p>
                            <p className="text-muted-foreground">
                              {format(workOrder.endDate, 'EEEE, dd/MM/yyyy', { locale: vi })}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-4">
                          <div className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center z-10',
                            workOrder.endDate > workOrder.dueDate ? 'bg-red-500' : 'bg-emerald-500'
                          )}>
                            <Clock className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <p className="font-medium">Deadline</p>
                            <p className={cn(
                              'text-muted-foreground',
                              workOrder.endDate > workOrder.dueDate && 'text-red-500'
                            )}>
                              {format(workOrder.dueDate, 'EEEE, dd/MM/yyyy', { locale: vi })}
                              {workOrder.endDate > workOrder.dueDate && (
                                <span className="ml-2 text-red-500">
                                  (Trễ {differenceInDays(workOrder.endDate, workOrder.dueDate)} ngày)
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Work Center */}
                  <div>
                    <h3 className="font-medium mb-3">Trung tâm sản xuất</h3>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 flex-1">
                        <Factory className="h-5 w-5 text-muted-foreground" />
                        <Select value={editedWorkCenter} onValueChange={setEditedWorkCenter}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="wc-1">Dây chuyền 1</SelectItem>
                            <SelectItem value="wc-2">Dây chuyền 2</SelectItem>
                            <SelectItem value="wc-3">Dây chuyền 3</SelectItem>
                            <SelectItem value="wc-4">Dây chuyền 4</SelectItem>
                            <SelectItem value="wc-5">Dây chuyền 5</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Conflicts Tab */}
                <TabsContent value="conflicts" className="mt-0 space-y-4">
                  {workOrder.conflicts.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                      <p className="text-muted-foreground">Không có xung đột</p>
                    </div>
                  ) : (
                    workOrder.conflicts.map((conflict) => (
                      <div
                        key={conflict.id}
                        className={cn(
                          'rounded-lg border p-4',
                          getSeverityColor(conflict.severity)
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium capitalize">{conflict.type.replace('_', ' ')}</span>
                              <Badge variant="outline" className="text-xs capitalize">
                                {conflict.severity}
                              </Badge>
                            </div>
                            <p className="text-sm mb-2">{conflict.description}</p>
                            {conflict.relatedWorkOrders.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {conflict.relatedWorkOrders.map((wo) => (
                                  <Badge key={wo.id} variant="secondary" className="text-xs">
                                    {wo.workOrderNumber}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            <p className="text-sm font-medium">
                              💡 {conflict.suggestedAction}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>

                {/* Alternatives Tab */}
                <TabsContent value="alternatives" className="mt-0 space-y-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    AI đã phân tích và đề xuất các phương án lịch trình thay thế:
                  </p>
                  {workOrder.alternatives.map((alt) => (
                    <div
                      key={alt.id}
                      className={cn(
                        'rounded-lg border p-4 cursor-pointer transition-colors',
                        selectedAlternative === alt.id
                          ? 'border-primary bg-primary/5'
                          : 'hover:border-gray-300',
                        alt.recommended && 'ring-2 ring-green-500/50'
                      )}
                      onClick={() => setSelectedAlternative(alt.id)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium">{alt.workCenterName}</span>
                            {alt.recommended && (
                              <Badge className="bg-green-500">
                                <Sparkles className="h-3 w-3 mr-1" />
                                Khuyến nghị
                              </Badge>
                            )}
                            <Badge variant="outline">
                              AI Score: {alt.aiScore}%
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {format(alt.startDate, 'dd/MM', { locale: vi })} - {format(alt.endDate, 'dd/MM', { locale: vi })}
                            {' '}• Hiệu suất: {alt.utilization}%
                          </p>
                          <div className="flex gap-4 mt-2 text-sm">
                            <span className={alt.impact.onTimeRisk > 10 ? 'text-red-500' : 'text-green-500'}>
                              Rủi ro trễ: {alt.impact.onTimeRisk}%
                            </span>
                            <span className={alt.impact.conflictRisk > 0 ? 'text-orange-500' : 'text-green-500'}>
                              Rủi ro xung đột: {alt.impact.conflictRisk}%
                            </span>
                            <span className={alt.impact.efficiencyGain > 0 ? 'text-green-500' : 'text-red-500'}>
                              Hiệu quả: {alt.impact.efficiencyGain > 0 ? '+' : ''}{alt.impact.efficiencyGain}%
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>
                    </div>
                  ))}

                  {selectedAlternative && (
                    <Button
                      className="w-full mt-4"
                      onClick={() => setShowApplyDialog(true)}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Áp dụng phương án đã chọn
                    </Button>
                  )}
                </TabsContent>

                {/* History Tab */}
                <TabsContent value="history" className="mt-0 space-y-4">
                  <div className="space-y-4">
                    {workOrder.history.map((item, index) => (
                      <div key={item.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                            <History className="h-4 w-4 text-gray-600" />
                          </div>
                          {index < workOrder.history.length - 1 && (
                            <div className="w-0.5 h-full bg-gray-200 mt-2" />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="flex items-center justify-between">
                            <p className="font-medium">{item.action}</p>
                            <span className="text-sm text-muted-foreground">
                              {format(item.timestamp, 'dd/MM/yyyy HH:mm', { locale: vi })}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{item.changedBy}</p>
                          {item.oldValue && item.newValue && (
                            <p className="text-sm mt-1">
                              <span className="line-through text-red-500">{item.oldValue}</span>
                              {' → '}
                              <span className="text-green-600">{item.newValue}</span>
                            </p>
                          )}
                          {item.reason && (
                            <p className="text-sm text-muted-foreground italic mt-1">
                              Lý do: {item.reason}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>

        {/* Right Column - Quick Actions */}
        <div className="space-y-4">
          {/* Quick Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Thông tin nhanh</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Trạng thái</span>
                {getStatusBadge(workOrder.status)}
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dây chuyền</span>
                <span className="font-medium">{workOrder.workCenterName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Độ ưu tiên</span>
                <span className="font-medium">{workOrder.priority}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Thời gian còn lại</span>
                <span className="font-medium">
                  {differenceInDays(workOrder.dueDate, new Date())} ngày
                </span>
              </div>

              <Separator />

              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Tiến độ</span>
                  <span className="font-medium">{workOrder.progress}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${workOrder.progress}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Hành động</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <Edit2 className="h-4 w-4 mr-2" />
                Chỉnh sửa thông tin
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <RotateCcw className="h-4 w-4 mr-2" />
                Reschedule
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Settings className="h-4 w-4 mr-2" />
                Cài đặt nâng cao
              </Button>
            </CardContent>
          </Card>

          {/* Conflict Summary */}
          {workOrder.hasConflict && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-red-700 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Cảnh báo xung đột
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-red-600 mb-3">
                  Phát hiện {workOrder.conflicts.length} xung đột cần giải quyết
                </p>
                <Button
                  size="sm"
                  variant="destructive"
                  className="w-full"
                  onClick={() => setActiveTab('conflicts')}
                >
                  Xem và giải quyết
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Apply Alternative Dialog */}
      <AlertDialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Áp dụng lịch trình mới?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn sắp thay đổi lịch trình của work order {workOrder.workOrderNumber}.
              Hành động này sẽ cập nhật dây chuyền sản xuất và thời gian thực hiện.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={applyAlternative}>
              Áp dụng
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
