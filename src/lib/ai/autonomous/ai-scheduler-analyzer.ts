// =============================================================================
// AI SCHEDULER ANALYZER - AI-Enhanced Schedule Analysis
// =============================================================================
// Uses AI to explain, predict, and suggest improvements for production schedules
// Part of Phase 3: Autonomous Operations - Auto-Scheduling Feature
// =============================================================================

import {
  ScheduleResult,
  ScheduleSuggestion,
  WorkOrderScheduleInfo,
  WorkCenterCapacityInfo,
  ScheduleConflict,
  ScheduleMetrics,
} from './scheduling-engine';
import { OptimizationResult, ScheduledWorkOrder, OptimizationMetrics } from './schedule-optimizer';
import { DetailedConflict, ConflictDetectionResult } from './conflict-detector';

// =============================================================================
// TYPES
// =============================================================================

export interface ScheduleExplanation {
  summary: string;
  keyDecisions: KeyDecision[];
  tradeoffs: Tradeoff[];
  assumptions: string[];
  limitations: string[];
  confidence: number;
}

export interface KeyDecision {
  decision: string;
  reason: string;
  impact: string;
  alternatives: string[];
}

export interface Tradeoff {
  factor1: string;
  factor2: string;
  description: string;
  recommendation: string;
}

export interface BottleneckPrediction {
  id: string;
  type: BottleneckType;
  severity: 'critical' | 'high' | 'medium' | 'low';
  location: string;
  locationId: string;
  predictedDate: Date;
  probability: number;
  description: string;
  impact: BottleneckImpact;
  preventiveActions: PreventiveAction[];
  confidenceScore: number;
}

export type BottleneckType =
  | 'capacity'
  | 'material'
  | 'skill'
  | 'equipment'
  | 'queue'
  | 'dependency';

export interface BottleneckImpact {
  affectedWorkOrders: number;
  estimatedDelay: number; // hours
  revenueAtRisk: number; // VND
  customerSatisfactionRisk: 'low' | 'medium' | 'high';
}

export interface PreventiveAction {
  action: string;
  effort: 'low' | 'medium' | 'high';
  effectiveness: number; // 0-100
  recommendedBy: Date;
}

export interface ImprovementSuggestion {
  id: string;
  category: ImprovementCategory;
  title: string;
  description: string;
  expectedBenefit: ExpectedBenefit;
  implementationSteps: string[];
  effort: 'low' | 'medium' | 'high';
  priority: number;
  dataSource: string;
}

export type ImprovementCategory =
  | 'capacity_optimization'
  | 'sequence_optimization'
  | 'resource_allocation'
  | 'setup_reduction'
  | 'lead_time_reduction'
  | 'workload_balance';

export interface ExpectedBenefit {
  metric: string;
  currentValue: number;
  projectedValue: number;
  improvement: number;
  unit: string;
}

export interface DisruptionHandlingResult {
  disruption: DisruptionEvent;
  impact: DisruptionImpact;
  rescheduleOptions: RescheduleOption[];
  recommendedOption: string;
  explanation: string;
}

export interface DisruptionEvent {
  type: DisruptionType;
  affectedEntity: string;
  affectedEntityId: string;
  startTime: Date;
  estimatedDuration: number; // hours
  description: string;
}

export type DisruptionType =
  | 'machine_breakdown'
  | 'material_delay'
  | 'quality_issue'
  | 'urgent_order'
  | 'operator_absence'
  | 'power_outage';

export interface DisruptionImpact {
  affectedWorkOrders: AffectedWorkOrderInfo[];
  totalDelayHours: number;
  revenueAtRisk: number;
  customersAffected: number;
  criticalOrdersAtRisk: number;
}

export interface AffectedWorkOrderInfo {
  workOrderId: string;
  woNumber: string;
  originalEnd: Date;
  newEstimatedEnd: Date;
  delayHours: number;
  priority: string;
  customerName?: string;
}

export interface RescheduleOption {
  id: string;
  strategy: string;
  description: string;
  pros: string[];
  cons: string[];
  impact: OptionImpact;
  score: number;
}

export interface OptionImpact {
  totalDelay: number;
  costIncrease: number;
  customerImpact: 'none' | 'minor' | 'moderate' | 'severe';
  resourceUtilization: number;
}

export interface ScheduleComparison {
  scheduleA: ScheduleComparisonItem;
  scheduleB: ScheduleComparisonItem;
  differences: ComparisonDifference[];
  recommendation: ComparisonRecommendation;
}

export interface ScheduleComparisonItem {
  id: string;
  name: string;
  algorithm: string;
  metrics: ScheduleMetrics;
  createdAt: Date;
}

export interface ComparisonDifference {
  dimension: string;
  valueA: number;
  valueB: number;
  difference: number;
  percentChange: number;
  winner: 'A' | 'B' | 'tie';
  significance: 'high' | 'medium' | 'low';
}

export interface ComparisonRecommendation {
  preferredSchedule: 'A' | 'B';
  reason: string;
  keyFactors: string[];
  confidence: number;
}

export interface ScheduleReport {
  title: string;
  generatedAt: Date;
  summary: ReportSummary;
  sections: ReportSection[];
  recommendations: string[];
  appendix: ReportAppendix;
}

export interface ReportSummary {
  totalWorkOrders: number;
  scheduledCount: number;
  unscheduledCount: number;
  onTimePercentage: number;
  utilizationPercentage: number;
  conflictCount: number;
  keyHighlights: string[];
}

export interface ReportSection {
  title: string;
  content: string;
  charts?: ReportChart[];
  tables?: ReportTable[];
}

