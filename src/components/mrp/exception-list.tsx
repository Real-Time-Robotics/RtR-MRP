"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  Check,
  X,
  Eye,
  Clock,
  TrendingDown,
  TrendingUp,
  Package,
} from "lucide-react";
import { format } from "date-fns";

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

interface ExceptionListProps {
  exceptions: Exception[];
  onResolve?: (id: string, resolution: string) => void;
  onAcknowledge?: (id: string) => void;
  onIgnore?: (id: string, reason: string) => void;
  onRefresh?: () => void;
}

export function ExceptionList({
  exceptions,
  onResolve,
  onAcknowledge,
  onIgnore,
  onRefresh,
}: ExceptionListProps) {
  const [selectedException, setSelectedException] = useState<Exception | null>(null);
  const [actionDialog, setActionDialog] = useState<"resolve" | "ignore" | null>(null);
  const [actionText, setActionText] = useState("");

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case "WARNING":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return "bg-red-100 text-red-800 border-red-200";
      case "WARNING":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "PAST_DUE":
        return <Clock className="h-4 w-4" />;
      case "SHORTAGE":
        return <TrendingDown className="h-4 w-4" />;
      case "EXCESS":
        return <TrendingUp className="h-4 w-4" />;
      case "RESCHEDULE_IN":
      case "RESCHEDULE_OUT":
        return <Clock className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const handleAction = () => {
    if (!selectedException) return;

    if (actionDialog === "resolve" && onResolve) {
      onResolve(selectedException.id, actionText);
    } else if (actionDialog === "ignore" && onIgnore) {
      onIgnore(selectedException.id, actionText);
    }

    setSelectedException(null);
    setActionDialog(null);
    setActionText("");
  };

  const criticalCount = exceptions.filter((e) => e.severity === "CRITICAL").length;
  const warningCount = exceptions.filter((e) => e.severity === "WARNING").length;
  const infoCount = exceptions.filter((e) => e.severity === "INFO").length;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div>
                <div className="text-3xl font-bold text-red-700">{criticalCount}</div>
                <div className="text-sm text-red-600">Critical</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-8 w-8 text-yellow-500" />
              <div>
                <div className="text-3xl font-bold text-yellow-700">{warningCount}</div>
                <div className="text-sm text-yellow-600">Warning</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Info className="h-8 w-8 text-blue-500" />
              <div>
                <div className="text-3xl font-bold text-blue-700">{infoCount}</div>
                <div className="text-sm text-blue-600">Info</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Exception List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle>MRP Exceptions ({exceptions.length})</CardTitle>
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh}>
              Refresh
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {exceptions.map((exception) => (
              <div
                key={exception.id}
                className={`p-4 flex items-start gap-4 ${
                  exception.status !== "OPEN" ? "opacity-60" : ""
                }`}
              >
                {getSeverityIcon(exception.severity)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="gap-1">
                      {getTypeIcon(exception.exceptionType)}
                      {exception.exceptionType.replace(/_/g, " ")}
                    </Badge>
                    <Badge className={getSeverityColor(exception.severity)}>
                      {exception.severity}
                    </Badge>
                    {exception.status !== "OPEN" && (
                      <Badge variant="secondary">{exception.status}</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm">{exception.message}</p>
                  <div className="mt-1 text-xs text-muted-foreground flex gap-4">
                    {exception.part && (
                      <span>Part: {exception.part.partNumber}</span>
                    )}
                    {exception.quantity && <span>Qty: {exception.quantity}</span>}
                    <span>{format(new Date(exception.createdAt), "MMM dd, yyyy HH:mm")}</span>
                  </div>
                </div>
                {exception.status === "OPEN" && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedException(exception);
                        setActionDialog("resolve");
                      }}
                      title="Resolve"
                    >
                      <Check className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (onAcknowledge) onAcknowledge(exception.id);
                      }}
                      title="Acknowledge"
                    >
                      <Eye className="h-4 w-4 text-blue-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedException(exception);
                        setActionDialog("ignore");
                      }}
                      title="Ignore"
                    >
                      <X className="h-4 w-4 text-gray-600" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
            {exceptions.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                No exceptions found
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog
        open={actionDialog !== null}
        onOpenChange={() => {
          setActionDialog(null);
          setSelectedException(null);
          setActionText("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog === "resolve" ? "Resolve Exception" : "Ignore Exception"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              {selectedException?.message}
            </p>
            <Textarea
              placeholder={
                actionDialog === "resolve"
                  ? "Enter resolution details..."
                  : "Enter reason for ignoring..."
              }
              value={actionText}
              onChange={(e) => setActionText(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setActionDialog(null);
                setSelectedException(null);
                setActionText("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAction}>
              {actionDialog === "resolve" ? "Resolve" : "Ignore"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
