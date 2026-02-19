"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Package,
  CheckCircle,
  AlertTriangle,
  FileText,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { EntityDiscussions } from "@/components/discussions/entity-discussions";
import { clientLogger } from '@/lib/client-logger';

interface LotSummary {
  lotNumber: string;
  partId?: string;
  partNumber?: string;
  partName?: string;
  productId?: string;
  productSku?: string;
  productName?: string;
  originalQty: number;
  consumedQty: number;
  scrappedQty: number;
  availableQty: number;
  transactions: Array<{
    id: string;
    transactionType: string;
    quantity: number;
    createdAt: string;
    notes?: string;
  }>;
}

interface TraceabilityNode {
  lotNumber: string;
  partNumber?: string;
  partName?: string;
  productSku?: string;
  productName?: string;
  quantity: number;
  type: "part" | "product";
  status: string;
  children: TraceabilityNode[];
  documents: Array<{ type: string; number: string; date: string }>;
  quality: { inspectionResult?: string; ncrCount: number };
}

export default function LotTraceabilityPage({
  params,
}: {
  params: Promise<{ lotNumber: string }>;
}) {
  const { lotNumber } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<LotSummary | null>(null);
  const [traceability, setTraceability] = useState<TraceabilityNode | null>(null);

  useEffect(() => {
    fetchTraceability();
  }, [lotNumber]);

  const fetchTraceability = async () => {
    try {
      const res = await fetch(`/api/quality/traceability/${encodeURIComponent(lotNumber)}`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
        setTraceability(data.traceability);
      }
    } catch (error) {
      clientLogger.error("Failed to fetch traceability:", error);
    } finally {
      setLoading(false);
    }
  };

  const transactionIcons: Record<string, React.ElementType> = {
    RECEIVED: Package,
    INSPECTED: CheckCircle,
    ISSUED: Truck,
    PRODUCED: Package,
    SHIPPED: Truck,
    SCRAPPED: AlertTriangle,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Lot not found</p>
        <Button onClick={() => router.back()} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Lot: ${decodeURIComponent(lotNumber)}`}
        description="Full lot genealogy and transaction history"
        actions={
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        }
      />

      {/* Tabs */}
      <Tabs defaultValue="details" className="w-full">
        <TabsList>
          <TabsTrigger value="details">Chi tiết</TabsTrigger>
          <TabsTrigger value="discussions">Thảo luận</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-4 space-y-6">
          {/* Lot Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Lot Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground">Part/Product</p>
                  <p className="font-medium">
                    {summary.partNumber || summary.productSku} -{" "}
                    {summary.partName || summary.productName}
                  </p>
                </div>
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold">{summary.originalQty}</p>
                    <p className="text-xs text-muted-foreground">Original</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{summary.consumedQty}</p>
                    <p className="text-xs text-muted-foreground">Consumed</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">{summary.scrappedQty}</p>
                    <p className="text-xs text-muted-foreground">Scrapped</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">{summary.availableQty}</p>
                    <p className="text-xs text-muted-foreground">Available</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-6">
            {/* Forward Traceability */}
            <Card>
              <CardHeader>
                <CardTitle>Forward Traceability (Where Used)</CardTitle>
              </CardHeader>
              <CardContent>
                {traceability ? (
                  <TraceabilityTree node={traceability} />
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    No forward traceability data
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Transaction History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Transaction History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {summary.transactions.map((tx) => {
                    const Icon = transactionIcons[tx.transactionType] || Package;
                    return (
                      <div
                        key={tx.id}
                        className="flex items-start gap-3 p-3 rounded-lg border"
                      >
                        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline">{tx.transactionType}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(tx.createdAt), "MMM d, yyyy h:mm a")}
                            </span>
                          </div>
                          <p className="text-sm mt-1">
                            Quantity: <strong>{tx.quantity > 0 ? "+" : ""}{tx.quantity}</strong>
                          </p>
                          {tx.notes && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {tx.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="discussions" className="mt-4">
          <EntityDiscussions
            contextType="QC_REPORT"
            contextId={lotNumber}
            contextTitle={`Lot ${decodeURIComponent(lotNumber)} - ${summary.partNumber || summary.productSku}`}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TraceabilityTree({ node }: { node: TraceabilityNode }) {
  return (
    <div className="space-y-2">
      <div className="p-3 rounded-lg border bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">
              {node.partNumber || node.productSku}
            </p>
            <p className="text-sm text-muted-foreground">
              {node.partName || node.productName}
            </p>
          </div>
          <div className="text-right">
            <p className="font-medium">{node.quantity} units</p>
            <Badge variant="outline" className="text-xs">
              {node.status}
            </Badge>
          </div>
        </div>
        {node.quality.inspectionResult && (
          <Badge
            className={`mt-2 ${
              node.quality.inspectionResult === "PASS"
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {node.quality.inspectionResult}
          </Badge>
        )}
      </div>
      {node.children.length > 0 && (
        <div className="ml-6 border-l-2 pl-4 space-y-2">
          {node.children.map((child, index) => (
            <TraceabilityTree key={index} node={child} />
          ))}
        </div>
      )}
    </div>
  );
}
