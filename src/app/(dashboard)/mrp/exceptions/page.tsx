"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExceptionList } from "@/components/mrp/exception-list";
import { Loader2, RefreshCw, Scan } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { clientLogger } from '@/lib/client-logger';

interface Exception {
  id: string;
  exceptionType: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  entityType: string;
  entityId: string;
  partId: string;
  message: string;
  currentDate?: Date;
  suggestedDate?: Date;
  quantity?: number;
  status: string;
  createdAt: Date;
  part?: {
    partNumber: string;
    name: string;
  };
}

export default function ExceptionsPage() {
  const { toast } = useToast();
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("OPEN");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [isDetecting, setIsDetecting] = useState(false);

  useEffect(() => {
    fetchExceptions();
  }, [statusFilter, severityFilter, typeFilter]);

  const fetchExceptions = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);
      if (severityFilter && severityFilter !== "ALL") params.append("severity", severityFilter);
      if (typeFilter && typeFilter !== "ALL") params.append("type", typeFilter);

      const response = await fetch(`/api/mrp/exceptions?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setExceptions(data);
      }
    } catch (error) {
      clientLogger.error("Failed to fetch exceptions:", error);
      toast({ title: "Failed to fetch exceptions", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const detectExceptions = async () => {
    setIsDetecting(true);
    try {
      const response = await fetch("/api/mrp/exceptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "detect" }),
      });

      if (response.ok) {
        const data = await response.json();
        toast({ title: `Detected ${data.count} new exceptions` });
        fetchExceptions();
      } else {
        throw new Error("Failed to detect exceptions");
      }
    } catch (error) {
      clientLogger.error("Failed to detect exceptions:", error);
      toast({ title: "Failed to detect exceptions", variant: "destructive" });
    } finally {
      setIsDetecting(false);
    }
  };

  const handleResolve = async (id: string, resolution: string) => {
    try {
      const response = await fetch("/api/mrp/exceptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "resolve",
          exceptionId: id,
          resolution,
          userId: "current-user",
        }),
      });

      if (response.ok) {
        toast({ title: "Exception resolved" });
        fetchExceptions();
      } else {
        throw new Error("Failed to resolve exception");
      }
    } catch (error) {
      clientLogger.error("Failed to resolve exception:", error);
      toast({ title: "Failed to resolve exception", variant: "destructive" });
    }
  };

  const handleAcknowledge = async (id: string) => {
    try {
      const response = await fetch("/api/mrp/exceptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "acknowledge",
          exceptionId: id,
          userId: "current-user",
        }),
      });

      if (response.ok) {
        toast({ title: "Exception acknowledged" });
        fetchExceptions();
      } else {
        throw new Error("Failed to acknowledge exception");
      }
    } catch (error) {
      clientLogger.error("Failed to acknowledge exception:", error);
      toast({ title: "Failed to acknowledge exception", variant: "destructive" });
    }
  };

  const handleIgnore = async (id: string, reason: string) => {
    try {
      const response = await fetch("/api/mrp/exceptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ignore",
          exceptionId: id,
          reason,
          userId: "current-user",
        }),
      });

      if (response.ok) {
        toast({ title: "Exception ignored" });
        fetchExceptions();
      } else {
        throw new Error("Failed to ignore exception");
      }
    } catch (error) {
      clientLogger.error("Failed to ignore exception:", error);
      toast({ title: "Failed to ignore exception", variant: "destructive" });
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">MRP Exceptions</h1>
          <p className="text-muted-foreground">
            Monitor and manage planning exceptions
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={detectExceptions}
            disabled={isDetecting}
          >
            {isDetecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Detecting...
              </>
            ) : (
              <>
                <Scan className="h-4 w-4 mr-2" />
                Detect Exceptions
              </>
            )}
          </Button>
          <Button variant="outline" onClick={fetchExceptions} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-4">
            <div className="w-[200px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="ACKNOWLEDGED">Acknowledged</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                  <SelectItem value="IGNORED">Ignored</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-[200px]">
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Severities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Severities</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                  <SelectItem value="WARNING">Warning</SelectItem>
                  <SelectItem value="INFO">Info</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-[200px]">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value="PAST_DUE">Past Due</SelectItem>
                  <SelectItem value="SHORTAGE">Shortage</SelectItem>
                  <SelectItem value="EXCESS">Excess</SelectItem>
                  <SelectItem value="RESCHEDULE_IN">Reschedule In</SelectItem>
                  <SelectItem value="RESCHEDULE_OUT">Reschedule Out</SelectItem>
                  <SelectItem value="EXPEDITE">Expedite</SelectItem>
                  <SelectItem value="DEFER">Defer</SelectItem>
                  <SelectItem value="CANCEL">Cancel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exception List */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            Loading exceptions...
          </CardContent>
        </Card>
      ) : (
        <ExceptionList
          exceptions={exceptions}
          onResolve={handleResolve}
          onAcknowledge={handleAcknowledge}
          onIgnore={handleIgnore}
          onRefresh={fetchExceptions}
        />
      )}
    </div>
  );
}
