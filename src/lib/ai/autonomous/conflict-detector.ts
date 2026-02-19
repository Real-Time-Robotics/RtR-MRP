// =============================================================================
// CONFLICT DETECTOR - Schedule Conflict Detection & Resolution
// =============================================================================
// Detects and resolves scheduling conflicts in production schedules
// Part of Phase 3: Autonomous Operations - Auto-Scheduling Feature
// =============================================================================

import prisma from '@/lib/prisma';
import {
  WorkOrderScheduleInfo,
  WorkCenterCapacityInfo,
  ScheduleSuggestion,
  ScheduleConflict,
  DailyCapacity,
} from './scheduling-engine';
import { ScheduledWorkOrder } from './schedule-optimizer';

// =============================================================================
// TYPES
// =============================================================================

export interface ConflictDetectionResult {
  conflicts: DetailedConflict[];
  warnings: ConflictWarning[];
  summary: ConflictSummary;
}

export interface DetailedConflict {
  id: string;
  type: ConflictType;
  severity: ConflictSeverity;
  title: string;
  description: string;
  affectedWorkOrders: AffectedWorkOrder[];
  affectedWorkCenters: AffectedWorkCenter[];
  affectedDates: Date[];
  suggestedResolutions: Resolution[];
  autoResolvable: boolean;
  estimatedImpact: ConflictImpact;
  detectedAt: Date;
}

export type ConflictType =
  | 'overlap' // Same resource, same time
  | 'overload' // Exceeds capacity
  | 'material_shortage' // Materials not available
  | 'due_date_risk' // Will miss due date
  | 'resource_unavailable' // Maintenance, holiday
  | 'predecessor_violation' // Starts before predecessor ends
  | 'skill_mismatch'; // Required skills not available

export type ConflictSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface AffectedWorkOrder {
  workOrderId: string;
  woNumber: string;
  productName: string;
  currentStart: Date | null;
  currentEnd: Date | null;
  suggestedStart?: Date;
  suggestedEnd?: Date;
}

export interface AffectedWorkCenter {
  workCenterId: string;
  workCenterName: string;
  affectedCapacity: number; // Hours
  overloadPercentage: number;
}

export interface Resolution {
  id: string;
  type: ResolutionType;
  description: string;
  impact: ResolutionImpact;
  actions: ResolutionAction[];
  confidence: number; // 0-100
  priority: number;
}

export type ResolutionType =
  | 'reschedule' // Move to different time
  | 'reassign' // Move to different work center
  | 'split' // Split work order
  | 'overtime' // Add overtime
  | 'expedite' // Expedite materials
  | 'defer' // Delay lower priority
  | 'outsource'; // External processing

export interface ResolutionAction {
  type: 'update_work_order' | 'update_operation' | 'add_overtime' | 'notify';
  target: string; // Work order ID or work center ID
  field?: string;
  oldValue?: unknown;
  newValue?: unknown;
  message?: string;
}

export interface ResolutionImpact {
  dueDateChange: number; // Days (positive = later)
  capacityChange: number; // Hours
  costChange: number; // VND
  otherWorkOrdersAffected: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface ConflictWarning {
  type: WarningType;
  severity: 'info' | 'warning';
  message: string;
  affectedEntities: string[];
  recommendation: string;
}

export type WarningType =
  | 'capacity_approaching_limit'
  | 'due_date_tight'
  | 'material_pending'
  | 'long_queue'
  | 'unbalanced_load'
  | 'high_utilization';

export interface ConflictSummary {
  totalConflicts: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  autoResolvableCount: number;
  totalAffectedWorkOrders: number;
  totalAffectedWorkCenters: number;
  recommendedActions: string[];
}

export interface ConflictImpact {
  delayDays: number;
  capacityLoss: number; // Hours
  costEstimate: number; // VND
  customerImpact: 'none' | 'minor' | 'moderate' | 'severe';
}

export interface ResolutionResult {
  success: boolean;
  conflictId: string;
  resolutionId: string;
  appliedActions: ResolutionAction[];
  remainingConflicts: string[];
  errors: string[];
}

// =============================================================================
// CONFLICT DETECTOR CLASS
// =============================================================================

export class ConflictDetector {
  private static instance: ConflictDetector;

  private constructor() {}

  public static getInstance(): ConflictDetector {
    if (!ConflictDetector.instance) {
      ConflictDetector.instance = new ConflictDetector();
    }
    return ConflictDetector.instance;
  }

  // ===========================================================================
  // MAIN DETECTION METHOD
  // ===========================================================================

