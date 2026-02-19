// =============================================================================
// AI PO ANALYZER - AI-Enhanced Purchase Order Analysis
// =============================================================================
// Provides AI-powered confidence scoring, explanations, risk analysis,
// and learning capabilities for PO suggestions
// =============================================================================

import { getAIProvider, createSystemMessage, createUserMessage } from '@/lib/ai/provider';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import {
  POSuggestion,
  AlternativeSupplier,
  SuggestionRisk,
} from './po-suggestion-engine';

// =============================================================================
// TYPES
// =============================================================================

export interface EnhancedPOSuggestion extends POSuggestion {
  aiEnhancement: AIEnhancement;
}

export interface AIEnhancement {
  enhancedExplanation: string;
  decisionFactors: DecisionFactor[];
  marketInsights: string[];
  optimizationSuggestions: string[];
  whatIfScenarios: WhatIfScenario[];
  learningInsights: LearningInsight[];
}

export interface DecisionFactor {
  factor: string;
  weight: number;
  score: number;
  explanation: string;
  impact: 'positive' | 'neutral' | 'negative';
}

export interface WhatIfScenario {
  scenario: string;
  description: string;
  outcome: string;
  recommendation: string;
}

export interface LearningInsight {
  type: 'pattern' | 'anomaly' | 'trend' | 'improvement';
  insight: string;
  confidence: number;
  actionable: boolean;
  action?: string;
}

export interface ApprovalDecision {
  suggestionId: string;
  decision: 'approved' | 'rejected' | 'modified';
  userId: string;
  reason?: string;
  modifications?: Partial<POSuggestion>;
  timestamp: Date;
}

export interface AnalyzerConfig {
  enableAI: boolean;
  confidenceThresholds: {
    high: number;    // >= 80: Auto-suggest approve
    medium: number;  // >= 60: Standard review
    low: number;     // < 60: Requires justification
  };
  learningEnabled: boolean;
  maxAlternatives: number;
}

const DEFAULT_CONFIG: AnalyzerConfig = {
  enableAI: true,
  confidenceThresholds: {
    high: 80,
    medium: 60,
    low: 40,
  },
  learningEnabled: true,
  maxAlternatives: 3,
};

// =============================================================================
// AI PO ANALYZER
// =============================================================================

export class AIPOAnalyzer {
  private config: AnalyzerConfig;
  private aiProvider = getAIProvider();

