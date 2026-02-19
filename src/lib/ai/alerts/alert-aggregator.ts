// =============================================================================
// INTELLIGENT ALERTS - Alert Aggregator
// Collects alerts from all AI sources and enriches them
// =============================================================================

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';
import {
  Alert,
  AlertType,
  AlertPriority,
  AlertSource,
  AlertStatus,
  AlertActionType,
  AlertAction,
  AlertEntity,
  AlertData,
  CreateAlertInput,
  PRIORITY_RULES,
  StockoutAlertData,
  QualityAlertData,
  SupplierAlertData,
  POAlertData,
  ScheduleAlertData,
} from './alert-types';

// =============================================================================
// ALERT AGGREGATOR CLASS
// =============================================================================

export class AlertAggregator {
  private static instance: AlertAggregator;

  private constructor() {}

  static getInstance(): AlertAggregator {
    if (!AlertAggregator.instance) {
      AlertAggregator.instance = new AlertAggregator();
    }
    return AlertAggregator.instance;
  }

  // ===========================================================================
  // MAIN COLLECTION METHOD
  // ===========================================================================

  async collectAllAlerts(): Promise<Alert[]> {
    const alerts: Alert[] = [];

    // Collect from all sources in parallel
    const [
      forecastAlerts,
      qualityAlerts,
      supplierAlerts,
      poAlerts,
      scheduleAlerts,
    ] = await Promise.all([
      this.collectFromForecast(),
      this.collectFromQuality(),
      this.collectFromSupplierRisk(),
      this.collectFromAutoPO(),
      this.collectFromAutoSchedule(),
    ]);

    alerts.push(...forecastAlerts);
    alerts.push(...qualityAlerts);
    alerts.push(...supplierAlerts);
    alerts.push(...poAlerts);
    alerts.push(...scheduleAlerts);

    // Deduplicate
    const deduplicated = this.deduplicateAlerts(alerts);

    // Enrich with additional context
    const enriched = await this.enrichAlerts(deduplicated);

    return enriched;
  }

  // ===========================================================================
  // FORECAST ALERTS
  // ===========================================================================

  async collectFromForecast(): Promise<Alert[]> {
    const alerts: Alert[] = [];

    try {
      // Get parts with low inventory
      const partsWithLowStock = await prisma.part.findMany({
        where: {
          status: 'active',
        },
        include: {
          inventory: true,
          poLines: {
            where: {
              po: {
                status: { in: ['approved', 'sent', 'acknowledged', 'partial'] },
              },
            },
            include: {
              po: true,
            },
          },
        },
      });

      // Pre-compute average daily demand per part from recent sales order data (last 90 days)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const recentDemand = await prisma.salesOrderLine.groupBy({
        by: ['productId'],
        _sum: { quantity: true },
        where: {
          order: {
            orderDate: { gte: ninetyDaysAgo },
            status: { notIn: ['draft', 'cancelled'] },
          },
        },
      });

      // Map productId -> avg daily demand (total qty / 90 days)
      const demandByProduct = new Map<string, number>();
      for (const row of recentDemand) {
        demandByProduct.set(row.productId, (row._sum.quantity || 0) / 90);
      }

      // Also get BOM mappings so we can translate product demand to part demand
      const bomLines = await prisma.bomLine.findMany({
        select: {
          partId: true,
          quantity: true,
          bom: { select: { productId: true } },
        },
      });

      // partId -> avg daily demand (sum across all products that use this part)
      const demandByPart = new Map<string, number>();
      for (const bl of bomLines) {
        const productDemand = demandByProduct.get(bl.bom.productId) || 0;
        const partDemand = productDemand * bl.quantity;
        demandByPart.set(bl.partId, (demandByPart.get(bl.partId) || 0) + partDemand);
      }