  async detectConflicts(
    schedule: ScheduledWorkOrder[] | ScheduleSuggestion[],
    workOrders: WorkOrderScheduleInfo[],
    capacities: WorkCenterCapacityInfo[]
  ): Promise<ConflictDetectionResult> {
    const conflicts: DetailedConflict[] = [];
    const warnings: ConflictWarning[] = [];

    // Normalize schedule format
    const normalizedSchedule = this.normalizeSchedule(schedule);

    // Run all detection checks
    const overlaps = await this.detectOverlaps(normalizedSchedule);
    const overloads = await this.detectOverloads(normalizedSchedule, capacities);
    const materialShortages = await this.detectMaterialShortages(normalizedSchedule, workOrders);
    const dueDateRisks = await this.detectDueDateRisks(normalizedSchedule, workOrders);
    const resourceIssues = await this.detectResourceUnavailability(normalizedSchedule, capacities);
    const predecessorViolations = await this.detectPredecessorViolations(normalizedSchedule, workOrders);

    conflicts.push(...overlaps, ...overloads, ...materialShortages, ...dueDateRisks, ...resourceIssues, ...predecessorViolations);

    // Generate warnings
    const capacityWarnings = this.generateCapacityWarnings(normalizedSchedule, capacities);
    const queueWarnings = this.generateQueueWarnings(normalizedSchedule);
    const balanceWarnings = this.generateBalanceWarnings(normalizedSchedule, capacities);

    warnings.push(...capacityWarnings, ...queueWarnings, ...balanceWarnings);

    // Generate summary
    const summary = this.generateSummary(conflicts, normalizedSchedule, capacities);

    return { conflicts, warnings, summary };
  }

  // ===========================================================================
  // OVERLAP DETECTION
  // ===========================================================================

  async detectOverlaps(schedule: NormalizedScheduleItem[]): Promise<DetailedConflict[]> {
    const conflicts: DetailedConflict[] = [];
    const byWorkCenter = new Map<string, NormalizedScheduleItem[]>();

    // Group by work center
    for (const item of schedule) {
      if (!byWorkCenter.has(item.workCenterId)) {
        byWorkCenter.set(item.workCenterId, []);
      }
      byWorkCenter.get(item.workCenterId)!.push(item);
    }

    // Check overlaps within each work center
    for (const [wcId, items] of byWorkCenter) {
      items.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const a = items[i];
          const b = items[j];

          // Check if they overlap
          if (a.startDate < b.endDate && b.startDate < a.endDate) {
            const overlapStart = new Date(Math.max(a.startDate.getTime(), b.startDate.getTime()));
            const overlapEnd = new Date(Math.min(a.endDate.getTime(), b.endDate.getTime()));
            const overlapHours = (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60);

            conflicts.push({
              id: `conflict-overlap-${a.workOrderId}-${b.workOrderId}`,
              type: 'overlap',
              severity: overlapHours > 8 ? 'critical' : overlapHours > 4 ? 'high' : 'medium',
              title: `Xung đột lịch trình`,
              description: `${a.woNumber} và ${b.woNumber} chồng chéo ${overlapHours.toFixed(1)} giờ trên ${a.workCenterName}`,
              affectedWorkOrders: [
                {
                  workOrderId: a.workOrderId,
                  woNumber: a.woNumber,
                  productName: a.productName || '',
                  currentStart: a.startDate,
                  currentEnd: a.endDate,
                },
                {
                  workOrderId: b.workOrderId,
                  woNumber: b.woNumber,
                  productName: b.productName || '',
                  currentStart: b.startDate,
                  currentEnd: b.endDate,
                },
              ],
              affectedWorkCenters: [
                {
                  workCenterId: wcId,
                  workCenterName: a.workCenterName,
                  affectedCapacity: overlapHours,
                  overloadPercentage: 0,
                },
              ],
              affectedDates: this.getDatesBetween(overlapStart, overlapEnd),
              suggestedResolutions: this.generateOverlapResolutions(a, b, overlapHours),
              autoResolvable: true,
              estimatedImpact: {
                delayDays: Math.ceil(overlapHours / 8),
                capacityLoss: overlapHours,
                costEstimate: overlapHours * 500000, // Estimate
                customerImpact: overlapHours > 16 ? 'moderate' : 'minor',
              },
              detectedAt: new Date(),
            });
          }
        }
      }
    }

