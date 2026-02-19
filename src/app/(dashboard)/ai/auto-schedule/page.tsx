'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
  Calendar,
  Play,
  Pause,
  RefreshCw,
  Settings,
  Sparkles,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Download,
  Upload,
  Filter,
  LayoutGrid,
  List,
  Maximize2,
  Minimize2,
  Zap,
  Target,
  TrendingUp,
  BarChart3,
  Layers,
  Search,
  ChevronDown,
  Save,
} from 'lucide-react';
import { format, addDays, startOfWeek } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from 'sonner';

// Import auto-schedule types
import type {
  GanttWorkOrder,
  GanttWorkCenter,
  ConflictAlertData,
  ScheduleSuggestionData,
  ViewMode,
} from '@/components/ai/auto-schedule';
import dynamic from 'next/dynamic';

// Lazy-load heavy auto-schedule visualization components (~1700 lines total)
const GanttChart = dynamic(
  () => import('@/components/ai/auto-schedule/gantt-chart').then(mod => mod.GanttChart),
  {
    ssr: false,
    loading: () => <div className="animate-pulse bg-muted h-96 rounded-lg" />,
  }
);

const CapacityOverview = dynamic(
  () => import('@/components/ai/auto-schedule/capacity-bar').then(mod => mod.CapacityOverview),
  {
    ssr: false,
    loading: () => <div className="animate-pulse bg-muted h-48 rounded-lg" />,
  }
);

const ConflictList = dynamic(
  () => import('@/components/ai/auto-schedule/conflict-alert').then(mod => mod.ConflictList),
  {
    ssr: false,
    loading: () => <div className="animate-pulse bg-muted h-48 rounded-lg" />,
  }
);

const SuggestionList = dynamic(
  () => import('@/components/ai/auto-schedule/schedule-suggestion').then(mod => mod.SuggestionList),
  {
    ssr: false,
    loading: () => <div className="animate-pulse bg-muted h-48 rounded-lg" />,
  }
);

// =============================================================================
// TYPES
// =============================================================================

interface ScheduleConfig {
  algorithm: 'greedy' | 'genetic' | 'constraint' | 'hybrid';
  optimizationGoal: 'minimize_makespan' | 'balance_utilization' | 'minimize_changeover' | 'maximize_ontime';
  respectPriority: boolean;
  allowOvertime: boolean;
  maxOvertimePercent: number;
  considerSetupTime: boolean;
  enableAISuggestions: boolean;
}

interface ScheduleMetrics {
  totalWorkOrders: number;
  scheduledWorkOrders: number;
  avgUtilization: number;
  conflictCount: number;
  onTimeRate: number;
  makespan: number;
  lastRunAt?: Date;
}

interface ScheduleRunHistory {
  id: string;
  runAt: Date;
  algorithm: string;
  duration: number;
  workOrdersProcessed: number;
  conflictsResolved: number;
  status: 'success' | 'partial' | 'failed';
}

// =============================================================================
// MOCK DATA GENERATORS
// =============================================================================

const generateMockWorkOrders = (): GanttWorkOrder[] => {
  const statuses: Array<'pending' | 'scheduled' | 'in_progress' | 'completed' | 'delayed'> = [
    'pending', 'scheduled', 'in_progress', 'completed', 'delayed'
  ];

  const products = [
    'Bánh quy bơ', 'Bánh mì sandwich', 'Bánh ngọt kem', 'Bánh tráng',
    'Bánh bông lan', 'Bánh cuốn', 'Bánh xèo mix', 'Bánh gạo'
  ];

  const workOrders: GanttWorkOrder[] = [];
  const startDate = startOfWeek(new Date(), { locale: vi });

  for (let i = 1; i <= 20; i++) {
    const orderStart = addDays(startDate, Math.floor(Math.random() * 14));
    const duration = 1 + Math.floor(Math.random() * 5);
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const hasConflict = Math.random() > 0.8;

    workOrders.push({
      id: `wo-${i}`,
      workOrderNumber: `WO-2026-${String(i).padStart(4, '0')}`,
      productName: products[Math.floor(Math.random() * products.length)],
      quantity: 100 + Math.floor(Math.random() * 900),
      workCenterId: `wc-${1 + Math.floor(Math.random() * 5)}`,
      workCenterName: `Dây chuyền ${1 + Math.floor(Math.random() * 5)}`,
      startDate: orderStart,
      endDate: addDays(orderStart, duration),
      status,
      priority: Math.floor(Math.random() * 100),
      progress: status === 'completed' ? 100 : status === 'in_progress' ? Math.floor(Math.random() * 80) : 0,
      hasConflict,
      conflictType: hasConflict ? 'Chồng chéo lịch' : undefined,
      dueDate: addDays(orderStart, duration + Math.floor(Math.random() * 3)),
    });
  }

  return workOrders;
};

