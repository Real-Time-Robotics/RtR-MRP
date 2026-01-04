/**
 * Capacity Calculator Engine for MRP Integration
 *
 * Calculates production capacity based on:
 * - Work Center calendars
 * - Shift schedules
 * - Maintenance schedules
 * - Downtime records
 * - Employee availability
 */

import prisma from '../prisma';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface CapacityParams {
  startDate: Date;
  endDate: Date;
  workCenterIds?: string[];
  includeMaintenanceDeduction?: boolean;
  includeDowntimeHistory?: boolean;
}

export interface DailyCapacity {
  date: string;
  workCenterId: string;
  workCenterCode: string;
  workCenterName: string;
  baseCapacityHours: number;
  shiftHours: number;
  maintenanceHours: number;
  expectedDowntimeHours: number;
  availableHours: number;
  scheduledHours: number;
  remainingHours: number;
  utilization: number;
}

export interface WorkCenterCapacitySummary {
  workCenterId: string;
  workCenterCode: string;
  workCenterName: string;
  type: string;
  totalAvailableHours: number;
  totalScheduledHours: number;
  totalRemainingHours: number;
  avgUtilization: number;
  peakUtilization: number;
  daysOverloaded: number;
  bottleneckDays: string[];
}

export interface CapacityResult {
  period: {
    startDate: string;
    endDate: string;
    totalDays: number;
  };
  summary: {
    totalCapacityHours: number;
    totalScheduledHours: number;
    totalRemainingHours: number;
    avgUtilization: number;
    overloadedWorkCenters: number;
    bottleneckWorkCenters: string[];
  };
  byWorkCenter: WorkCenterCapacitySummary[];
  dailyDetails: DailyCapacity[];
}

export interface CapacityCheckResult {
  feasible: boolean;
  score: number; // 0-100
  workOrders: WorkOrderCapacityCheck[];
  bottlenecks: BottleneckInfo[];
  suggestions: CapacitySuggestion[];
}

export interface WorkOrderCapacityCheck {
  workOrderId?: string;
  productId: string;
  productName: string;
  quantity: number;
  requiredHours: number;
  workCenterId: string;
  workCenterName: string;
  requestedDate: Date;
  feasibleDate: Date | null;
  status: 'on_time' | 'delayed' | 'infeasible';
  delayDays: number;
}

export interface BottleneckInfo {
  workCenterId: string;
  workCenterName: string;
  date: string;
  overloadHours: number;
  affectedOrders: number;
  severity: 'critical' | 'warning' | 'minor';
}

export interface CapacitySuggestion {
  type: 'add_shift' | 'reschedule' | 'outsource' | 'overtime' | 'add_equipment';
  priority: 'high' | 'medium' | 'low';
  workCenterId: string;
  description: string;
  potentialGainHours: number;
  estimatedCost?: number;
}

export interface ProductionScheduleItem {
  workOrderId?: string;
  productId: string;
  productName: string;
  quantity: number;
  workCenterId: string;
  workCenterName: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  hours: number;
  status: 'scheduled' | 'tentative' | 'at_risk';
}

// ============================================================================
// CAPACITY CALCULATION ENGINE
// ============================================================================

/**
 * Calculate available capacity for work centers over a date range
 */
