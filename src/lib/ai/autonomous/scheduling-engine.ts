// =============================================================================
// SCHEDULING ENGINE - Automatic Production Scheduling
// =============================================================================
// Core engine for analyzing work orders and generating optimal schedules
// Part of Phase 3: Autonomous Operations - Auto-Scheduling Feature
// =============================================================================

import prisma from '@/lib/prisma';

// =============================================================================
// INTERNAL HELPER TYPES (for Prisma query results and method signatures)
// =============================================================================

interface WorkOrderWithOperations {
  id: string;
  woNumber: string;
  quantity: number;
  completedQty: number;
  plannedStart: Date | null;
  plannedEnd: Date | null;
  status: string;
  operations?: WorkOrderOperationRecord[];
  [key: string]: unknown;
}

interface WorkOrderOperationRecord {
  plannedSetupTime: number;
  plannedRunTime: number;
  [key: string]: unknown;
}

interface ScheduledWorkOrder {
  id: string;
  woNumber: string;
  plannedStart: Date | null;
  plannedEnd: Date | null;
  status: string;
  operations: { workCenterId: string }[];
  [key: string]: unknown;
}

// =============================================================================
// TYPES
// =============================================================================

export interface WorkOrderScheduleInfo {
  id: string;
  woNumber: string;
  productId: string;
  productName: string;
  productCode: string;
  quantity: number;
  completedQty: number;
  remainingQty: number;
  priority: WorkOrderPriority;
  status: string;
  salesOrderId: string | null;
  salesOrderNumber: string | null;
  dueDate: Date | null;
  plannedStart: Date | null;
  plannedEnd: Date | null;
  actualStart: Date | null;
  workCenterId: string | null;
  workCenterName: string | null;
  estimatedDuration: number; // in hours
  operations: OperationInfo[];
  materialStatus: MaterialStatus;
  predecessors: string[];
  successors: string[];
}

export interface OperationInfo {
  id: string;
  operationNumber: number;
  name: string;
  workCenterId: string;
  workCenterName: string;
  plannedSetupTime: number;
  plannedRunTime: number;
  plannedStartDate: Date | null;
  plannedEndDate: Date | null;
  status: string;
  quantityPlanned: number;
  quantityCompleted: number;
}

export interface MaterialStatus {
  allAvailable: boolean;
  availablePercentage: number;
  shortages: MaterialShortage[];
  expectedReadyDate: Date | null;
}

export interface MaterialShortage {
  partId: string;
  partNumber: string;
  partName: string;
  requiredQty: number;
  availableQty: number;
  shortageQty: number;
  expectedArrival: Date | null;
  pendingPOQty: number;
}

export interface WorkCenterCapacityInfo {
  id: string;
  code: string;
  name: string;
  type: string;
  capacityPerDay: number; // hours
  efficiency: number;
  workingHoursStart: string;
  workingHoursEnd: string;
  breakMinutes: number;
  workingDays: number[];
  maxConcurrentJobs: number;
  dailyCapacity: DailyCapacity[];
}

export interface DailyCapacity {
  date: Date;
  availableHours: number;
  scheduledHours: number;
  remainingHours: number;
  utilization: number;
  scheduledWorkOrders: ScheduledSlot[];
  isHoliday: boolean;
  maintenanceHours: number;
}

export interface ScheduledSlot {
  workOrderId: string;
  woNumber: string;
  operationId: string | null;
  startTime: Date;
  endTime: Date;
  durationHours: number;
  status: string;
}

export type WorkOrderPriority = 'critical' | 'high' | 'normal' | 'low';

export interface ScheduleSuggestion {
  id: string;
  workOrderId: string;
  woNumber: string;
  productName: string;
  currentSchedule: {
    workCenterId: string | null;
    workCenterName: string | null;
    startDate: Date | null;
    endDate: Date | null;
  };
  suggestedSchedule: {
    workCenterId: string;
    workCenterName: string;
    startDate: Date;
    endDate: Date;
  };
  operations: OperationSuggestion[];
  changeType: 'new' | 'reschedule' | 'split' | 'move';
  reason: string;
  impact: ScheduleImpact;
  priority: number; // 1-100, higher = more important
  confidenceScore: number; // 0-100
  createdAt: Date;
}

export interface OperationSuggestion {
  operationId: string;
  operationNumber: number;
  operationName: string;
  workCenterId: string;
  workCenterName: string;
  startDate: Date;
  endDate: Date;
  durationHours: number;
}

export interface ScheduleImpact {
  onTimeDeliveryChange: number; // percentage points
  capacityUtilizationChange: number;
  setupTimeChange: number; // hours
  conflictsResolved: number;
  affectedWorkOrders: string[];
}

export interface ScheduleResult {
  id: string;
  createdAt: Date;
  algorithm: SchedulingAlgorithm;
  horizon: {
    startDate: Date;
    endDate: Date;
    days: number;
  };
  workOrdersAnalyzed: number;
  suggestions: ScheduleSuggestion[];
  metrics: ScheduleMetrics;
  conflicts: ScheduleConflict[];
  warnings: ScheduleWarning[];
}