  constructor(config: Partial<AnalyzerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // =============================================================================
  // MAIN METHODS
  // =============================================================================

  /**
   * Enhance a PO suggestion with AI analysis
   */
  async enhanceSuggestion(suggestion: POSuggestion): Promise<EnhancedPOSuggestion> {
    try {
      // Calculate decision factors
      const decisionFactors = this.calculateDecisionFactors(suggestion);

      // Generate AI-enhanced explanation if enabled
      let enhancedExplanation = suggestion.explanation;
      let marketInsights: string[] = [];
      let optimizationSuggestions: string[] = [];

      if (this.config.enableAI) {
        const aiAnalysis = await this.generateAIAnalysis(suggestion);
        enhancedExplanation = aiAnalysis.explanation || suggestion.explanation;
        marketInsights = aiAnalysis.marketInsights || [];
        optimizationSuggestions = aiAnalysis.optimizations || [];
      }

      // Generate what-if scenarios
      const whatIfScenarios = this.generateWhatIfScenarios(suggestion);

      // Get learning insights
      const learningInsights = await this.getLearningInsights(suggestion);

      return {
        ...suggestion,
        aiEnhancement: {
          enhancedExplanation,
          decisionFactors,
          marketInsights,
          optimizationSuggestions,
          whatIfScenarios,
          learningInsights,
        },
      };
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'ai-po-analyzer', operation: 'enhance' });
      // Return suggestion without AI enhancement
      return {
        ...suggestion,
        aiEnhancement: {
          enhancedExplanation: suggestion.explanation,
          decisionFactors: this.calculateDecisionFactors(suggestion),
          marketInsights: [],
          optimizationSuggestions: [],
          whatIfScenarios: this.generateWhatIfScenarios(suggestion),
          learningInsights: [],
        },
      };
    }
  }

  /**
   * Calculate detailed confidence score with breakdown
   */
  calculateDetailedConfidence(suggestion: POSuggestion): {
    score: number;
    breakdown: { factor: string; score: number; weight: number }[];
    recommendation: 'auto_approve' | 'standard_review' | 'detailed_review';
  } {
    const factors = [
      {
        factor: 'Supplier Reliability',
        score: suggestion.metadata.supplierReliability,
        weight: 0.25,
      },
      {
        factor: 'Data Quality',
        score: this.assessDataQuality(suggestion),
        weight: 0.2,
      },
      {
        factor: 'Forecast Confidence',
        score: this.assessForecastConfidence(suggestion),
        weight: 0.2,
      },
      {
        factor: 'Risk Level',
        score: this.assessRiskLevel(suggestion.risks),
        weight: 0.2,
      },
      {
        factor: 'Historical Performance',
        score: suggestion.metadata.lastPurchasePrice ? 80 : 60,
        weight: 0.15,
      },
    ];

    const weightedScore = factors.reduce(
      (sum, f) => sum + f.score * f.weight,
      0
    );

    const score = Math.round(weightedScore);

    let recommendation: 'auto_approve' | 'standard_review' | 'detailed_review';
    if (score >= this.config.confidenceThresholds.high) {
      recommendation = 'auto_approve';
    } else if (score >= this.config.confidenceThresholds.medium) {
      recommendation = 'standard_review';
    } else {
      recommendation = 'detailed_review';
    }

    return {
      score,
      breakdown: factors.map((f) => ({
        factor: f.factor,
        score: Math.round(f.score),
        weight: f.weight,
      })),
      recommendation,
    };
  }

  /**
   * Generate detailed explanation for why this suggestion was made
   */
  generateDetailedExplanation(suggestion: POSuggestion): string {
    const sections: string[] = [];

    // Overview
    sections.push('## Tổng quan đề xuất');
    sections.push(`Hệ thống AI đề xuất mua **${suggestion.quantity}** ${suggestion.partName} từ **${suggestion.supplierName}** với tổng giá trị **${this.formatCurrency(suggestion.totalAmount)}**.`);

    // Reason for reorder
    sections.push('\n## Lý do đặt hàng');
    sections.push(`- **Loại:** ${this.translateReorderType(suggestion.reorderReason.type)}`);
    sections.push(`- **Tồn kho hiện tại:** ${suggestion.reorderReason.currentStock} units`);
    sections.push(`- **Điểm đặt hàng lại:** ${suggestion.reorderReason.reorderPoint} units`);
    sections.push(`- **Số ngày tồn kho còn:** ${suggestion.reorderReason.daysOfSupply} ngày`);
    sections.push(`- **Nhu cầu dự báo:** ${suggestion.reorderReason.forecastDemand} units / ${suggestion.reorderReason.forecastPeriodDays} ngày`);

    // Supplier selection
    sections.push('\n## Lựa chọn nhà cung cấp');
    sections.push(`**${suggestion.supplierName}** được chọn vì:`);
    sections.push(`- Giá đơn vị: ${this.formatCurrency(suggestion.unitPrice)}`);
    sections.push(`- Lead time: ${suggestion.metadata.supplierLeadTime} ngày`);
    sections.push(`- Độ tin cậy giao hàng: ${suggestion.metadata.supplierReliability}%`);

    if (suggestion.alternatives.length > 0) {
      sections.push('\nCác lựa chọn thay thế:');
      for (const alt of suggestion.alternatives.slice(0, 3)) {
        const priceNote = alt.priceDifference > 0
          ? `(+${alt.priceDifference}% giá)`
          : alt.priceDifference < 0
            ? `(${alt.priceDifference}% giá)`
            : '';
        sections.push(`- ${alt.supplierName}: ${this.formatCurrency(alt.unitPrice)} ${priceNote}, LT ${alt.leadTimeDays} ngày`);
      }
    }

    // Quantity calculation
    sections.push('\n## Tính toán số lượng');
    sections.push(`- **EOQ tối ưu:** ${suggestion.metadata.eoqQuantity} units`);
    sections.push(`- **MOQ nhà cung cấp:** ${suggestion.metadata.moqQuantity} units`);
    sections.push(`- **Số lượng đề xuất:** ${suggestion.quantity} units (đã làm tròn theo MOQ)`);

    // Risks
    if (suggestion.risks.length > 0) {
      sections.push('\n## Rủi ro cần lưu ý');
      for (const risk of suggestion.risks) {
        const icon = risk.severity === 'high' ? '🔴' : risk.severity === 'medium' ? '🟡' : '🟢';
        sections.push(`${icon} **${this.translateRiskType(risk.type)}:** ${risk.description}`);
        sections.push(`   → Giảm thiểu: ${risk.mitigation}`);
      }
    }

    // Price comparison
    if (suggestion.metadata.lastPurchasePrice) {
      sections.push('\n## So sánh giá');
      const priceChange = suggestion.metadata.priceChangePercent || 0;
      const changeIcon = priceChange > 0 ? '📈' : priceChange < 0 ? '📉' : '➡️';
      sections.push(`- Giá lần mua trước: ${this.formatCurrency(suggestion.metadata.lastPurchasePrice)}`);
      sections.push(`- Giá hiện tại: ${this.formatCurrency(suggestion.unitPrice)}`);
      sections.push(`- Thay đổi: ${changeIcon} ${priceChange > 0 ? '+' : ''}${priceChange}%`);
    }

    return sections.join('\n');
  }

  /**
   * Identify and analyze risks
   */
  analyzeRisks(suggestion: POSuggestion): {
    overallRisk: 'low' | 'medium' | 'high';
    riskScore: number;
    topRisks: SuggestionRisk[];
    mitigationPlan: string;
  } {
    const risks = suggestion.risks;

    // Calculate risk score
    let riskScore = 0;
    for (const risk of risks) {
      if (risk.severity === 'high') riskScore += 30;
      else if (risk.severity === 'medium') riskScore += 15;
      else riskScore += 5;
    }

    // Determine overall risk level
    let overallRisk: 'low' | 'medium' | 'high';
    if (riskScore >= 50) overallRisk = 'high';
    else if (riskScore >= 25) overallRisk = 'medium';
    else overallRisk = 'low';

    // Sort risks by severity
    const topRisks = [...risks].sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    // Generate mitigation plan
    const mitigationPlan = this.generateMitigationPlan(topRisks);

    return {
      overallRisk,
      riskScore: Math.min(100, riskScore),
      topRisks,
      mitigationPlan,
    };
  }

  /**
   * Suggest alternatives with comparison
   */
  async suggestAlternatives(
    suggestion: POSuggestion
  ): Promise<{
    alternatives: AlternativeSupplier[];
    comparison: {
      metric: string;
      primary: string | number;
      alternatives: { supplier: string; value: string | number }[];
    }[];
    recommendation: string;
  }> {
    const alternatives = suggestion.alternatives.slice(0, this.config.maxAlternatives);

    // Build comparison table
    const comparison = [
      {
        metric: 'Giá đơn vị',
        primary: this.formatCurrency(suggestion.unitPrice),
        alternatives: alternatives.map((a) => ({
          supplier: a.supplierName,
          value: this.formatCurrency(a.unitPrice),
        })),
      },
      {
        metric: 'Lead time',
        primary: `${suggestion.metadata.supplierLeadTime} ngày`,
        alternatives: alternatives.map((a) => ({
          supplier: a.supplierName,
          value: `${a.leadTimeDays} ngày`,
        })),
      },
      {
        metric: 'Điểm chất lượng',
        primary: `${suggestion.metadata.supplierReliability}%`,
        alternatives: alternatives.map((a) => ({
          supplier: a.supplierName,
          value: `${a.qualityScore}%`,
        })),
      },
      {
        metric: 'Điểm giao hàng',
        primary: `${suggestion.metadata.supplierReliability}%`,
        alternatives: alternatives.map((a) => ({
          supplier: a.supplierName,
          value: `${a.deliveryScore}%`,
        })),
      },
    ];

    // Generate recommendation
    let recommendation = `**${suggestion.supplierName}** vẫn là lựa chọn tốt nhất dựa trên đánh giá tổng hợp.`;

    // Check if any alternative is significantly better
    for (const alt of alternatives) {
      if (alt.priceDifference < -10 && alt.qualityScore >= 80 && alt.deliveryScore >= 80) {
        recommendation = `Cân nhắc **${alt.supplierName}** - giá thấp hơn ${Math.abs(alt.priceDifference)}% với chất lượng tương đương.`;
        break;
      }
    }

    return { alternatives, comparison, recommendation };
  }

  /**
   * Learn from approval/rejection decisions.
   * Persists decisions to AiModelLog for future pattern analysis and model improvement.
   */
  async learnFromDecision(decision: ApprovalDecision): Promise<void> {
    if (!this.config.learningEnabled) return;

    try {
      // Persist the decision to AiModelLog for historical learning
      await prisma.aiModelLog.create({
        data: {
          modelName: 'po-analyzer',
          version: '1.0',
          runType: 'recommendation',
          inputData: JSON.parse(JSON.stringify({
            suggestionId: decision.suggestionId,
            userId: decision.userId,
            modifications: decision.modifications || null,
          })),
          outputData: {
            decision: decision.decision,
            reason: decision.reason || null,
            timestamp: decision.timestamp.toISOString(),
          },
          status: 'success',
        },
      });

      logger.info(`[AI PO Analyzer] Learning recorded for ${decision.suggestionId}: ${decision.decision}`);

      // Update pattern analysis
      await this.updatePatternAnalysis(decision);
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'ai-po-analyzer', operation: 'recordLearning' });
    }
  }

  /**
   * Get insights from historical decisions.
   * Queries AiModelLog for past approval/rejection patterns and enriches insights.
   */
  async getLearningInsights(suggestion: POSuggestion): Promise<LearningInsight[]> {
    const insights: LearningInsight[] = [];

    try {
      // Query historical decisions from AiModelLog for this part
      const historicalLogs = await prisma.aiModelLog.findMany({
        where: {
          modelName: 'po-analyzer',
          runType: 'recommendation',
          status: 'success',
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      // Analyze approval/rejection patterns
      const partLogs = historicalLogs.filter((log) => {
        const input = log.inputData as Record<string, unknown> | null;
        return input?.suggestionId?.toString().includes(suggestion.partId);
      });

      if (partLogs.length > 0) {
        const approvedCount = partLogs.filter(
          (log) => (log.outputData as Record<string, unknown>)?.decision === 'approved'
        ).length;
        const approvalRate = Math.round((approvedCount / partLogs.length) * 100);

        insights.push({
          type: 'trend',
          insight: `${partLogs.length} previous decisions found for this part (${approvalRate}% approval rate)`,
          confidence: Math.min(90, 50 + partLogs.length * 5),
          actionable: approvalRate >= 80,
          action: approvalRate >= 80
            ? 'High historical approval rate supports fast-track review'
            : 'Mixed approval history -- review carefully',
        });
      }

      // Add general insight about confidence
      if (suggestion.confidenceScore >= 0.8) {
        insights.push({
          type: 'pattern',
          insight: `Đề xuất cho ${suggestion.partName} có độ tin cậy cao`,
          confidence: 85,
          actionable: true,
          action: 'Có thể xem xét phê duyệt nhanh',
        });
      }

      // Check if suggestion has risks
      if (suggestion.risks && suggestion.risks.length > 0) {
        insights.push({
          type: 'anomaly',
          insight: `Phát hiện ${suggestion.risks.length} rủi ro tiềm ẩn`,
          confidence: 70,
          actionable: true,
          action: 'Kiểm tra kỹ các yếu tố rủi ro trước khi phê duyệt',
        });
      }
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'ai-po-analyzer', operation: 'getLearningInsights' });
    }

    return insights;
  }

  // =============================================================================
  // PRIVATE METHODS
  // =============================================================================

  private calculateDecisionFactors(suggestion: POSuggestion): DecisionFactor[] {
    return [
      {
        factor: 'Độ tin cậy nhà cung cấp',
        weight: 0.25,
        score: suggestion.metadata.supplierReliability,
        explanation: `${suggestion.supplierName} có điểm giao hàng ${suggestion.metadata.supplierReliability}%`,
        impact: suggestion.metadata.supplierReliability >= 80 ? 'positive' :
                suggestion.metadata.supplierReliability >= 60 ? 'neutral' : 'negative',
      },
      {
        factor: 'Mức độ khẩn cấp',
        weight: 0.2,
        score: this.urgencyToScore(suggestion.urgencyLevel),
        explanation: `Cấp độ ${suggestion.urgencyLevel}: ${suggestion.reorderReason.daysOfSupply} ngày tồn`,
        impact: suggestion.urgencyLevel === 'critical' ? 'negative' :
                suggestion.urgencyLevel === 'high' ? 'neutral' : 'positive',
      },
      {
        factor: 'Tối ưu số lượng',
        weight: 0.2,
        score: this.quantityOptimizationScore(suggestion),
        explanation: `EOQ: ${suggestion.metadata.eoqQuantity}, Đề xuất: ${suggestion.quantity}`,
        impact: 'neutral',
      },
      {
        factor: 'Mức độ rủi ro',
        weight: 0.2,
        score: this.assessRiskLevel(suggestion.risks),
        explanation: `${suggestion.risks.length} rủi ro đã nhận diện`,
        impact: suggestion.risks.some((r) => r.severity === 'high') ? 'negative' : 'neutral',
      },
      {
        factor: 'Lựa chọn thay thế',
        weight: 0.15,
        score: suggestion.alternatives.length > 0 ? 70 + suggestion.alternatives.length * 10 : 60,
        explanation: `${suggestion.alternatives.length} nhà cung cấp thay thế`,
        impact: suggestion.alternatives.length > 0 ? 'positive' : 'neutral',
      },
    ];
  }

  private async generateAIAnalysis(suggestion: POSuggestion): Promise<{
    explanation?: string;
    marketInsights?: string[];
    optimizations?: string[];
  }> {
    try {
      const prompt = this.buildAnalysisPrompt(suggestion);
      const response = await this.aiProvider.chat({
        messages: [
          createSystemMessage('Bạn là chuyên gia phân tích mua hàng cho ngành sản xuất tại Việt Nam. Trả lời bằng tiếng Việt.'),
          createUserMessage(prompt),
        ],
      });

      const content = response.content;

      // Parse response (simple extraction)
      const lines = content.split('\n').filter((l) => l.trim());
      const explanation = lines.slice(0, 3).join('\n');
      const marketInsights = lines.filter((l) => l.includes('thị trường') || l.includes('xu hướng'));
      const optimizations = lines.filter((l) => l.includes('tối ưu') || l.includes('đề xuất'));

      return {
        explanation: explanation || undefined,
        marketInsights: marketInsights.length > 0 ? marketInsights.slice(0, 3) : undefined,
        optimizations: optimizations.length > 0 ? optimizations.slice(0, 3) : undefined,
      };
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'ai-po-analyzer', operation: 'aiAnalysis' });
      return {};
    }
  }

  private buildAnalysisPrompt(suggestion: POSuggestion): string {
    return `Phân tích đề xuất mua hàng sau:

Sản phẩm: ${suggestion.partName} (${suggestion.partNumber})
Danh mục: ${suggestion.partCategory}
Số lượng: ${suggestion.quantity} units
Nhà cung cấp: ${suggestion.supplierName}
Đơn giá: ${this.formatCurrency(suggestion.unitPrice)}
Tổng tiền: ${this.formatCurrency(suggestion.totalAmount)}

Tồn kho hiện tại: ${suggestion.reorderReason.currentStock}
Điểm đặt hàng lại: ${suggestion.reorderReason.reorderPoint}
Số ngày tồn: ${suggestion.reorderReason.daysOfSupply}
Lead time: ${suggestion.reorderReason.leadTimeDays} ngày

Rủi ro: ${suggestion.risks.map((r) => r.description).join('; ')}

Hãy:
1. Đánh giá ngắn gọn đề xuất này (2-3 câu)
2. Nêu bất kỳ insight thị trường nào liên quan
3. Đề xuất tối ưu hóa nếu có`;
  }

  private generateWhatIfScenarios(suggestion: POSuggestion): WhatIfScenario[] {
    const scenarios: WhatIfScenario[] = [];

    // Scenario 1: Delay order
    scenarios.push({
      scenario: 'Hoãn đặt hàng 1 tuần',
      description: 'Không đặt hàng ngay, chờ thêm 7 ngày',
      outcome: suggestion.reorderReason.daysOfSupply > 7
        ? 'Vẫn đủ hàng, có thể chờ giá tốt hơn'
        : 'Nguy cơ hết hàng, ảnh hưởng sản xuất',
      recommendation: suggestion.reorderReason.daysOfSupply > 10
        ? 'Có thể cân nhắc'
        : 'Không khuyến nghị',
    });

    // Scenario 2: Order double quantity
    scenarios.push({
      scenario: 'Tăng gấp đôi số lượng',
      description: `Đặt ${suggestion.quantity * 2} units thay vì ${suggestion.quantity}`,
      outcome: 'Giảm chi phí đặt hàng, tăng chi phí tồn kho',
      recommendation: suggestion.metadata.demandVariability < 0.3
        ? 'Có thể cân nhắc nếu giá ổn định'
        : 'Không khuyến nghị do nhu cầu biến động',
    });

    // Scenario 3: Use alternative supplier
    if (suggestion.alternatives.length > 0) {
      const alt = suggestion.alternatives[0];
      scenarios.push({
        scenario: `Chuyển sang ${alt.supplierName}`,
        description: `Sử dụng nhà cung cấp thay thế`,
        outcome: alt.priceDifference < 0
          ? `Tiết kiệm ${Math.abs(alt.priceDifference)}% chi phí`
          : `Tăng ${alt.priceDifference}% chi phí, lead time ${alt.leadTimeDays > suggestion.metadata.supplierLeadTime ? 'dài hơn' : 'ngắn hơn'}`,
        recommendation: alt.overallScore >= 80 && alt.priceDifference < 0
          ? 'Đáng cân nhắc'
          : 'Giữ nhà cung cấp hiện tại',
      });
    }

    return scenarios;
  }

  private generateMitigationPlan(risks: SuggestionRisk[]): string {
    if (risks.length === 0) return 'Không có rủi ro đáng kể. Đề xuất an toàn để phê duyệt.';

    const plans: string[] = ['## Kế hoạch giảm thiểu rủi ro\n'];

    for (const risk of risks) {
      plans.push(`### ${this.translateRiskType(risk.type)} (${this.translateSeverity(risk.severity)})`);
      plans.push(`- **Vấn đề:** ${risk.description}`);
      plans.push(`- **Giải pháp:** ${risk.mitigation}\n`);
    }

    return plans.join('\n');
  }

  private async updatePatternAnalysis(decision: ApprovalDecision): Promise<void> {
    // This would update a pattern analysis store
    // For now, we just log
    logger.info(`[AI PO Analyzer] Pattern update: ${decision.decision} for ${decision.suggestionId}`);
  }

  private assessDataQuality(suggestion: POSuggestion): number {
    let score = 50; // Base score

    if (suggestion.metadata.lastPurchasePrice) score += 15;
    if (suggestion.metadata.averageMonthlyDemand > 0) score += 15;
    if (suggestion.alternatives.length > 0) score += 10;
    if (suggestion.reorderReason.forecastDemand > 0) score += 10;

    return Math.min(100, score);
  }

  private assessForecastConfidence(suggestion: POSuggestion): number {
    const variability = suggestion.metadata.demandVariability;

    if (variability < 0.1) return 95;
    if (variability < 0.2) return 85;
    if (variability < 0.3) return 75;
    if (variability < 0.5) return 60;
    return 45;
  }

  private assessRiskLevel(risks: SuggestionRisk[]): number {
    let penalty = 0;

    for (const risk of risks) {
      if (risk.severity === 'high') penalty += 25;
      else if (risk.severity === 'medium') penalty += 12;
      else penalty += 5;
    }

    return Math.max(0, 100 - penalty);
  }

  private urgencyToScore(urgency: string): number {
    switch (urgency) {
      case 'critical': return 100;
      case 'high': return 80;
      case 'medium': return 60;
      case 'low': return 40;
      default: return 50;
    }
  }

  private quantityOptimizationScore(suggestion: POSuggestion): number {
    const diff = Math.abs(suggestion.quantity - suggestion.metadata.eoqQuantity);
    const percentDiff = diff / suggestion.metadata.eoqQuantity;

    if (percentDiff < 0.1) return 95;
    if (percentDiff < 0.2) return 85;
    if (percentDiff < 0.3) return 75;
    if (percentDiff < 0.5) return 60;
    return 50;
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(amount);
  }

  private translateReorderType(type: string): string {
    const map: Record<string, string> = {
      below_reorder_point: 'Dưới điểm đặt hàng lại',
      forecast_demand: 'Nhu cầu dự báo',
      safety_stock: 'Bổ sung tồn kho an toàn',
      lead_time: 'Đảm bảo lead time',
      scheduled_production: 'Theo kế hoạch sản xuất',
    };
    return map[type] || type;
  }

  private translateRiskType(type: string): string {
    const map: Record<string, string> = {
      supplier: 'Rủi ro nhà cung cấp',
      price: 'Rủi ro giá cả',
      lead_time: 'Rủi ro lead time',
      quality: 'Rủi ro chất lượng',
      capacity: 'Rủi ro năng lực',
      market: 'Rủi ro thị trường',
    };
    return map[type] || type;
  }

  private translateSeverity(severity: string): string {
    const map: Record<string, string> = {
      high: 'Cao',
      medium: 'Trung bình',
      low: 'Thấp',
    };
    return map[severity] || severity;
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let aiPOAnalyzerInstance: AIPOAnalyzer | null = null;

export function getAIPOAnalyzer(config?: Partial<AnalyzerConfig>): AIPOAnalyzer {
  if (!aiPOAnalyzerInstance) {
    aiPOAnalyzerInstance = new AIPOAnalyzer(config);
  }
  return aiPOAnalyzerInstance;
}
