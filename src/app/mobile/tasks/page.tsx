"use client";

import { useState, useEffect } from "react";
import { MobileHeader } from "@/components/mobile/mobile-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  ClipboardList,
  Package,
  Truck,
  CheckCircle,
  Clock,
  ChevronRight,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { haptic } from "@/lib/mobile/haptics";
import Link from "next/link";

interface Task {
  id: string;
  type: "picking" | "receiving" | "work_order" | "inspection";
  reference: string;
  description: string;
  status: "pending" | "in_progress" | "completed";
  priority: "low" | "medium" | "high" | "urgent";
  dueDate?: string;
  assignedTo?: string;
  items: number;
  completedItems: number;
}

const TASK_TYPE_CONFIG = {
  picking: { label: "Pick List", color: "bg-purple-500", icon: Package },
  receiving: { label: "Receiving", color: "bg-orange-500", icon: Truck },
  work_order: { label: "Work Order", color: "bg-blue-500", icon: ClipboardList },
  inspection: { label: "Inspection", color: "bg-green-500", icon: CheckCircle },
};

const STATUS_CONFIG = {
  pending: { label: "Pending", color: "bg-gray-200 text-gray-700" },
  in_progress: { label: "In Progress", color: "bg-yellow-100 text-yellow-700" },
  completed: { label: "Completed", color: "bg-green-100 text-green-700" },
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("my-tasks");

  const loadTasks = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/mobile/tasks");
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
      } else {
        // Demo data
        setTasks([
          {
            id: "1",
            type: "picking",
            reference: "PL-2024-001",
            description: "Sales Order SO-2024-0025",
            status: "pending",
            priority: "high",
            dueDate: "2024-12-28",
            items: 5,
            completedItems: 0,
          },
          {
            id: "2",
            type: "receiving",
            reference: "PO-2024-0015",
            description: "Motor Components from KDE Direct",
            status: "in_progress",
            priority: "medium",
            items: 8,
            completedItems: 3,
          },
          {
            id: "3",
            type: "work_order",
            reference: "WO-2024-001",
            description: "HERA X8 Professional Drone",
            status: "in_progress",
            priority: "urgent",
            items: 10,
            completedItems: 7,
          },
        ]);
      }
    } catch (error) {
      console.error("Failed to load tasks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const filteredTasks = tasks.filter((task) => {
    if (activeTab === "my-tasks") {
      return task.status !== "completed";
    }
    if (activeTab === "completed") {
      return task.status === "completed";
    }
    return true;
  });

  const handleRefresh = () => {
    haptic("light");
    loadTasks();
  };

  const getTaskLink = (task: Task) => {
    switch (task.type) {
      case "picking":
        return `/mobile/picking/${task.reference}`;
      case "receiving":
        return `/mobile/receiving/${task.reference}`;
      case "work_order":
        return `/mobile/work-orders/${task.reference}`;
      case "inspection":
        return `/mobile/quality/inspect/${task.id}`;
      default:
        return "/mobile/tasks";
    }
  };

  return (
    <div className="min-h-screen">
      <MobileHeader
        title="My Tasks"
        subtitle="Assigned tasks and pick lists"
        showBack
        backHref="/mobile"
        actions={
          <Button variant="ghost" size="icon" onClick={handleRefresh}>
            <RefreshCw className={cn("h-5 w-5", isLoading && "animate-spin")} />
          </Button>
        }
      />

      <div className="p-4 space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="my-tasks">My Tasks</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-2">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {tasks.filter((t) => t.status === "pending").length}
              </p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">
                {tasks.filter((t) => t.status === "in_progress").length}
              </p>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-green-600">
                {tasks.filter((t) => t.status === "completed").length}
              </p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredTasks.length > 0 ? (
          <div className="space-y-2">
            {filteredTasks.map((task) => {
              const typeConfig = TASK_TYPE_CONFIG[task.type];
              const statusConfig = STATUS_CONFIG[task.status];
              const TypeIcon = typeConfig.icon;
              const progress =
                task.items > 0
                  ? Math.round((task.completedItems / task.items) * 100)
                  : 0;

              return (
                <Link
                  key={task.id}
                  href={getTaskLink(task)}
                  onClick={() => haptic("selection")}
                >
                  <Card className="hover:shadow-md active:scale-[0.99] transition-all">
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                            typeConfig.color
                          )}
                        >
                          <TypeIcon className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-sm">
                              {task.reference}
                            </span>
                            <Badge className={statusConfig.color}>
                              {statusConfig.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {task.description}
                          </p>
                          {task.dueDate && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                              <Clock className="h-3 w-3" />
                              Due: {task.dueDate}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">
                            {task.completedItems}/{task.items}
                          </p>
                          <p className="text-xs text-muted-foreground">items</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground self-center" />
                      </div>

                      {/* Progress bar */}
                      {task.status === "in_progress" && (
                        <div className="mt-3 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No tasks found</p>
              <p className="text-xs mt-1">
                {activeTab === "my-tasks"
                  ? "You have no pending tasks"
                  : "No tasks match this filter"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
