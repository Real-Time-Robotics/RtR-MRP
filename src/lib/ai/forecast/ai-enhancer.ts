// =============================================================================
// AI ENHANCER SERVICE
// Gemini AI-powered forecast enhancement and explanation
// =============================================================================

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { ForecastResult, ForecastPoint } from './forecast-engine';
import { getUpcomingHolidays, getTetPhase, VN_HOLIDAYS } from './vn-calendar';
import { getDataExtractorService, CustomerBehavior } from './data-extractor';

// =============================================================================
// TYPES
// =============================================================================

export interface EnhancedForecast extends ForecastResult {
  aiInsights: AIInsights;
  riskAssessment: RiskAssessment;
  actionItems: ActionItem[];
}

export interface AIInsights {
  summary: string;
  summaryVi: string;
  keyFactors: string[];
  keyFactorsVi: string[];
  anomalies: Anomaly[];
  confidence: number;
}

export interface Anomaly {
  period: string;
  type: 'spike' | 'drop' | 'unusual_pattern';
  description: string;
  descriptionVi: string;
  suggestedAction: string;
}

export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high';
  stockoutRisk: number; // 0-100
  overstockRisk: number; // 0-100
  riskFactors: RiskFactor[];
}

export interface RiskFactor {
  factor: string;
  factorVi: string;
  impact: 'low' | 'medium' | 'high';
  mitigation: string;
  mitigationVi: string;
}

export interface ActionItem {
  priority: 'urgent' | 'high' | 'medium' | 'low';
  action: string;
  actionVi: string;
  deadline: Date | null;
  reason: string;
  reasonVi: string;
}

export interface ExplainedForecast {
  period: string;
  forecast: number;
  explanation: string;
  explanationVi: string;
  factors: {
    name: string;
    nameVi: string;
    impact: number;
    direction: 'increase' | 'decrease' | 'neutral';
  }[];
}

// =============================================================================
// AI ENHANCER SERVICE
// =============================================================================

export class AIEnhancerService {
  private aiApiKey: string;
  private aiModel: string;
  private dataExtractor = getDataExtractorService();

  constructor() {
    this.aiApiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || '';
    this.aiModel = 'gemini-1.5-flash';
  }

  // ===========================================================================
  // MAIN ENHANCEMENT
  // ===========================================================================

  /**
   * Enhance forecast with AI-powered insights
   */
  async enhanceForecast(forecast: ForecastResult): Promise<EnhancedForecast> {
    // Generate insights
    const aiInsights = await this.generateInsights(forecast);

    // Assess risks
    const riskAssessment = await this.assessRisks(forecast);

    // Generate action items
    const actionItems = await this.generateActionItems(forecast, riskAssessment);

    return {
      ...forecast,
      aiInsights,
      riskAssessment,
      actionItems,
    };
  }

  // ===========================================================================
  // AI INSIGHTS GENERATION
  // ===========================================================================

  private async generateInsights(forecast: ForecastResult): Promise<AIInsights> {
    // Try AI-powered insights first
    if (this.aiApiKey) {
      try {
        return await this.generateAIInsights(forecast);
      } catch (error) {
        logger.warn('[AIEnhancer] AI insights failed, using rule-based', { context: 'ai-enhancer', error: String(error) });
      }
    }

    // Fall back to rule-based insights
    return this.generateRuleBasedInsights(forecast);
  }

