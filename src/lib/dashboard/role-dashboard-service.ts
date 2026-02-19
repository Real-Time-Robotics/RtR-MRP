// src/lib/dashboard/role-dashboard-service.ts
// R19: Role-based dashboard — return KPIs and data tailored to each user role

import { prisma } from "@/lib/prisma";

type UserRole = "admin" | "manager" | "operator" | "viewer";

interface DashboardKPI {
  label: string;
  labelVi: string;
  value: number | string;
  change?: number; // % change from previous period
  trend?: "up" | "down" | "stable";
  severity?: "success" | "warning" | "danger" | "info";
}

interface DashboardSection {
  title: string;
  titleVi: string;
  kpis: DashboardKPI[];
}

interface RoleDashboardData {
  role: UserRole;
  sections: DashboardSection[];
  alerts: DashboardAlert[];
  quickActions: QuickAction[];
}

interface DashboardAlert {
  type: "warning" | "danger" | "info";
  message: string;
  messageVi: string;
  link?: string;
  count?: number;
}

interface QuickAction {
  label: string;
  labelVi: string;
  action: string; // URL path
  icon: string;
}

/**
 * Get role-specific dashboard data.
 * Each role sees different KPIs, alerts, and quick actions.
 */
export async function getRoleDashboard(
  userId: string,
  role: UserRole
): Promise<RoleDashboardData> {
  switch (role) {
    case "admin":
      return getAdminDashboard();
    case "manager":
      return getManagerDashboard();
    case "operator":
      return getOperatorDashboard(userId);
    case "viewer":
      return getViewerDashboard();
    default:
      return getViewerDashboard();
  }
}