      for (const part of partsWithLowStock) {
        const totalInventory = part.inventory.reduce(
          (sum, inv) => sum + inv.quantity - inv.reservedQty,
          0
        );

        // Calculate days of supply from actual sales order demand (fallback to 1 if no data)
        const avgDailyDemand = demandByPart.get(part.id) || 1;
        const daysOfSupply = avgDailyDemand > 0 ? totalInventory / avgDailyDemand : 999;

        // Check for stockout alert
        if (daysOfSupply <= 7 && totalInventory < part.reorderPoint) {
          const alertData: StockoutAlertData = {
            partId: part.id,
            partNumber: part.partNumber,
            partName: part.name,
            currentStock: totalInventory,
            daysOfSupply: Math.round(daysOfSupply),
            reorderPoint: part.reorderPoint,
            safetyStock: part.safetyStock,
            demandRate: avgDailyDemand,
          };

          const priority = daysOfSupply <= 3
            ? AlertPriority.CRITICAL
            : daysOfSupply <= 5
              ? AlertPriority.HIGH
              : AlertPriority.MEDIUM;

          alerts.push(this.createAlert({
            type: AlertType.STOCKOUT,
            priority,
            source: AlertSource.FORECAST,
            title: `Sắp hết hàng: ${part.partNumber}`,
            message: `Part ${part.name} còn ${totalInventory} đơn vị, dự kiến hết sau ${Math.round(daysOfSupply)} ngày.`,
            aiSuggestion: `Đề xuất đặt hàng ngay để tránh stockout. Kiểm tra PO suggestions có sẵn.`,
            entities: [
              { type: 'part', id: part.id, name: part.name, code: part.partNumber },
            ],
            data: alertData,
            actions: [
              {
                id: 'view-po-suggestions',
                label: 'Xem PO Suggestions',
                type: AlertActionType.NAVIGATE,
                url: `/ai/auto-po?partId=${part.id}`,
                isPrimary: true,
              },
              {
                id: 'view-part',
                label: 'Xem Part',
                type: AlertActionType.NAVIGATE,
                url: `/parts/${part.id}`,
              },
            ],
          }));
        }

        // Check for reorder point alert
        if (totalInventory <= part.reorderPoint && totalInventory > part.safetyStock) {
          const alertData: StockoutAlertData = {
            partId: part.id,
            partNumber: part.partNumber,
            partName: part.name,
            currentStock: totalInventory,
            daysOfSupply: Math.round(daysOfSupply),
            reorderPoint: part.reorderPoint,
            safetyStock: part.safetyStock,
            demandRate: avgDailyDemand,
          };

          alerts.push(this.createAlert({
            type: AlertType.REORDER,
            priority: AlertPriority.MEDIUM,
            source: AlertSource.FORECAST,
            title: `Đạt điểm đặt hàng: ${part.partNumber}`,
            message: `Part ${part.name} đã đạt reorder point (${part.reorderPoint}). Tồn kho hiện tại: ${totalInventory}.`,
            entities: [
              { type: 'part', id: part.id, name: part.name, code: part.partNumber },
            ],
            data: alertData,
            actions: [
              {
                id: 'view-po-suggestions',
                label: 'Xem PO Suggestions',
                type: AlertActionType.NAVIGATE,
                url: `/ai/auto-po?partId=${part.id}`,
                isPrimary: true,
              },
            ],
          }));
        }

        // Check for safety stock alert
        if (totalInventory < part.safetyStock && totalInventory > 0) {
          const alertData: StockoutAlertData = {
            partId: part.id,
            partNumber: part.partNumber,
            partName: part.name,
            currentStock: totalInventory,
            daysOfSupply: Math.round(daysOfSupply),
            reorderPoint: part.reorderPoint,
            safetyStock: part.safetyStock,
            demandRate: avgDailyDemand,
          };

          alerts.push(this.createAlert({
            type: AlertType.SAFETY_STOCK_LOW,
            priority: AlertPriority.HIGH,
            source: AlertSource.FORECAST,
            title: `Dưới tồn kho an toàn: ${part.partNumber}`,
            message: `Part ${part.name} dưới mức safety stock (${part.safetyStock}). Tồn kho hiện tại: ${totalInventory}.`,
            entities: [
              { type: 'part', id: part.id, name: part.name, code: part.partNumber },
            ],
            data: alertData,
            actions: [
              {
                id: 'view-po-suggestions',
                label: 'Đặt hàng ngay',
                type: AlertActionType.NAVIGATE,
                url: `/ai/auto-po?partId=${part.id}`,
                isPrimary: true,
              },
            ],
          }));
        }
      }
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'alert-aggregator', operation: 'collectForecastAlerts' });
    }

    return alerts;
  }

  // ===========================================================================
  // QUALITY ALERTS
  // ===========================================================================

  async collectFromQuality(): Promise<Alert[]> {
    const alerts: Alert[] = [];

    try {
      // Get parts with quality issues (from NCRs)
      const recentNCRs = await prisma.nCR.findMany({
        where: {
          status: { notIn: ['closed', 'cancelled'] },
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
        include: {
          part: true,
          product: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      // Group NCRs by part to find problematic parts
      const ncrsByPart = new Map<string, typeof recentNCRs>();
      for (const ncr of recentNCRs) {
        if (ncr.partId) {
          const existing = ncrsByPart.get(ncr.partId) || [];
          existing.push(ncr);
          ncrsByPart.set(ncr.partId, existing);
        }
      }

      // Generate alerts for parts with multiple NCRs
      for (const [partId, ncrs] of ncrsByPart) {
        if (ncrs.length >= 3) {
          const part = ncrs[0].part;
          if (!part) continue;

          const alertData: QualityAlertData = {
            partId: part.id,
            partNumber: part.partNumber,
            partName: part.name,
            riskScore: Math.min(100, ncrs.length * 20),
            defectRate: ncrs.length / 100, // Simplified calculation
            trend: 'declining',
          };

          alerts.push(this.createAlert({
            type: AlertType.QUALITY_RISK,
            priority: ncrs.length >= 5 ? AlertPriority.CRITICAL : AlertPriority.HIGH,
            source: AlertSource.QUALITY,
            title: `Rủi ro chất lượng cao: ${part.partNumber}`,
            message: `Part ${part.name} có ${ncrs.length} NCRs trong 30 ngày qua. Cần kiểm tra quy trình chất lượng.`,
            aiSuggestion: `Đề xuất review quy trình QC cho part này và xem xét đổi supplier nếu vấn đề từ nguồn cung.`,
            entities: [
              { type: 'part', id: part.id, name: part.name, code: part.partNumber },
            ],
            data: alertData,
            actions: [
              {
                id: 'view-ncrs',
                label: 'Xem NCRs',
                type: AlertActionType.NAVIGATE,
                url: `/quality/ncr?partId=${part.id}`,
                isPrimary: true,
              },
              {
                id: 'view-quality',
                label: 'Phân tích chất lượng',
                type: AlertActionType.NAVIGATE,
                url: `/ai/quality/${part.id}`,
              },
            ],
          }));
        }
      }

      // Check for critical inspections (failed)
      const failedInspections = await prisma.inspection.findMany({
        where: {
          result: 'fail',
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
        include: {
          part: true,
          product: true,
        },
        take: 20,
      });

      for (const inspection of failedInspections) {
        const entity = inspection.part || inspection.product;
        if (!entity) continue;

        const alertData: QualityAlertData = {
          partId: inspection.partId || '',
          partNumber: 'partNumber' in entity ? entity.partNumber : (entity as { sku?: string }).sku || '',
          partName: entity.name,
          riskScore: 80,
          trend: 'declining',
        };

        alerts.push(this.createAlert({
          type: AlertType.QUALITY_CRITICAL,
          priority: AlertPriority.CRITICAL,
          source: AlertSource.QUALITY,
          title: `Inspection failed: ${entity.name}`,
          message: `Inspection ID ${inspection.id.slice(0, 8)} failed. Cần xử lý ngay.`,
          entities: [
            {
              type: inspection.partId ? 'part' : 'product',
              id: inspection.partId || inspection.productId || '',
              name: entity.name,
            },
          ],
          data: alertData,
          actions: [
            {
              id: 'view-inspection',
              label: 'Xem chi tiết',
              type: AlertActionType.NAVIGATE,
              url: `/quality/inspections/${inspection.id}`,
              isPrimary: true,
            },
            {
              id: 'create-ncr',
              label: 'Tạo NCR',
              type: AlertActionType.CREATE,
              handler: 'createNCR',
              params: { inspectionId: inspection.id },
            },
          ],
        }));
      }
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'alert-aggregator', operation: 'collectQualityAlerts' });
    }

    return alerts;
  }

  // ===========================================================================
  // SUPPLIER RISK ALERTS
  // ===========================================================================

  async collectFromSupplierRisk(): Promise<Alert[]> {
    const alerts: Alert[] = [];

    try {
      // Get suppliers with recent delivery issues
      const suppliers = await prisma.supplier.findMany({
        where: { status: 'active' },
        include: {
          purchaseOrders: {
            where: {
              status: { in: ['approved', 'sent', 'acknowledged', 'partial'] },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });

      for (const supplier of suppliers) {
        // Check for late deliveries
        const lateDeliveries = supplier.purchaseOrders.filter(po => {
          if (!po.expectedDate) return false;
          return new Date() > po.expectedDate && po.status !== 'received';
        });

        if (lateDeliveries.length > 0) {
          for (const po of lateDeliveries) {
            const delayDays = Math.ceil(
              (Date.now() - (po.expectedDate?.getTime() || 0)) / (1000 * 60 * 60 * 24)
            );

            const alertData: SupplierAlertData = {
              supplierId: supplier.id,
              supplierName: supplier.name,
              riskScore: Math.min(100, 50 + delayDays * 5),
              riskLevel: delayDays > 5 ? 'critical' : delayDays > 3 ? 'high' : 'medium',
              riskFactors: [`Giao hàng trễ ${delayDays} ngày`],
              poId: po.id,
              poNumber: po.poNumber,
              expectedDate: po.expectedDate || undefined,
              delayDays,
            };

            alerts.push(this.createAlert({
              type: AlertType.SUPPLIER_DELIVERY,
              priority: delayDays > 5 ? AlertPriority.CRITICAL : AlertPriority.HIGH,
              source: AlertSource.SUPPLIER_RISK,
              title: `Giao hàng trễ: ${supplier.name}`,
              message: `PO ${po.poNumber} từ ${supplier.name} đã trễ ${delayDays} ngày. Expected: ${po.expectedDate?.toLocaleDateString('vi-VN')}.`,
              aiSuggestion: `Đề xuất liên hệ supplier để cập nhật ETA mới và xem xét tìm nguồn thay thế nếu cần.`,
              entities: [
                { type: 'supplier', id: supplier.id, name: supplier.name, code: supplier.code },
                { type: 'purchase_order', id: po.id, code: po.poNumber },
              ],
              data: alertData,
              actions: [
                {
                  id: 'contact-supplier',
                  label: 'Liên hệ Supplier',
                  type: AlertActionType.CONTACT,
                  handler: 'contactSupplier',
                  params: { supplierId: supplier.id, poId: po.id },
                  isPrimary: true,
                },
                {
                  id: 'view-po',
                  label: 'Xem PO',
                  type: AlertActionType.NAVIGATE,
                  url: `/purchasing/${po.id}`,
                },
                {
                  id: 'find-alternative',
                  label: 'Tìm nguồn thay thế',
                  type: AlertActionType.NAVIGATE,
                  url: `/ai/supplier-risk?findAlternative=true`,
                },
              ],
            }));
          }
        }

        // Check overall supplier risk
        const rating = supplier.rating || 0;
        if (rating < 3) {
          const alertData: SupplierAlertData = {
            supplierId: supplier.id,
            supplierName: supplier.name,
            riskScore: (5 - rating) * 20,
            riskLevel: rating < 2 ? 'high' : 'medium',
            riskFactors: [`Rating thấp: ${rating}/5`],
          };

          alerts.push(this.createAlert({
            type: AlertType.SUPPLIER_RISK,
            priority: rating < 2 ? AlertPriority.HIGH : AlertPriority.MEDIUM,
            source: AlertSource.SUPPLIER_RISK,
            title: `Supplier rating thấp: ${supplier.name}`,
            message: `${supplier.name} có rating ${rating}/5. Cần review và xem xét tìm nguồn thay thế.`,
            entities: [
              { type: 'supplier', id: supplier.id, name: supplier.name, code: supplier.code },
            ],
            data: alertData,
            actions: [
              {
                id: 'view-supplier',
                label: 'Xem chi tiết',
                type: AlertActionType.NAVIGATE,
                url: `/ai/supplier-risk/${supplier.id}`,
                isPrimary: true,
              },
            ],
          }));
        }
      }
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'alert-aggregator', operation: 'collectSupplierAlerts' });
    }

    return alerts;
  }

  // ===========================================================================
  // AUTO-PO ALERTS
  // ===========================================================================

  async collectFromAutoPO(): Promise<Alert[]> {
    const alerts: Alert[] = [];

    try {
      // Check for pending PO suggestions from approval queue
      // Since we're using mock/in-memory for approval queue, we'll check the database
      const pendingMrpSuggestions = await prisma.mrpSuggestion.findMany({
        where: {
          status: 'pending',
          actionType: 'purchase',
        },
        include: {
          part: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      for (const suggestion of pendingMrpSuggestions) {
        const pendingHours = Math.ceil(
          (Date.now() - suggestion.createdAt.getTime()) / (1000 * 60 * 60)
        );

        const quantity = suggestion.suggestedQty || 0;
        const alertData: POAlertData = {
          suggestionId: suggestion.id,
          partId: suggestion.partId,
          partNumber: suggestion.part.partNumber,
          partName: suggestion.part.name,
          supplierId: '',
          supplierName: '',
          quantity,
          estimatedCost: quantity * (suggestion.part.unitCost || 0),
          confidenceScore: 75, // Default confidence
          createdAt: suggestion.createdAt,
          pendingHours,
        };

        const priority = pendingHours > 48
          ? AlertPriority.HIGH
          : pendingHours > 24
            ? AlertPriority.MEDIUM
            : AlertPriority.LOW;

        if (pendingHours > 12) {
          alerts.push(this.createAlert({
            type: AlertType.PO_PENDING,
            priority,
            source: AlertSource.AUTO_PO,
            title: `PO suggestion chờ duyệt: ${suggestion.part.partNumber}`,
            message: `Suggestion đặt ${quantity} ${suggestion.part.name} đã chờ ${pendingHours} giờ. Cần review và phê duyệt.`,
            aiSuggestion: pendingHours > 24
              ? `Suggestion này đã chờ hơn 24 giờ. Đề xuất xử lý sớm để tránh stockout.`
              : undefined,
            entities: [
              { type: 'part', id: suggestion.partId, name: suggestion.part.name, code: suggestion.part.partNumber },
            ],
            data: alertData,
            actions: [
              {
                id: 'approve-po',
                label: 'Duyệt PO',
                type: AlertActionType.APPROVE,
                handler: 'approvePO',
                params: { suggestionId: suggestion.id },
                isPrimary: true,
              },
              {
                id: 'view-suggestion',
                label: 'Xem chi tiết',
                type: AlertActionType.NAVIGATE,
                url: `/ai/auto-po/${suggestion.id}`,
              },
              {
                id: 'reject-po',
                label: 'Từ chối',
                type: AlertActionType.REJECT,
                handler: 'rejectPO',
                params: { suggestionId: suggestion.id },
              },
            ],
          }));
        }
      }
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'alert-aggregator', operation: 'collectAutoPOAlerts' });
    }

    return alerts;
  }

  // ===========================================================================
  // AUTO-SCHEDULE ALERTS
  // ===========================================================================

  async collectFromAutoSchedule(): Promise<Alert[]> {
    const alerts: Alert[] = [];

    try {
      // Get work orders with potential conflicts or deadline risks
      const workOrders = await prisma.workOrder.findMany({
        where: {
          status: { in: ['planned', 'scheduled', 'in_progress'] },
        },
        include: {
          product: true,
          salesOrder: true,
          workCenterRef: true,
        },
        orderBy: { plannedStart: 'asc' },
        take: 100,
      });

      // Check for deadline risks
      for (const wo of workOrders) {
        const dueDate = wo.salesOrder?.requiredDate || wo.plannedEnd;
        if (!dueDate) continue;

        const daysUntilDue = Math.ceil(
          (dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );

        if (daysUntilDue <= 7 && daysUntilDue >= 0) {
          const alertData: ScheduleAlertData = {
            workOrderId: wo.id,
            woNumber: wo.woNumber,
            productName: wo.product.name,
            workCenterId: wo.workCenterId || undefined,
            workCenterName: wo.workCenterRef?.name,
            plannedStart: wo.plannedStart || undefined,
            plannedEnd: wo.plannedEnd || undefined,
            dueDate,
            daysUntilDue,
          };

          const priority = daysUntilDue <= 2
            ? AlertPriority.CRITICAL
            : daysUntilDue <= 5
              ? AlertPriority.HIGH
              : AlertPriority.MEDIUM;

          alerts.push(this.createAlert({
            type: AlertType.DEADLINE_RISK,
            priority,
            source: AlertSource.AUTO_SCHEDULE,
            title: `Deadline gần: ${wo.woNumber}`,
            message: `Work Order ${wo.woNumber} (${wo.product.name}) còn ${daysUntilDue} ngày đến deadline.`,
            aiSuggestion: daysUntilDue <= 2
              ? `Cần ưu tiên WO này ngay. Kiểm tra schedule optimizer để tối ưu.`
              : undefined,
            entities: [
              { type: 'work_order', id: wo.id, code: wo.woNumber },
              { type: 'product', id: wo.productId, name: wo.product.name },
            ],
            data: alertData,
            actions: [
              {
                id: 'view-schedule',
                label: 'Xem lịch trình',
                type: AlertActionType.NAVIGATE,
                url: `/ai/auto-schedule/${wo.id}`,
                isPrimary: true,
              },
              {
                id: 'optimize-schedule',
                label: 'Tối ưu lịch',
                type: AlertActionType.NAVIGATE,
                url: `/ai/auto-schedule?optimize=${wo.id}`,
              },
            ],
          }));
        }
      }

      // Check for overlapping work orders on same work center
      const workCenterWOs = new Map<string, typeof workOrders>();
      for (const wo of workOrders) {
        if (wo.workCenterId) {
          const existing = workCenterWOs.get(wo.workCenterId) || [];
          existing.push(wo);
          workCenterWOs.set(wo.workCenterId, existing);
        }
      }

      for (const [workCenterId, wos] of workCenterWOs) {
        // Sort by planned start
        wos.sort((a, b) =>
          (a.plannedStart?.getTime() || 0) - (b.plannedStart?.getTime() || 0)
        );

        // Check for overlaps
        for (let i = 0; i < wos.length - 1; i++) {
          const current = wos[i];
          const next = wos[i + 1];

          if (!current.plannedEnd || !next.plannedStart) continue;

          if (current.plannedEnd > next.plannedStart) {
            const overlapHours = Math.ceil(
              (current.plannedEnd.getTime() - next.plannedStart.getTime()) / (1000 * 60 * 60)
            );

            const alertData: ScheduleAlertData = {
              workOrderId: current.id,
              woNumber: current.woNumber,
              productName: current.product.name,
              conflictType: 'overlap',
              conflictWith: [next.woNumber],
              workCenterId,
              workCenterName: current.workCenterRef?.name,
              plannedStart: current.plannedStart || undefined,
              plannedEnd: current.plannedEnd,
            };

            alerts.push(this.createAlert({
              type: AlertType.SCHEDULE_CONFLICT,
              priority: AlertPriority.HIGH,
              source: AlertSource.AUTO_SCHEDULE,
              title: `Xung đột lịch: ${current.woNumber} vs ${next.woNumber}`,
              message: `Work Orders ${current.woNumber} và ${next.woNumber} overlap ${overlapHours} giờ trên ${current.workCenterRef?.name}.`,
              aiSuggestion: `Đề xuất move ${next.woNumber} sang slot sau để giải quyết conflict.`,
              entities: [
                { type: 'work_order', id: current.id, code: current.woNumber },
                { type: 'work_order', id: next.id, code: next.woNumber },
                { type: 'work_center', id: workCenterId, name: current.workCenterRef?.name },
              ],
              data: alertData,
              actions: [
                {
                  id: 'resolve-conflict',
                  label: 'Giải quyết',
                  type: AlertActionType.NAVIGATE,
                  url: `/ai/auto-schedule?conflict=${current.id},${next.id}`,
                  isPrimary: true,
                },
                {
                  id: 'view-gantt',
                  label: 'Xem Gantt',
                  type: AlertActionType.NAVIGATE,
                  url: `/ai/auto-schedule`,
                },
              ],
            }));
          }
        }
      }
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'alert-aggregator', operation: 'collectScheduleAlerts' });
    }

    return alerts;
  }

  // ===========================================================================
  // DEDUPLICATION
  // ===========================================================================

  deduplicateAlerts(alerts: Alert[]): Alert[] {
    const seen = new Map<string, Alert>();

    for (const alert of alerts) {
      // Create a unique key based on type and primary entity
      const primaryEntity = alert.entities[0];
      const key = `${alert.type}:${primaryEntity?.type}:${primaryEntity?.id}`;

      const existing = seen.get(key);
      if (!existing) {
        seen.set(key, alert);
      } else {
        // Keep the one with higher priority
        if (this.comparePriority(alert.priority, existing.priority) > 0) {
          seen.set(key, alert);
        }
      }
    }

    return Array.from(seen.values());
  }

  // ===========================================================================
  // ENRICHMENT
  // ===========================================================================

  async enrichAlerts(alerts: Alert[]): Promise<Alert[]> {
    // Add correlation IDs for related alerts
    const enriched: Alert[] = [];
    const correlationGroups = new Map<string, Alert[]>();

    for (const alert of alerts) {
      // Group by primary entity for correlation
      const primaryEntity = alert.entities[0];
      if (primaryEntity) {
        const correlationKey = `${primaryEntity.type}:${primaryEntity.id}`;
        const group = correlationGroups.get(correlationKey) || [];
        group.push(alert);
        correlationGroups.set(correlationKey, group);
      }
    }

    // Assign correlation IDs
    for (const [, group] of correlationGroups) {
      if (group.length > 1) {
        const correlationId = uuidv4();
        for (const alert of group) {
          alert.correlationId = correlationId;
          alert.relatedAlertIds = group
            .filter(a => a.id !== alert.id)
            .map(a => a.id);
        }
      }
      enriched.push(...group);
    }

    return enriched;
  }

  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================

  private createAlert(input: CreateAlertInput): Alert {
    const priority = input.priority || this.calculatePriority(input.type, input.data);

    return {
      id: uuidv4(),
      type: input.type,
      priority,
      source: input.source,
      status: AlertStatus.ACTIVE,
      title: input.title,
      message: input.message,
      aiSuggestion: input.aiSuggestion,
      entities: input.entities || [],
      data: input.data,
      actions: (input.actions || []).map((action, idx) => ({
        id: action.id || `action-${idx}`,
        label: action.label || 'Action',
        type: action.type || AlertActionType.VIEW_DETAILS,
        icon: action.icon,
        url: action.url,
        handler: action.handler,
        params: action.params,
        isPrimary: action.isPrimary || false,
      })),
      createdAt: new Date(),
      expiresAt: input.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days default
      isEscalated: false,
      correlationId: input.correlationId,
      metadata: input.metadata,
    };
  }

  private calculatePriority(type: AlertType, data: AlertData): AlertPriority {
    const rules = PRIORITY_RULES[type];
    if (!rules) return AlertPriority.MEDIUM;

    for (const condition of rules.conditions) {
      if (condition.condition(data)) {
        return condition.priority;
      }
    }

    return rules.default;
  }

  private comparePriority(a: AlertPriority, b: AlertPriority): number {
    const order = {
      [AlertPriority.CRITICAL]: 4,
      [AlertPriority.HIGH]: 3,
      [AlertPriority.MEDIUM]: 2,
      [AlertPriority.LOW]: 1,
    };
    return order[a] - order[b];
  }
}

// Singleton export
export const alertAggregator = AlertAggregator.getInstance();
export const getAlertAggregator = () => AlertAggregator.getInstance();
