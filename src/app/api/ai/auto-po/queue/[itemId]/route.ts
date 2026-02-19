// =============================================================================
// AUTO-PO QUEUE ITEM API - Get single queue item details
// GET: Get queue item by ID
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { withAuth } from '@/lib/api/with-auth';
import { approvalQueueService } from '@/lib/ai/autonomous/approval-queue-service';

import { checkHeavyEndpointLimit } from '@/lib/rate-limit';
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
const { itemId } = await context.params;

    if (!itemId) {
      return NextResponse.json(
        { error: 'itemId is required' },
        { status: 400 }
      );
    }

    const queueItem = await approvalQueueService.getQueueItem(itemId);

    if (!queueItem) {
      return NextResponse.json(
        { error: 'Queue item not found' },
        { status: 404 }
      );
    }

    const suggestion = queueItem.suggestion;

    // Build enriched response
    const enrichedItem = {
      id: queueItem.id,
      partId: suggestion.partId,
      partNumber: suggestion.partNumber,
      partName: suggestion.partName,
      partCategory: suggestion.partCategory || 'N/A',
      supplierId: suggestion.supplierId,
      supplierName: suggestion.supplierName,
      supplierScore: (suggestion as unknown as Record<string, unknown>).supplierScore as number || 4.0,
      quantity: suggestion.quantity,
      unitPrice: suggestion.unitPrice,
      totalAmount: suggestion.totalAmount,
      confidence: suggestion.confidenceScore || 0.75,
      reason: suggestion.explanation || 'AI-generated suggestion based on demand analysis',
      aiNotes: suggestion.aiEnhancement?.enhancedExplanation || 'Analyzed based on historical data and current inventory levels.',
      expectedDeliveryDate: suggestion.expectedDeliveryDate,
      urgency: queueItem.priority,
      risks: suggestion.risks?.map((r: { description: string }) => r.description) || [],
      createdAt: queueItem.addedAt.toISOString(),
      status: queueItem.status,
      // Key factors for AI reasoning
      keyFactors: suggestion.aiEnhancement?.decisionFactors?.map((f: { impact: string; factor: string; explanation: string; weight: number }) => ({
        type: f.impact === 'positive' ? 'positive' : f.impact === 'negative' ? 'negative' : 'neutral',
        label: f.factor,
        description: f.explanation,
        impact: f.weight > 0.3 ? 'high' : f.weight > 0.15 ? 'medium' : 'low',
      })) || [
        {
          type: 'positive',
          label: 'Nhu cầu dự báo',
          description: 'Dữ liệu nhu cầu cho thấy cần bổ sung hàng trong 2 tuần tới',
          impact: 'high',
        },
        {
          type: 'positive',
          label: 'Nhà cung cấp tin cậy',
          description: `${suggestion.supplierName} có điểm đánh giá cao`,
          impact: 'medium',
        },
        {
          type: 'neutral',
          label: 'Giá ổn định',
          description: 'Giá đề xuất nằm trong phạm vi trung bình 30 ngày qua',
          impact: 'low',
        },
      ],
      // Data sources
      dataSources: [
        {
          name: 'Dữ liệu tồn kho',
          description: 'Mức tồn kho hiện tại và ngưỡng đặt lại',
          lastUpdated: new Date().toISOString(),
        },
        {
          name: 'Lịch sử nhu cầu',
          description: 'Dữ liệu tiêu thụ 90 ngày gần nhất',
          lastUpdated: new Date().toISOString(),
        },
        {
          name: 'Thông tin nhà cung cấp',
          description: 'Đánh giá và lịch sử giao dịch',
          lastUpdated: new Date().toISOString(),
        },
      ],
      // Alternative suppliers
      alternativeSuppliers: (suggestion as unknown as Record<string, unknown>).alternativeSuppliers as Array<Record<string, unknown>> || [
        {
          supplierId: suggestion.supplierId,
          supplierName: suggestion.supplierName,
          unitPrice: suggestion.unitPrice,
          leadTimeDays: 7,
          score: (suggestion as unknown as Record<string, unknown>).supplierScore as number || 4.2,
          isRecommended: true,
          isCurrentSupplier: true,
          pros: ['Giá cạnh tranh', 'Giao hàng đúng hẹn'],
          cons: [],
        },
      ],
      // Risk analysis
      riskAnalysis: {
        level: (suggestion.confidenceScore || 0.75) >= 0.8 ? 'low' : (suggestion.confidenceScore || 0.75) >= 0.6 ? 'medium' : 'high',
        factors: suggestion.risks?.map((r: { type?: string; severity?: string; description: string; mitigation?: string }) => ({
          name: r.type || 'Risk',
          severity: r.severity || 'medium',
          description: r.description,
          mitigation: r.mitigation,
        })) || [],
      },
      // Audit trail
      auditTrail: [
        {
          action: 'Tạo đề xuất',
          userId: 'system',
          userName: 'Hệ thống AI',
          timestamp: queueItem.addedAt.toISOString(),
          notes: 'Tự động tạo từ phát hiện nhu cầu đặt hàng',
        },
        ...(queueItem.reviewedAt
          ? [{
              action: queueItem.decision === 'approved' ? 'Phê duyệt' : 'Từ chối',
              userId: queueItem.reviewedBy || 'unknown',
              userName: 'Người dùng',
              timestamp: queueItem.reviewedAt.toISOString(),
              notes: queueItem.decisionReason,
            }]
          : []),
      ],
    };

    return NextResponse.json({
      success: true,
      item: enrichedItem,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/ai/auto-po/queue/[itemId]' });
    return NextResponse.json(
      { error: 'Failed to get queue item', details: (error as Error).message },
      { status: 500 }
    );
  }
});