export interface ScheduleMetrics {
  currentOnTimeDelivery: number;
  projectedOnTimeDelivery: number;
  currentCapacityUtilization: number;
  projectedCapacityUtilization: number;
  currentSetupTime: number;
  projectedSetupTime: number;
  makespan: number; // total days to complete all WOs
  conflictCount: number;
  unscheduledCount: number;
}

export interface ScheduleConflict {
  type: 'overlap' | 'overload' | 'material_shortage' | 'due_date_risk' | 'resource_unavailable';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  affectedWorkOrders: string[];
  affectedWorkCenters: string[];
  suggestedResolution: string;
  autoResolvable: boolean;
}

export interface ScheduleWarning {
  type: 'capacity_low' | 'due_date_tight' | 'material_pending' | 'long_queue';
  message: string;
  affectedEntities: string[];
  recommendation: string;
}

export type SchedulingAlgorithm =
  | 'priority_first'
  | 'due_date_first'
  | 'shortest_first'
  | 'setup_minimize'
  | 'balanced_load'
  | 'genetic';

export interface SchedulingOptions {
  algorithm: SchedulingAlgorithm;
  horizonDays: number;
  respectDueDates: boolean;
  minimizeSetup: boolean;
  balanceWorkload: boolean;
  allowSplitting: boolean;
  allowOvertime: boolean;
  maxOvertimeHoursPerDay: number;
  includeUnscheduled: boolean;
  workCenterIds?: string[];
  workOrderIds?: string[];
  excludeStatuses?: string[];
}

export interface ScheduleFilter {
  workCenterIds?: string[];
  workOrderIds?: string[];
  statuses?: string[];
  priorities?: WorkOrderPriority[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  hasDueDate?: boolean;
  isCritical?: boolean;
}

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

export const DEFAULT_SCHEDULING_OPTIONS: SchedulingOptions = {
  algorithm: 'priority_first',
  horizonDays: 14,
  respectDueDates: true,
  minimizeSetup: true,
  balanceWorkload: true,
  allowSplitting: false,
  allowOvertime: false,
  maxOvertimeHoursPerDay: 2,
  includeUnscheduled: true,
  excludeStatuses: ['completed', 'cancelled', 'on_hold'],
};

// =============================================================================
// SCHEDULING ENGINE CLASS
// =============================================================================

export class SchedulingEngine {
  private static instance: SchedulingEngine;

  private constructor() {}

  public static getInstance(): SchedulingEngine {
    if (!SchedulingEngine.instance) {
      SchedulingEngine.instance = new SchedulingEngine();
    }
    return SchedulingEngine.instance;
  }

  // ===========================================================================
  // ANALYZE WORK ORDERS
  // ===========================================================================