async function getAdminDashboard(): Promise<RoleDashboardData> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    totalOrders,
    pendingOrders,
    activeWOs,
    overdueWOs,
    lowStockParts,
    openNCRs,
    pendingApprovals,
    totalRevenue,
  ] = await Promise.all([
    prisma.salesOrder.count(),
    prisma.salesOrder.count({ where: { status: "pending" } }),
    prisma.workOrder.count({ where: { status: { in: ["in_progress", "released"] } } }),
    prisma.workOrder.count({
      where: { status: { in: ["in_progress", "released"] }, plannedEnd: { lt: now } },
    }),
    // Low stock: raw SQL count where inventory.quantity <= part.reorderPoint
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT p.id)::bigint as count FROM parts p
      JOIN inventory i ON i."partId" = p.id
      WHERE p.status = 'active' AND i.quantity <= p."reorderPoint" AND p."reorderPoint" > 0
    `.then((r) => Number(r[0]?.count || 0)),
    prisma.nCR.count({ where: { status: { notIn: ["closed", "voided", "completed"] } } }),
    prisma.workflowInstance.count({ where: { status: "PENDING" } }),
    prisma.salesInvoice.aggregate({
      where: { invoiceDate: { gte: thirtyDaysAgo }, status: { not: "VOID" } },
      _sum: { totalAmount: true },
    }),
  ]);

  const alerts: DashboardAlert[] = [];
  if (overdueWOs > 0) {
    alerts.push({
      type: "danger",
      message: `${overdueWOs} work orders are overdue`,
      messageVi: `${overdueWOs} lệnh sản xuất quá hạn`,
      link: "/work-orders?filter=overdue",
      count: overdueWOs,
    });
  }
  if (openNCRs > 0) {
    alerts.push({
      type: "warning",
      message: `${openNCRs} open quality issues`,
      messageVi: `${openNCRs} vấn đề chất lượng đang mở`,
      link: "/quality/ncr",
      count: openNCRs,
    });
  }
  if (pendingApprovals > 0) {
    alerts.push({
      type: "info",
      message: `${pendingApprovals} items awaiting approval`,
      messageVi: `${pendingApprovals} mục chờ phê duyệt`,
      link: "/approvals",
      count: pendingApprovals,
    });
  }

  return {
    role: "admin",
    sections: [
      {
        title: "Business Overview",
        titleVi: "Tổng quan kinh doanh",
        kpis: [
          { label: "Total Orders", labelVi: "Tổng đơn hàng", value: totalOrders },
          { label: "Pending Orders", labelVi: "Đơn hàng chờ", value: pendingOrders, severity: pendingOrders > 10 ? "warning" : "info" },
          { label: "Monthly Revenue", labelVi: "Doanh thu tháng", value: `${((totalRevenue._sum.totalAmount || 0) / 1000000).toFixed(1)}M` },
        ],
      },
      {
        title: "Production",
        titleVi: "Sản xuất",
        kpis: [
          { label: "Active WOs", labelVi: "LSX đang chạy", value: activeWOs },
          { label: "Overdue WOs", labelVi: "LSX quá hạn", value: overdueWOs, severity: overdueWOs > 0 ? "danger" : "success" },
        ],
      },
      {
        title: "Quality & Inventory",
        titleVi: "Chất lượng & Tồn kho",
        kpis: [
          { label: "Open NCRs", labelVi: "NCR đang mở", value: openNCRs, severity: openNCRs > 5 ? "danger" : "info" },
          { label: "Low Stock Items", labelVi: "Hàng sắp hết", value: lowStockParts, severity: lowStockParts > 0 ? "warning" : "success" },
          { label: "Pending Approvals", labelVi: "Chờ phê duyệt", value: pendingApprovals },
        ],
      },
    ],
    alerts,
    quickActions: [
      { label: "Run MRP", labelVi: "Chạy MRP", action: "/mrp", icon: "play" },
      { label: "Review Approvals", labelVi: "Phê duyệt", action: "/approvals", icon: "check-circle" },
      { label: "View Reports", labelVi: "Xem báo cáo", action: "/reports", icon: "bar-chart" },
      { label: "System Settings", labelVi: "Cài đặt", action: "/settings", icon: "settings" },
    ],
  };
}

async function getManagerDashboard(): Promise<RoleDashboardData> {
  const now = new Date();
  const [
    activeWOs,
    completedThisWeek,
    pendingPOs,
    openNCRs,
    pendingApprovals,
  ] = await Promise.all([
    prisma.workOrder.count({ where: { status: { in: ["in_progress", "released"] } } }),
    prisma.workOrder.count({
      where: {
        status: "completed",
        actualEnd: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.purchaseOrder.count({ where: { status: { in: ["draft", "sent"] } } }),
    prisma.nCR.count({ where: { status: { notIn: ["closed", "voided", "completed"] } } }),
    prisma.workflowInstance.count({ where: { status: "PENDING" } }),
  ]);

  return {
    role: "manager",
    sections: [
      {
        title: "Production Status",
        titleVi: "Tình trạng sản xuất",
        kpis: [
          { label: "Active WOs", labelVi: "LSX đang chạy", value: activeWOs },
          { label: "Completed (7d)", labelVi: "Hoàn thành (7 ngày)", value: completedThisWeek },
          { label: "Pending POs", labelVi: "PO chờ xử lý", value: pendingPOs },
        ],
      },
      {
        title: "Quality & Approvals",
        titleVi: "Chất lượng & Phê duyệt",
        kpis: [
          { label: "Open NCRs", labelVi: "NCR đang mở", value: openNCRs, severity: openNCRs > 3 ? "warning" : "info" },
          { label: "Pending Approvals", labelVi: "Chờ phê duyệt", value: pendingApprovals, severity: pendingApprovals > 0 ? "warning" : "success" },
        ],
      },
    ],
    alerts: [],
    quickActions: [
      { label: "Review Approvals", labelVi: "Phê duyệt", action: "/approvals", icon: "check-circle" },
      { label: "View Production", labelVi: "Xem sản xuất", action: "/work-orders", icon: "factory" },
      { label: "Create PO", labelVi: "Tạo PO", action: "/purchase-orders/new", icon: "plus" },
    ],
  };
}

async function getOperatorDashboard(userId: string): Promise<RoleDashboardData> {
  const [
    myWOs,
    myCompletedToday,
    pendingInspections,
  ] = await Promise.all([
    prisma.workOrder.count({
      where: { assignedTo: userId, status: { in: ["in_progress", "released"] } },
    }),
    prisma.workOrder.count({
      where: {
        assignedTo: userId,
        status: "completed",
        actualEnd: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
    prisma.inspection.count({ where: { status: "pending" } }),
  ]);

  return {
    role: "operator",
    sections: [
      {
        title: "My Work",
        titleVi: "Công việc của tôi",
        kpis: [
          { label: "My Active WOs", labelVi: "LSX của tôi", value: myWOs },
          { label: "Completed Today", labelVi: "Hoàn thành hôm nay", value: myCompletedToday },
          { label: "Pending Inspections", labelVi: "Kiểm tra chờ", value: pendingInspections },
        ],
      },
    ],
    alerts: [],
    quickActions: [
      { label: "My Work Orders", labelVi: "LSX của tôi", action: "/work-orders?assignedTo=me", icon: "clipboard" },
      { label: "Log Labor", labelVi: "Ghi nhân công", action: "/labor", icon: "clock" },
      { label: "Report Issue", labelVi: "Báo lỗi", action: "/quality/ncr/new", icon: "alert-triangle" },
    ],
  };
}

async function getViewerDashboard(): Promise<RoleDashboardData> {
  const [totalOrders, activeWOs, totalInventoryValue] = await Promise.all([
    prisma.salesOrder.count({ where: { status: { notIn: ["cancelled"] } } }),
    prisma.workOrder.count({ where: { status: { in: ["in_progress", "released"] } } }),
    prisma.inventory.aggregate({
      where: { quantity: { gt: 0 } },
      _sum: { quantity: true },
    }),
  ]);

  return {
    role: "viewer",
    sections: [
      {
        title: "Overview",
        titleVi: "Tổng quan",
        kpis: [
          { label: "Total Orders", labelVi: "Tổng đơn hàng", value: totalOrders },
          { label: "Active WOs", labelVi: "LSX đang chạy", value: activeWOs },
          { label: "Total Stock", labelVi: "Tổng tồn kho", value: totalInventoryValue._sum.quantity || 0 },
        ],
      },
    ],
    alerts: [],
    quickActions: [
      { label: "View Orders", labelVi: "Xem đơn hàng", action: "/sales-orders", icon: "list" },
      { label: "View Inventory", labelVi: "Xem tồn kho", action: "/inventory", icon: "package" },
    ],
  };
}