export async function calculateCapacity(params: CapacityParams): Promise<CapacityResult> {
  const {
    startDate,
    endDate,
    workCenterIds,
    includeMaintenanceDeduction = true,
    includeDowntimeHistory = true,
  } = params;

  // Get work centers
  const workCenters = await prisma.workCenter.findMany({
    where: workCenterIds ? { id: { in: workCenterIds } } : { status: 'active' },
    include: {
      equipment: {
        where: { status: 'operational' },
      },
    },
  });

  // Get shifts
  const shifts = await prisma.shift.findMany({
    where: { isActive: true },
  });

  // Get maintenance schedules in period
  const maintenanceOrders = includeMaintenanceDeduction
    ? await prisma.maintenanceOrder.findMany({
        where: {
          plannedStartDate: { lte: endDate },
          plannedEndDate: { gte: startDate },
          status: { in: ['pending', 'in_progress', 'scheduled'] },
        },
        include: {
          equipment: {
            include: { workCenter: true },
          },
        },
      })
    : [];

  // Get historical downtime for estimation
  const historicalDowntime = includeDowntimeHistory
    ? await prisma.maintenanceOrder.findMany({
        where: {
          type: 'corrective',
          actualStartDate: {
            gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
          },
          status: 'completed',
        },
        include: {
          equipment: {
            include: { workCenter: true },
          },
        },
      })
    : [];

  // Get existing work orders scheduled in period
  const scheduledWorkOrders = await prisma.workOrder.findMany({
    where: {
      plannedStart: { lte: endDate },
      plannedEnd: { gte: startDate },
      status: { in: ['draft', 'released', 'in_progress'] },
    },
    include: {
      product: true,
    },
  });

  // Calculate daily capacity for each work center
  const dailyDetails: DailyCapacity[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    const dateStr = current.toISOString().split('T')[0];
    const dayOfWeek = current.getDay();

    for (const wc of workCenters) {
      // Base capacity from work center settings
      const baseCapacity = wc.capacityPerDay || 8;

      // Calculate shift hours for this day
      const applicableShifts = shifts.filter((s) => {
        const days = (s.workingDays as number[]) || [1, 2, 3, 4, 5]; // Default Mon-Fri
        return days.includes(dayOfWeek);
      });

      let shiftHours = 0;
      for (const shift of applicableShifts) {
        const startParts = shift.startTime.split(':').map(Number);
        const endParts = shift.endTime.split(':').map(Number);
        const startMins = startParts[0] * 60 + startParts[1];
        let endMins = endParts[0] * 60 + endParts[1];
        if (endMins < startMins) endMins += 24 * 60; // Handle overnight shifts
        const breakMins = shift.breakMinutes || 0;
        shiftHours += (endMins - startMins - breakMins) / 60;
      }

      // If no shifts defined, use base capacity
      if (shiftHours === 0) {
        shiftHours = dayOfWeek === 0 || dayOfWeek === 6 ? 0 : baseCapacity;
      }

      // Calculate maintenance hours for this day and work center
      let maintenanceHours = 0;
      for (const mo of maintenanceOrders) {
        if (mo.equipment?.workCenterId !== wc.id) continue;
        if (!mo.plannedStartDate || !mo.plannedEndDate) continue;

        const moStart = new Date(mo.plannedStartDate);
        const moEnd = new Date(mo.plannedEndDate);

        if (moStart <= current && moEnd >= current) {
          // Calculate hours for this specific day
          const dayStart = new Date(current);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(current);
          dayEnd.setHours(23, 59, 59, 999);

          const overlapStart = moStart > dayStart ? moStart : dayStart;
          const overlapEnd = moEnd < dayEnd ? moEnd : dayEnd;
          const overlapHours = (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60);

          maintenanceHours += Math.min(overlapHours, mo.estimatedDuration || 2);
        }
      }

      // Estimate expected downtime based on historical data
      let expectedDowntimeHours = 0;
      if (includeDowntimeHistory && wc.equipment.length > 0) {
        const wcDowntimeOrders = historicalDowntime.filter(
          (d) => d.equipment?.workCenterId === wc.id
        );
        if (wcDowntimeOrders.length > 0) {
          const totalDowntimeHours = wcDowntimeOrders.reduce(
            (sum, d) => sum + (d.actualDuration || 0),
            0
          );
          // Average daily downtime based on 90-day history
          expectedDowntimeHours = (totalDowntimeHours / 90) * (dayOfWeek === 0 || dayOfWeek === 6 ? 0.2 : 1);
        }
      }

      // Calculate available hours
      const availableHours = Math.max(0, shiftHours - maintenanceHours - expectedDowntimeHours);

      // Calculate scheduled hours from work orders
      let scheduledHours = 0;
      for (const wo of scheduledWorkOrders) {
        // For simplicity, distribute work order hours evenly across its planned period
        // In reality, you'd want to check which work center the product uses
        if (wo.workCenterId !== wc.id) continue;
        if (!wo.plannedStart || !wo.plannedEnd) continue;

        const woStart = new Date(wo.plannedStart);
        const woEnd = new Date(wo.plannedEnd);

        if (woStart <= current && woEnd >= current) {
          const totalWoDays = Math.max(1, Math.ceil((woEnd.getTime() - woStart.getTime()) / (1000 * 60 * 60 * 24)));
          const dailyHours = ((wo.product?.assemblyHours || 8) + (wo.product?.testingHours || 2)) * wo.quantity / totalWoDays;
          scheduledHours += dailyHours;
        }
      }

      const remainingHours = Math.max(0, availableHours - scheduledHours);
      const utilization = availableHours > 0 ? (scheduledHours / availableHours) * 100 : 0;

      dailyDetails.push({
        date: dateStr,
        workCenterId: wc.id,
        workCenterCode: wc.code,
        workCenterName: wc.name,
        baseCapacityHours: baseCapacity,
        shiftHours,
        maintenanceHours,
        expectedDowntimeHours,
        availableHours,
        scheduledHours,
        remainingHours,
        utilization,
      });
    }

    current.setDate(current.getDate() + 1);
  }

  // Aggregate by work center
  const byWorkCenter: WorkCenterCapacitySummary[] = workCenters.map((wc) => {
    const wcDaily = dailyDetails.filter((d) => d.workCenterId === wc.id);

    const totalAvailableHours = wcDaily.reduce((sum, d) => sum + d.availableHours, 0);
    const totalScheduledHours = wcDaily.reduce((sum, d) => sum + d.scheduledHours, 0);
    const totalRemainingHours = wcDaily.reduce((sum, d) => sum + d.remainingHours, 0);
    const avgUtilization = wcDaily.length > 0
      ? wcDaily.reduce((sum, d) => sum + d.utilization, 0) / wcDaily.length
      : 0;
    const peakUtilization = Math.max(...wcDaily.map((d) => d.utilization));
    const overloadedDays = wcDaily.filter((d) => d.utilization > 100);
    const daysOverloaded = overloadedDays.length;
    const bottleneckDays = overloadedDays.map((d) => d.date);

    return {
      workCenterId: wc.id,
      workCenterCode: wc.code,
      workCenterName: wc.name,
      type: wc.type,
      totalAvailableHours,
      totalScheduledHours,
      totalRemainingHours,
      avgUtilization,
      peakUtilization,
      daysOverloaded,
      bottleneckDays,
    };
  });

  // Overall summary
  const totalCapacityHours = byWorkCenter.reduce((sum, wc) => sum + wc.totalAvailableHours, 0);
  const totalScheduledHours = byWorkCenter.reduce((sum, wc) => sum + wc.totalScheduledHours, 0);
  const totalRemainingHours = byWorkCenter.reduce((sum, wc) => sum + wc.totalRemainingHours, 0);
  const avgUtilization = totalCapacityHours > 0 ? (totalScheduledHours / totalCapacityHours) * 100 : 0;
  const overloadedWorkCenters = byWorkCenter.filter((wc) => wc.daysOverloaded > 0).length;
  const bottleneckWorkCenters = byWorkCenter
    .filter((wc) => wc.peakUtilization > 100)
    .map((wc) => wc.workCenterCode);

  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  return {
    period: {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      totalDays,
    },
    summary: {
      totalCapacityHours,
      totalScheduledHours,
      totalRemainingHours,
      avgUtilization,
      overloadedWorkCenters,
      bottleneckWorkCenters,
    },
    byWorkCenter,
    dailyDetails,
  };
}