    return conflicts;
  }

  // ===========================================================================
  // OVERLOAD DETECTION
  // ===========================================================================

  async detectOverloads(
    schedule: NormalizedScheduleItem[],
    capacities: WorkCenterCapacityInfo[]
  ): Promise<DetailedConflict[]> {
    const conflicts: DetailedConflict[] = [];

    // Calculate daily load for each work center
    const dailyLoads = new Map<string, Map<string, number>>();

    for (const item of schedule) {
      if (!dailyLoads.has(item.workCenterId)) {
        dailyLoads.set(item.workCenterId, new Map());
      }

      const dateMap = dailyLoads.get(item.workCenterId)!;
      const dates = this.getDatesBetween(item.startDate, item.endDate);
      const hoursPerDay = item.durationHours / dates.length;

      for (const date of dates) {
        const key = date.toDateString();
        dateMap.set(key, (dateMap.get(key) || 0) + hoursPerDay);
      }
    }

    // Check against capacity
    for (const capacity of capacities) {
      const loads = dailyLoads.get(capacity.id);
      if (!loads) continue;

      for (const dc of capacity.dailyCapacity) {
        const dateKey = dc.date.toDateString();
        const loadedHours = loads.get(dateKey) || 0;

        if (loadedHours > dc.availableHours) {
          const overloadHours = loadedHours - dc.availableHours;
          const overloadPercent = ((loadedHours / dc.availableHours) - 1) * 100;

          // Find affected work orders
          const affectedWOs = schedule.filter(item =>
            item.workCenterId === capacity.id &&
            this.dateInRange(dc.date, item.startDate, item.endDate)
          );

          conflicts.push({
            id: `conflict-overload-${capacity.id}-${dateKey}`,
            type: 'overload',
            severity: overloadPercent > 50 ? 'critical' : overloadPercent > 25 ? 'high' : 'medium',
            title: `Quá tải công suất`,
            description: `${capacity.name} vượt ${overloadPercent.toFixed(0)}% công suất vào ${this.formatDate(dc.date)}`,
            affectedWorkOrders: affectedWOs.map(wo => ({
              workOrderId: wo.workOrderId,
              woNumber: wo.woNumber,
              productName: wo.productName || '',
              currentStart: wo.startDate,
              currentEnd: wo.endDate,
            })),
            affectedWorkCenters: [
              {
                workCenterId: capacity.id,
                workCenterName: capacity.name,
                affectedCapacity: overloadHours,
                overloadPercentage: overloadPercent,
              },
            ],
            affectedDates: [dc.date],
            suggestedResolutions: this.generateOverloadResolutions(
              capacity,
              affectedWOs,
              overloadHours
            ),
            autoResolvable: overloadPercent <= 25,
            estimatedImpact: {
              delayDays: Math.ceil(overloadHours / dc.availableHours),
              capacityLoss: overloadHours,
              costEstimate: overloadHours * 600000,
              customerImpact: overloadPercent > 50 ? 'severe' : overloadPercent > 25 ? 'moderate' : 'minor',
            },
            detectedAt: new Date(),
          });
        }
      }
    }

    return conflicts;
  }

  // ===========================================================================
  // MATERIAL SHORTAGE DETECTION
  // ===========================================================================

  async detectMaterialShortages(
    schedule: NormalizedScheduleItem[],
    workOrders: WorkOrderScheduleInfo[]
  ): Promise<DetailedConflict[]> {
    const conflicts: DetailedConflict[] = [];

    for (const item of schedule) {
      const wo = workOrders.find(w => w.id === item.workOrderId);
      if (!wo) continue;

      if (!wo.materialStatus.allAvailable && wo.materialStatus.shortages.length > 0) {
        // Check if scheduled start is before materials ready
        const materialsReady = wo.materialStatus.expectedReadyDate;

        if (materialsReady && item.startDate < materialsReady) {
          const delayDays = Math.ceil(
            (materialsReady.getTime() - item.startDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          conflicts.push({
            id: `conflict-material-${item.workOrderId}`,
            type: 'material_shortage',
            severity: delayDays > 7 ? 'critical' : delayDays > 3 ? 'high' : 'medium',
            title: `Thiếu nguyên vật liệu`,
            description: `${item.woNumber} thiếu ${wo.materialStatus.shortages.length} loại NVL, dự kiến có vào ${this.formatDate(materialsReady)}`,
            affectedWorkOrders: [
              {
                workOrderId: wo.id,
                woNumber: wo.woNumber,
                productName: wo.productName,
                currentStart: item.startDate,
                currentEnd: item.endDate,
                suggestedStart: materialsReady,
              },
            ],
            affectedWorkCenters: [
              {
                workCenterId: item.workCenterId,
                workCenterName: item.workCenterName,
                affectedCapacity: item.durationHours,
                overloadPercentage: 0,
              },
            ],
            affectedDates: this.getDatesBetween(item.startDate, materialsReady),
            suggestedResolutions: this.generateMaterialResolutions(wo, materialsReady),
            autoResolvable: true,
            estimatedImpact: {
              delayDays,
              capacityLoss: item.durationHours,
              costEstimate: delayDays * 1000000,
              customerImpact: delayDays > 7 ? 'severe' : delayDays > 3 ? 'moderate' : 'minor',
            },
            detectedAt: new Date(),
          });
        }
      }
    }

    return conflicts;
  }

  // ===========================================================================
  // DUE DATE RISK DETECTION
  // ===========================================================================

  async detectDueDateRisks(
    schedule: NormalizedScheduleItem[],
    workOrders: WorkOrderScheduleInfo[]
  ): Promise<DetailedConflict[]> {
    const conflicts: DetailedConflict[] = [];

    for (const item of schedule) {
      const wo = workOrders.find(w => w.id === item.workOrderId);
      if (!wo || !wo.dueDate) continue;

      if (item.endDate > wo.dueDate) {
        const lateDays = Math.ceil(
          (item.endDate.getTime() - wo.dueDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        conflicts.push({
          id: `conflict-duedate-${item.workOrderId}`,
          type: 'due_date_risk',
          severity: lateDays > 7 ? 'critical' : lateDays > 3 ? 'high' : 'medium',
          title: `Nguy cơ trễ hạn`,
          description: `${item.woNumber} sẽ trễ ${lateDays} ngày so với hạn giao ${this.formatDate(wo.dueDate)}`,
          affectedWorkOrders: [
            {
              workOrderId: wo.id,
              woNumber: wo.woNumber,
              productName: wo.productName,
              currentStart: item.startDate,
              currentEnd: item.endDate,
            },
          ],
          affectedWorkCenters: [
            {
              workCenterId: item.workCenterId,
              workCenterName: item.workCenterName,
              affectedCapacity: 0,
              overloadPercentage: 0,
            },
          ],
          affectedDates: [wo.dueDate, item.endDate],
          suggestedResolutions: this.generateDueDateResolutions(wo, item, lateDays),
          autoResolvable: lateDays <= 2,
          estimatedImpact: {
            delayDays: lateDays,
            capacityLoss: 0,
            costEstimate: lateDays * 2000000, // Penalty estimate
            customerImpact: lateDays > 7 ? 'severe' : lateDays > 3 ? 'moderate' : 'minor',
          },
          detectedAt: new Date(),
        });
      }
    }

    return conflicts;
  }

  // ===========================================================================
  // RESOURCE UNAVAILABILITY DETECTION
  // ===========================================================================

  async detectResourceUnavailability(
    schedule: NormalizedScheduleItem[],
    capacities: WorkCenterCapacityInfo[]
  ): Promise<DetailedConflict[]> {
    const conflicts: DetailedConflict[] = [];

    for (const item of schedule) {
      const capacity = capacities.find(c => c.id === item.workCenterId);
      if (!capacity) continue;

      const scheduledDates = this.getDatesBetween(item.startDate, item.endDate);

      for (const date of scheduledDates) {
        const dc = capacity.dailyCapacity.find(
          d => d.date.toDateString() === date.toDateString()
        );

        if (dc && (dc.isHoliday || dc.maintenanceHours >= dc.availableHours)) {
          conflicts.push({
            id: `conflict-unavailable-${item.workOrderId}-${date.toDateString()}`,
            type: 'resource_unavailable',
            severity: 'high',
            title: dc.isHoliday ? `Lên lịch vào ngày nghỉ` : `Bảo trì theo lịch`,
            description: dc.isHoliday
              ? `${item.woNumber} được lên lịch vào ngày nghỉ ${this.formatDate(date)}`
              : `${item.woNumber} trùng với bảo trì ${capacity.name} vào ${this.formatDate(date)}`,
            affectedWorkOrders: [
              {
                workOrderId: item.workOrderId,
                woNumber: item.woNumber,
                productName: item.productName || '',
                currentStart: item.startDate,
                currentEnd: item.endDate,
              },
            ],
            affectedWorkCenters: [
              {
                workCenterId: capacity.id,
                workCenterName: capacity.name,
                affectedCapacity: dc.maintenanceHours,
                overloadPercentage: 0,
              },
            ],
            affectedDates: [date],
            suggestedResolutions: [
              {
                id: `res-reschedule-${item.workOrderId}`,
                type: 'reschedule',
                description: 'Di chuyển sang ngày làm việc khác',
                impact: {
                  dueDateChange: 1,
                  capacityChange: 0,
                  costChange: 0,
                  otherWorkOrdersAffected: 0,
                  riskLevel: 'low',
                },
                actions: [
                  {
                    type: 'update_work_order',
                    target: item.workOrderId,
                    field: 'plannedStart',
                    oldValue: item.startDate,
                    newValue: this.getNextWorkingDay(date, capacity.workingDays),
                  },
                ],
                confidence: 95,
                priority: 1,
              },
            ],
            autoResolvable: true,
            estimatedImpact: {
              delayDays: 1,
              capacityLoss: 8,
              costEstimate: 0,
              customerImpact: 'minor',
            },
            detectedAt: new Date(),
          });
        }
      }
    }

    return conflicts;
  }

  // ===========================================================================
  // PREDECESSOR VIOLATION DETECTION
  // ===========================================================================

  async detectPredecessorViolations(
    schedule: NormalizedScheduleItem[],
    workOrders: WorkOrderScheduleInfo[]
  ): Promise<DetailedConflict[]> {
    const conflicts: DetailedConflict[] = [];

    for (const item of schedule) {
      const wo = workOrders.find(w => w.id === item.workOrderId);
      if (!wo || wo.predecessors.length === 0) continue;

      for (const predId of wo.predecessors) {
        const predSchedule = schedule.find(s => s.workOrderId === predId);
        const predWO = workOrders.find(w => w.id === predId);

        if (predSchedule && item.startDate < predSchedule.endDate) {
          const overlapDays = Math.ceil(
            (predSchedule.endDate.getTime() - item.startDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          conflicts.push({
            id: `conflict-predecessor-${item.workOrderId}-${predId}`,
            type: 'predecessor_violation',
            severity: 'high',
            title: `Vi phạm thứ tự sản xuất`,
            description: `${item.woNumber} bắt đầu trước khi ${predWO?.woNumber || predId} hoàn thành`,
            affectedWorkOrders: [
              {
                workOrderId: item.workOrderId,
                woNumber: item.woNumber,
                productName: wo.productName,
                currentStart: item.startDate,
                currentEnd: item.endDate,
                suggestedStart: predSchedule.endDate,
              },
              {
                workOrderId: predId,
                woNumber: predWO?.woNumber || predId,
                productName: predWO?.productName || '',
                currentStart: predSchedule.startDate,
                currentEnd: predSchedule.endDate,
              },
            ],
            affectedWorkCenters: [],
            affectedDates: [item.startDate, predSchedule.endDate],
            suggestedResolutions: [
              {
                id: `res-delay-${item.workOrderId}`,
                type: 'reschedule',
                description: `Dời ${item.woNumber} sau khi ${predWO?.woNumber} hoàn thành`,
                impact: {
                  dueDateChange: overlapDays,
                  capacityChange: 0,
                  costChange: 0,
                  otherWorkOrdersAffected: 0,
                  riskLevel: 'medium',
                },
                actions: [
                  {
                    type: 'update_work_order',
                    target: item.workOrderId,
                    field: 'plannedStart',
                    oldValue: item.startDate,
                    newValue: predSchedule.endDate,
                  },
                ],
                confidence: 90,
                priority: 1,
              },
            ],
            autoResolvable: true,
            estimatedImpact: {
              delayDays: overlapDays,
              capacityLoss: 0,
              costEstimate: 0,
              customerImpact: 'minor',
            },
            detectedAt: new Date(),
          });
        }
      }
    }

    return conflicts;
  }

  // ===========================================================================
  // WARNING GENERATION
  // ===========================================================================

  private generateCapacityWarnings(
    schedule: NormalizedScheduleItem[],
    capacities: WorkCenterCapacityInfo[]
  ): ConflictWarning[] {
    const warnings: ConflictWarning[] = [];

    for (const capacity of capacities) {
      const avgUtilization = capacity.dailyCapacity.reduce(
        (sum, dc) => sum + dc.utilization,
        0
      ) / capacity.dailyCapacity.length;

      if (avgUtilization > 80 && avgUtilization <= 95) {
        warnings.push({
          type: 'high_utilization',
          severity: 'warning',
          message: `${capacity.name} đang hoạt động ${avgUtilization.toFixed(0)}% công suất`,
          affectedEntities: [capacity.id],
          recommendation: 'Cân nhắc phân bổ công việc sang máy khác hoặc tăng ca',
        });
      } else if (avgUtilization > 95) {
        warnings.push({
          type: 'capacity_approaching_limit',
          severity: 'warning',
          message: `${capacity.name} gần đạt giới hạn công suất (${avgUtilization.toFixed(0)}%)`,
          affectedEntities: [capacity.id],
          recommendation: 'Xem xét thuê ngoài hoặc dời lịch các đơn hàng ưu tiên thấp',
        });
      }
    }

    return warnings;
  }

  private generateQueueWarnings(schedule: NormalizedScheduleItem[]): ConflictWarning[] {
    const warnings: ConflictWarning[] = [];
    const byWorkCenter = new Map<string, number>();

    for (const item of schedule) {
      byWorkCenter.set(
        item.workCenterId,
        (byWorkCenter.get(item.workCenterId) || 0) + 1
      );
    }

    for (const [wcId, count] of byWorkCenter) {
      if (count > 10) {
        warnings.push({
          type: 'long_queue',
          severity: 'info',
          message: `Có ${count} lệnh sản xuất đang chờ`,
          affectedEntities: [wcId],
          recommendation: 'Xem xét ưu tiên lại hoặc phân bổ sang máy khác',
        });
      }
    }

    return warnings;
  }

  private generateBalanceWarnings(
    schedule: NormalizedScheduleItem[],
    capacities: WorkCenterCapacityInfo[]
  ): ConflictWarning[] {
    const warnings: ConflictWarning[] = [];
    const loads = new Map<string, number>();

    for (const item of schedule) {
      loads.set(
        item.workCenterId,
        (loads.get(item.workCenterId) || 0) + item.durationHours
      );
    }

    const loadValues = Array.from(loads.values());
    if (loadValues.length > 1) {
      const avg = loadValues.reduce((a, b) => a + b, 0) / loadValues.length;
      const max = Math.max(...loadValues);
      const min = Math.min(...loadValues);

      if (max > avg * 1.5 && min < avg * 0.5) {
        warnings.push({
          type: 'unbalanced_load',
          severity: 'warning',
          message: 'Công việc phân bổ không đều giữa các máy',
          affectedEntities: Array.from(loads.keys()),
          recommendation: 'Sử dụng thuật toán cân bằng tải để phân bổ lại',
        });
      }
    }

    return warnings;
  }

  // ===========================================================================
  // RESOLUTION METHODS
  // ===========================================================================

  async applyResolution(
    conflictId: string,
    resolutionId: string,
    userId: string
  ): Promise<ResolutionResult> {
    // This would be implemented to actually apply the resolution
    // For now, return a mock result
    return {
      success: true,
      conflictId,
      resolutionId,
      appliedActions: [],
      remainingConflicts: [],
      errors: [],
    };
  }

  async autoResolveConflicts(
    conflicts: DetailedConflict[],
    userId: string
  ): Promise<ResolutionResult[]> {
    const results: ResolutionResult[] = [];

    for (const conflict of conflicts) {
      if (!conflict.autoResolvable) continue;

      const resolution = conflict.suggestedResolutions[0];
      if (!resolution) continue;

      const result = await this.applyResolution(conflict.id, resolution.id, userId);
      results.push(result);
    }

    return results;
  }

  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================

  private normalizeSchedule(
    schedule: ScheduledWorkOrder[] | ScheduleSuggestion[]
  ): NormalizedScheduleItem[] {
    return schedule.map(item => {
      if ('suggestedSchedule' in item) {
        // ScheduleSuggestion
        return {
          workOrderId: item.workOrderId,
          woNumber: item.woNumber,
          productName: item.productName,
          workCenterId: item.suggestedSchedule.workCenterId,
          workCenterName: item.suggestedSchedule.workCenterName,
          startDate: item.suggestedSchedule.startDate,
          endDate: item.suggestedSchedule.endDate,
          durationHours: this.calculateHours(
            item.suggestedSchedule.startDate,
            item.suggestedSchedule.endDate
          ),
        };
      } else {
        // ScheduledWorkOrder
        return {
          workOrderId: item.workOrderId,
          woNumber: item.woNumber,
          productName: '',
          workCenterId: item.workCenterId,
          workCenterName: item.workCenterName,
          startDate: item.startDate,
          endDate: item.endDate,
          durationHours: this.calculateHours(item.startDate, item.endDate),
        };
      }
    });
  }

  private calculateHours(start: Date, end: Date): number {
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  }

  private getDatesBetween(start: Date, end: Date): Date[] {
    const dates: Date[] = [];
    const current = new Date(start);

    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }

  private dateInRange(date: Date, start: Date, end: Date): boolean {
    const dateTime = date.getTime();
    return dateTime >= start.getTime() && dateTime <= end.getTime();
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  private getNextWorkingDay(date: Date, workingDays: number[]): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + 1);

    while (!workingDays.includes(next.getDay())) {
      next.setDate(next.getDate() + 1);
    }

    return next;
  }

  private generateOverlapResolutions(
    a: NormalizedScheduleItem,
    b: NormalizedScheduleItem,
    overlapHours: number
  ): Resolution[] {
    return [
      {
        id: `res-move-${b.workOrderId}`,
        type: 'reschedule',
        description: `Dời ${b.woNumber} bắt đầu sau ${a.woNumber}`,
        impact: {
          dueDateChange: Math.ceil(overlapHours / 8),
          capacityChange: 0,
          costChange: 0,
          otherWorkOrdersAffected: 1,
          riskLevel: 'low',
        },
        actions: [
          {
            type: 'update_work_order',
            target: b.workOrderId,
            field: 'plannedStart',
            oldValue: b.startDate,
            newValue: a.endDate,
          },
        ],
        confidence: 90,
        priority: 1,
      },
      {
        id: `res-reassign-${b.workOrderId}`,
        type: 'reassign',
        description: `Chuyển ${b.woNumber} sang máy khác`,
        impact: {
          dueDateChange: 0,
          capacityChange: b.durationHours,
          costChange: 0,
          otherWorkOrdersAffected: 0,
          riskLevel: 'medium',
        },
        actions: [
          {
            type: 'update_work_order',
            target: b.workOrderId,
            field: 'workCenterId',
            oldValue: b.workCenterId,
            newValue: null, // Would be determined
          },
        ],
        confidence: 75,
        priority: 2,
      },
    ];
  }

  private generateOverloadResolutions(
    capacity: WorkCenterCapacityInfo,
    affectedWOs: NormalizedScheduleItem[],
    overloadHours: number
  ): Resolution[] {
    const resolutions: Resolution[] = [];

    // Option 1: Overtime
    if (overloadHours <= 4) {
      resolutions.push({
        id: `res-overtime-${capacity.id}`,
        type: 'overtime',
        description: `Thêm ${overloadHours.toFixed(1)} giờ làm thêm`,
        impact: {
          dueDateChange: 0,
          capacityChange: overloadHours,
          costChange: overloadHours * 200000, // Overtime rate
          otherWorkOrdersAffected: 0,
          riskLevel: 'low',
        },
        actions: [
          {
            type: 'add_overtime',
            target: capacity.id,
            message: `Thêm ${overloadHours.toFixed(1)} giờ làm thêm`,
          },
        ],
        confidence: 85,
        priority: 1,
      });
    }

    // Option 2: Defer lowest priority
    const lowestPriority = affectedWOs[affectedWOs.length - 1];
    if (lowestPriority) {
      resolutions.push({
        id: `res-defer-${lowestPriority.workOrderId}`,
        type: 'defer',
        description: `Dời ${lowestPriority.woNumber} sang ngày sau`,
        impact: {
          dueDateChange: 1,
          capacityChange: lowestPriority.durationHours,
          costChange: 0,
          otherWorkOrdersAffected: 1,
          riskLevel: 'medium',
        },
        actions: [
          {
            type: 'update_work_order',
            target: lowestPriority.workOrderId,
            field: 'plannedStart',
            oldValue: lowestPriority.startDate,
            newValue: new Date(lowestPriority.startDate.getTime() + 24 * 60 * 60 * 1000),
          },
        ],
        confidence: 80,
        priority: 2,
      });
    }

    return resolutions;
  }

  private generateMaterialResolutions(
    wo: WorkOrderScheduleInfo,
    materialsReady: Date
  ): Resolution[] {
    return [
      {
        id: `res-delay-material-${wo.id}`,
        type: 'reschedule',
        description: `Dời ${wo.woNumber} đến khi NVL sẵn sàng`,
        impact: {
          dueDateChange: Math.ceil(
            (materialsReady.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          ),
          capacityChange: 0,
          costChange: 0,
          otherWorkOrdersAffected: 0,
          riskLevel: 'low',
        },
        actions: [
          {
            type: 'update_work_order',
            target: wo.id,
            field: 'plannedStart',
            oldValue: wo.plannedStart,
            newValue: materialsReady,
          },
        ],
        confidence: 95,
        priority: 1,
      },
      {
        id: `res-expedite-${wo.id}`,
        type: 'expedite',
        description: 'Đẩy nhanh đơn hàng NVL',
        impact: {
          dueDateChange: 0,
          capacityChange: 0,
          costChange: 500000, // Expedite fee
          otherWorkOrdersAffected: 0,
          riskLevel: 'medium',
        },
        actions: [
          {
            type: 'notify',
            target: 'purchasing',
            message: `Yêu cầu đẩy nhanh NVL cho ${wo.woNumber}`,
          },
        ],
        confidence: 70,
        priority: 2,
      },
    ];
  }

  private generateDueDateResolutions(
    wo: WorkOrderScheduleInfo,
    item: NormalizedScheduleItem,
    lateDays: number
  ): Resolution[] {
    const resolutions: Resolution[] = [];

    // Option 1: Overtime
    if (lateDays <= 2) {
      resolutions.push({
        id: `res-overtime-${wo.id}`,
        type: 'overtime',
        description: `Tăng ca ${lateDays * 2} giờ để kịp hạn`,
        impact: {
          dueDateChange: -lateDays,
          capacityChange: lateDays * 2,
          costChange: lateDays * 2 * 200000,
          otherWorkOrdersAffected: 0,
          riskLevel: 'low',
        },
        actions: [
          {
            type: 'add_overtime',
            target: item.workCenterId,
            message: `Thêm ${lateDays * 2} giờ làm thêm`,
          },
        ],
        confidence: 85,
        priority: 1,
      });
    }

    // Option 2: Outsource
    resolutions.push({
      id: `res-outsource-${wo.id}`,
      type: 'outsource',
      description: 'Thuê ngoài một phần công việc',
      impact: {
        dueDateChange: -lateDays,
        capacityChange: wo.estimatedDuration * 0.5,
        costChange: wo.estimatedDuration * 0.5 * 300000,
        otherWorkOrdersAffected: 0,
        riskLevel: 'medium',
      },
      actions: [
        {
          type: 'notify',
          target: 'purchasing',
          message: `Yêu cầu thuê ngoài cho ${wo.woNumber}`,
        },
      ],
      confidence: 70,
      priority: 2,
    });

    return resolutions;
  }

  private generateSummary(
    conflicts: DetailedConflict[],
    schedule: NormalizedScheduleItem[],
    capacities: WorkCenterCapacityInfo[]
  ): ConflictSummary {
    const affectedWOs = new Set<string>();
    const affectedWCs = new Set<string>();

    for (const conflict of conflicts) {
      conflict.affectedWorkOrders.forEach(wo => affectedWOs.add(wo.workOrderId));
      conflict.affectedWorkCenters.forEach(wc => affectedWCs.add(wc.workCenterId));
    }

    const recommendedActions: string[] = [];
    const criticalConflicts = conflicts.filter(c => c.severity === 'critical');
    const autoResolvable = conflicts.filter(c => c.autoResolvable);

    if (criticalConflicts.length > 0) {
      recommendedActions.push(`Xử lý ngay ${criticalConflicts.length} xung đột nghiêm trọng`);
    }
    if (autoResolvable.length > 0) {
      recommendedActions.push(`Có thể tự động giải quyết ${autoResolvable.length} xung đột`);
    }

    return {
      totalConflicts: conflicts.length,
      criticalCount: conflicts.filter(c => c.severity === 'critical').length,
      highCount: conflicts.filter(c => c.severity === 'high').length,
      mediumCount: conflicts.filter(c => c.severity === 'medium').length,
      lowCount: conflicts.filter(c => c.severity === 'low').length,
      autoResolvableCount: autoResolvable.length,
      totalAffectedWorkOrders: affectedWOs.size,
      totalAffectedWorkCenters: affectedWCs.size,
      recommendedActions,
    };
  }
}

// =============================================================================
// INTERNAL TYPES
// =============================================================================

interface NormalizedScheduleItem {
  workOrderId: string;
  woNumber: string;
  productName: string;
  workCenterId: string;
  workCenterName: string;
  startDate: Date;
  endDate: Date;
  durationHours: number;
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const conflictDetector = ConflictDetector.getInstance();

export function getConflictDetector(): ConflictDetector {
  return ConflictDetector.getInstance();
}