  private async generateAIInsights(forecast: ForecastResult): Promise<AIInsights> {
    const prompt = this.buildInsightsPrompt(forecast);
    const response = await this.callGeminiAPI(prompt);

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          summary: parsed.summary || 'Forecast analysis complete',
          summaryVi: parsed.summaryVi || 'Phân tích dự báo hoàn tất',
          keyFactors: parsed.keyFactors || [],
          keyFactorsVi: parsed.keyFactorsVi || [],
          anomalies: (parsed.anomalies || []).map((a: { period: string; type?: string; description?: string; descriptionVi?: string; suggestedAction?: string }) => ({
            period: a.period,
            type: a.type || 'unusual_pattern',
            description: a.description || '',
            descriptionVi: a.descriptionVi || '',
            suggestedAction: a.suggestedAction || '',
          })),
          confidence: parsed.confidence || 0.7,
        };
      }
    } catch (e) {
      logger.warn('[AIEnhancer] Failed to parse AI response', { context: 'ai-enhancer' });
    }

    return this.generateRuleBasedInsights(forecast);
  }

  private generateRuleBasedInsights(forecast: ForecastResult): AIInsights {
    const keyFactors: string[] = [];
    const keyFactorsVi: string[] = [];
    const anomalies: Anomaly[] = [];

    // Analyze trend
    if (forecast.metrics.trend === 'increasing') {
      keyFactors.push('Upward demand trend detected');
      keyFactorsVi.push('Xu hướng nhu cầu tăng');
    } else if (forecast.metrics.trend === 'decreasing') {
      keyFactors.push('Downward demand trend detected');
      keyFactorsVi.push('Xu hướng nhu cầu giảm');
    }

    // Analyze seasonality
    if (forecast.metrics.seasonality === 'strong') {
      keyFactors.push('Strong seasonal patterns observed');
      keyFactorsVi.push('Mẫu mùa vụ mạnh được quan sát');
    }

    // Check for holidays
    const upcomingHolidays = getUpcomingHolidays(3);
    if (upcomingHolidays.length > 0) {
      const tetHoliday = upcomingHolidays.find(h => h.name === 'Tet Holiday');
      if (tetHoliday) {
        keyFactors.push(`Tet holiday approaching (${tetHoliday.date.toLocaleDateString()})`);
        keyFactorsVi.push(`Tết Nguyên Đán đang đến (${tetHoliday.date.toLocaleDateString('vi-VN')})`);
      }
    }

    // Check volatility
    if (forecast.metrics.volatility === 'high') {
      keyFactors.push('High demand volatility - larger safety stock recommended');
      keyFactorsVi.push('Biến động nhu cầu cao - khuyến nghị tăng tồn kho an toàn');
    }

    // Detect anomalies in forecast
    const avgForecast = forecast.forecasts.reduce((a, f) => a + f.forecast, 0) / forecast.forecasts.length;

    for (const point of forecast.forecasts) {
      if (point.forecast > avgForecast * 1.5) {
        anomalies.push({
          period: point.period,
          type: 'spike',
          description: `Demand spike predicted: ${point.forecast} units (${Math.round((point.forecast / avgForecast - 1) * 100)}% above average)`,
          descriptionVi: `Dự báo nhu cầu tăng đột biến: ${point.forecast} đơn vị (cao hơn TB ${Math.round((point.forecast / avgForecast - 1) * 100)}%)`,
          suggestedAction: 'Prepare additional inventory before this period',
        });
      } else if (point.forecast < avgForecast * 0.5 && avgForecast > 0) {
        anomalies.push({
          period: point.period,
          type: 'drop',
          description: `Demand drop predicted: ${point.forecast} units (${Math.round((1 - point.forecast / avgForecast) * 100)}% below average)`,
          descriptionVi: `Dự báo nhu cầu giảm: ${point.forecast} đơn vị (thấp hơn TB ${Math.round((1 - point.forecast / avgForecast) * 100)}%)`,
          suggestedAction: 'Reduce order quantities to avoid overstock',
        });
      }
    }

    // Build summary
    const trendText = forecast.metrics.trend === 'increasing'
      ? 'tăng'
      : forecast.metrics.trend === 'decreasing'
      ? 'giảm'
      : 'ổn định';

    const summaryVi = `Dự báo cho ${forecast.productName}: Xu hướng ${trendText}, biến động ${
      forecast.metrics.volatility === 'high' ? 'cao' : forecast.metrics.volatility === 'medium' ? 'trung bình' : 'thấp'
    }. ${anomalies.length > 0 ? `Phát hiện ${anomalies.length} điểm bất thường.` : 'Không có điểm bất thường.'}`;

    const summary = `Forecast for ${forecast.productName}: ${
      forecast.metrics.trend.charAt(0).toUpperCase() + forecast.metrics.trend.slice(1)
    } trend, ${forecast.metrics.volatility} volatility. ${
      anomalies.length > 0 ? `${anomalies.length} anomalies detected.` : 'No anomalies detected.'
    }`;

    return {
      summary,
      summaryVi,
      keyFactors,
      keyFactorsVi,
      anomalies,
      confidence: forecast.dataQuality === 'good' ? 0.85 : forecast.dataQuality === 'fair' ? 0.7 : 0.5,
    };
  }

  // ===========================================================================
  // RISK ASSESSMENT
  // ===========================================================================

  private async assessRisks(forecast: ForecastResult): Promise<RiskAssessment> {
    const riskFactors: RiskFactor[] = [];

    // Volatility risk
    if (forecast.metrics.volatility === 'high') {
      riskFactors.push({
        factor: 'High demand volatility',
        factorVi: 'Biến động nhu cầu cao',
        impact: 'high',
        mitigation: 'Increase safety stock by 50%',
        mitigationVi: 'Tăng tồn kho an toàn 50%',
      });
    }

    // Seasonal risk
    const upcomingHolidays = getUpcomingHolidays(2);
    const tetHoliday = upcomingHolidays.find(h => h.name === 'Tet Holiday');
    if (tetHoliday) {
      const daysUntilTet = Math.ceil(
        (tetHoliday.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntilTet < 60) {
        riskFactors.push({
          factor: `Tet holiday in ${daysUntilTet} days`,
          factorVi: `Tết còn ${daysUntilTet} ngày`,
          impact: 'high',
          mitigation: 'Stock up before suppliers close, plan for 2-week shutdown',
          mitigationVi: 'Nhập hàng trước khi NCC nghỉ, lên kế hoạch cho 2 tuần nghỉ',
        });
      }
    }

    // Data quality risk
    if (forecast.dataQuality === 'poor') {
      riskFactors.push({
        factor: 'Limited historical data',
        factorVi: 'Dữ liệu lịch sử hạn chế',
        impact: 'medium',
        mitigation: 'Use conservative estimates, review forecasts frequently',
        mitigationVi: 'Dùng ước tính thận trọng, review dự báo thường xuyên',
      });
    }

    // Trend risk
    if (forecast.metrics.trend === 'increasing' && forecast.metrics.trendSlope > 5) {
      riskFactors.push({
        factor: 'Rapidly increasing demand',
        factorVi: 'Nhu cầu tăng nhanh',
        impact: 'medium',
        mitigation: 'Monitor closely, consider capacity expansion',
        mitigationVi: 'Theo dõi sát, xem xét mở rộng công suất',
      });
    }

    // Calculate risk scores
    let stockoutRisk = 30; // Base risk
    let overstockRisk = 20;

    if (forecast.metrics.volatility === 'high') {
      stockoutRisk += 25;
      overstockRisk += 15;
    } else if (forecast.metrics.volatility === 'medium') {
      stockoutRisk += 10;
      overstockRisk += 10;
    }

    if (forecast.metrics.trend === 'increasing') {
      stockoutRisk += 15;
      overstockRisk -= 10;
    } else if (forecast.metrics.trend === 'decreasing') {
      stockoutRisk -= 10;
      overstockRisk += 15;
    }

    if (tetHoliday && Math.ceil((tetHoliday.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) < 60) {
      stockoutRisk += 20;
    }

    stockoutRisk = Math.max(0, Math.min(100, stockoutRisk));
    overstockRisk = Math.max(0, Math.min(100, overstockRisk));

    const overallRisk: 'low' | 'medium' | 'high' =
      Math.max(stockoutRisk, overstockRisk) > 60
        ? 'high'
        : Math.max(stockoutRisk, overstockRisk) > 35
        ? 'medium'
        : 'low';

    return {
      overallRisk,
      stockoutRisk,
      overstockRisk,
      riskFactors,
    };
  }

  // ===========================================================================
  // ACTION ITEMS
  // ===========================================================================

  private async generateActionItems(
    forecast: ForecastResult,
    riskAssessment: RiskAssessment
  ): Promise<ActionItem[]> {
    const actionItems: ActionItem[] = [];
    const today = new Date();

    // High stockout risk
    if (riskAssessment.stockoutRisk > 50) {
      actionItems.push({
        priority: 'urgent',
        action: 'Review and increase safety stock levels',
        actionVi: 'Xem xét và tăng mức tồn kho an toàn',
        deadline: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000),
        reason: `Stockout risk at ${riskAssessment.stockoutRisk}%`,
        reasonVi: `Rủi ro hết hàng ở mức ${riskAssessment.stockoutRisk}%`,
      });
    }

    // Tet preparation
    const upcomingHolidays = getUpcomingHolidays(2);
    const tetHoliday = upcomingHolidays.find(h => h.name === 'Tet Holiday');
    if (tetHoliday) {
      const daysUntilTet = Math.ceil(
        (tetHoliday.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilTet < 45 && daysUntilTet > 0) {
        actionItems.push({
          priority: 'high',
          action: 'Place pre-Tet orders with suppliers',
          actionVi: 'Đặt hàng với NCC trước Tết',
          deadline: new Date(tetHoliday.date.getTime() - 21 * 24 * 60 * 60 * 1000),
          reason: 'Suppliers will close for Tet holiday',
          reasonVi: 'Nhà cung cấp sẽ nghỉ Tết',
        });
      }
    }

    // Demand spikes
    const avgForecast = forecast.forecasts.reduce((a, f) => a + f.forecast, 0) / forecast.forecasts.length;
    const spikePeriods = forecast.forecasts.filter(f => f.forecast > avgForecast * 1.3);

    for (const spike of spikePeriods.slice(0, 2)) {
      const spikeDate = new Date(spike.date);
      const prepDate = new Date(spikeDate.getTime() - 14 * 24 * 60 * 60 * 1000);

      if (prepDate > today) {
        actionItems.push({
          priority: 'medium',
          action: `Prepare for demand spike in ${spike.period}`,
          actionVi: `Chuẩn bị cho nhu cầu tăng cao trong ${spike.period}`,
          deadline: prepDate,
          reason: `Forecast: ${spike.forecast} units (${Math.round((spike.forecast / avgForecast - 1) * 100)}% above average)`,
          reasonVi: `Dự báo: ${spike.forecast} đơn vị (cao hơn TB ${Math.round((spike.forecast / avgForecast - 1) * 100)}%)`,
        });
      }
    }

    // Data quality improvement
    if (forecast.dataQuality === 'poor') {
      actionItems.push({
        priority: 'low',
        action: 'Improve data quality for better forecasting',
        actionVi: 'Cải thiện chất lượng dữ liệu để dự báo tốt hơn',
        deadline: null,
        reason: 'Limited historical data affects forecast accuracy',
        reasonVi: 'Dữ liệu lịch sử hạn chế ảnh hưởng độ chính xác dự báo',
      });
    }

    // Sort by priority
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    actionItems.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return actionItems;
  }

  // ===========================================================================
  // FORECAST EXPLANATION
  // ===========================================================================

  /**
   * Generate human-readable explanation for a forecast
   */
  async explainForecast(
    forecast: ForecastResult,
    period?: string
  ): Promise<ExplainedForecast[]> {
    const pointsToExplain = period
      ? forecast.forecasts.filter(f => f.period === period)
      : forecast.forecasts;

    const explanations: ExplainedForecast[] = [];

    for (const point of pointsToExplain) {
      const factors: ExplainedForecast['factors'] = [];

      // Trend factor
      if (point.factors.trend !== 0) {
        factors.push({
          name: 'Trend',
          nameVi: 'Xu hướng',
          impact: Math.abs(point.factors.trend),
          direction: point.factors.trend > 0 ? 'increase' : 'decrease',
        });
      }

      // Seasonal factor
      if (point.factors.seasonalIndex !== 1) {
        factors.push({
          name: 'Seasonality',
          nameVi: 'Mùa vụ',
          impact: Math.abs((point.factors.seasonalIndex - 1) * point.factors.baseValue),
          direction: point.factors.seasonalIndex > 1 ? 'increase' : 'decrease',
        });
      }

      // Holiday factor
      if (point.factors.holidayFactor !== 1) {
        factors.push({
          name: point.factors.holidayNames.length > 0
            ? point.factors.holidayNames[0]
            : 'Holiday',
          nameVi: point.factors.holidayNames.length > 0
            ? point.factors.holidayNames[0]
            : 'Ngày lễ',
          impact: Math.abs((point.factors.holidayFactor - 1) * point.factors.baseValue),
          direction: point.factors.holidayFactor > 1 ? 'increase' : 'decrease',
        });
      }

      // Build explanation
      const parts: string[] = [];
      const partsVi: string[] = [];

      parts.push(`Base forecast: ${Math.round(point.factors.baseValue)} units`);
      partsVi.push(`Dự báo cơ sở: ${Math.round(point.factors.baseValue)} đơn vị`);

      for (const factor of factors) {
        const sign = factor.direction === 'increase' ? '+' : '-';
        const pct = Math.round((Math.abs(factor.impact) / point.factors.baseValue) * 100);

        parts.push(`${factor.name}: ${sign}${Math.round(factor.impact)} (${sign}${pct}%)`);
        partsVi.push(`${factor.nameVi}: ${sign}${Math.round(factor.impact)} (${sign}${pct}%)`);
      }

      parts.push(`Final forecast: ${point.forecast} units`);
      partsVi.push(`Dự báo cuối cùng: ${point.forecast} đơn vị`);

      explanations.push({
        period: point.period,
        forecast: point.forecast,
        explanation: parts.join('. '),
        explanationVi: partsVi.join('. '),
        factors,
      });
    }

    return explanations;
  }

  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================

  private buildInsightsPrompt(forecast: ForecastResult): string {
    const forecastSummary = forecast.forecasts
      .slice(0, 6)
      .map(f => `${f.period}: ${f.forecast} (${f.lowerBound}-${f.upperBound})`)
      .join('\n');

    return `You are an expert demand forecasting analyst. Analyze this forecast and provide insights.

PRODUCT: ${forecast.productName} (${forecast.productSku})

FORECAST DATA (next 6 periods):
${forecastSummary}

METRICS:
- Trend: ${forecast.metrics.trend} (slope: ${forecast.metrics.trendSlope})
- Seasonality: ${forecast.metrics.seasonality}
- Volatility: ${forecast.metrics.volatility}
- Historical Average: ${forecast.metrics.historicalAvg}

CONTEXT:
- Vietnamese market (holidays: Tet, 30/4, 2/9, etc.)
- Manufacturing/industrial products
- Today's date: ${new Date().toISOString().split('T')[0]}

Provide analysis in JSON format:
{
  "summary": "English summary (1-2 sentences)",
  "summaryVi": "Vietnamese summary (1-2 sentences)",
  "keyFactors": ["factor1", "factor2", "factor3"],
  "keyFactorsVi": ["yếu tố 1", "yếu tố 2", "yếu tố 3"],
  "anomalies": [
    {
      "period": "2024-03",
      "type": "spike|drop|unusual_pattern",
      "description": "English description",
      "descriptionVi": "Vietnamese description",
      "suggestedAction": "What to do"
    }
  ],
  "confidence": 0.8
}

Return ONLY valid JSON, no additional text.`;
  }

  private async callGeminiAPI(prompt: string): Promise<string> {
    const response = await fetch(
      `${process.env.GOOGLE_AI_API_BASE_URL || 'https://generativelanguage.googleapis.com'}/v1beta/models/${this.aiModel}:generateContent?key=${this.aiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let aiEnhancerInstance: AIEnhancerService | null = null;

export function getAIEnhancerService(): AIEnhancerService {
  if (!aiEnhancerInstance) {
    aiEnhancerInstance = new AIEnhancerService();
  }
  return aiEnhancerInstance;
}

export default AIEnhancerService;