const generateMockWorkCenters = (): GanttWorkCenter[] => {
  return [
    { id: 'wc-1', name: 'Dây chuyền 1', capacity: 100, utilization: 85 },
    { id: 'wc-2', name: 'Dây chuyền 2', capacity: 100, utilization: 92 },
    { id: 'wc-3', name: 'Dây chuyền 3', capacity: 100, utilization: 67 },
    { id: 'wc-4', name: 'Dây chuyền 4', capacity: 100, utilization: 78 },
    { id: 'wc-5', name: 'Dây chuyền 5', capacity: 100, utilization: 45 },
  ];
};

const generateMockConflicts = (): ConflictAlertData[] => {
  return [
    {
      id: 'conflict-1',
      type: 'overlap',
      severity: 'critical',
      title: 'Chồng chéo lịch trình',
      description: 'WO-2026-0001 và WO-2026-0005 được lên lịch cùng thời điểm trên Dây chuyền 1',
      affectedWorkOrders: [
        { id: 'wo-1', workOrderNumber: 'WO-2026-0001' },
        { id: 'wo-5', workOrderNumber: 'WO-2026-0005' },
      ],
      suggestedResolution: 'Dời WO-2026-0005 sang Dây chuyền 2 hoặc delay 2 ngày',
    },
    {
      id: 'conflict-2',
      type: 'overload',
      severity: 'high',
      title: 'Quá tải công suất',
      description: 'Dây chuyền 2 vượt 15% công suất trong tuần 3-4',
      affectedWorkOrders: [
        { id: 'wo-3', workOrderNumber: 'WO-2026-0003' },
        { id: 'wo-7', workOrderNumber: 'WO-2026-0007' },
        { id: 'wo-12', workOrderNumber: 'WO-2026-0012' },
      ],
      suggestedResolution: 'Phân bổ lại sang Dây chuyền 3 (hiệu suất 67%)',
    },
    {
      id: 'conflict-3',
      type: 'due_date_risk',
      severity: 'medium',
      title: 'Rủi ro trễ deadline',
      description: 'WO-2026-0008 có thể trễ hạn 1 ngày so với ngày giao hàng',
      affectedWorkOrders: [
        { id: 'wo-8', workOrderNumber: 'WO-2026-0008' },
      ],
      suggestedResolution: 'Tăng độ ưu tiên hoặc thêm ca làm việc',
    },
  ];
};

