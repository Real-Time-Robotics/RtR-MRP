// =============================================================================
// AUTO-SCHEDULE OPTIMIZE API - Run optimization algorithms
// POST: Run optimization on a schedule
// GET: Get available algorithms
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

// =============================================================================
// TYPES
// =============================================================================

interface OptimizationResult {
  algorithm: string;
  originalMetrics: {
    utilization: number;
    onTimeDelivery: number;
    conflictCount: number;
    makespan: number;
  };
  optimizedMetrics: {
    utilization: number;
    onTimeDelivery: number;
    conflictCount: number;
    makespan: number;
  };
  improvement: {
    utilization: number;
    onTimeDelivery: number;
    conflictsResolved: number;
    makespanReduction: number;
  };
  suggestions: Array<{
    id: string;
    type: string;
    description: string;
    impact: string;
  }>;
  executionTime: number;
}

// =============================================================================
// MOCK OPTIMIZATION
// =============================================================================

function runMockOptimization(algorithm: string): OptimizationResult {
  const originalMetrics = {
    utilization: 72,
    onTimeDelivery: 85,
    conflictCount: 4,
    makespan: 21,
  };

  // Different algorithms produce different results
  const algorithmImprovements: Record<string, Partial<OptimizationResult['improvement']>> = {
    priority_first: { utilization: 3, onTimeDelivery: 8, conflictsResolved: 2, makespanReduction: 1 },
    due_date_first: { utilization: 2, onTimeDelivery: 12, conflictsResolved: 1, makespanReduction: 2 },
    shortest_first: { utilization: 5, onTimeDelivery: 5, conflictsResolved: 1, makespanReduction: 3 },
    setup_minimize: { utilization: 8, onTimeDelivery: 4, conflictsResolved: 2, makespanReduction: 2 },
    balanced_load: { utilization: 10, onTimeDelivery: 7, conflictsResolved: 3, makespanReduction: 2 },
    genetic: { utilization: 12, onTimeDelivery: 10, conflictsResolved: 4, makespanReduction: 4 },
  };

  const improvements = algorithmImprovements[algorithm] || algorithmImprovements['balanced_load'];

  const optimizedMetrics = {
    utilization: originalMetrics.utilization + (improvements.utilization || 0),
    onTimeDelivery: originalMetrics.onTimeDelivery + (improvements.onTimeDelivery || 0),
    conflictCount: Math.max(0, originalMetrics.conflictCount - (improvements.conflictsResolved || 0)),
    makespan: originalMetrics.makespan - (improvements.makespanReduction || 0),
  };

  return {
    algorithm,
    originalMetrics,
    optimizedMetrics,
    improvement: {
      utilization: improvements.utilization || 0,
      onTimeDelivery: improvements.onTimeDelivery || 0,
      conflictsResolved: improvements.conflictsResolved || 0,
      makespanReduction: improvements.makespanReduction || 0,
    },
    suggestions: [
      {
        id: 'sug-1',
        type: 'workload_balance',
        description: 'Di chuyển 3 work orders từ Dây chuyền 2 sang Dây chuyền 3',
        impact: `Cải thiện hiệu suất ${improvements.utilization}%`,
      },
      {
        id: 'sug-2',
        type: 'schedule_adjustment',
        description: 'Điều chỉnh ngày bắt đầu cho 5 work orders',
        impact: `Tăng tỷ lệ đúng hạn ${improvements.onTimeDelivery}%`,
      },
    ],
    executionTime: Math.random() * 2000 + 500, // 0.5-2.5 seconds
  };
}

