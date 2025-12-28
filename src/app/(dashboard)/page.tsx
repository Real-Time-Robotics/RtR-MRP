import { AlertsPanel } from "@/components/dashboard/alerts-panel";
import { RecentOrders } from "@/components/dashboard/recent-orders";
import { OrderStatusChart } from "@/components/dashboard/order-status-chart";
import { DashboardHeader, DashboardKPICards } from "@/components/dashboard/dashboard-content";
import prisma from "@/lib/prisma";
import { getStockStatus } from "@/lib/bom-engine";

async function getDashboardData() {
  // Get pending orders
  const pendingOrders = await prisma.salesOrder.findMany({
    where: {
      status: { in: ["draft", "confirmed"] },
    },
    include: {
      customer: true,
    },
  });

  const pendingOrdersValue = pendingOrders.reduce(
    (sum, order) => sum + (order.totalAmount || 0),
    0
  );

  // Get inventory with parts info
  const inventoryData = await prisma.inventory.findMany({
    include: {
      part: true,
    },
  });

  // Group inventory by part and calculate totals
  const partInventory = new Map<string, { quantity: number; reserved: number; part: typeof inventoryData[0]["part"] }>();
  inventoryData.forEach((inv) => {
    const existing = partInventory.get(inv.partId);
    if (existing) {
      existing.quantity += inv.quantity;
      existing.reserved += inv.reservedQty;
    } else {
      partInventory.set(inv.partId, {
        quantity: inv.quantity,
        reserved: inv.reservedQty,
        part: inv.part,
      });
    }
  });

  // Calculate stock statuses
  let criticalStock = 0;
  let reorderAlerts = 0;
  const alerts: Array<{
    id: string;
    type: "critical" | "warning" | "info";
    title: string;
    description: string;
  }> = [];

  partInventory.forEach((inv, partId) => {
    const available = inv.quantity - inv.reserved;
    const status = getStockStatus(
      available,
      inv.part.minStockLevel,
      inv.part.reorderPoint
    );

    if (status === "CRITICAL" || status === "OUT_OF_STOCK") {
      criticalStock++;
      alerts.push({
        id: partId,
        type: "critical",
        title: `${inv.part.name} stock critical`,
        description: `Only ${available} available, min level is ${inv.part.minStockLevel}`,
      });
    } else if (status === "REORDER") {
      reorderAlerts++;
      alerts.push({
        id: partId,
        type: "warning",
        title: `${inv.part.name} below reorder point`,
        description: `${available} available, reorder point is ${inv.part.reorderPoint}`,
      });
    }
  });

  // Get active POs
  const activePOs = await prisma.purchaseOrder.findMany({
    where: {
      status: { notIn: ["received", "cancelled"] },
    },
  });

  const activePOsValue = activePOs.reduce(
    (sum, po) => sum + (po.totalAmount || 0),
    0
  );

  // Get recent orders
  const recentOrders = await prisma.salesOrder.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      customer: true,
    },
  });

  // Get order status summary
  const orderStatusCounts = await prisma.salesOrder.groupBy({
    by: ["status"],
    _count: true,
  });

  const orderStatusData = [
    { name: "Draft", value: 0, color: "#9CA3AF" },
    { name: "Confirmed", value: 0, color: "#22C55E" },
    { name: "In Production", value: 0, color: "#3B82F6" },
    { name: "Ready", value: 0, color: "#8B5CF6" },
    { name: "Shipped", value: 0, color: "#6366F1" },
  ];

  orderStatusCounts.forEach((item) => {
    const statusMap: Record<string, number> = {
      draft: 0,
      confirmed: 1,
      in_production: 2,
      ready: 3,
      shipped: 4,
    };
    const index = statusMap[item.status];
    if (index !== undefined) {
      orderStatusData[index].value = item._count;
    }
  });

  return {
    kpis: {
      pendingOrders: pendingOrders.length,
      pendingOrdersValue,
      criticalStock,
      activePOs: activePOs.length,
      activePOsValue,
      reorderAlerts,
    },
    alerts: alerts.slice(0, 5),
    recentOrders: recentOrders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customer.name,
      requiredDate: order.requiredDate,
      status: order.status,
      totalAmount: order.totalAmount || 0,
    })),
    orderStatusData: orderStatusData.filter((d) => d.value > 0),
  };
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="space-y-6">
      <DashboardHeader />

      {/* KPI Cards */}
      <DashboardKPICards
        kpis={{
          pendingOrders: data.kpis.pendingOrders,
          pendingOrdersValue: formatCurrency(data.kpis.pendingOrdersValue),
          criticalStock: data.kpis.criticalStock,
          activePOs: data.kpis.activePOs,
          activePOsValue: formatCurrency(data.kpis.activePOsValue),
          reorderAlerts: data.kpis.reorderAlerts,
        }}
      />

      {/* Alerts and Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AlertsPanel alerts={data.alerts} />
        <OrderStatusChart data={data.orderStatusData} />
      </div>

      {/* Recent Orders */}
      <RecentOrders orders={data.recentOrders} />
    </div>
  );
}