const generateMockSuggestions = (): ScheduleSuggestionData[] => {
  return [
    {
      id: 'sug-1',
      title: 'Cân bằng tải Dây chuyền 2 → 3',
      description: 'Di chuyển 3 work orders từ Dây chuyền 2 sang Dây chuyền 3 để cân bằng công suất',
      type: 'capacity_balance',
      confidence: 0.92,
      changes: [
        { workOrderId: 'wo-3', workOrderNumber: 'WO-2026-0003', field: 'workCenter', oldValue: 'Dây chuyền 2', newValue: 'Dây chuyền 3' },
        { workOrderId: 'wo-7', workOrderNumber: 'WO-2026-0007', field: 'workCenter', oldValue: 'Dây chuyền 2', newValue: 'Dây chuyền 3' },
      ],
      metrics: {
        utilizationImprovement: 12.5,
        conflictsResolved: 1,
      },
      reasoning: 'Dây chuyền 3 đang có công suất dư 33%, trong khi Dây chuyền 2 quá tải 15%. Di chuyển các đơn không ưu tiên cao sẽ tối ưu hiệu suất tổng thể.',
    },
    {
      id: 'sug-2',
      title: 'Tối ưu thứ tự sản xuất',
      description: 'Sắp xếp lại thứ tự để giảm thời gian setup giữa các sản phẩm tương tự',
      type: 'optimization',
      confidence: 0.87,
      changes: [
        { workOrderId: 'wo-2', workOrderNumber: 'WO-2026-0002', field: 'startDate', oldValue: new Date('2026-01-20'), newValue: new Date('2026-01-22') },
        { workOrderId: 'wo-4', workOrderNumber: 'WO-2026-0004', field: 'startDate', oldValue: new Date('2026-01-22'), newValue: new Date('2026-01-20') },
      ],
      metrics: {
        leadTimeReduction: 8.3,
      },
      reasoning: 'WO-2026-0002 và WO-2026-0004 cùng dòng sản phẩm. Đổi thứ tự giảm 2 giờ setup time.',
    },
    {
      id: 'sug-3',
      title: 'Giải quyết xung đột WO-0001/0005',
      description: 'Dời WO-2026-0005 sang slot trống để giải quyết overlap',
      type: 'conflict_resolution',
      confidence: 0.95,
      changes: [
        { workOrderId: 'wo-5', workOrderNumber: 'WO-2026-0005', field: 'startDate', oldValue: new Date('2026-01-19'), newValue: new Date('2026-01-21') },
      ],
      metrics: {
        conflictsResolved: 1,
        onTimeDeliveryImprovement: 5.2,
      },
      reasoning: 'Di chuyển WO-2026-0005 2 ngày không ảnh hưởng deadline và giải quyết hoàn toàn xung đột.',
    },
  ];
};

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export default function AutoSchedulePage() {
  const router = useRouter();

  // Data state
  const [workOrders, setWorkOrders] = useState<GanttWorkOrder[]>([]);
  const [workCenters, setWorkCenters] = useState<GanttWorkCenter[]>([]);
  const [conflicts, setConflicts] = useState<ConflictAlertData[]>([]);
  const [suggestions, setSuggestions] = useState<ScheduleSuggestionData[]>([]);
  const [metrics, setMetrics] = useState<ScheduleMetrics>({
    totalWorkOrders: 0,
    scheduledWorkOrders: 0,
    avgUtilization: 0,
    conflictCount: 0,
    onTimeRate: 0,
    makespan: 0,
  });

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isScheduling, setIsScheduling] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<GanttWorkOrder | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState('gantt');
  const [showSettings, setShowSettings] = useState(false);
  const [showConfirmRun, setShowConfirmRun] = useState(false);
  const [applyingSuggestionId, setApplyingSuggestionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Config state
  const [config, setConfig] = useState<ScheduleConfig>({
    algorithm: 'hybrid',
    optimizationGoal: 'balance_utilization',
    respectPriority: true,
    allowOvertime: false,
    maxOvertimePercent: 20,
    considerSetupTime: true,
    enableAISuggestions: true,
  });

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 800));

        const mockWorkOrders = generateMockWorkOrders();
        const mockWorkCenters = generateMockWorkCenters();
        const mockConflicts = generateMockConflicts();
        const mockSuggestions = generateMockSuggestions();

        setWorkOrders(mockWorkOrders);
        setWorkCenters(mockWorkCenters);
        setConflicts(mockConflicts);
        setSuggestions(mockSuggestions);

        // Calculate metrics
        const scheduled = mockWorkOrders.filter(wo => wo.status !== 'pending').length;
        const avgUtil = mockWorkCenters.reduce((sum, wc) => sum + wc.utilization, 0) / mockWorkCenters.length;
        const onTime = mockWorkOrders.filter(wo => !wo.dueDate || wo.endDate <= wo.dueDate).length;

        setMetrics({
          totalWorkOrders: mockWorkOrders.length,
          scheduledWorkOrders: scheduled,
          avgUtilization: avgUtil,
          conflictCount: mockConflicts.length,
          onTimeRate: (onTime / mockWorkOrders.length) * 100,
          makespan: 14,
          lastRunAt: new Date(),
        });
      } catch (error) {
        toast.error('Không thể tải dữ liệu lịch trình');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Run scheduling algorithm
  const runScheduling = async () => {
    setIsScheduling(true);
    setShowConfirmRun(false);

    try {
      toast.info('Đang chạy thuật toán lên lịch...');

      // Simulate scheduling run
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Refresh data
      const newWorkOrders = generateMockWorkOrders();
      setWorkOrders(newWorkOrders);

      // Update metrics
      setMetrics(prev => ({
        ...prev,
        scheduledWorkOrders: newWorkOrders.filter(wo => wo.status !== 'pending').length,
        conflictCount: Math.max(0, prev.conflictCount - 1),
        lastRunAt: new Date(),
      }));

      toast.success('Lên lịch hoàn tất! Đã tối ưu 20 work orders');
    } catch (error) {
      toast.error('Lỗi khi chạy thuật toán lên lịch');
    } finally {
      setIsScheduling(false);
    }
  };

  // Handle work order drag
  const handleWorkOrderDrag = useCallback((
    workOrderId: string,
    newStartDate: Date,
    newWorkCenterId: string
  ) => {
    setWorkOrders(prev => prev.map(wo => {
      if (wo.id === workOrderId) {
        const duration = Math.ceil((wo.endDate.getTime() - wo.startDate.getTime()) / (1000 * 60 * 60 * 24));
        return {
          ...wo,
          startDate: newStartDate,
          endDate: addDays(newStartDate, duration),
          workCenterId: newWorkCenterId,
          workCenterName: workCenters.find(wc => wc.id === newWorkCenterId)?.name || wo.workCenterName,
        };
      }
      return wo;
    }));

    toast.success('Đã cập nhật lịch trình work order');
  }, [workCenters]);

  // Handle suggestion accept
  const handleAcceptSuggestion = async (suggestionId: string) => {
    setApplyingSuggestionId(suggestionId);

    try {
      // Simulate applying suggestion
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Remove applied suggestion
      setSuggestions(prev => prev.filter(s => s.id !== suggestionId));

      // Update conflicts count
      const suggestion = suggestions.find(s => s.id === suggestionId);
      if (suggestion?.metrics.conflictsResolved) {
        setConflicts(prev => prev.slice(suggestion.metrics.conflictsResolved));
        setMetrics(prev => ({
          ...prev,
          conflictCount: Math.max(0, prev.conflictCount - (suggestion.metrics.conflictsResolved || 0)),
        }));
      }

      toast.success('Đã áp dụng đề xuất thành công');
    } catch (error) {
      toast.error('Không thể áp dụng đề xuất');
    } finally {
      setApplyingSuggestionId(null);
    }
  };

  // Handle conflict resolve
  const handleResolveConflict = async (conflictId: string) => {
    try {
      // Simulate resolving
      await new Promise(resolve => setTimeout(resolve, 1000));

      setConflicts(prev => prev.filter(c => c.id !== conflictId));
      setMetrics(prev => ({
        ...prev,
        conflictCount: Math.max(0, prev.conflictCount - 1),
      }));

      toast.success('Đã giải quyết xung đột');
    } catch (error) {
      toast.error('Không thể giải quyết xung đột');
    }
  };

  // Filter work orders
  const filteredWorkOrders = workOrders.filter(wo =>
    wo.workOrderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    wo.productName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Đang tải dữ liệu lịch trình...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'flex flex-col gap-4 p-4',
      isFullscreen && 'fixed inset-0 z-50 bg-background'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            Lên lịch tự động
          </h1>
          <p className="text-muted-foreground">
            Tối ưu lịch sản xuất với AI-powered scheduling
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(true)}
          >
            <Settings className="h-4 w-4 mr-1" />
            Cài đặt
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>

          <Button
            onClick={() => setShowConfirmRun(true)}
            disabled={isScheduling}
          >
            {isScheduling ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Đang lên lịch...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Chạy lên lịch
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Work Orders</p>
                <p className="text-2xl font-bold">{metrics.totalWorkOrders}</p>
              </div>
              <Layers className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Đã lên lịch</p>
                <p className="text-2xl font-bold">{metrics.scheduledWorkOrders}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Hiệu suất TB</p>
                <p className="text-2xl font-bold">{metrics.avgUtilization.toFixed(0)}%</p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Xung đột</p>
                <p className={cn(
                  'text-2xl font-bold',
                  metrics.conflictCount > 0 && 'text-red-500'
                )}>
                  {metrics.conflictCount}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Đúng hạn</p>
                <p className="text-2xl font-bold">{metrics.onTimeRate.toFixed(0)}%</p>
              </div>
              <Target className="h-8 w-8 text-emerald-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Makespan</p>
                <p className="text-2xl font-bold">{metrics.makespan} ngày</p>
              </div>
              <Clock className="h-8 w-8 text-cyan-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1">
        {/* Gantt Chart Area */}
        <div className="lg:col-span-3">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Biểu đồ Gantt</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Tìm work order..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 w-48 h-8"
                    />
                  </div>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-1" />
                    Lọc
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-1" />
                    Xuất
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <GanttChart
                workOrders={filteredWorkOrders}
                workCenters={workCenters}
                viewMode={viewMode}
                onWorkOrderClick={(wo) => {
                  setSelectedWorkOrder(wo);
                }}
                onWorkOrderDrag={handleWorkOrderDrag}
                className="h-[500px]"
              />
            </CardContent>
          </Card>
        </div>

        {/* Side Panel */}
        <div className="space-y-4">
          {/* Capacity Overview */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Công suất
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CapacityOverview
                workCenters={workCenters.map(wc => ({
                  id: wc.id,
                  name: wc.name,
                  utilization: wc.utilization,
                  scheduledHours: Math.round(wc.utilization * 8 * 5 / 100),
                  availableHours: 40,
                }))}
              />
            </CardContent>
          </Card>

          {/* Tabs for Conflicts & Suggestions */}
          <Card>
            <CardHeader className="pb-2">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="conflicts" className="text-sm">
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Xung đột ({conflicts.length})
                  </TabsTrigger>
                  <TabsTrigger value="suggestions" className="text-sm">
                    <Sparkles className="h-4 w-4 mr-1" />
                    AI ({suggestions.length})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent className="max-h-[400px] overflow-y-auto">
              {activeTab === 'conflicts' && (
                <ConflictList
                  conflicts={conflicts}
                  onResolve={handleResolveConflict}
                  onViewDetails={(id) => {
                    const conflict = conflicts.find(c => c.id === id);
                    if (conflict && conflict.affectedWorkOrders.length > 0) {
                      const wo = workOrders.find(w => w.id === conflict.affectedWorkOrders[0].id);
                      if (wo) setSelectedWorkOrder(wo);
                    }
                  }}
                />
              )}
              {activeTab === 'suggestions' && (
                <SuggestionList
                  suggestions={suggestions}
                  onAccept={handleAcceptSuggestion}
                  onReject={(id) => {
                    setSuggestions(prev => prev.filter(s => s.id !== id));
                    toast.info('Đã bỏ qua đề xuất');
                  }}
                  applyingSuggestionId={applyingSuggestionId}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Work Order Detail Sheet */}
      <Sheet open={!!selectedWorkOrder} onOpenChange={() => setSelectedWorkOrder(null)}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{selectedWorkOrder?.workOrderNumber}</SheetTitle>
            <SheetDescription>
              Chi tiết work order và lịch trình
            </SheetDescription>
          </SheetHeader>

          {selectedWorkOrder && (
            <div className="mt-6 space-y-6">
              {/* Product Info */}
              <div>
                <h4 className="font-medium mb-2">Thông tin sản phẩm</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Sản phẩm:</span>
                    <p className="font-medium">{selectedWorkOrder.productName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Số lượng:</span>
                    <p className="font-medium">{selectedWorkOrder.quantity.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Schedule Info */}
              <div>
                <h4 className="font-medium mb-2">Lịch trình</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Bắt đầu:</span>
                    <p className="font-medium">{format(selectedWorkOrder.startDate, 'dd/MM/yyyy', { locale: vi })}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Kết thúc:</span>
                    <p className="font-medium">{format(selectedWorkOrder.endDate, 'dd/MM/yyyy', { locale: vi })}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Trung tâm SX:</span>
                    <p className="font-medium">{selectedWorkOrder.workCenterName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Trạng thái:</span>
                    <Badge variant={
                      selectedWorkOrder.status === 'completed' ? 'default' :
                      selectedWorkOrder.status === 'in_progress' ? 'secondary' :
                      selectedWorkOrder.status === 'delayed' ? 'destructive' : 'outline'
                    }>
                      {selectedWorkOrder.status}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Priority & Progress */}
              <div>
                <h4 className="font-medium mb-2">Tiến độ</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Độ ưu tiên:</span>
                    <span className="font-medium">{selectedWorkOrder.priority}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Hoàn thành:</span>
                    <span className="font-medium">{selectedWorkOrder.progress}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${selectedWorkOrder.progress}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Conflict Warning */}
              {selectedWorkOrder.hasConflict && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">Có xung đột lịch trình</span>
                  </div>
                  <p className="mt-1 text-sm text-red-600">
                    {selectedWorkOrder.conflictType}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => {
                    router.push(`/ai/auto-schedule/${selectedWorkOrder.id}`);
                  }}
                >
                  Xem chi tiết
                </Button>
                <Button variant="outline">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Cài đặt lên lịch</DialogTitle>
            <DialogDescription>
              Cấu hình thuật toán và tham số tối ưu
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Algorithm */}
            <div className="space-y-2">
              <Label>Thuật toán</Label>
              <Select
                value={config.algorithm}
                onValueChange={(value: string) => setConfig(prev => ({ ...prev, algorithm: value as ScheduleConfig['algorithm'] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="greedy">Greedy (Nhanh)</SelectItem>
                  <SelectItem value="genetic">Genetic Algorithm</SelectItem>
                  <SelectItem value="constraint">Constraint Programming</SelectItem>
                  <SelectItem value="hybrid">Hybrid AI (Khuyến nghị)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Optimization Goal */}
            <div className="space-y-2">
              <Label>Mục tiêu tối ưu</Label>
              <Select
                value={config.optimizationGoal}
                onValueChange={(value: string) => setConfig(prev => ({ ...prev, optimizationGoal: value as ScheduleConfig['optimizationGoal'] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minimize_makespan">Tối thiểu thời gian hoàn thành</SelectItem>
                  <SelectItem value="balance_utilization">Cân bằng công suất</SelectItem>
                  <SelectItem value="minimize_changeover">Giảm thời gian chuyển đổi</SelectItem>
                  <SelectItem value="maximize_ontime">Tối đa đơn đúng hạn</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Switches */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Ưu tiên độ priority</Label>
                  <p className="text-sm text-muted-foreground">Ưu tiên lên lịch các đơn có priority cao</p>
                </div>
                <Switch
                  checked={config.respectPriority}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, respectPriority: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Cho phép tăng ca</Label>
                  <p className="text-sm text-muted-foreground">Có thể sử dụng giờ làm thêm nếu cần</p>
                </div>
                <Switch
                  checked={config.allowOvertime}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, allowOvertime: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Tính thời gian setup</Label>
                  <p className="text-sm text-muted-foreground">Tính toán thời gian chuyển đổi giữa sản phẩm</p>
                </div>
                <Switch
                  checked={config.considerSetupTime}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, considerSetupTime: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Bật đề xuất AI</Label>
                  <p className="text-sm text-muted-foreground">Nhận gợi ý tối ưu từ AI</p>
                </div>
                <Switch
                  checked={config.enableAISuggestions}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enableAISuggestions: checked }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              Hủy
            </Button>
            <Button onClick={() => {
              setShowSettings(false);
              toast.success('Đã lưu cài đặt');
            }}>
              <Save className="h-4 w-4 mr-1" />
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Run Dialog */}
      <AlertDialog open={showConfirmRun} onOpenChange={setShowConfirmRun}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Chạy lên lịch tự động?</AlertDialogTitle>
            <AlertDialogDescription>
              Hệ thống sẽ phân tích {metrics.totalWorkOrders} work orders và tối ưu lịch sản xuất
              dựa trên thuật toán <strong>{config.algorithm}</strong> với mục tiêu{' '}
              <strong>
                {config.optimizationGoal === 'minimize_makespan' && 'tối thiểu thời gian'}
                {config.optimizationGoal === 'balance_utilization' && 'cân bằng công suất'}
                {config.optimizationGoal === 'minimize_changeover' && 'giảm chuyển đổi'}
                {config.optimizationGoal === 'maximize_ontime' && 'tối đa đúng hạn'}
              </strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={runScheduling}>
              <Zap className="h-4 w-4 mr-1" />
              Chạy ngay
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
