// src/lib/inventory/expiry-alert-service.ts
// R06: Expiry date alerts and expired lot detection

import { prisma } from "@/lib/prisma";

interface ExpiryAlert {
  inventoryId: string;
  partId: string;
  partNumber: string;
  partName: string;
  warehouseCode: string;
  lotNumber: string | null;
  quantity: number;
  expiryDate: Date;
  daysUntilExpiry: number;
  severity: "expired" | "critical" | "warning" | "info";
}

interface ExpiryAlertSummary {
  expired: ExpiryAlert[];
  critical: ExpiryAlert[];
  warning: ExpiryAlert[];
  totalExpiredQty: number;
  totalAtRiskQty: number;
}

/**
 * Get all inventory lots approaching or past expiry date.
 *
 * @param warningDays - Days before expiry to start warning (default 30)
 * @param criticalDays - Days before expiry for critical alert (default 7)
 */
export async function getExpiryAlerts(
  warningDays: number = 30,
  criticalDays: number = 7
): Promise<ExpiryAlertSummary> {
  const now = new Date();
  const warningDate = new Date(now);
  warningDate.setDate(warningDate.getDate() + warningDays);

  // Get all inventory with expiry dates within warning window or already expired
  const inventory = await prisma.inventory.findMany({
    where: {
      expiryDate: { lte: warningDate },
      quantity: { gt: 0 },
    },
    include: {
      part: { select: { partNumber: true, name: true } },
      warehouse: { select: { code: true } },
    },
    orderBy: { expiryDate: "asc" },
  });

  const expired: ExpiryAlert[] = [];
  const critical: ExpiryAlert[] = [];
  const warning: ExpiryAlert[] = [];

  for (const inv of inventory) {
    if (!inv.expiryDate) continue;

    const daysUntilExpiry = Math.floor(
      (inv.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    let severity: ExpiryAlert["severity"];
    if (daysUntilExpiry < 0) {
      severity = "expired";
    } else if (daysUntilExpiry <= criticalDays) {
      severity = "critical";
    } else {
      severity = "warning";
    }

    const alert: ExpiryAlert = {
      inventoryId: inv.id,
      partId: inv.partId,
      partNumber: inv.part.partNumber,
      partName: inv.part.name,
      warehouseCode: inv.warehouse.code,
      lotNumber: inv.lotNumber,
      quantity: inv.quantity,
      expiryDate: inv.expiryDate,
      daysUntilExpiry,
      severity,
    };

    switch (severity) {
      case "expired":
        expired.push(alert);
        break;
      case "critical":
        critical.push(alert);
        break;
      case "warning":
        warning.push(alert);
        break;
    }
  }

  const totalExpiredQty = expired.reduce((sum, a) => sum + a.quantity, 0);
  const totalAtRiskQty = critical.reduce((sum, a) => sum + a.quantity, 0);

  return {
    expired,
    critical,
    warning,
    totalExpiredQty,
    totalAtRiskQty,
  };
}

/**
 * Get expiry status for a specific lot (used in lot selection UI).
 */
export function getLotExpiryStatus(
  expiryDate: Date | null,
  warningDays: number = 30,
  criticalDays: number = 7
): { status: "ok" | "warning" | "critical" | "expired" | "no_expiry"; daysLeft: number | null } {
  if (!expiryDate) return { status: "no_expiry", daysLeft: null };

  const now = new Date();
  const daysLeft = Math.floor(
    (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysLeft < 0) return { status: "expired", daysLeft };
  if (daysLeft <= criticalDays) return { status: "critical", daysLeft };
  if (daysLeft <= warningDays) return { status: "warning", daysLeft };
  return { status: "ok", daysLeft };
}