// =============================================================================
// POST: Run optimization
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      algorithm = 'balanced_load',
      compareAlgorithms = false,
    } = body;

    // If comparing algorithms, run all and compare
    if (compareAlgorithms) {
      const algorithms = [
        'priority_first',
        'due_date_first',
        'shortest_first',
        'setup_minimize',
        'balanced_load',
        'genetic',
      ];

      const results = algorithms.map((algo) => {
        const result = runMockOptimization(algo);
        const score =
          result.improvement.utilization * 0.3 +
          result.improvement.onTimeDelivery * 0.4 +
          result.improvement.conflictsResolved * 10 +
          result.improvement.makespanReduction * 5;

        return {
          algorithm: algo,
          name: getAlgorithmName(algo),
          metrics: result.optimizedMetrics,
          improvement: result.improvement,
          score: Math.round(score * 10) / 10,
        };
      });

      // Sort by score
      results.sort((a, b) => b.score - a.score);

      return NextResponse.json({
        success: true,
        comparison: results,
        recommended: results[0]?.algorithm,
        message: `Thuật toán "${results[0]?.name}" cho kết quả tốt nhất với điểm ${results[0]?.score}`,
      });
    }

    // Run single algorithm optimization
    const result = runMockOptimization(algorithm);

    return NextResponse.json({
      success: true,
      result,
      summary: {
        algorithm: getAlgorithmName(algorithm),
        utilizationBefore: result.originalMetrics.utilization,
        utilizationAfter: result.optimizedMetrics.utilization,
        onTimeDeliveryBefore: result.originalMetrics.onTimeDelivery,
        onTimeDeliveryAfter: result.optimizedMetrics.onTimeDelivery,
        conflictsBefore: result.originalMetrics.conflictCount,
        conflictsAfter: result.optimizedMetrics.conflictCount,
        improvementScore:
          result.improvement.utilization +
          result.improvement.onTimeDelivery +
          result.improvement.conflictsResolved * 10,
      },
    });
  } catch (error) {
    console.error('[Auto-Schedule Optimize API] Error:', error);
    return NextResponse.json(
      {
        error: 'Không thể tối ưu hóa lịch sản xuất',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

function getAlgorithmName(algorithm: string): string {
  const names: Record<string, string> = {
    priority_first: 'Ưu tiên cao trước',
    due_date_first: 'Ngày đáo hạn trước',
    shortest_first: 'Ngắn nhất trước',
    setup_minimize: 'Tối thiểu setup',
    balanced_load: 'Cân bằng tải',
    genetic: 'Thuật toán di truyền',
  };
  return names[algorithm] || algorithm;
}

// =============================================================================
// GET: Get available algorithms
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const algorithms = [
      {
        id: 'priority_first',
        name: 'Ưu tiên cao trước',
        description: 'Lên lịch các lệnh có mức ưu tiên cao trước',
        bestFor: 'Khi có nhiều lệnh khẩn cấp cần xử lý',
        tradeoff: 'Có thể bỏ qua các lệnh ưu tiên thấp',
        estimatedTime: '< 1 phút',
      },
      {
        id: 'due_date_first',
        name: 'Ngày đáo hạn trước',
        description: 'Lên lịch theo thứ tự ngày đáo hạn gần nhất',
        bestFor: 'Tối đa hóa tỷ lệ giao hàng đúng hẹn',
        tradeoff: 'Có thể không tối ưu về sử dụng công suất',
        estimatedTime: '< 1 phút',
      },
      {
        id: 'shortest_first',
        name: 'Ngắn nhất trước',
        description: 'Lên lịch các lệnh có thời gian sản xuất ngắn trước',
        bestFor: 'Tối đa hóa số lượng lệnh hoàn thành',
        tradeoff: 'Lệnh dài có thể bị trì hoãn',
        estimatedTime: '< 1 phút',
      },
      {
        id: 'setup_minimize',
        name: 'Tối thiểu setup',
        description: 'Nhóm các lệnh tương tự để giảm thời gian chuyển đổi',
        bestFor: 'Giảm thời gian setup và tăng năng suất',
        tradeoff: 'Có thể không tối ưu về ngày giao hàng',
        estimatedTime: '1-2 phút',
      },
      {
        id: 'balanced_load',
        name: 'Cân bằng tải',
        description: 'Phân bổ đều công việc giữa các trung tâm sản xuất',
        bestFor: 'Tránh tình trạng quá tải tại một điểm',
        tradeoff: 'Có thể không tối ưu cho từng lệnh riêng lẻ',
        estimatedTime: '1-2 phút',
      },
      {
        id: 'genetic',
        name: 'Thuật toán di truyền (AI)',
        description: 'Sử dụng AI để tìm giải pháp tối ưu đa mục tiêu',
        bestFor: 'Bài toán phức tạp với nhiều ràng buộc',
        tradeoff: 'Cần nhiều thời gian tính toán hơn',
        estimatedTime: '2-5 phút',
      },
    ];

    return NextResponse.json({
      success: true,
      algorithms,
      defaultAlgorithm: 'balanced_load',
      recommendations: {
        highPriorityOrders: 'priority_first',
        tightDeadlines: 'due_date_first',
        manySmallOrders: 'shortest_first',
        similarProducts: 'setup_minimize',
        general: 'balanced_load',
        complex: 'genetic',
      },
    });
  } catch (error) {
    console.error('[Auto-Schedule Optimize API] Error:', error);
    return NextResponse.json(
      { error: 'Không thể lấy thông tin thuật toán' },
      { status: 500 }
    );
  }
}