// ============================================================================
// FINITE CAPACITY SCHEDULING
// ============================================================================

interface WorkOrderRequirement {
  id?: string;
  productId: string;
  quantity: number;
  requestedDate: Date;
  priority?: 'high' | 'normal' | 'low';
}

/**
 * Schedule work orders using finite capacity
 * Uses forward scheduling - finds earliest available slot
 */
export async function finiteCapacitySchedule(
  requirements: WorkOrderRequirement[],
  startDate: Date
): Promise<ProductionScheduleItem[]> {
  // Get products with routing info
  const productIds = Array.from(new Set(requirements.map((r) => r.productId)));
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: {
      defaultWorkCenter: true,
    },
  });

  // Get work centers
  const workCenters = await prisma.workCenter.findMany({
    where: { status: 'active' },
  });

  // Calculate capacity for next 60 days
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 60);

  const capacityResult = await calculateCapacity({
    startDate,
    endDate,
  });

  // Create a mutable capacity tracker
  const capacityTracker = new Map<string, number>(); // key: workCenterId-date
  for (const daily of capacityResult.dailyDetails) {
    const key = `${daily.workCenterId}-${daily.date}`;
    capacityTracker.set(key, daily.remainingHours);
  }

  // Sort requirements by priority and date
  const sortedReqs = [...requirements].sort((a, b) => {
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    const aPriority = priorityOrder[a.priority || 'normal'];
    const bPriority = priorityOrder[b.priority || 'normal'];
    if (aPriority !== bPriority) return aPriority - bPriority;
    return a.requestedDate.getTime() - b.requestedDate.getTime();
  });

  const schedule: ProductionScheduleItem[] = [];

  for (const req of sortedReqs) {
    const product = products.find((p) => p.id === req.productId);
    if (!product) continue;

    // Determine work center (use default or first available)
    const workCenter = product.defaultWorkCenter || workCenters[0];
    if (!workCenter) continue;

    // Calculate required hours
    const assemblyHours = product.assemblyHours || 8;
    const testingHours = product.testingHours || 2;
    const totalHours = (assemblyHours + testingHours) * req.quantity;

    // Find first available slot with enough capacity
    let remainingHours = totalHours;
    let scheduledStart: Date | null = null;
    let scheduledEnd: Date | null = null;
    const current = new Date(startDate);

    while (remainingHours > 0 && current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];
      const key = `${workCenter.id}-${dateStr}`;
      const available = capacityTracker.get(key) || 0;

      if (available > 0) {
        if (!scheduledStart) {
          scheduledStart = new Date(current);
        }

        const hoursToSchedule = Math.min(available, remainingHours);
        capacityTracker.set(key, available - hoursToSchedule);
        remainingHours -= hoursToSchedule;
        scheduledEnd = new Date(current);
      }

      current.setDate(current.getDate() + 1);
    }

    if (scheduledStart && scheduledEnd) {
      const delayDays = Math.max(
        0,
        Math.ceil((scheduledEnd.getTime() - req.requestedDate.getTime()) / (1000 * 60 * 60 * 24))
      );

      schedule.push({
        workOrderId: req.id,
        productId: req.productId,
        productName: product.name,
        quantity: req.quantity,
        workCenterId: workCenter.id,
        workCenterName: workCenter.name,
        scheduledStart,
        scheduledEnd,
        hours: totalHours,
        status: delayDays === 0 ? 'scheduled' : delayDays <= 3 ? 'tentative' : 'at_risk',
      });
    }
  }

  return schedule;
}