export interface ReportChart {
  type: 'bar' | 'line' | 'pie' | 'gantt';
  title: string;
  data: Record<string, unknown>[];
}

export interface ReportTable {
  title: string;
  headers: string[];
  rows: string[][];
}

export interface ReportAppendix {
  workOrderList: WorkOrderSummary[];
  conflictDetails: ConflictSummary[];
  capacityDetails: CapacitySummary[];
}

export interface WorkOrderSummary {
  woNumber: string;
  productName: string;
  quantity: number;
  startDate: Date | null;
  endDate: Date | null;
  status: string;
}

export interface ConflictSummary {
  type: string;
  description: string;
  resolution: string;
}

export interface CapacitySummary {
  workCenter: string;
  utilization: number;
  scheduledHours: number;
  availableHours: number;
}

// =============================================================================
// AI SCHEDULER ANALYZER CLASS
// =============================================================================

export class AISchedulerAnalyzer {
  private static instance: AISchedulerAnalyzer;

  private constructor() {}

  public static getInstance(): AISchedulerAnalyzer {
    if (!AISchedulerAnalyzer.instance) {
      AISchedulerAnalyzer.instance = new AISchedulerAnalyzer();
    }
    return AISchedulerAnalyzer.instance;
  }

  // ===========================================================================
  // EXPLAIN SCHEDULE
  // ===========================================================================

  async explainSchedule(
    result: ScheduleResult | OptimizationResult,
    workOrders: WorkOrderScheduleInfo[] = [],
    capacities: WorkCenterCapacityInfo[] = []
  ): Promise<ScheduleExplanation> {
    const metrics = 'metrics' in result ? result.metrics : null;
    const algorithm = result.algorithm;

    const keyDecisions = this.identifyKeyDecisions(result, workOrders || []);
    const tradeoffs = this.identifyTradeoffs(result, workOrders || [], capacities || []);
    const assumptions = this.identifyAssumptions(result);
    const limitations = this.identifyLimitations(result, workOrders || []);

    const summary = this.generateExplanationSummary(
      algorithm,
      metrics,
      (workOrders || []).length,
      keyDecisions,
      tradeoffs
    );

    return {
      summary,
      keyDecisions,
      tradeoffs,
      assumptions,
      limitations,
      confidence: this.calculateExplanationConfidence(result, workOrders),
    };
  }

  private identifyKeyDecisions(
    result: ScheduleResult | OptimizationResult,
    workOrders: WorkOrderScheduleInfo[] = []
  ): KeyDecision[] {
    const decisions: KeyDecision[] = [];
    const safeWorkOrders = workOrders || [];

    // Algorithm choice
    decisions.push({
      decision: `Sử dụng thuật toán ${this.getAlgorithmName(result.algorithm)}`,
      reason: this.getAlgorithmReason(result.algorithm),
      impact: 'Quyết định thứ tự và phân bổ lệnh sản xuất',
      alternatives: ['priority_first', 'due_date_first', 'genetic']
        .filter(a => a !== result.algorithm)
        .map(a => this.getAlgorithmName(a)),
    });

    // Priority handling - check for high priority work orders
    const criticalWOs = safeWorkOrders.filter(wo =>
      (typeof wo.priority === 'number' && wo.priority >= 90) || wo.priority === 'critical'
    );
    if (criticalWOs.length > 0) {
      decisions.push({
        decision: `Ưu tiên ${criticalWOs.length} lệnh sản xuất khẩn cấp`,
        reason: 'Các lệnh sản xuất khẩn cấp được xếp lịch trước',
        impact: 'Đảm bảo đơn hàng quan trọng được hoàn thành đúng hạn',
        alternatives: ['Xếp lịch theo ngày đến hạn', 'Cân bằng tải trước'],
      });
    }

    // Material waiting - check for material availability (if property exists)
    const waitingMaterial = safeWorkOrders.filter(wo => {
      const extWo = wo as WorkOrderScheduleInfo & {
        materialAvailability?: { allAvailable?: boolean };
        materialStatus?: { allAvailable?: boolean };
      };
      const materialStatus = extWo.materialAvailability || extWo.materialStatus;
      return materialStatus && !materialStatus.allAvailable;
    });
    if (waitingMaterial.length > 0) {
      decisions.push({
        decision: `${waitingMaterial.length} lệnh sản xuất chờ nguyên vật liệu`,
        reason: 'Không thể bắt đầu trước khi NVL sẵn sàng',
        impact: 'Có thể ảnh hưởng đến thời gian giao hàng',
        alternatives: ['Đẩy nhanh đơn hàng NVL', 'Sử dụng NVL thay thế'],
      });
    }

    return decisions;
  }

