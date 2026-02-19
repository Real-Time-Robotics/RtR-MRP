"use client";

import { useState, useEffect } from "react";
import { FirmOrderTable } from "@/components/mrp/firm-order-table";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { clientLogger } from '@/lib/client-logger';

interface PlannedOrder {
  id: string;
  orderNumber: string;
  partId: string;
  quantity: number;
  dueDate: Date;
  orderType: string;
  status: string;
  isFirm: boolean;
  firmDate?: Date | null;
  notes?: string | null;
  part?: {
    partNumber: string;
    name: string;
  };
}

interface Part {
  id: string;
  partNumber: string;
  name: string;
}

export default function FirmOrdersPage() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<PlannedOrder[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
    fetchParts();
  }, []);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/mrp/firm-orders");
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      }
    } catch (error) {
      clientLogger.error("Failed to fetch orders:", error);
      toast({ title: "Failed to fetch orders", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchParts = async () => {
    try {
      const response = await fetch("/api/parts?limit=500");
      if (response.ok) {
        const data = await response.json();
        setParts(data);
      }
    } catch (error) {
      clientLogger.error("Failed to fetch parts:", error);
    }
  };

  const handleFirm = async (orderId: string, firm: boolean) => {
    try {
      const response = await fetch("/api/mrp/firm-orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, isFirm: firm }),
      });

      if (response.ok) {
        toast({ title: firm ? "Order firmed" : "Order unfirmed" });
        fetchOrders();
      } else {
        throw new Error("Failed to update order");
      }
    } catch (error) {
      clientLogger.error("Failed to update order:", error);
      toast({ title: "Failed to update order", variant: "destructive" });
    }
  };

  const handleEdit = async (
    orderId: string,
    data: { quantity?: number; dueDate?: Date; notes?: string }
  ) => {
    try {
      const response = await fetch("/api/mrp/firm-orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, ...data }),
      });

      if (response.ok) {
        toast({ title: "Order updated" });
        fetchOrders();
      } else {
        throw new Error("Failed to update order");
      }
    } catch (error) {
      clientLogger.error("Failed to update order:", error);
      toast({ title: "Failed to update order", variant: "destructive" });
    }
  };

  const handleDelete = async (orderId: string) => {
    try {
      const response = await fetch(`/api/mrp/firm-orders?id=${orderId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({ title: "Order deleted" });
        fetchOrders();
      } else {
        throw new Error("Failed to delete order");
      }
    } catch (error) {
      clientLogger.error("Failed to delete order:", error);
      toast({ title: "Failed to delete order", variant: "destructive" });
    }
  };

  const handleCreate = async (data: {
    partId: string;
    quantity: number;
    dueDate: Date;
    isFirm: boolean;
    notes?: string;
  }) => {
    try {
      const response = await fetch("/api/mrp/firm-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast({ title: "Order created" });
        fetchOrders();
      } else {
        throw new Error("Failed to create order");
      }
    } catch (error) {
      clientLogger.error("Failed to create order:", error);
      toast({ title: "Failed to create order", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Firm Planned Orders</h1>
          <p className="text-muted-foreground">
            Lock planned orders to prevent MRP changes
          </p>
        </div>
      </div>

      <FirmOrderTable
        orders={orders}
        parts={parts}
        onFirm={handleFirm}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreate={handleCreate}
      />
    </div>
  );
}