// ============================================================================
// CAPACITY CHECK FOR MRP
// ============================================================================

/**
 * Check if proposed production can be completed within capacity
 */
export async function checkCapacityFeasibility(
  requirements: WorkOrderRequirement[]
): Promise<CapacityCheckResult> {
  const startDate = new Date();
  const schedule = await finiteCapacitySchedule(requirements, startDate);

  // Get products for checking
  const productIds = Array.from(new Set(requirements.map((r) => r.productId)));
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: { defaultWorkCenter: true },
  });

  // Map results back to requirements
  const workOrderChecks: WorkOrderCapacityCheck[] = requirements.map((req) => {
    const product = products.find((p) => p.id === req.productId);
    const scheduledItem = schedule.find(
      (s) => s.productId === req.productId && s.workOrderId === req.id
    );

    const assemblyHours = product?.assemblyHours || 8;
    const testingHours = product?.testingHours || 2;
    const requiredHours = (assemblyHours + testingHours) * req.quantity;

    if (scheduledItem) {
      const delayDays = Math.max(
        0,
        Math.ceil(
          (scheduledItem.scheduledEnd.getTime() - req.requestedDate.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      );

      return {
        workOrderId: req.id,
        productId: req.productId,
        productName: product?.name || 'Unknown',
        quantity: req.quantity,
        requiredHours,
        workCenterId: scheduledItem.workCenterId,
        workCenterName: scheduledItem.workCenterName,
        requestedDate: req.requestedDate,
        feasibleDate: scheduledItem.scheduledEnd,
        status: delayDays === 0 ? 'on_time' : 'delayed',
        delayDays,
      };
    }

    return {
      workOrderId: req.id,
      productId: req.productId,
      productName: product?.name || 'Unknown',
      quantity: req.quantity,
      requiredHours,
      workCenterId: product?.defaultWorkCenterId || '',
      workCenterName: product?.defaultWorkCenter?.name || 'Unknown',
      requestedDate: req.requestedDate,
      feasibleDate: null,
      status: 'infeasible',
      delayDays: -1,
    };
  });

  // Identify bottlenecks
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 30);
  const capacityResult = await calculateCapacity({ startDate, endDate });

  const bottlenecks: BottleneckInfo[] = capacityResult.dailyDetails
    .filter((d) => d.utilization > 100)
    .map((d) => ({
      workCenterId: d.workCenterId,
      workCenterName: d.workCenterName,
      date: d.date,
      overloadHours: d.scheduledHours - d.availableHours,
      affectedOrders: workOrderChecks.filter(
        (wo) =>
          wo.workCenterId === d.workCenterId &&
          wo.feasibleDate &&
          wo.feasibleDate.toISOString().split('T')[0] === d.date
      ).length,
      severity:
        d.utilization > 150
          ? 'critical'
          : d.utilization > 120
          ? 'warning'
          : 'minor',
    }));

  // Generate suggestions
  const suggestions: CapacitySuggestion[] = [];

  // Check for overloaded work centers
  const overloadedWCs = capacityResult.byWorkCenter.filter((wc) => wc.daysOverloaded > 0);
  for (const wc of overloadedWCs) {
    if (wc.peakUtilization > 120) {
      suggestions.push({
        type: 'add_shift',
        priority: 'high',
        workCenterId: wc.workCenterId,
        description: `Add extra shift to ${wc.workCenterName} to handle ${wc.daysOverloaded} overloaded days`,
        potentialGainHours: wc.daysOverloaded * 8,
      });
    }

    if (wc.avgUtilization > 90) {
      suggestions.push({
        type: 'overtime',
        priority: 'medium',
        workCenterId: wc.workCenterId,
        description: `Consider overtime for ${wc.workCenterName} (avg utilization: ${wc.avgUtilization.toFixed(1)}%)`,
        potentialGainHours: wc.daysOverloaded * 2,
      });
    }
  }

  // Check for delayed orders
  const delayedOrders = workOrderChecks.filter((wo) => wo.status === 'delayed' && wo.delayDays > 5);
  if (delayedOrders.length > 0) {
    suggestions.push({
      type: 'reschedule',
      priority: 'medium',
      workCenterId: '',
      description: `Consider rescheduling ${delayedOrders.length} orders with >5 day delays`,
      potentialGainHours: 0,
    });
  }

  // Check for infeasible orders
  const infeasibleOrders = workOrderChecks.filter((wo) => wo.status === 'infeasible');
  if (infeasibleOrders.length > 0) {
    suggestions.push({
      type: 'outsource',
      priority: 'high',
      workCenterId: '',
      description: `${infeasibleOrders.length} orders cannot be scheduled within capacity - consider outsourcing`,
      potentialGainHours: infeasibleOrders.reduce((sum, wo) => sum + wo.requiredHours, 0),
    });
  }

  // Calculate feasibility score
  const totalOrders = workOrderChecks.length;
  const onTimeOrders = workOrderChecks.filter((wo) => wo.status === 'on_time').length;
  const delayedOrdersCount = workOrderChecks.filter((wo) => wo.status === 'delayed').length;
  const infeasibleCount = infeasibleOrders.length;

  let score = 100;
  score -= (delayedOrdersCount / totalOrders) * 30;
  score -= (infeasibleCount / totalOrders) * 50;
  score -= bottlenecks.filter((b) => b.severity === 'critical').length * 5;
  score = Math.max(0, Math.min(100, score));

  return {
    feasible: infeasibleCount === 0 && score >= 60,
    score: Math.round(score),
    workOrders: workOrderChecks,
    bottlenecks,
    suggestions,
  };
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Get capacity utilization summary for dashboard
 */
export async function getCapacityUtilizationSummary(days: number = 7) {
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);

  const result = await calculateCapacity({ startDate, endDate });

  return {
    totalCapacityHours: result.summary.totalCapacityHours,
    totalScheduledHours: result.summary.totalScheduledHours,
    utilizationPercent: result.summary.avgUtilization,
    overloadedWorkCenters: result.summary.overloadedWorkCenters,
    bottlenecks: result.summary.bottleneckWorkCenters,
  };
}

/**
 * Find the next available slot for a specific work center
 */
export async function findNextAvailableSlot(
  workCenterId: string,
  requiredHours: number,
  afterDate?: Date
): Promise<{ startDate: Date; endDate: Date } | null> {
  const startDate = afterDate || new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 60);

  const result = await calculateCapacity({
    startDate,
    endDate,
    workCenterIds: [workCenterId],
  });

  let remainingHours = requiredHours;
  let slotStart: Date | null = null;
  let slotEnd: Date | null = null;

  for (const daily of result.dailyDetails) {
    if (daily.remainingHours > 0) {
      if (!slotStart) {
        slotStart = new Date(daily.date);
      }

      remainingHours -= daily.remainingHours;
      slotEnd = new Date(daily.date);

      if (remainingHours <= 0) {
        return { startDate: slotStart, endDate: slotEnd };
      }
    }
  }

  return null;
}