  private identifyTradeoffs(
    result: ScheduleResult | OptimizationResult,
    workOrders: WorkOrderScheduleInfo[] = [],
    capacities: WorkCenterCapacityInfo[] = []
  ): Tradeoff[] {
    const tradeoffs: Tradeoff[] = [];

    // On-time vs Utilization
    const metrics = 'metrics' in result ? result.metrics : null;
    if (metrics) {
      // Handle different metric structures safely
      const onTimeDelivery = 'projectedOnTimeDelivery' in metrics
        ? (metrics as ScheduleMetrics).projectedOnTimeDelivery
        : 'onTimeCount' in metrics
          ? ((metrics as OptimizationMetrics).onTimeCount / Math.max(1, (metrics as OptimizationMetrics).onTimeCount + (metrics as OptimizationMetrics).lateCount)) * 100
          : 0;
      const utilizationScore = 'projectedCapacityUtilization' in metrics
        ? (metrics as ScheduleMetrics).projectedCapacityUtilization
        : 'utilizationScore' in metrics
          ? (metrics as OptimizationMetrics).utilizationScore
          : 0;

      if (onTimeDelivery > 95 && utilizationScore < 70) {
        tradeoffs.push({
          factor1: 'Giao hàng đúng hạn',
          factor2: 'Hiệu suất sử dụng',
          description: 'Ưu tiên giao hàng đúng hạn có thể làm giảm hiệu suất sử dụng máy',
          recommendation: 'Có thể chấp nhận được nếu doanh thu quan trọng hơn chi phí vận hành',
        });
      }
    }

    // Setup time vs Due date
    if (result.algorithm === 'setup_minimize') {
      tradeoffs.push({
        factor1: 'Giảm thời gian setup',
        factor2: 'Thứ tự ưu tiên',
        description: 'Gom nhóm sản phẩm tương tự để giảm setup có thể làm chậm một số đơn hàng ưu tiên',
        recommendation: 'Phù hợp khi chi phí setup cao và đơn hàng không quá gấp',
      });
    }

    // Workload balance vs Efficiency
    if (result.algorithm === 'balanced_load') {
      tradeoffs.push({
        factor1: 'Cân bằng tải',
        factor2: 'Hiệu suất từng máy',
        description: 'Phân bổ đều công việc có thể không tận dụng tối đa máy hiệu quả nhất',
        recommendation: 'Phù hợp khi cần giảm áp lực cho nhân viên hoặc tránh quá tải',
      });
    }

    return tradeoffs;
  }

  private identifyAssumptions(result: ScheduleResult | OptimizationResult): string[] {
    return [
      'Thời gian sản xuất ước tính dựa trên dữ liệu lịch sử',
      'Công suất máy được tính theo giờ làm việc tiêu chuẩn',
      'Không có sự cố máy móc không dự kiến',
      'Nhân viên sẵn sàng theo ca làm việc bình thường',
      'Nguyên vật liệu đến đúng ngày dự kiến',
    ];
  }

  private identifyLimitations(
    result: ScheduleResult | OptimizationResult,
    workOrders: WorkOrderScheduleInfo[] = []
  ): string[] {
    const limitations: string[] = [];
    const safeWorkOrders = workOrders || [];

    if ('warnings' in result && result.warnings && result.warnings.length > 0) {
      limitations.push('Có một số cảnh báo cần xem xét');
    }

    if (safeWorkOrders.length > 0) {
      const unscheduled = safeWorkOrders.filter(wo => wo && !wo.plannedStart);
      if (unscheduled.length > 0) {
        limitations.push(`${unscheduled.length} lệnh sản xuất chưa được xếp lịch`);
      }
    }

    limitations.push('Lịch trình có thể thay đổi khi có thông tin mới');
    limitations.push('Chưa tính đến các yếu tố bất ngờ');

    return limitations;
  }

  private generateExplanationSummary(
    algorithm: string,
    metrics: ScheduleMetrics | OptimizationMetrics | null,
    woCount: number,
    keyDecisions: KeyDecision[],
    tradeoffs: Tradeoff[]
  ): string {
    let summary = `Lịch trình được tạo bằng thuật toán ${this.getAlgorithmName(algorithm)} cho ${woCount} lệnh sản xuất. `;

    if (metrics) {
      const onTime = 'projectedOnTimeDelivery' in metrics
        ? (metrics as ScheduleMetrics).projectedOnTimeDelivery
        : 0;
      const utilization = 'projectedCapacityUtilization' in metrics
        ? (metrics as ScheduleMetrics).projectedCapacityUtilization
        : 'utilizationScore' in metrics
          ? (metrics as OptimizationMetrics).utilizationScore
          : 0;
      summary += `Dự kiến ${onTime?.toFixed(0) || 0}% đơn hàng giao đúng hạn với hiệu suất sử dụng ${utilization?.toFixed(0) || 0}%. `;
    }

    if (keyDecisions.length > 0) {
      summary += `Có ${keyDecisions.length} quyết định chính ảnh hưởng đến lịch trình. `;
    }

    if (tradeoffs.length > 0) {
      summary += `Cần cân nhắc ${tradeoffs.length} sự đánh đổi.`;
    }

    return summary;
  }

  private calculateExplanationConfidence(
    result: ScheduleResult | OptimizationResult,
    workOrders: WorkOrderScheduleInfo[] = []
  ): number {
    let confidence = 80;
    const safeWorkOrders = workOrders || [];

    if (safeWorkOrders.length === 0) return confidence;

    // Reduce confidence for unscheduled work orders
    const unscheduled = safeWorkOrders.filter(wo => wo && !wo.plannedStart);
    confidence -= unscheduled.length * 2;

    // Reduce confidence for material issues (if property exists)
    const materialIssues = safeWorkOrders.filter(wo => {
      const extWo = wo as WorkOrderScheduleInfo & {
        materialAvailability?: { allAvailable?: boolean };
        materialStatus?: { allAvailable?: boolean };
      };
      const materialStatus = extWo?.materialAvailability || extWo?.materialStatus;
      return materialStatus && !materialStatus.allAvailable;
    });
    confidence -= materialIssues.length;

    return Math.max(50, Math.min(100, confidence));
  }

  // ===========================================================================
  // PREDICT BOTTLENECKS
  // ===========================================================================

