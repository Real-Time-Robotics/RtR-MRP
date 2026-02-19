// =============================================================================
// AUTO-SCHEDULE ANALYZE API - AI analysis of schedules
// POST: Analyze schedule with AI, GET: Get analysis for disruption
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { withAuth } from '@/lib/api/with-auth';
import { getAISchedulerAnalyzer } from '@/lib/ai/autonomous/ai-scheduler-analyzer';
import { ScheduleResult } from '@/lib/ai/autonomous/scheduling-engine';

import { checkHeavyEndpointLimit } from '@/lib/rate-limit';

const analyzeBodySchema = z.object({
  scheduleResult: z.any().optional(),
  analysisType: z.enum(['explain', 'bottlenecks', 'improvements', 'compare', 'disruption', 'report', 'full']).optional(),
  scheduleResults: z.array(z.any()).optional(),
  disruption: z.any().optional(),
});
export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkHeavyEndpointLimit(request);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter || 60),
            'X-RateLimit-Limit': String(rateLimitResult.limit),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          },
        }
      );
    }

  try {
const rawBody = await request.json();
    const parseResult = analyzeBodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const {
      scheduleResult,
      analysisType = 'full',
      scheduleResults, // For comparison
      disruption, // For disruption handling
    } = parseResult.data;

    const analyzer = getAISchedulerAnalyzer();

    // Handle different analysis types
    switch (analysisType) {
      case 'explain': {
        if (!scheduleResult) {
          return NextResponse.json(
            { error: 'scheduleResult is required' },
            { status: 400 }
          );
        }

        const explanation = await analyzer.explainSchedule(
          scheduleResult as ScheduleResult
        );

        return NextResponse.json({
          success: true,
          analysisType: 'explain',
          explanation,
        });
      }

      case 'bottlenecks': {
        if (!scheduleResult) {
          return NextResponse.json(
            { error: 'scheduleResult is required' },
            { status: 400 }
          );
        }

        const bottlenecks = await analyzer.predictBottlenecks(
          scheduleResult as ScheduleResult
        );

        return NextResponse.json({
          success: true,
          analysisType: 'bottlenecks',
          bottlenecks,
          summary: {
            total: bottlenecks.length,
            highRisk: bottlenecks.filter((b) => b.probability > 0.7).length,
            mediumRisk: bottlenecks.filter(
              (b) => b.probability > 0.4 && b.probability <= 0.7
            ).length,
            lowRisk: bottlenecks.filter((b) => b.probability <= 0.4).length,
          },
        });
      }

      case 'improvements': {
        if (!scheduleResult) {
          return NextResponse.json(
            { error: 'scheduleResult is required' },
            { status: 400 }
          );
        }

        const improvements = await analyzer.suggestImprovements(
          scheduleResult as ScheduleResult
        );

        return NextResponse.json({
          success: true,
          analysisType: 'improvements',
          improvements,
          summary: {
            total: improvements.length,
            byPriority: improvements.reduce(
              (acc, i) => {
                acc[i.priority] = (acc[i.priority] || 0) + 1;
                return acc;
              },
              {} as Record<string, number>
            ),
            potentialImpact: improvements
              .slice(0, 3)
              .map((i) => `${i.expectedBenefit.metric}: +${i.expectedBenefit.improvement.toFixed(1)}%`)
              .join(', '),
          },
        });
      }

      case 'compare': {
        if (!scheduleResults || scheduleResults.length < 2) {
          return NextResponse.json(
            { error: 'At least 2 scheduleResults required for comparison' },
            { status: 400 }
          );
        }

        const comparison = await analyzer.compareSchedules(
          scheduleResults as ScheduleResult[]
        );

        return NextResponse.json({
          success: true,
          analysisType: 'compare',
          comparison,
        });
      }

      case 'disruption': {
        if (!scheduleResult || !disruption) {
          return NextResponse.json(
            { error: 'scheduleResult and disruption are required' },
            { status: 400 }
          );
        }

        const disruptionResponse = await analyzer.handleDisruption(
          scheduleResult as ScheduleResult,
          disruption
        );

        return NextResponse.json({
          success: true,
          analysisType: 'disruption',
          response: disruptionResponse,
        });
      }

      case 'report': {
        if (!scheduleResult) {
          return NextResponse.json(
            { error: 'scheduleResult is required' },
            { status: 400 }
          );
        }

        const report = await analyzer.generateScheduleReport(
          scheduleResult as ScheduleResult
        );

        return NextResponse.json({
          success: true,
          analysisType: 'report',
          report,
        });
      }

      case 'full':
      default: {
        if (!scheduleResult) {
          return NextResponse.json(
            { error: 'scheduleResult is required' },
            { status: 400 }
          );
        }

        const [explanation, bottlenecks, improvements, report] =
          await Promise.all([
            analyzer.explainSchedule(scheduleResult as ScheduleResult),
            analyzer.predictBottlenecks(scheduleResult as ScheduleResult),
            analyzer.suggestImprovements(scheduleResult as ScheduleResult),
            analyzer.generateScheduleReport(scheduleResult as ScheduleResult),
          ]);

        return NextResponse.json({
          success: true,
          analysisType: 'full',
          analysis: {
            explanation,
            bottlenecks,
            improvements,
            report,
          },
          summary: {
            overallHealth: calculateScheduleHealth(
              scheduleResult as ScheduleResult
            ),
            riskLevel: bottlenecks.length > 5 ? 'high' : bottlenecks.length > 2 ? 'medium' : 'low',
            topPriorityAction:
              improvements[0]?.description || 'Không có đề xuất cải thiện',
          },
        });
      }
    }
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/ai/auto-schedule/analyze' });
    return NextResponse.json(
      {
        error: 'Không thể phân tích lịch sản xuất',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
});

export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkHeavyEndpointLimit(request);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter || 60),
            'X-RateLimit-Limit': String(rateLimitResult.limit),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          },
        }
      );
    }

  try {
// Return available analysis types and descriptions
    const analysisTypes = [
      {
        id: 'explain',
        name: 'Giải thích lịch',
        description: 'Giải thích chi tiết các quyết định lên lịch',
        parameters: ['scheduleResult'],
      },
      {
        id: 'bottlenecks',
        name: 'Dự đoán nút thắt',
        description: 'Phát hiện các điểm tắc nghẽn tiềm ẩn trong lịch',
        parameters: ['scheduleResult'],
      },
      {
        id: 'improvements',
        name: 'Đề xuất cải thiện',
        description: 'Gợi ý các cách cải thiện lịch sản xuất',
        parameters: ['scheduleResult'],
      },
      {
        id: 'compare',
        name: 'So sánh lịch',
        description: 'So sánh nhiều phương án lịch sản xuất',
        parameters: ['scheduleResults (array)'],
      },
      {
        id: 'disruption',
        name: 'Xử lý gián đoạn',
        description: 'Phân tích và đề xuất giải pháp cho các gián đoạn',
        parameters: ['scheduleResult', 'disruption'],
      },
      {
        id: 'report',
        name: 'Báo cáo tổng hợp',
        description: 'Tạo báo cáo tổng quan về lịch sản xuất',
        parameters: ['scheduleResult'],
      },
      {
        id: 'full',
        name: 'Phân tích đầy đủ',
        description: 'Chạy tất cả các phân tích trên',
        parameters: ['scheduleResult'],
      },
    ];

    const disruptionTypes = [
      {
        type: 'machine_breakdown',
        name: 'Máy hỏng',
        description: 'Thiết bị ngừng hoạt động đột xuất',
      },
      {
        type: 'material_shortage',
        name: 'Thiếu nguyên liệu',
        description: 'Nguyên liệu không có sẵn như dự kiến',
      },
      {
        type: 'worker_absence',
        name: 'Công nhân vắng',
        description: 'Nhân sự không đi làm',
      },
      {
        type: 'urgent_order',
        name: 'Đơn hàng gấp',
        description: 'Đơn hàng mới cần xử lý khẩn cấp',
      },
      {
        type: 'quality_issue',
        name: 'Vấn đề chất lượng',
        description: 'Sản phẩm không đạt yêu cầu cần làm lại',
      },
      {
        type: 'supplier_delay',
        name: 'Nhà cung cấp trễ',
        description: 'Nguyên liệu giao trễ hơn dự kiến',
      },
    ];

    return NextResponse.json({
      success: true,
      analysisTypes,
      disruptionTypes,
      usage: {
        endpoint: '/api/ai/auto-schedule/analyze',
        method: 'POST',
        body: {
          scheduleResult: 'ScheduleResult object from scheduling engine',
          analysisType: 'One of the analysis type IDs',
          scheduleResults: 'Array of ScheduleResult (for compare)',
          disruption: 'Disruption object (for disruption type)',
        },
      },
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/ai/auto-schedule/analyze' });
    return NextResponse.json(
      { error: 'Không thể lấy thông tin phân tích' },
      { status: 500 }
    );
  }
});

function calculateScheduleHealth(schedule: ScheduleResult): string {
  const utilizationScore = schedule.metrics.currentCapacityUtilization;
  const deliveryScore = schedule.metrics.currentOnTimeDelivery;
  const conflictPenalty = schedule.conflicts.length * 5;

  const healthScore = (utilizationScore + deliveryScore) / 2 - conflictPenalty;

  if (healthScore >= 90) return 'excellent';
  if (healthScore >= 75) return 'good';
  if (healthScore >= 60) return 'fair';
  if (healthScore >= 40) return 'poor';
  return 'critical';
}
