// src/lib/notifications/trigger-service.ts
// Smart Notification Triggers for Work Session Context
// Checks for abandoned sessions, pending approvals, low stock, MRP suggestions

import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';
import { logger } from '@/lib/logger';

interface TriggerResult {
  trigger: string;
  notificationsCreated: number;
}

/**
 * Check for abandoned work sessions (idle > 2 hours without pause)
 */
async function checkAbandonedSessions(): Promise<TriggerResult> {
  let count = 0;
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

  try {
    const abandonedSessions = await prisma.workSession.findMany({
      where: {
        status: 'ACTIVE',
        lastActivityAt: { lt: twoHoursAgo },
      },
      include: {
        user: { select: { id: true, name: true } },
      },
      take: 50,
    });

    for (const session of abandonedSessions) {
      // Check if we already sent a notification for this session recently
      const existing = await prisma.notification.findFirst({
        where: {
          userId: session.userId,
          type: 'session_abandoned',
          sourceType: 'WorkSession',
          sourceId: session.id,
          createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });

      if (!existing) {
        await createNotification({
          userId: session.userId,
          type: 'session_abandoned',
          title: `Phien lam viec chua dong: ${session.entityNumber}`,
          message: `Ban co phien lam viec dang mo cho ${session.entityNumber} nhung chua co hoat dong trong 2 gio qua. Hay dong hoac tiep tuc.`,
          priority: 'normal',
          link: session.resumeUrl,
          sourceType: 'WorkSession',
          sourceId: session.id,
        });
        count++;
      }
    }
  } catch (error) {
    logger.error('[TriggerService] checkAbandonedSessions error', { error: String(error) });
  }

  return { trigger: 'abandoned_sessions', notificationsCreated: count };
}

/**
 * Check for pending PO approvals (status = pending_approval for > 24h)
 */
async function checkPendingApprovals(): Promise<TriggerResult> {
  let count = 0;
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    const pendingPOs = await prisma.purchaseOrder.findMany({
      where: {
        status: { in: ['pending_approval', 'pending'] },
        updatedAt: { lt: oneDayAgo },
      },
      select: {
        id: true,
        poNumber: true,
        totalAmount: true,
      },
      take: 20,
    });

    // Get admin users to notify
    const admins = await prisma.user.findMany({
      where: { role: { in: ['admin', 'manager'] }, status: 'active' },
      select: { id: true },
    });

    for (const po of pendingPOs) {
      for (const admin of admins) {
        const existing = await prisma.notification.findFirst({
          where: {
            userId: admin.id,
            type: 'pending_approval',
            sourceType: 'PurchaseOrder',
            sourceId: po.id,
            createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        });

        if (!existing) {
          await createNotification({
            userId: admin.id,
            type: 'pending_approval',
            title: `PO cho phe duyet: ${po.poNumber}`,
            message: `${po.poNumber} dang cho phe duyet hon 24 gio.`,
            priority: 'high',
            link: `/purchasing/${po.id}`,
            sourceType: 'PurchaseOrder',
            sourceId: po.id,
          });
          count++;
        }
      }
    }
  } catch (error) {
    logger.error('[TriggerService] checkPendingApprovals error', { error: String(error) });
  }

  return { trigger: 'pending_approvals', notificationsCreated: count };
}

/**
 * Check for low stock items below safety stock
 */
async function checkLowStock(): Promise<TriggerResult> {
  let count = 0;

  try {
    // Find items where current stock is below safety stock
    const lowStockItems = await prisma.$queryRaw<
      { id: string; partNumber: string; name: string; totalQty: number; safetyStock: number }[]
    >`
      SELECT p.id, p."partNumber", p.name,
        COALESCE(SUM(i.quantity), 0)::int as "totalQty",
        COALESCE(p."safetyStock", 0) as "safetyStock"
      FROM parts p
      LEFT JOIN inventory i ON i."partId" = p.id
      WHERE p."safetyStock" > 0
      GROUP BY p.id, p."partNumber", p.name, p."safetyStock"
      HAVING COALESCE(SUM(i.quantity), 0) < p."safetyStock"
      LIMIT 20
    `;

    // Get admins/managers to notify
    const admins = await prisma.user.findMany({
      where: { role: { in: ['admin', 'manager', 'inventory_manager'] }, status: 'active' },
      select: { id: true },
    });

    for (const item of lowStockItems) {
      for (const admin of admins) {
        const existing = await prisma.notification.findFirst({
          where: {
            userId: admin.id,
            type: 'low_stock',
            sourceType: 'Part',
            sourceId: item.id,
            createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        });

        if (!existing) {
          await createNotification({
            userId: admin.id,
            type: 'low_stock',
            title: `Ton kho thap: ${item.partNumber}`,
            message: `${item.name} (${item.partNumber}) con ${item.totalQty} / safety stock ${item.safetyStock}.`,
            priority: 'high',
            link: `/inventory?filter=low-stock`,
            sourceType: 'Part',
            sourceId: item.id,
          });
          count++;
        }
      }
    }
  } catch (error) {
    logger.error('[TriggerService] checkLowStock error', { error: String(error) });
  }

  return { trigger: 'low_stock', notificationsCreated: count };
}

/**
 * Check for unprocessed MRP suggestions
 */
async function checkMRPSuggestions(): Promise<TriggerResult> {
  let count = 0;

  try {
    const recentRuns = await prisma.mrpRun.findMany({
      where: {
        status: 'completed',
        completedAt: { gt: new Date(Date.now() - 48 * 60 * 60 * 1000) },
      },
      select: {
        id: true,
        runNumber: true,
        purchaseSuggestions: true,
        createdBy: true,
      },
      take: 5,
    });

    for (const run of recentRuns) {
      if ((run.purchaseSuggestions || 0) > 0) {
        const targetUserId = run.createdBy;
        if (!targetUserId) continue;

        const existing = await prisma.notification.findFirst({
          where: {
            userId: targetUserId,
            type: 'mrp_suggestion',
            sourceType: 'MrpRun',
            sourceId: run.id,
          },
        });

        if (!existing) {
          await createNotification({
            userId: targetUserId,
            type: 'mrp_suggestion',
            title: `MRP ${run.runNumber}: ${run.purchaseSuggestions} de xuat mua hang`,
            message: `Ket qua MRP ${run.runNumber} co ${run.purchaseSuggestions} de xuat mua hang can xu ly.`,
            priority: 'normal',
            link: `/mrp/${run.id}`,
            sourceType: 'MrpRun',
            sourceId: run.id,
          });
          count++;
        }
      }
    }
  } catch (error) {
    logger.error('[TriggerService] checkMRPSuggestions error', { error: String(error) });
  }

  return { trigger: 'mrp_suggestions', notificationsCreated: count };
}

/**
 * Run all notification triggers
 */
export async function runNotificationTriggers(): Promise<TriggerResult[]> {
  const results: TriggerResult[] = [];

  results.push(await checkAbandonedSessions());
  results.push(await checkPendingApprovals());
  results.push(await checkLowStock());
  results.push(await checkMRPSuggestions());

  const total = results.reduce((sum, r) => sum + r.notificationsCreated, 0);
  logger.info(`[TriggerService] Created ${total} notifications from ${results.length} triggers`);

  return results;
}
