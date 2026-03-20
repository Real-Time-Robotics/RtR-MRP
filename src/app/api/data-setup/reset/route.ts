// src/app/api/data-setup/reset/route.ts
// Resets all master/transactional data, preserving User and SystemSetting records

import { NextRequest, NextResponse } from "next/server";
import { withRoleAuth } from "@/lib/api/with-auth";
import prisma from "@/lib/prisma";

// Tables to preserve (never delete)
const PRESERVED_TABLES = [
  'users',
  'system_settings',
  'password_reset_tokens',
  'password_history',
  'password_policies',
  'mfa_devices',
  'mfa_challenges',
  'user_sessions',
  'notification_settings',
  '_prisma_migrations',
  // Tenant tables
  'Tenant',
  'TenantApiKey',
  'TenantInvitation',
  'TenantSubscription',
  'TenantUsageLog',
  'TenantWebhook',
];

export const POST = withRoleAuth(["admin"], async (request: NextRequest) => {
  const body = await request.json();

  if (body.confirm !== "RESET") {
    return NextResponse.json(
      { error: 'Confirmation required: send { confirm: "RESET" }' },
      { status: 400 }
    );
  }

  try {
    // Get all table names from the database
    const tables: { tablename: string }[] = await prisma.$queryRaw`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `;

    const tableNames = tables
      .map((t) => t.tablename)
      .filter((name) => !PRESERVED_TABLES.includes(name));

    // Truncate all non-preserved tables with CASCADE
    for (const table of tableNames) {
      try {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);
      } catch {
        // Table might have dependencies handled by CASCADE, skip errors
      }
    }

    // Recreate standard warehouses (they are infrastructure, not user data)
    const STANDARD_WAREHOUSES = [
      { code: "WH-RECEIVING", name: "Receiving Area", type: "RECEIVING", location: "Khu nhận hàng - Chờ kiểm tra QC", status: "active" },
      { code: "WH-QUARANTINE", name: "Quarantine", type: "QUARANTINE", location: "Khu cách ly - Hàng lỗi chờ xử lý", status: "active" },
      { code: "WH-MAIN", name: "Main Warehouse", type: "MAIN", location: "Austin, TX", status: "active" },
      { code: "WH-WIP", name: "Work-in-Progress", type: "WIP", location: "Khu sản xuất - Hàng đang gia công", status: "active" },
      { code: "WH-FG", name: "Finished Goods", type: "FINISHED_GOODS", location: "Kho thành phẩm - Hàng hoàn thành", status: "active" },
      { code: "WH-SHIP", name: "Shipping Area", type: "SHIPPING", location: "Khu xuất hàng - Chờ vận chuyển", status: "active" },
      { code: "WH-HOLD", name: "Hold Area", type: "HOLD", location: "Khu chờ xử lý - Hàng conditional", status: "active" },
      { code: "WH-SCRAP", name: "Scrap Area", type: "SCRAP", location: "Khu phế liệu - Hàng hủy chờ xử lý", status: "active" },
    ];

    for (const wh of STANDARD_WAREHOUSES) {
      await prisma.warehouse.upsert({
        where: { code: wh.code },
        create: wh,
        update: {},
      });
    }

    return NextResponse.json({ success: true, message: "All data reset successfully. 8 standard warehouses recreated." });
  } catch (error) {
    console.error("Reset failed:", error);
    return NextResponse.json(
      { error: "Reset failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});
