"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MobileHeader } from "@/components/mobile/mobile-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  Factory,
  Clock,
  CheckCircle,
  Play,
  Pause,
  ChevronRight,
  Loader2,
  Scan,
  RefreshCw,
} from "lucide-react";
import { getActiveWorkOrders } from "@/lib/mobile";
import { haptic } from "@/lib/mobile/haptics";
import Link from "next/link";

interface WorkOrder {
  id: string;
  number: string;
  productId: string;
  productName: string;
  quantity: number;
  completedQty: number;
  status: string;
  priority: string;
  scheduledDate?: string;
  currentOperation?: string;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ElementType }
> = {
  PLANNED: { label: "Planned", color: "bg-gray-500", icon: Clock },
  RELEASED: { label: "Released", color: "bg-blue-500", icon: Play },
  IN_PROGRESS: { label: "In Progress", color: "bg-yellow-500", icon: Factory },
  COMPLETED: { label: "Completed", color: "bg-green-500", icon: CheckCircle },
  ON_HOLD: { label: "On Hold", color: "bg-red-500", icon: Pause },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  LOW: { label: "Low", color: "text-gray-500" },
  MEDIUM: { label: "Medium", color: "text-blue-500" },
  HIGH: { label: "High", color: "text-orange-500" },
  URGENT: { label: "Urgent", color: "text-red-500" },
};

export default function WorkOrdersPage() {
  const router = useRouter();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active");

  const loadWorkOrders = async () => {
    setIsLoading(true);
    try {
      // Try local cache first
      const cachedWOs = await getActiveWorkOrders();
      if (cachedWOs.length > 0) {
        setWorkOrders(
          cachedWOs.map((wo) => ({
            id: wo.id,
            number: wo.number,
            productId: wo.productId,
            productName: wo.productName,
            quantity: wo.quantity,
            completedQty: 0,
            status: wo.status,
            priority: wo.priority || "MEDIUM",
            scheduledDate: wo.scheduledDate,
          }))
        );
      } else {
        // Try API
        const response = await fetch("/api/mobile/work-orders");
        if (response.ok) {
          const data = await response.json();
          setWorkOrders(data.workOrders || []);
        }
      }
    } catch (error) {
      console.error("Failed to load work orders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWorkOrders();
  }, []);

  const filteredWOs = workOrders.filter((wo) => {
    if (activeTab === "active") {
      return ["RELEASED", "IN_PROGRESS"].includes(wo.status);
    }
    if (activeTab === "completed") {
      return wo.status === "COMPLETED";
    }
    return true;
  });

  const handleScan = () => {
    haptic("light");
    router.push("/mobile/scan");
  };

  const handleRefresh = () => {
    haptic("light");
    loadWorkOrders();
  };

  return (
    <div className="min-h-screen">
      <MobileHeader
        title="Work Orders"
        subtitle="View and update work orders"
        showBack
        backHref="/mobile"
        actions={
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={handleRefresh}>
              <RefreshCw className={cn("h-5 w-5", isLoading && "animate-spin")} />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleScan}>
              <Scan className="h-5 w-5" />
            </Button>
          </div>
        }
      />

      <div className="p-4 space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredWOs.length > 0 ? (
          <div className="space-y-2">
            {filteredWOs.map((wo) => {
              const status = STATUS_CONFIG[wo.status] || STATUS_CONFIG.PLANNED;
              const priority = PRIORITY_CONFIG[wo.priority] || PRIORITY_CONFIG.MEDIUM;
              const StatusIcon = status.icon;
              const progress =
                wo.quantity > 0
                  ? Math.round((wo.completedQty / wo.quantity) * 100)
                  : 0;

              return (
                <Link
                  key={wo.id}
                  href={`/mobile/work-orders/${wo.number}`}
                  onClick={() => haptic("selection")}
                >
                  <Card className="hover:shadow-md active:scale-[0.99] transition-all">
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                            status.color
                          )}
                        >
                          <StatusIcon className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-sm">
                              {wo.number}
                            </span>
                            <Badge variant="outline" className={priority.color}>
                              {priority.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {wo.productName}
                          </p>
                          {wo.currentOperation && (
                            <p className="text-xs text-primary mt-1">
                              Current: {wo.currentOperation}
                            </p>
                          )}
                          {wo.scheduledDate && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Scheduled: {wo.scheduledDate}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">
                            {wo.completedQty}/{wo.quantity}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {progress}% done
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground self-center" />
                      </div>

                      {/* Progress bar */}
                      {wo.status === "IN_PROGRESS" && (
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
              <Factory className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No work orders found</p>
              <p className="text-xs mt-1">
                {activeTab === "active"
                  ? "No active work orders"
                  : "Try a different filter"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