  async analyzeWorkOrders(filter?: ScheduleFilter): Promise<WorkOrderScheduleInfo[]> {
    const where: Record<string, unknown> = {
      status: {
        notIn: ['completed', 'cancelled'],
      },
    };

    if (filter?.workOrderIds?.length) {
      where.id = { in: filter.workOrderIds };
    }

    if (filter?.workCenterIds?.length) {
      where.workCenterId = { in: filter.workCenterIds };
    }

    if (filter?.statuses?.length) {
      where.status = { in: filter.statuses };
    }

    if (filter?.priorities?.length) {
      where.priority = { in: filter.priorities };
    }

    if (filter?.dateRange) {
      where.OR = [
        {
          plannedStart: {
            gte: filter.dateRange.start,
            lte: filter.dateRange.end,
          },
        },
        {
          plannedEnd: {
            gte: filter.dateRange.start,
            lte: filter.dateRange.end,
          },
        },
      ];
    }

    const workOrders = await prisma.workOrder.findMany({
      where,
      include: {
        product: true,
        salesOrder: true,
        workCenterRef: true,
        operations: {
          include: {
            workCenter: true,
          },
          orderBy: { operationNumber: 'asc' },
        },
        allocations: {
          include: {
            part: true,
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { plannedStart: 'asc' },
      ],
    });

    const results: WorkOrderScheduleInfo[] = [];

    for (const wo of workOrders) {
      // Calculate material status
      const materialStatus = await this.checkMaterialAvailability(wo.id);

      // Calculate estimated duration
      const estimatedDuration = this.calculateEstimatedDuration(wo);

      // Get predecessors/successors if any
      const { predecessors, successors } = await this.getWorkOrderDependencies(wo.id);

      results.push({
        id: wo.id,
        woNumber: wo.woNumber,
        productId: wo.productId,
        productName: wo.product.name,
        productCode: wo.product.sku,
        quantity: wo.quantity,
        completedQty: wo.completedQty,
        remainingQty: wo.quantity - wo.completedQty,
        priority: this.mapPriority(wo.priority),
        status: wo.status,
        salesOrderId: wo.salesOrderId,
        salesOrderNumber: wo.salesOrder?.orderNumber || null,
        dueDate: wo.salesOrder?.requiredDate || wo.plannedEnd || null,
        plannedStart: wo.plannedStart,
        plannedEnd: wo.plannedEnd,
        actualStart: wo.actualStart,
        workCenterId: wo.workCenterId,
        workCenterName: wo.workCenterRef?.name || null,
        estimatedDuration,
        operations: wo.operations.map(op => ({
          id: op.id,
          operationNumber: op.operationNumber,
          name: op.name,
          workCenterId: op.workCenterId,
          workCenterName: op.workCenter.name,
          plannedSetupTime: op.plannedSetupTime,
          plannedRunTime: op.plannedRunTime,
          plannedStartDate: op.plannedStartDate,
          plannedEndDate: op.plannedEndDate,
          status: op.status,
          quantityPlanned: op.quantityPlanned,
          quantityCompleted: op.quantityCompleted,
        })),
        materialStatus,
        predecessors,
        successors,
      });
    }

    return results;
  }

  // ===========================================================================
  // CHECK CAPACITY
  // ===========================================================================

  async checkCapacity(
    workCenterId: string,
    startDate: Date,
    endDate: Date
  ): Promise<WorkCenterCapacityInfo | null> {
    const workCenter = await prisma.workCenter.findUnique({
      where: { id: workCenterId },
      include: {
        workCenterCapacity: {
          where: {
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
          orderBy: { date: 'asc' },
        },
        workOrders: {
          where: {
            status: { notIn: ['completed', 'cancelled'] },
            OR: [
              {
                plannedStart: { gte: startDate, lte: endDate },
              },
              {
                plannedEnd: { gte: startDate, lte: endDate },
              },
            ],
          },
          include: {
            operations: {
              where: {
                workCenterId,
              },
            },
          },
        },
      },
    });

    if (!workCenter) return null;

    const workingDays = workCenter.workingDays as number[];
    const dailyCapacity: DailyCapacity[] = [];

    // Generate daily capacity for date range
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      const isWorkingDay = workingDays.includes(dayOfWeek);

      // Find capacity record for this date
      const capacityRecord = workCenter.workCenterCapacity.find(
        c => c.date.toDateString() === currentDate.toDateString()
      );

      const baseHours = isWorkingDay ? workCenter.capacityPerDay : 0;
      const maintenanceHours = capacityRecord?.maintenanceHours || 0;
      const availableHours = Math.max(0, baseHours - maintenanceHours);

      // Calculate scheduled hours for this day
      const scheduledSlots = this.getScheduledSlotsForDate(
        workCenter.workOrders,
        currentDate,
        workCenterId
      );

      const scheduledHours = scheduledSlots.reduce(
        (sum, slot) => sum + slot.durationHours,
        0
      );

      dailyCapacity.push({
        date: new Date(currentDate),
        availableHours,
        scheduledHours,
        remainingHours: Math.max(0, availableHours - scheduledHours),
        utilization: availableHours > 0
          ? (scheduledHours / availableHours) * 100
          : 0,
        scheduledWorkOrders: scheduledSlots,
        isHoliday: !isWorkingDay,
        maintenanceHours,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      id: workCenter.id,
      code: workCenter.code,
      name: workCenter.name,
      type: workCenter.type,
      capacityPerDay: workCenter.capacityPerDay,
      efficiency: workCenter.efficiency,
      workingHoursStart: workCenter.workingHoursStart,
      workingHoursEnd: workCenter.workingHoursEnd,
      breakMinutes: workCenter.breakMinutes,
      workingDays,
      maxConcurrentJobs: workCenter.maxConcurrentJobs,
      dailyCapacity,
    };
  }

  async getAllWorkCentersCapacity(
    startDate: Date,
    endDate: Date
  ): Promise<WorkCenterCapacityInfo[]> {
    const workCenters = await prisma.workCenter.findMany({
      where: { status: 'active' },
      select: { id: true },
    });

    const capacities: WorkCenterCapacityInfo[] = [];

    for (const wc of workCenters) {
      const capacity = await this.checkCapacity(wc.id, startDate, endDate);
      if (capacity) {
        capacities.push(capacity);
      }
    }

    return capacities;
  }

  // ===========================================================================
  // CHECK MATERIAL AVAILABILITY
  // ===========================================================================

  async checkMaterialAvailability(workOrderId: string): Promise<MaterialStatus> {
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
      include: {
        product: {
          include: {
            bomHeaders: {
              where: { status: 'active' },
              take: 1,
              include: {
                bomLines: {
                  include: {
                    part: {
                      include: {
                        inventory: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        allocations: {
          include: {
            part: true,
          },
        },
      },
    });

    if (!workOrder) {
      return {
        allAvailable: false,
        availablePercentage: 0,
        shortages: [],
        expectedReadyDate: null,
      };
    }

    const shortages: MaterialShortage[] = [];
    let totalRequired = 0;
    let totalAvailable = 0;
    let latestArrival: Date | null = null;

    // Get active BOM header
    const activeBom = workOrder.product.bomHeaders[0];
    if (!activeBom) {
      return {
        allAvailable: true,
        availablePercentage: 100,
        shortages: [],
        expectedReadyDate: null,
      };
    }

    // Check BOM components
    for (const bomLine of activeBom.bomLines) {
      const requiredQty = bomLine.quantity * (workOrder.quantity - workOrder.completedQty);
      totalRequired++;

      // Calculate available quantity
      const inventoryQty = bomLine.part.inventory.reduce(
        (sum, inv) => sum + inv.quantity - inv.reservedQty,
        0
      );

      // Check for pending POs
      const pendingPOs = await prisma.purchaseOrderLine.aggregate({
        where: {
          partId: bomLine.partId,
          po: {
            status: { in: ['approved', 'sent', 'acknowledged', 'partial'] },
          },
        },
        _sum: {
          quantity: true,
          receivedQty: true,
        },
      });

      const pendingQty = (pendingPOs._sum.quantity || 0) - (pendingPOs._sum.receivedQty || 0);

      if (inventoryQty >= requiredQty) {
        totalAvailable++;
      } else {
        const shortageQty = requiredQty - inventoryQty;

        // Get expected arrival date
        const nextPO = await prisma.purchaseOrderLine.findFirst({
          where: {
            partId: bomLine.partId,
            po: {
              status: { in: ['approved', 'sent', 'acknowledged', 'partial'] },
            },
          },
          include: { po: true },
          orderBy: {
            po: { expectedDate: 'asc' },
          },
        });

        const expectedArrival = nextPO?.po?.expectedDate || null;

        if (expectedArrival && (!latestArrival || expectedArrival > latestArrival)) {
          latestArrival = expectedArrival;
        }

        shortages.push({
          partId: bomLine.partId,
          partNumber: bomLine.part.partNumber,
          partName: bomLine.part.name,
          requiredQty,
          availableQty: inventoryQty,
          shortageQty,
          expectedArrival,
          pendingPOQty: pendingQty,
        });
      }
    }

    return {
      allAvailable: shortages.length === 0,
      availablePercentage: totalRequired > 0
        ? (totalAvailable / totalRequired) * 100
        : 100,
      shortages,
      expectedReadyDate: latestArrival,
    };
  }

  // ===========================================================================
  // CALCULATE EARLIEST/LATEST START
  // ===========================================================================

  async calculateEarliestStart(workOrderOrId: string | WorkOrderScheduleInfo): Promise<Date> {
    const constraints: Date[] = [new Date()]; // Can't start before today

    // Handle both string ID and WorkOrderScheduleInfo object
    if (typeof workOrderOrId === 'object') {
      // Direct calculation from WorkOrderScheduleInfo
      const wo = workOrderOrId;

      // Check material availability from the object
      const materialStatus = wo.materialStatus;
      if (materialStatus && !materialStatus.allAvailable && materialStatus.expectedReadyDate) {
        constraints.push(new Date(materialStatus.expectedReadyDate));
      }

      // Check predecessors
      if (wo.predecessors && wo.predecessors.length > 0) {
        for (const predId of wo.predecessors) {
          // For now, just add a day for each predecessor
          constraints.push(new Date(Date.now() + 24 * 60 * 60 * 1000));
        }
      }

      return new Date(Math.max(...constraints.map(d => d.getTime())));
    }

    // Original database-based logic for string ID
    const workOrderId = workOrderOrId;
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
      include: {
        operations: {
          orderBy: { operationNumber: 'asc' },
        },
      },
    });

    if (!workOrder) {
      return new Date();
    }

    // Check material availability
    const materialStatus = await this.checkMaterialAvailability(workOrderId);
    if (materialStatus.expectedReadyDate) {
      constraints.push(materialStatus.expectedReadyDate);
    }

    // Check predecessor completion
    const { predecessors } = await this.getWorkOrderDependencies(workOrderId);
    for (const predId of predecessors) {
      const pred = await prisma.workOrder.findUnique({
        where: { id: predId },
        select: { plannedEnd: true, actualEnd: true, status: true },
      });

      if (pred) {
        if (pred.status === 'completed' && pred.actualEnd) {
          constraints.push(pred.actualEnd);
        } else if (pred.plannedEnd) {
          constraints.push(pred.plannedEnd);
        }
      }
    }

    // Return the latest constraint
    return new Date(Math.max(...constraints.map(d => d.getTime())));
  }

  async calculateLatestStart(workOrderOrId: string | WorkOrderScheduleInfo): Promise<Date | null> {
    // Handle WorkOrderScheduleInfo object directly
    if (typeof workOrderOrId === 'object') {
      const wo = workOrderOrId;

      // Get due date
      const dueDate = wo.dueDate;
      if (!dueDate) {
        // Return a default future date if no due date
        return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      }

      // Calculate estimated duration
      const duration = wo.estimatedDuration || 8;

      // Buffer (10% of duration or minimum 1 day)
      const bufferHours = Math.max(duration * 0.1, 8);

      // Latest start = Due date - Duration - Buffer
      const latestStart = new Date(dueDate);
      latestStart.setHours(latestStart.getHours() - duration - bufferHours);

      return latestStart;
    }

    // Original database-based logic for string ID
    const workOrderId = workOrderOrId;
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
      include: {
        salesOrder: true,
      },
    });

    if (!workOrder) return null;

    // Get due date from sales order or planned end
    const dueDate = workOrder.salesOrder?.requiredDate || workOrder.plannedEnd;
    if (!dueDate) return null;

    // Calculate estimated duration
    const duration = this.calculateEstimatedDuration(workOrder);

    // Buffer (10% of duration or minimum 1 day)
    const bufferHours = Math.max(duration * 0.1, 8);

    // Latest start = Due date - Duration - Buffer
    const latestStart = new Date(dueDate);
    latestStart.setHours(latestStart.getHours() - duration - bufferHours);

    return latestStart;
  }

  // ===========================================================================
  // GENERATE SCHEDULE
  // ===========================================================================

  async generateSchedule(
    workOrders: WorkOrderScheduleInfo[],
    options: Partial<SchedulingOptions> = {}
  ): Promise<ScheduleResult> {
    const opts = { ...DEFAULT_SCHEDULING_OPTIONS, ...options };

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + opts.horizonDays);

    // Get all work center capacities
    const capacities = await this.getAllWorkCentersCapacity(startDate, endDate);

    // Filter work orders
    let filteredWOs = workOrders.filter(
      wo => !opts.excludeStatuses?.includes(wo.status)
    );

    if (opts.workOrderIds?.length) {
      filteredWOs = filteredWOs.filter(wo => opts.workOrderIds!.includes(wo.id));
    }

    if (opts.workCenterIds?.length) {
      filteredWOs = filteredWOs.filter(
        wo => wo.workCenterId && opts.workCenterIds!.includes(wo.workCenterId)
      );
    }

    // Sort work orders based on algorithm
    const sortedWOs = this.sortWorkOrders(filteredWOs, opts.algorithm);

    // Generate suggestions
    const suggestions: ScheduleSuggestion[] = [];
    const conflicts: ScheduleConflict[] = [];
    const warnings: ScheduleWarning[] = [];

    // Track available capacity
    const capacityTracker = new Map<string, Map<string, number>>();
    for (const cap of capacities) {
      const dateMap = new Map<string, number>();
      for (const dc of cap.dailyCapacity) {
        dateMap.set(dc.date.toDateString(), dc.remainingHours);
      }
      capacityTracker.set(cap.id, dateMap);
    }

    for (const wo of sortedWOs) {
      const suggestion = await this.generateSuggestionForWorkOrder(
        wo,
        capacities,
        capacityTracker,
        opts
      );

      if (suggestion) {
        suggestions.push(suggestion);

        // Update capacity tracker
        this.updateCapacityTracker(capacityTracker, suggestion);
      }
    }

    // Detect conflicts
    const detectedConflicts = await this.detectConflicts(suggestions, capacities);
    conflicts.push(...detectedConflicts);

    // Generate warnings
    const detectedWarnings = this.generateWarnings(suggestions, capacities);
    warnings.push(...detectedWarnings);

    // Calculate metrics
    const metrics = this.calculateMetrics(workOrders, suggestions, capacities);

    return {
      id: `sched-${Date.now()}`,
      createdAt: new Date(),
      algorithm: opts.algorithm,
      horizon: {
        startDate,
        endDate,
        days: opts.horizonDays,
      },
      workOrdersAnalyzed: filteredWOs.length,
      suggestions,
      metrics,
      conflicts,
      warnings,
    };
  }

  // ===========================================================================
  // APPLY SCHEDULE
  // ===========================================================================

  async applySchedule(
    suggestions: ScheduleSuggestion[],
    userId: string
  ): Promise<{ success: boolean; appliedCount: number; errors: string[] }> {
    const errors: string[] = [];
    let appliedCount = 0;

    for (const suggestion of suggestions) {
      try {
        await prisma.$transaction(async (tx) => {
          // Update work order
          await tx.workOrder.update({
            where: { id: suggestion.workOrderId },
            data: {
              workCenterId: suggestion.suggestedSchedule.workCenterId,
              plannedStart: suggestion.suggestedSchedule.startDate,
              plannedEnd: suggestion.suggestedSchedule.endDate,
              updatedAt: new Date(),
            },
          });

          // Update operations if any
          for (const opSuggestion of suggestion.operations) {
            await tx.workOrderOperation.update({
              where: { id: opSuggestion.operationId },
              data: {
                workCenterId: opSuggestion.workCenterId,
                plannedStartDate: opSuggestion.startDate,
                plannedEndDate: opSuggestion.endDate,
              },
            });
          }

          // Log audit trail
          await tx.auditLog.create({
            data: {
              userId,
              action: 'SCHEDULE_APPLIED',
              entityType: 'WorkOrder',
              entityId: suggestion.workOrderId,
              metadata: JSON.stringify({
                suggestionId: suggestion.id,
                changeType: suggestion.changeType,
                previousSchedule: suggestion.currentSchedule,
                newSchedule: suggestion.suggestedSchedule,
              }),
              createdAt: new Date(),
            },
          });
        });

        appliedCount++;
      } catch (error) {
        errors.push(`Failed to apply schedule for ${suggestion.woNumber}: ${error}`);
      }
    }

    return {
      success: errors.length === 0,
      appliedCount,
      errors,
    };
  }

  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================

  private mapPriority(priority: string): WorkOrderPriority {
    const map: Record<string, WorkOrderPriority> = {
      critical: 'critical',
      high: 'high',
      normal: 'normal',
      low: 'low',
      urgent: 'critical',
      rush: 'high',
    };
    return map[priority.toLowerCase()] || 'normal';
  }

  private calculateEstimatedDuration(workOrder: WorkOrderWithOperations): number {
    if (workOrder.operations && workOrder.operations.length > 0) {
      return workOrder.operations.reduce(
        (sum: number, op: WorkOrderOperationRecord) => sum + op.plannedSetupTime + op.plannedRunTime,
        0
      );
    }

    // Default estimation based on quantity
    const hoursPerUnit = 0.5; // Default
    return workOrder.quantity * hoursPerUnit;
  }

  private async getWorkOrderDependencies(
    workOrderId: string
  ): Promise<{ predecessors: string[]; successors: string[] }> {
    // In a real system, this would query a work order dependencies table
    // For now, return empty arrays
    return { predecessors: [], successors: [] };
  }

  private getScheduledSlotsForDate(
    workOrders: ScheduledWorkOrder[],
    date: Date,
    workCenterId: string
  ): ScheduledSlot[] {
    const slots: ScheduledSlot[] = [];
    const dateStr = date.toDateString();

    for (const wo of workOrders) {
      if (!wo.plannedStart || !wo.plannedEnd) continue;

      const startStr = wo.plannedStart.toDateString();
      const endStr = wo.plannedEnd.toDateString();

      if (dateStr >= startStr && dateStr <= endStr) {
        // Calculate hours for this specific day
        const dayStart = new Date(date);
        dayStart.setHours(8, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(17, 0, 0, 0);

        const effectiveStart = wo.plannedStart > dayStart ? wo.plannedStart : dayStart;
        const effectiveEnd = wo.plannedEnd < dayEnd ? wo.plannedEnd : dayEnd;

        const durationHours = (effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60);

        if (durationHours > 0) {
          slots.push({
            workOrderId: wo.id,
            woNumber: wo.woNumber,
            operationId: null,
            startTime: effectiveStart,
            endTime: effectiveEnd,
            durationHours,
            status: wo.status,
          });
        }
      }
    }

    return slots;
  }

  private sortWorkOrders(
    workOrders: WorkOrderScheduleInfo[],
    algorithm: SchedulingAlgorithm
  ): WorkOrderScheduleInfo[] {
    switch (algorithm) {
      case 'priority_first':
        return [...workOrders].sort((a, b) => {
          const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
          const pA = priorityOrder[a.priority] ?? 2;
          const pB = priorityOrder[b.priority] ?? 2;
          if (pA !== pB) return pA - pB;
          // Secondary: due date
          if (a.dueDate && b.dueDate) {
            return a.dueDate.getTime() - b.dueDate.getTime();
          }
          return 0;
        });

      case 'due_date_first':
        return [...workOrders].sort((a, b) => {
          if (a.dueDate && b.dueDate) {
            return a.dueDate.getTime() - b.dueDate.getTime();
          }
          if (a.dueDate) return -1;
          if (b.dueDate) return 1;
          return 0;
        });

      case 'shortest_first':
        return [...workOrders].sort(
          (a, b) => a.estimatedDuration - b.estimatedDuration
        );

      case 'setup_minimize':
        // Group by work center, then by product family
        return [...workOrders].sort((a, b) => {
          if (a.workCenterId && b.workCenterId) {
            if (a.workCenterId !== b.workCenterId) {
              return a.workCenterId.localeCompare(b.workCenterId);
            }
          }
          return a.productCode.localeCompare(b.productCode);
        });

      default:
        return workOrders;
    }
  }

  private async generateSuggestionForWorkOrder(
    wo: WorkOrderScheduleInfo,
    capacities: WorkCenterCapacityInfo[],
    capacityTracker: Map<string, Map<string, number>>,
    options: SchedulingOptions
  ): Promise<ScheduleSuggestion | null> {
    // Find best work center and time slot
    const preferredWorkCenter = wo.workCenterId;
    const candidateWorkCenters = preferredWorkCenter
      ? [preferredWorkCenter]
      : capacities.map(c => c.id);

    let bestSlot: {
      workCenterId: string;
      workCenterName: string;
      startDate: Date;
      endDate: Date;
    } | null = null;

    for (const wcId of candidateWorkCenters) {
      const capacity = capacities.find(c => c.id === wcId);
      if (!capacity) continue;

      const dateMap = capacityTracker.get(wcId);
      if (!dateMap) continue;

      // Find first available slot that can accommodate the work order
      const slot = this.findAvailableSlot(
        capacity,
        dateMap,
        wo.estimatedDuration,
        wo.materialStatus.expectedReadyDate || new Date()
      );

      if (slot && (!bestSlot || slot.startDate < bestSlot.startDate)) {
        bestSlot = {
          workCenterId: wcId,
          workCenterName: capacity.name,
          startDate: slot.startDate,
          endDate: slot.endDate,
        };
      }
    }

    if (!bestSlot) {
      return null;
    }

    // Determine change type
    let changeType: ScheduleSuggestion['changeType'] = 'new';
    if (wo.plannedStart && wo.plannedEnd) {
      if (bestSlot.workCenterId !== wo.workCenterId) {
        changeType = 'move';
      } else {
        changeType = 'reschedule';
      }
    }

    // Generate reason
    const reason = this.generateScheduleReason(wo, bestSlot, changeType);

    // Calculate impact
    const impact = this.calculateScheduleImpact(wo, bestSlot);

    return {
      id: `sugg-${wo.id}-${Date.now()}`,
      workOrderId: wo.id,
      woNumber: wo.woNumber,
      productName: wo.productName,
      currentSchedule: {
        workCenterId: wo.workCenterId,
        workCenterName: wo.workCenterName,
        startDate: wo.plannedStart,
        endDate: wo.plannedEnd,
      },
      suggestedSchedule: bestSlot,
      operations: [], // Would be populated with operation-level suggestions
      changeType,
      reason,
      impact,
      priority: this.calculateSuggestionPriority(wo),
      confidenceScore: 85, // Based on data quality
      createdAt: new Date(),
    };
  }

  private findAvailableSlot(
    capacity: WorkCenterCapacityInfo,
    dateMap: Map<string, number>,
    durationHours: number,
    earliestStart: Date
  ): { startDate: Date; endDate: Date } | null {
    let remainingDuration = durationHours;
    let startDate: Date | null = null;
    let currentDate = new Date(earliestStart);

    // Search up to 30 days ahead
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);

    while (currentDate <= maxDate && remainingDuration > 0) {
      const dateStr = currentDate.toDateString();
      const availableHours = dateMap.get(dateStr) || 0;

      if (availableHours > 0) {
        if (!startDate) {
          startDate = new Date(currentDate);
        }

        const hoursToUse = Math.min(availableHours, remainingDuration);
        remainingDuration -= hoursToUse;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    if (remainingDuration > 0 || !startDate) {
      return null;
    }

    const endDate = new Date(currentDate);
    endDate.setDate(endDate.getDate() - 1);

    return { startDate, endDate };
  }

  private updateCapacityTracker(
    capacityTracker: Map<string, Map<string, number>>,
    suggestion: ScheduleSuggestion
  ): void {
    const wcId = suggestion.suggestedSchedule.workCenterId;
    const dateMap = capacityTracker.get(wcId);
    if (!dateMap) return;

    // Distribute hours across scheduled days
    const startDate = suggestion.suggestedSchedule.startDate;
    const endDate = suggestion.suggestedSchedule.endDate;
    const currentDate = new Date(startDate);

    // Rough distribution - in production would be more sophisticated
    const totalDays = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

    const hoursPerDay = 8 / totalDays;

    while (currentDate <= endDate) {
      const dateStr = currentDate.toDateString();
      const currentHours = dateMap.get(dateStr) || 0;
      dateMap.set(dateStr, Math.max(0, currentHours - hoursPerDay));
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  private generateScheduleReason(
    wo: WorkOrderScheduleInfo,
    slot: { workCenterId: string; startDate: Date; endDate: Date },
    changeType: string
  ): string {
    const reasons: string[] = [];

    if (changeType === 'new') {
      reasons.push('Lệnh sản xuất chưa được lên lịch');
    }

    if (wo.priority === 'critical' || wo.priority === 'high') {
      reasons.push(`Ưu tiên ${wo.priority === 'critical' ? 'khẩn cấp' : 'cao'}`);
    }

    if (wo.dueDate) {
      const daysUntilDue = Math.ceil(
        (wo.dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntilDue <= 7) {
        reasons.push(`Hạn giao trong ${daysUntilDue} ngày`);
      }
    }

    if (!wo.materialStatus.allAvailable && wo.materialStatus.expectedReadyDate) {
      reasons.push('Chờ nguyên vật liệu đến');
    }

    if (changeType === 'move') {
      reasons.push('Tối ưu hóa sử dụng công suất');
    }

    return reasons.join('. ') || 'Tối ưu hóa lịch trình sản xuất';
  }

  private calculateScheduleImpact(
    wo: WorkOrderScheduleInfo,
    slot: { startDate: Date; endDate: Date }
  ): ScheduleImpact {
    let onTimeChange = 0;

    if (wo.dueDate) {
      const wasOnTime = !wo.plannedEnd || wo.plannedEnd <= wo.dueDate;
      const willBeOnTime = slot.endDate <= wo.dueDate;

      if (!wasOnTime && willBeOnTime) onTimeChange = 5;
      if (wasOnTime && !willBeOnTime) onTimeChange = -5;
    }

    return {
      onTimeDeliveryChange: onTimeChange,
      capacityUtilizationChange: 5,
      setupTimeChange: 0,
      conflictsResolved: 0,
      affectedWorkOrders: [],
    };
  }

  private calculateSuggestionPriority(wo: WorkOrderScheduleInfo): number {
    let priority = 50;

    // Priority boost
    if (wo.priority === 'critical') priority += 30;
    else if (wo.priority === 'high') priority += 20;
    else if (wo.priority === 'low') priority -= 10;

    // Due date urgency
    if (wo.dueDate) {
      const daysUntilDue = Math.ceil(
        (wo.dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntilDue <= 3) priority += 20;
      else if (daysUntilDue <= 7) priority += 10;
    }

    // Material availability
    if (!wo.materialStatus.allAvailable) priority -= 10;

    return Math.min(100, Math.max(0, priority));
  }

  private async detectConflicts(
    suggestions: ScheduleSuggestion[],
    capacities: WorkCenterCapacityInfo[]
  ): Promise<ScheduleConflict[]> {
    const conflicts: ScheduleConflict[] = [];

    // Check for overlaps
    for (let i = 0; i < suggestions.length; i++) {
      for (let j = i + 1; j < suggestions.length; j++) {
        const a = suggestions[i];
        const b = suggestions[j];

        if (a.suggestedSchedule.workCenterId === b.suggestedSchedule.workCenterId) {
          const aStart = a.suggestedSchedule.startDate.getTime();
          const aEnd = a.suggestedSchedule.endDate.getTime();
          const bStart = b.suggestedSchedule.startDate.getTime();
          const bEnd = b.suggestedSchedule.endDate.getTime();

          if (aStart < bEnd && bStart < aEnd) {
            conflicts.push({
              type: 'overlap',
              severity: 'high',
              description: `${a.woNumber} và ${b.woNumber} chồng chéo trên ${a.suggestedSchedule.workCenterName}`,
              affectedWorkOrders: [a.workOrderId, b.workOrderId],
              affectedWorkCenters: [a.suggestedSchedule.workCenterId],
              suggestedResolution: 'Di chuyển một trong hai lệnh sản xuất',
              autoResolvable: true,
            });
          }
        }
      }
    }

    return conflicts;
  }

  private generateWarnings(
    suggestions: ScheduleSuggestion[],
    capacities: WorkCenterCapacityInfo[]
  ): ScheduleWarning[] {
    const warnings: ScheduleWarning[] = [];

    // Check for high utilization
    for (const capacity of capacities) {
      const avgUtilization = capacity.dailyCapacity.reduce(
        (sum, dc) => sum + dc.utilization,
        0
      ) / capacity.dailyCapacity.length;

      if (avgUtilization > 90) {
        warnings.push({
          type: 'capacity_low',
          message: `${capacity.name} có công suất cao (${avgUtilization.toFixed(0)}%)`,
          affectedEntities: [capacity.id],
          recommendation: 'Xem xét tăng ca hoặc phân bổ sang máy khác',
        });
      }
    }

    return warnings;
  }

  private calculateMetrics(
    workOrders: WorkOrderScheduleInfo[],
    suggestions: ScheduleSuggestion[],
    capacities: WorkCenterCapacityInfo[]
  ): ScheduleMetrics {
    // Current metrics
    const currentOnTime = workOrders.filter(wo => {
      if (!wo.dueDate || !wo.plannedEnd) return true;
      return wo.plannedEnd <= wo.dueDate;
    }).length;

    const currentOnTimeDelivery = workOrders.length > 0
      ? (currentOnTime / workOrders.length) * 100
      : 100;

    // Projected metrics
    const projectedOnTime = suggestions.filter(s => {
      const wo = workOrders.find(w => w.id === s.workOrderId);
      if (!wo?.dueDate) return true;
      return s.suggestedSchedule.endDate <= wo.dueDate;
    }).length;

    const projectedOnTimeDelivery = suggestions.length > 0
      ? (projectedOnTime / suggestions.length) * 100
      : 100;

    // Capacity utilization
    const currentUtilization = capacities.reduce((sum, c) => {
      const avgUtil = c.dailyCapacity.reduce((s, d) => s + d.utilization, 0)
        / c.dailyCapacity.length;
      return sum + avgUtil;
    }, 0) / capacities.length;

    return {
      currentOnTimeDelivery,
      projectedOnTimeDelivery,
      currentCapacityUtilization: currentUtilization,
      projectedCapacityUtilization: currentUtilization + 5, // Estimate
      currentSetupTime: 0,
      projectedSetupTime: 0,
      makespan: suggestions.length > 0
        ? Math.ceil(
            (Math.max(...suggestions.map(s => s.suggestedSchedule.endDate.getTime()))
            - new Date().getTime()) / (1000 * 60 * 60 * 24)
          )
        : 0,
      conflictCount: 0,
      unscheduledCount: workOrders.filter(wo => !wo.plannedStart).length,
    };
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const schedulingEngine = SchedulingEngine.getInstance();

export function getSchedulingEngine(): SchedulingEngine {
  return SchedulingEngine.getInstance();
}