  async predictBottlenecks(
    workOrdersOrResult: WorkOrderScheduleInfo[] | ScheduleResult,
    capacities: WorkCenterCapacityInfo[] = [],
    horizonDays: number = 14
  ): Promise<BottleneckPrediction[]> {
    const predictions: BottleneckPrediction[] = [];
    const safeCapacities = capacities || [];

    // Handle both array of work orders and ScheduleResult
    let workOrders: WorkOrderScheduleInfo[] = [];
    if (Array.isArray(workOrdersOrResult)) {
      workOrders = workOrdersOrResult || [];
    } else if (workOrdersOrResult && 'suggestions' in workOrdersOrResult) {
      // Extract from ScheduleResult if passed
      workOrders = [];
    }

    // Capacity bottlenecks
    const capacityPredictions = this.predictCapacityBottlenecks(safeCapacities, horizonDays);
    predictions.push(...capacityPredictions);

    // Material bottlenecks
    const materialPredictions = this.predictMaterialBottlenecks(workOrders);
    predictions.push(...materialPredictions);

    // Queue bottlenecks
    const queuePredictions = this.predictQueueBottlenecks(workOrders, safeCapacities);
    predictions.push(...queuePredictions);

    // Sort by severity and probability
    predictions.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return b.probability - a.probability;
    });

    return predictions;
  }

  private predictCapacityBottlenecks(
    capacities: WorkCenterCapacityInfo[] = [],
    horizonDays: number = 14
  ): BottleneckPrediction[] {
    const predictions: BottleneckPrediction[] = [];
    const safeCapacities = capacities || [];

    for (const capacity of safeCapacities) {
      if (!capacity || !capacity.dailyCapacity) continue;
      const highUtilDays = capacity.dailyCapacity.filter(
        dc => dc.utilization > 90
      );

      if (highUtilDays.length >= 3) {
        const firstHighDay = highUtilDays[0];
        const avgUtilization = highUtilDays.reduce(
          (sum, dc) => sum + dc.utilization,
          0
        ) / highUtilDays.length;

        predictions.push({
          id: `bottleneck-capacity-${capacity.id}`,
          type: 'capacity',
          severity: avgUtilization > 100 ? 'critical' : 'high',
          location: capacity.name,
          locationId: capacity.id,
          predictedDate: firstHighDay.date,
          probability: Math.min(95, avgUtilization),
          description: `${capacity.name} dự kiến đạt ${avgUtilization.toFixed(0)}% công suất trong ${highUtilDays.length} ngày`,
          impact: {
            affectedWorkOrders: highUtilDays.reduce(
              (sum, dc) => sum + dc.scheduledWorkOrders.length,
              0
            ),
            estimatedDelay: (avgUtilization - 100) * 0.5,
            revenueAtRisk: (avgUtilization - 100) * 1000000,
            customerSatisfactionRisk: avgUtilization > 100 ? 'high' : 'medium',
          },
          preventiveActions: [
            {
              action: 'Cân nhắc tăng ca',
              effort: 'low',
              effectiveness: 70,
              recommendedBy: new Date(firstHighDay.date.getTime() - 3 * 24 * 60 * 60 * 1000),
            },
            {
              action: 'Phân bổ sang máy khác',
              effort: 'medium',
              effectiveness: 80,
              recommendedBy: new Date(firstHighDay.date.getTime() - 5 * 24 * 60 * 60 * 1000),
            },
          ],
          confidenceScore: 85,
        });
      }
    }

    return predictions;
  }

  private predictMaterialBottlenecks(
    workOrders: WorkOrderScheduleInfo[]
  ): BottleneckPrediction[] {
    // Note: materialStatus is not part of WorkOrderScheduleInfo
    // This would need to be extended with actual material availability data
    // For now, return empty array - material bottleneck prediction requires
    // integration with inventory/material planning system
    return [];
  }

  private predictQueueBottlenecks(
    workOrders: WorkOrderScheduleInfo[],
    capacities: WorkCenterCapacityInfo[]
  ): BottleneckPrediction[] {
    const predictions: BottleneckPrediction[] = [];
    const queueByWC = new Map<string, number>();

    for (const wo of workOrders) {
      if (wo.workCenterId) {
        queueByWC.set(wo.workCenterId, (queueByWC.get(wo.workCenterId) || 0) + 1);
      }
    }

    for (const [wcId, count] of queueByWC) {
      if (count > 8) {
        const wc = capacities.find(c => c.id === wcId);
        if (!wc) continue;

        predictions.push({
          id: `bottleneck-queue-${wcId}`,
          type: 'queue',
          severity: count > 15 ? 'high' : 'medium',
          location: wc.name,
          locationId: wcId,
          predictedDate: new Date(),
          probability: 75,
          description: `${wc.name} có ${count} lệnh sản xuất đang chờ`,
          impact: {
            affectedWorkOrders: count,
            estimatedDelay: count * 2,
            revenueAtRisk: count * 500000,
            customerSatisfactionRisk: count > 15 ? 'high' : 'medium',
          },
          preventiveActions: [
            {
              action: 'Ưu tiên lại hàng đợi',
              effort: 'low',
              effectiveness: 50,
              recommendedBy: new Date(),
            },
            {
              action: 'Phân bổ sang máy khác',
              effort: 'medium',
              effectiveness: 70,
              recommendedBy: new Date(),
            },
          ],
          confidenceScore: 70,
        });
      }
    }

    return predictions;
  }

  // ===========================================================================
  // SUGGEST IMPROVEMENTS
  // ===========================================================================

  async suggestImprovements(
    result: ScheduleResult | OptimizationResult,
    workOrders: WorkOrderScheduleInfo[] = [],
    capacities: WorkCenterCapacityInfo[] = []
  ): Promise<ImprovementSuggestion[]> {
    const suggestions: ImprovementSuggestion[] = [];
    const metrics = 'metrics' in result ? result.metrics : null;
    const safeCapacities = capacities || [];

    // Capacity optimization suggestions
    const utilizationValue = metrics
      ? ('projectedCapacityUtilization' in metrics
          ? (metrics as ScheduleMetrics).projectedCapacityUtilization
          : 'utilizationScore' in metrics
            ? (metrics as OptimizationMetrics).utilizationScore
            : 0)
      : 0;

    if (utilizationValue < 70) {
      suggestions.push({
        id: 'improve-utilization',
        category: 'capacity_optimization',
        title: 'Tăng hiệu suất sử dụng máy',
        description: 'Hiệu suất sử dụng máy hiện tại thấp, có thể tối ưu hóa',
        expectedBenefit: {
          metric: 'Hiệu suất sử dụng',
          currentValue: utilizationValue,
          projectedValue: 85,
          improvement: 85 - utilizationValue,
          unit: '%',
        },
        implementationSteps: [
          'Phân tích thời gian chờ giữa các lệnh sản xuất',
          'Gom nhóm các lệnh sản xuất tương tự',
          'Giảm thời gian setup bằng cách sắp xếp thứ tự hợp lý',
        ],
        effort: 'medium',
        priority: 1,
        dataSource: 'Phân tích lịch trình hiện tại',
      });
    }

    // Workload balance suggestion
    const loadVariance = this.calculateLoadVariance(safeCapacities);
    if (loadVariance > 20) {
      suggestions.push({
        id: 'improve-balance',
        category: 'workload_balance',
        title: 'Cân bằng tải giữa các máy',
        description: 'Công việc phân bổ không đều giữa các máy',
        expectedBenefit: {
          metric: 'Độ lệch tải',
          currentValue: loadVariance,
          projectedValue: 10,
          improvement: loadVariance - 10,
          unit: '%',
        },
        implementationSteps: [
          'Xác định máy quá tải và máy nhàn rỗi',
          'Di chuyển công việc từ máy quá tải sang máy nhàn rỗi',
          'Cân nhắc đào tạo chéo để linh hoạt hơn',
        ],
        effort: 'low',
        priority: 2,
        dataSource: 'Phân tích công suất',
      });
    }

    // Setup time reduction
    suggestions.push({
      id: 'improve-setup',
      category: 'setup_reduction',
      title: 'Giảm thời gian chuyển đổi',
      description: 'Gom nhóm sản phẩm tương tự để giảm thời gian setup',
      expectedBenefit: {
        metric: 'Thời gian setup',
        currentValue: metrics && 'currentSetupTime' in metrics ? (metrics as ScheduleMetrics).currentSetupTime : 0,
        projectedValue: (metrics && 'currentSetupTime' in metrics ? (metrics as ScheduleMetrics).currentSetupTime : 0) * 0.7,
        improvement: 30,
        unit: '%',
      },
      implementationSteps: [
        'Nhóm các sản phẩm có cùng loại setup',
        'Lập lịch chạy liên tiếp các sản phẩm cùng nhóm',
        'Chuẩn bị sẵn dụng cụ và khuôn cho lần setup tiếp theo',
      ],
      effort: 'medium',
      priority: 3,
      dataSource: 'Phân tích thời gian setup',
    });

    return suggestions.sort((a, b) => a.priority - b.priority);
  }

  private calculateLoadVariance(capacities: WorkCenterCapacityInfo[] = []): number {
    const safeCapacities = capacities || [];
    if (safeCapacities.length === 0) return 0;

    const loads = safeCapacities
      .filter(c => c && c.dailyCapacity && c.dailyCapacity.length > 0)
      .map(c =>
        c.dailyCapacity.reduce((sum, dc) => sum + dc.utilization, 0) / c.dailyCapacity.length
      );

    if (loads.length === 0) return 0;

    const avg = loads.reduce((a, b) => a + b, 0) / loads.length;
    const variance = loads.reduce((sum, l) => sum + Math.pow(l - avg, 2), 0) / loads.length;
    return Math.sqrt(variance);
  }

  // ===========================================================================
  // HANDLE DISRUPTION
  // ===========================================================================

  async handleDisruption(
    disruptionOrResult: DisruptionEvent | ScheduleResult,
    workOrdersOrDisruption?: WorkOrderScheduleInfo[] | Record<string, unknown>,
    capacities: WorkCenterCapacityInfo[] = []
  ): Promise<DisruptionHandlingResult> {
    // Handle both old signature and new signature (ScheduleResult, disruption)
    let disruption: DisruptionEvent;
    let workOrders: WorkOrderScheduleInfo[] = [];
    let safeCapacities = capacities || [];

    if ('suggestions' in disruptionOrResult) {
      // New signature: (ScheduleResult, disruption)
      disruption = (workOrdersOrDisruption || {}) as unknown as DisruptionEvent;
      workOrders = [];
    } else {
      // Old signature: (disruption, workOrders, capacities)
      disruption = disruptionOrResult as unknown as DisruptionEvent;
      workOrders = (Array.isArray(workOrdersOrDisruption) ? workOrdersOrDisruption : []) || [];
    }

    // Calculate impact
    const impact = this.calculateDisruptionImpact(disruption, workOrders, safeCapacities);

    // Generate reschedule options
    const options = this.generateRescheduleOptions(disruption, workOrders, safeCapacities, impact);

    // Find recommended option
    const recommendedOption = options.reduce((best, current) =>
      current.score > best.score ? current : best
    );

    return {
      disruption,
      impact,
      rescheduleOptions: options,
      recommendedOption: recommendedOption.id,
      explanation: this.generateDisruptionExplanation(disruption, impact, recommendedOption),
    };
  }

  private calculateDisruptionImpact(
    disruption: DisruptionEvent,
    workOrders: WorkOrderScheduleInfo[] = [],
    capacities: WorkCenterCapacityInfo[] = []
  ): DisruptionImpact {
    const affected: AffectedWorkOrderInfo[] = [];
    let totalDelay = 0;
    const safeWorkOrders = workOrders || [];

    for (const wo of safeWorkOrders) {
      if (!wo) continue;
      if (wo.workCenterId === disruption.affectedEntityId) {
        const delay = disruption.estimatedDuration || 0;
        totalDelay += delay;

        affected.push({
          workOrderId: wo.id,
          woNumber: wo.woNumber,
          originalEnd: wo.plannedEnd || new Date(),
          newEstimatedEnd: new Date(
            (wo.plannedEnd || new Date()).getTime() + delay * 60 * 60 * 1000
          ),
          delayHours: delay,
          priority: String(wo.priority),
        });
      }
    }

    return {
      affectedWorkOrders: affected,
      totalDelayHours: totalDelay,
      revenueAtRisk: affected.length * 2000000,
      customersAffected: affected.length,
      criticalOrdersAtRisk: affected.filter(wo => wo.priority === 'critical' || (typeof wo.priority === 'number' && wo.priority >= 90)).length,
    };
  }

  private generateRescheduleOptions(
    disruption: DisruptionEvent,
    workOrders: WorkOrderScheduleInfo[] = [],
    capacities: WorkCenterCapacityInfo[] = [],
    impact: DisruptionImpact
  ): RescheduleOption[] {
    const options: RescheduleOption[] = [];
    const safeCapacities = capacities || [];

    // Option 1: Wait and delay
    options.push({
      id: 'option-wait',
      strategy: 'Chờ và dời lịch',
      description: `Chờ ${disruption.estimatedDuration || 0} giờ và dời tất cả lệnh sản xuất`,
      pros: ['Đơn giản', 'Không cần can thiệp'],
      cons: ['Tất cả đơn hàng bị trễ', 'Có thể ảnh hưởng khách hàng'],
      impact: {
        totalDelay: impact.totalDelayHours,
        costIncrease: 0,
        customerImpact: impact.criticalOrdersAtRisk > 0 ? 'severe' : 'moderate',
        resourceUtilization: 50,
      },
      score: 40,
    });

    // Option 2: Reassign to other machines
    const alternativeMachines = safeCapacities.filter(
      c => c && c.id !== disruption.affectedEntityId
    );
    if (alternativeMachines.length > 0) {
      options.push({
        id: 'option-reassign',
        strategy: 'Chuyển sang máy khác',
        description: 'Di chuyển các lệnh sản xuất ưu tiên cao sang máy khác',
        pros: ['Giảm thiểu trễ hạn', 'Sử dụng tài nguyên hiệu quả'],
        cons: ['Có thể cần đào tạo', 'Setup time cao hơn'],
        impact: {
          totalDelay: impact.totalDelayHours * 0.3,
          costIncrease: 500000,
          customerImpact: 'minor',
          resourceUtilization: 75,
        },
        score: 75,
      });
    }

    // Option 3: Overtime
    options.push({
      id: 'option-overtime',
      strategy: 'Tăng ca bù',
      description: 'Tăng ca sau khi khắc phục sự cố',
      pros: ['Giữ nguyên phân bổ máy', 'Linh hoạt'],
      cons: ['Chi phí cao hơn', 'Phụ thuộc nhân viên'],
      impact: {
        totalDelay: impact.totalDelayHours * 0.5,
        costIncrease: disruption.estimatedDuration * 200000,
        customerImpact: 'minor',
        resourceUtilization: 90,
      },
      score: 65,
    });

    // Option 4: Outsource critical
    if (impact.criticalOrdersAtRisk > 0) {
      options.push({
        id: 'option-outsource',
        strategy: 'Thuê ngoài đơn hàng khẩn',
        description: 'Thuê ngoài các đơn hàng khẩn cấp',
        pros: ['Đảm bảo giao hàng đúng hạn', 'Giảm áp lực nội bộ'],
        cons: ['Chi phí cao', 'Khó kiểm soát chất lượng'],
        impact: {
          totalDelay: 0,
          costIncrease: impact.criticalOrdersAtRisk * 3000000,
          customerImpact: 'none',
          resourceUtilization: 60,
        },
        score: impact.criticalOrdersAtRisk > 2 ? 80 : 50,
      });
    }

    return options.sort((a, b) => b.score - a.score);
  }

  private generateDisruptionExplanation(
    disruption: DisruptionEvent,
    impact: DisruptionImpact,
    recommendedOption: RescheduleOption
  ): string {
    return `Sự cố ${this.getDisruptionTypeName(disruption.type)} tại ${disruption.affectedEntity} ảnh hưởng đến ${impact.affectedWorkOrders.length} lệnh sản xuất. ` +
      `Tổng thời gian trễ dự kiến là ${impact.totalDelayHours} giờ. ` +
      `Khuyến nghị: ${recommendedOption.strategy} - ${recommendedOption.description}`;
  }

  // ===========================================================================
  // COMPARE SCHEDULES
  // ===========================================================================

  async compareSchedules(
    schedulesOrA: ScheduleResult[] | ScheduleResult | OptimizationResult,
    scheduleB?: ScheduleResult | OptimizationResult
  ): Promise<ScheduleComparison> {
    // Handle both array and two-argument forms
    let scheduleA: ScheduleResult | OptimizationResult;
    let scheduleBResolved: ScheduleResult | OptimizationResult;

    if (Array.isArray(schedulesOrA)) {
      if (schedulesOrA.length < 2) {
        throw new Error('At least 2 schedules required for comparison');
      }
      scheduleA = schedulesOrA[0];
      scheduleBResolved = schedulesOrA[1];
    } else {
      scheduleA = schedulesOrA;
      scheduleBResolved = scheduleB!;
    }

    const metricsA = 'metrics' in scheduleA ? scheduleA.metrics : null;
    const metricsB = 'metrics' in scheduleBResolved ? scheduleBResolved.metrics : null;

    const differences: ComparisonDifference[] = [];

    if (metricsA && metricsB) {
      const getOnTime = (m: ScheduleMetrics | OptimizationMetrics): number =>
        'projectedOnTimeDelivery' in m ? (m as ScheduleMetrics).projectedOnTimeDelivery
        : 'onTimeCount' in m ? (m as OptimizationMetrics).onTimeCount : 0;
      const getUtilization = (m: ScheduleMetrics | OptimizationMetrics): number =>
        'projectedCapacityUtilization' in m ? (m as ScheduleMetrics).projectedCapacityUtilization
        : 'utilizationScore' in m ? (m as OptimizationMetrics).utilizationScore : 0;
      const getMakespan = (m: ScheduleMetrics | OptimizationMetrics): number => m.makespan || 0;
      const getConflictCount = (m: ScheduleMetrics | OptimizationMetrics): number =>
        'conflictCount' in m ? (m as ScheduleMetrics).conflictCount : 0;

      differences.push(
        this.compareDimension('Giao hàng đúng hạn', getOnTime(metricsA), getOnTime(metricsB), '%'),
        this.compareDimension('Hiệu suất sử dụng', getUtilization(metricsA), getUtilization(metricsB), '%'),
        this.compareDimension('Makespan', getMakespan(metricsA), getMakespan(metricsB), 'ngày', true),
        this.compareDimension('Xung đột', getConflictCount(metricsA), getConflictCount(metricsB), '', true)
      );
    }

    const recommendation = this.generateComparisonRecommendation(differences);

    // Get IDs from schedules
    const idA = 'id' in scheduleA ? scheduleA.id : 'schedule-a';
    const idB = 'id' in scheduleBResolved ? scheduleBResolved.id : 'schedule-b';

    // Determine best schedule based on recommendation
    const bestScheduleId = recommendation.preferredSchedule === 'A' ? idA : idB;

    // Convert metrics to ScheduleMetrics for the comparison item
    const toScheduleMetrics = (m: ScheduleMetrics | OptimizationMetrics | null): ScheduleMetrics => {
      if (!m) {
        return { currentOnTimeDelivery: 0, projectedOnTimeDelivery: 0, currentCapacityUtilization: 0, projectedCapacityUtilization: 0, currentSetupTime: 0, projectedSetupTime: 0, makespan: 0, conflictCount: 0, unscheduledCount: 0 };
      }
      if ('projectedOnTimeDelivery' in m) return m as ScheduleMetrics;
      const opt = m as OptimizationMetrics;
      return {
        currentOnTimeDelivery: 0,
        projectedOnTimeDelivery: opt.onTimeCount / Math.max(1, opt.onTimeCount + opt.lateCount) * 100,
        currentCapacityUtilization: 0,
        projectedCapacityUtilization: opt.utilizationScore,
        currentSetupTime: opt.totalSetupTime,
        projectedSetupTime: opt.totalSetupTime,
        makespan: opt.makespan,
        conflictCount: 0,
        unscheduledCount: 0,
      };
    };

    return {
      scheduleA: {
        id: idA,
        name: 'Lịch trình A',
        algorithm: scheduleA.algorithm,
        metrics: toScheduleMetrics(metricsA),
        createdAt: new Date(),
      },
      scheduleB: {
        id: idB,
        name: 'Lịch trình B',
        algorithm: scheduleBResolved.algorithm,
        metrics: toScheduleMetrics(metricsB),
        createdAt: new Date(),
      },
      differences,
      recommendation,
    };
  }

  private compareDimension(
    dimension: string,
    valueA: number,
    valueB: number,
    unit: string,
    lowerIsBetter: boolean = false
  ): ComparisonDifference {
    const difference = valueA - valueB;
    const percentChange = valueB !== 0 ? (difference / valueB) * 100 : 0;

    let winner: 'A' | 'B' | 'tie';
    if (Math.abs(difference) < 0.01) {
      winner = 'tie';
    } else if (lowerIsBetter) {
      winner = valueA < valueB ? 'A' : 'B';
    } else {
      winner = valueA > valueB ? 'A' : 'B';
    }

    return {
      dimension,
      valueA,
      valueB,
      difference,
      percentChange,
      winner,
      significance: Math.abs(percentChange) > 10 ? 'high' : Math.abs(percentChange) > 5 ? 'medium' : 'low',
    };
  }

  private generateComparisonRecommendation(differences: ComparisonDifference[]): ComparisonRecommendation {
    let aScore = 0;
    let bScore = 0;
    const keyFactors: string[] = [];

    for (const diff of differences) {
      const weight = diff.significance === 'high' ? 3 : diff.significance === 'medium' ? 2 : 1;
      if (diff.winner === 'A') {
        aScore += weight;
        if (diff.significance === 'high') {
          keyFactors.push(`${diff.dimension} tốt hơn ở A`);
        }
      } else if (diff.winner === 'B') {
        bScore += weight;
        if (diff.significance === 'high') {
          keyFactors.push(`${diff.dimension} tốt hơn ở B`);
        }
      }
    }

    return {
      preferredSchedule: aScore >= bScore ? 'A' : 'B',
      reason: aScore >= bScore
        ? 'Lịch trình A có các chỉ số tổng thể tốt hơn'
        : 'Lịch trình B có các chỉ số tổng thể tốt hơn',
      keyFactors,
      confidence: Math.abs(aScore - bScore) > 3 ? 85 : 65,
    };
  }

  // ===========================================================================
  // GENERATE REPORT
  // ===========================================================================

  async generateScheduleReport(
    result: ScheduleResult,
    workOrders: WorkOrderScheduleInfo[] = [],
    capacities: WorkCenterCapacityInfo[] = []
  ): Promise<ScheduleReport> {
    const metrics = result.metrics;
    const safeWorkOrders = workOrders || [];
    const safeCapacities = capacities || [];
    const suggestions = result.suggestions || [];
    const conflicts = result.conflicts || [];

    // Get safe metrics values using proper type narrowing
    const onTimeDelivery = metrics.projectedOnTimeDelivery ?? metrics.currentOnTimeDelivery ?? 0;
    const capacityUtilization = metrics.projectedCapacityUtilization ?? metrics.currentCapacityUtilization ?? 0;
    const horizonDays = result.horizon?.days || 30;

    // Calculate health score based on metrics
    const healthScore = Math.round(
      (onTimeDelivery * 0.4 + capacityUtilization * 0.3 + (100 - conflicts.length * 5) * 0.3)
    );

    return {
      title: 'Báo cáo Lịch trình Sản xuất',
      generatedAt: new Date(),
      summary: {
        totalWorkOrders: safeWorkOrders.length || suggestions.length,
        scheduledCount: suggestions.length,
        unscheduledCount: Math.max(0, (safeWorkOrders.length || suggestions.length) - suggestions.length),
        onTimePercentage: onTimeDelivery,
        utilizationPercentage: capacityUtilization,
        conflictCount: conflicts.length,
        keyHighlights: [
          `Dự kiến ${onTimeDelivery.toFixed(0)}% giao hàng đúng hạn`,
          `Hiệu suất sử dụng máy: ${capacityUtilization.toFixed(0)}%`,
          `${conflicts.length} xung đột cần giải quyết`,
        ],
      },
      sections: [
        {
          title: 'Tổng quan',
          content: `Lịch trình này được tạo bằng thuật toán ${this.getAlgorithmName(result.algorithm)} cho ${suggestions.length} lệnh sản xuất trong thời gian ${horizonDays} ngày.`,
        },
        {
          title: 'Phân tích công suất',
          content: `Các máy đang hoạt động ở mức ${capacityUtilization.toFixed(0)}% công suất trung bình.`,
        },
      ],
      recommendations: [
        'Xem xét các lệnh sản xuất ưu tiên cao trước',
        'Giải quyết các xung đột được phát hiện',
        'Theo dõi tiến độ thường xuyên',
      ],
      appendix: {
        workOrderList: safeWorkOrders.map(wo => ({
            woNumber: wo.woNumber || '',
            productName: wo.productName || '',
            quantity: wo.quantity || 0,
            startDate: wo.plannedStart || null,
            endDate: wo.plannedEnd || null,
            status: wo.status || 'pending',
        })),
        conflictDetails: conflicts.map(c => ({
            type: c.type || 'unknown',
            description: c.description || '',
            resolution: c.suggestedResolution || 'Cần xem xét',
        })),
        capacityDetails: safeCapacities
          .filter(c => c && c.dailyCapacity && c.dailyCapacity.length > 0)
          .map(c => {
            const avgUtil = c.dailyCapacity.reduce((sum, dc) => sum + dc.utilization, 0) / c.dailyCapacity.length;
            const totalScheduled = c.dailyCapacity.reduce((sum, dc) => sum + dc.scheduledHours, 0);
            const totalAvailable = c.dailyCapacity.reduce((sum, dc) => sum + dc.availableHours, 0);
            return {
              workCenter: c.name,
              utilization: avgUtil,
              scheduledHours: totalScheduled,
              availableHours: totalAvailable,
            };
          }),
      },
    };
  }

  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================

  private getAlgorithmName(algorithm: string): string {
    const names: Record<string, string> = {
      priority_first: 'Ưu tiên trước',
      due_date_first: 'Hạn giao trước (EDD)',
      shortest_first: 'Ngắn nhất trước (SPT)',
      setup_minimize: 'Giảm setup',
      balanced_load: 'Cân bằng tải',
      genetic: 'Di truyền (GA)',
    };
    return names[algorithm] || algorithm;
  }

  private getAlgorithmReason(algorithm: string): string {
    const reasons: Record<string, string> = {
      priority_first: 'Đảm bảo các đơn hàng quan trọng được xử lý trước',
      due_date_first: 'Giảm thiểu trễ hạn giao hàng',
      shortest_first: 'Tối ưu thời gian hoàn thành tổng thể',
      setup_minimize: 'Giảm thời gian và chi phí chuyển đổi',
      balanced_load: 'Phân bổ đều công việc, giảm quá tải',
      genetic: 'Tìm kiếm giải pháp tối ưu toàn cục',
    };
    return reasons[algorithm] || 'Phù hợp với yêu cầu sản xuất';
  }

  private getDisruptionTypeName(type: DisruptionType): string {
    const names: Record<DisruptionType, string> = {
      machine_breakdown: 'Hỏng máy',
      material_delay: 'Trễ nguyên vật liệu',
      quality_issue: 'Vấn đề chất lượng',
      urgent_order: 'Đơn hàng khẩn cấp',
      operator_absence: 'Vắng nhân viên',
      power_outage: 'Mất điện',
    };
    return names[type] || type;
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const aiSchedulerAnalyzer = AISchedulerAnalyzer.getInstance();

export function getAISchedulerAnalyzer(): AISchedulerAnalyzer {
  return AISchedulerAnalyzer.getInstance();
}
