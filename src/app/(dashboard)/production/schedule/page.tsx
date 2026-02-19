"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/layout/page-header";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Factory,
} from "lucide-react";
import {
  format,
  addDays,
  differenceInDays,
  startOfWeek,
  eachDayOfInterval,
  isToday,
} from "date-fns";
import { vi } from "date-fns/locale";
import { clientLogger } from '@/lib/client-logger';

interface GanttTask {
  id: string;
  woNumber: string;
  name: string;
  product: string;
  quantity: number;
  completedQty: number;
  progress: number;
  startDate: string;
  endDate: string;
  status: string;
  priority: string;
}

interface Conflict {
  type: string;
  messageVi: string;
  severity: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-400",
  planned: "bg-blue-400",
  released: "bg-cyan-400",
  in_progress: "bg-amber-500",
  completed: "bg-green-500",
  cancelled: "bg-red-400",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Nháp",
  planned: "Đã lên KH",
  released: "Đã phát hành",
  in_progress: "Đang SX",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
};

type ViewMode = "day" | "week" | "month";

export default function ProductionSchedulePage() {
  const [tasks, setTasks] = useState<GanttTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [viewStart, setViewStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [stats, setStats] = useState({
    total: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
  });

  // Drag state
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragStartX, setDragStartX] = useState<number | null>(null);

  // Reschedule dialog
  const [rescheduleDialog, setRescheduleDialog] = useState<{
    open: boolean;
    task: GanttTask | null;
    newStart: Date | null;
    newEnd: Date | null;
    conflicts: Conflict[];
    canProceed: boolean;
  }>({
    open: false,
    task: null,
    newStart: null,
    newEnd: null,
    conflicts: [],
    canProceed: true,
  });

  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate visible date range based on view mode
  const getViewRange = useCallback(() => {
    const start = viewStart;
    let days: number;

    switch (viewMode) {
      case "day":
        days = 14;
        break;
      case "week":
        days = 28;
        break;
      case "month":
        days = 90;
        break;
      default:
        days = 28;
    }

    const end = addDays(start, days);
    return { start, end, days };
  }, [viewStart, viewMode]);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    const { start, end } = getViewRange();

    try {
      const res = await fetch(
        `/api/production/schedule?startDate=${start.toISOString()}&endDate=${end.toISOString()}`
      );
      const data = await res.json();
      setTasks(data.tasks || []);
      setStats(
        data.stats || { total: 0, inProgress: 0, completed: 0, overdue: 0 }
      );
    } catch (error) {
      clientLogger.error("Failed to fetch schedule:", error);
    } finally {
      setLoading(false);
    }
  }, [getViewRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Navigation
  function navigate(direction: "prev" | "next") {
    const days = viewMode === "day" ? 7 : viewMode === "week" ? 14 : 30;
    setViewStart((prev) => addDays(prev, direction === "next" ? days : -days));
  }

  function goToToday() {
    setViewStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  }

  // Calculate position for a task
  function getTaskPosition(task: GanttTask) {
    const { start, days } = getViewRange();
    const taskStart = new Date(task.startDate);
    const taskEnd = new Date(task.endDate);

    const startOffset = Math.max(0, differenceInDays(taskStart, start));
    const endOffset = Math.min(days, differenceInDays(taskEnd, start));
    const duration = endOffset - startOffset;

    const dayWidth = 100 / days;

    return {
      left: `${startOffset * dayWidth}%`,
      width: `${Math.max(duration, 1) * dayWidth}%`,
      visible: endOffset > 0 && startOffset < days,
    };
  }

  // Generate timeline dates
  function getTimelineDates() {
    const { start, end } = getViewRange();
    return eachDayOfInterval({ start, end: addDays(end, -1) });
  }

  // Handle drag start
  function handleDragStart(e: React.MouseEvent, taskId: string) {
    setDragging(taskId);
    setDragStartX(e.clientX);
  }

  // Handle drag end
  async function handleDragEnd(e: React.MouseEvent) {
    if (!dragging || dragStartX === null || !containerRef.current) {
      setDragging(null);
      setDragStartX(null);
      return;
    }

    const task = tasks.find((t) => t.id === dragging);
    if (!task) {
      setDragging(null);
      setDragStartX(null);
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const { days } = getViewRange();
    const dayWidth = rect.width / days;
    const daysMoved = Math.round((e.clientX - dragStartX) / dayWidth);

    if (daysMoved === 0) {
      setDragging(null);
      setDragStartX(null);
      return;
    }

    const originalStart = new Date(task.startDate);
    const originalEnd = new Date(task.endDate);
    const newStart = addDays(originalStart, daysMoved);
    const newEnd = addDays(originalEnd, daysMoved);

    try {
      const res = await fetch("/api/production/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workOrderId: task.id,
          startDate: newStart.toISOString(),
          endDate: newEnd.toISOString(),
          force: false,
        }),
      });

      const data = await res.json();

      if (!data.success && data.conflicts) {
        setRescheduleDialog({
          open: true,
          task,
          newStart,
          newEnd,
          conflicts: data.conflicts,
          canProceed: data.canProceed,
        });
      } else if (data.success) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === task.id
              ? {
                  ...t,
                  startDate: newStart.toISOString(),
                  endDate: newEnd.toISOString(),
                }
              : t
          )
        );
      }
    } catch (error) {
      clientLogger.error("Reschedule failed:", error);
    }

    setDragging(null);
    setDragStartX(null);
  }

  // Confirm reschedule with conflicts
  async function confirmReschedule() {
    const { task, newStart, newEnd } = rescheduleDialog;
    if (!task || !newStart || !newEnd) return;

    try {
      const res = await fetch("/api/production/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workOrderId: task.id,
          startDate: newStart.toISOString(),
          endDate: newEnd.toISOString(),
          force: true,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === task.id
              ? {
                  ...t,
                  startDate: newStart.toISOString(),
                  endDate: newEnd.toISOString(),
                }
              : t
          )
        );
      }
    } catch (error) {
      clientLogger.error("Reschedule failed:", error);
    }

    setRescheduleDialog({
      open: false,
      task: null,
      newStart: null,
      newEnd: null,
      conflicts: [],
      canProceed: true,
    });
  }

  const timelineDates = getTimelineDates();
  const { days } = getViewRange();
  const dayWidth = `${100 / days}%`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lịch sản xuất"
        description="Kéo thả để điều chỉnh lịch sản xuất"
        backHref="/production"
      />

      {/* Controls */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("prev")}
              aria-label="Trước"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Hôm nay
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("next")}
              aria-label="Sau"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <h2 className="text-lg font-semibold">
            {format(viewStart, "dd/MM/yyyy", { locale: vi })} -{" "}
            {format(addDays(viewStart, days - 1), "dd/MM/yyyy", { locale: vi })}
          </h2>

          <div className="flex items-center gap-2">
            <Select
              value={viewMode}
              onValueChange={(v) => setViewMode(v as ViewMode)}
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Ngày</SelectItem>
                <SelectItem value="week">Tuần</SelectItem>
                <SelectItem value="month">Tháng</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchData} aria-label="Làm mới">
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Factory className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-gray-500">Tổng WO</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-amber-600" />
              <div>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
                <p className="text-sm text-gray-500">Đang chạy</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-sm text-gray-500">Hoàn thành</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-2xl font-bold">{stats.overdue}</p>
                <p className="text-sm text-gray-500">Trễ hạn</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gantt Chart */}
      <Card>
        <CardContent className="p-0">
          <div className="flex">
            {/* Sidebar */}
            <div className="w-64 flex-shrink-0 border-r">
              <div className="h-12 border-b flex items-center px-4 bg-gray-50 dark:bg-neutral-800 font-medium text-sm">
                <Calendar className="h-4 w-4 mr-2" />
                Lệnh sản xuất
              </div>
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="h-12 border-b flex items-center px-4 hover:bg-gray-50 dark:hover:bg-neutral-800"
                >
                  <div className="truncate">
                    <p className="font-medium text-sm truncate">
                      {task.woNumber}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {task.product}
                    </p>
                  </div>
                </div>
              ))}
              {tasks.length === 0 && !loading && (
                <div className="h-24 flex items-center justify-center text-gray-500 text-sm">
                  Không có lệnh sản xuất
                </div>
              )}
            </div>

            {/* Chart area */}
            <div className="flex-1 overflow-x-auto">
              {/* Timeline header */}
              <div className="h-12 border-b flex bg-gray-50 dark:bg-neutral-800 sticky top-0">
                {timelineDates.map((date, i) => (
                  <div
                    key={i}
                    className={`flex-shrink-0 border-r text-center text-xs py-1 ${
                      isToday(date)
                        ? "bg-blue-100 dark:bg-blue-900"
                        : ""
                    }`}
                    style={{ width: dayWidth, minWidth: viewMode === "day" ? 60 : viewMode === "week" ? 36 : 12 }}
                  >
                    <div className="font-medium">
                      {format(
                        date,
                        viewMode === "month" ? "d" : "EEE",
                        { locale: vi }
                      )}
                    </div>
                    <div className="text-gray-500">
                      {format(
                        date,
                        viewMode === "month" ? "MMM" : "d/M",
                        { locale: vi }
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Task rows */}
              <div
                ref={containerRef}
                className="relative"
                onMouseUp={handleDragEnd}
                onMouseLeave={handleDragEnd}
              >
                {/* Today line */}
                {(() => {
                  const todayOffset = differenceInDays(
                    new Date(),
                    viewStart
                  );
                  if (todayOffset >= 0 && todayOffset < days) {
                    return (
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
                        style={{
                          left: `${(todayOffset / days) * 100}%`,
                        }}
                      />
                    );
                  }
                  return null;
                })()}

                {tasks.map((task) => {
                  const pos = getTaskPosition(task);
                  if (!pos.visible) return (
                    <div key={task.id} className="h-12 border-b" />
                  );

                  return (
                    <div key={task.id} className="h-12 border-b relative">
                      {/* Grid lines */}
                      <div className="absolute inset-0 flex">
                        {timelineDates.map((date, i) => (
                          <div
                            key={i}
                            className={`flex-shrink-0 border-r ${
                              isToday(date)
                                ? "bg-blue-50 dark:bg-blue-950"
                                : ""
                            }`}
                            style={{ width: dayWidth }}
                          />
                        ))}
                      </div>

                      {/* Task bar */}
                      <div
                        className={`
                          absolute top-2 h-8 rounded cursor-move z-[5]
                          ${STATUS_COLORS[task.status] || "bg-gray-400"}
                          ${
                            dragging === task.id
                              ? "opacity-50 ring-2 ring-blue-500"
                              : "hover:ring-2 hover:ring-blue-300"
                          }
                          transition-all shadow-sm
                        `}
                        style={{ left: pos.left, width: pos.width }}
                        onMouseDown={(e) => handleDragStart(e, task.id)}
                        title={`${task.woNumber} - ${task.product}\n${format(new Date(task.startDate), "dd/MM")} → ${format(new Date(task.endDate), "dd/MM")}\nTiến độ: ${task.progress}%`}
                      >
                        {/* Progress bar */}
                        <div
                          className="absolute inset-0 bg-black/20 rounded-l"
                          style={{ width: `${task.progress}%` }}
                        />

                        {/* Label */}
                        <div className="relative px-2 py-1 text-white text-xs font-medium truncate">
                          {task.woNumber} ({task.progress}%)
                        </div>
                      </div>
                    </div>
                  );
                })}

                {loading && (
                  <div className="absolute inset-0 bg-white/80 dark:bg-neutral-900/80 flex items-center justify-center">
                    <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status legend */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="text-gray-500">Trạng thái:</span>
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded ${color}`} />
            <span>{STATUS_LABELS[status]}</span>
          </div>
        ))}
        <span className="text-gray-400 ml-4">|</span>
        <div className="flex items-center gap-1">
          <div className="w-4 h-0.5 bg-red-500" />
          <span>Hôm nay</span>
        </div>
      </div>

      {/* Reschedule Conflict Dialog */}
      <Dialog
        open={rescheduleDialog.open}
        onOpenChange={(open) =>
          !open &&
          setRescheduleDialog((prev) => ({ ...prev, open: false }))
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Cảnh báo khi dời lịch
            </DialogTitle>
            <DialogDescription>
              Phát hiện vấn đề khi dời {rescheduleDialog.task?.woNumber}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {rescheduleDialog.conflicts.map((conflict, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg flex items-start gap-2 text-sm ${
                  conflict.severity === "ERROR"
                    ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                    : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                }`}
              >
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">{conflict.type}</p>
                  <p>{conflict.messageVi}</p>
                </div>
              </div>
            ))}

            {rescheduleDialog.newStart && rescheduleDialog.newEnd && (
              <div className="p-3 bg-gray-50 dark:bg-neutral-800 rounded-lg text-sm">
                <p>
                  <strong>Lịch mới:</strong>
                </p>
                <p>
                  {format(rescheduleDialog.newStart, "dd/MM/yyyy")} →{" "}
                  {format(rescheduleDialog.newEnd, "dd/MM/yyyy")}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setRescheduleDialog((prev) => ({
                  ...prev,
                  open: false,
                }))
              }
            >
              Hủy
            </Button>
            {rescheduleDialog.canProceed && (
              <Button
                onClick={confirmReschedule}
                className="bg-amber-600 hover:bg-amber-700"
              >
                Vẫn dời lịch
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
