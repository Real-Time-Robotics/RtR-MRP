import { NextRequest, NextResponse } from 'next/server';import { logger } from '@/lib/logger';
import { withAuth } from '@/lib/api/with-auth';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

import {
  MLEngine,
  DemandForecast,
  EquipmentHealth,
  AIInsight,
  Anomaly,
  generateMockHistoricalData,
  generateMockSensorData,
  generateMockMaintenanceHistory,
} from '@/lib/ai/ml-engine';

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';
// =============================================================================
// AI/ML API
// Provides AI-powered insights, forecasting, and predictive maintenance
// =============================================================================

// Input shape for demand forecasting
interface ForecastItem {
  id: string;
  code: string;
  name: string;
  stock: number;
  avgDemand: number;
  leadTime: number;
}

// Input shape for equipment health
interface EquipmentInput {
  id: string;
  code: string;
  name: string;
  opHours: number;
  lifeHours: number;
  pmInterval: number;
}

// Fetch parts with aggregated inventory for demand forecasting
async function fetchForecastItems(): Promise<ForecastItem[]> {
  const parts = await prisma.part.findMany({
    where: { status: 'active' },
    select: {
      id: true,
      partNumber: true,
      name: true,
      reorderPoint: true,
      leadTimeDays: true,
      inventory: {
        select: {
          quantity: true,
        },
      },
    },
    orderBy: { partNumber: 'asc' },
  });

  return parts.map(part => {
    const totalStock = part.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
    // Estimate average daily demand from reorder point and lead time
    // If reorderPoint > 0 and leadTimeDays > 0, avgDemand ~ reorderPoint / leadTimeDays
    const avgDemand = part.leadTimeDays > 0 && part.reorderPoint > 0
      ? Math.max(1, Math.round(part.reorderPoint / part.leadTimeDays))
      : 1;

    return {
      id: part.id,
      code: part.partNumber,
      name: part.name,
      stock: totalStock,
      avgDemand,
      leadTime: part.leadTimeDays,
    };
  });
}

// Fetch a single part by ID for demand forecasting
async function fetchForecastItemById(itemId: string): Promise<ForecastItem | null> {
  const part = await prisma.part.findUnique({
    where: { id: itemId },
    select: {
      id: true,
      partNumber: true,
      name: true,
      reorderPoint: true,
      leadTimeDays: true,
      inventory: {
        select: {
          quantity: true,
        },
      },
    },
  });

  if (!part) return null;

  const totalStock = part.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
  const avgDemand = part.leadTimeDays > 0 && part.reorderPoint > 0
    ? Math.max(1, Math.round(part.reorderPoint / part.leadTimeDays))
    : 1;

  return {
    id: part.id,
    code: part.partNumber,
    name: part.name,
    stock: totalStock,
    avgDemand,
    leadTime: part.leadTimeDays,
  };
}

// Fetch equipment for predictive maintenance
async function fetchEquipmentList(): Promise<EquipmentInput[]> {
  const equipment = await prisma.equipment.findMany({
    where: {
      status: { not: 'retired' },
    },
    select: {
      id: true,
      code: true,
      name: true,
      operatingHours: true,
      designLifeHours: true,
      maintenanceIntervalDays: true,
    },
    orderBy: { code: 'asc' },
  });

  return equipment.map(eq => ({
    id: eq.id,
    code: eq.code,
    name: eq.name,
    opHours: eq.operatingHours ?? 0,
    lifeHours: eq.designLifeHours ?? 20000,
    pmInterval: eq.maintenanceIntervalDays ?? 30,
  }));
}

// Fetch a single equipment by ID for predictive maintenance
async function fetchEquipmentById(equipmentId: string): Promise<EquipmentInput | null> {
  const eq = await prisma.equipment.findUnique({
    where: { id: equipmentId },
    select: {
      id: true,
      code: true,
      name: true,
      operatingHours: true,
      designLifeHours: true,
      maintenanceIntervalDays: true,
    },
  });

  if (!eq) return null;

  return {
    id: eq.id,
    code: eq.code,
    name: eq.name,
    opHours: eq.operatingHours ?? 0,
    lifeHours: eq.designLifeHours ?? 20000,
    pmInterval: eq.maintenanceIntervalDays ?? 30,
  };
}

// Generate demand forecast for an item
function generateDemandForecast(item: ForecastItem): DemandForecast {
  const historicalData = generateMockHistoricalData(30);
  const values = historicalData.map(d => d.value);

  const forecast = MLEngine.doubleExponentialSmoothing(values, 0.3, 0.1, 7);
  const fitted = MLEngine.exponentialMovingAverage(values, 0.3);
  const metrics = MLEngine.calculateForecastMetrics(
    values.slice(-14),
    fitted.slice(-14)
  );

  const recommendations = MLEngine.generateForecastRecommendations(
    forecast,
    item.stock,
    item.avgDemand,
    item.leadTime
  );

  return {
    itemId: item.id,
    itemCode: item.code,
    itemName: item.name,
    currentStock: item.stock,
    avgDailyDemand: item.avgDemand,
    historicalData,
    forecast,
    metrics,
    recommendations,
    seasonalityDetected: MLEngine.detectSeasonality(values),
    trendDirection: MLEngine.detectTrend(values),
  };
}

// Generate equipment health data
function generateEquipmentHealth(eq: EquipmentInput): EquipmentHealth {
  const sensorData = generateMockSensorData(eq.id);
  const maintenanceHistory = generateMockMaintenanceHistory(eq.id);

  // Calculate days since last PM
  const lastPM = maintenanceHistory.find(e => e.type === 'PM');
  const daysSinceLastPM = lastPM
    ? Math.floor((Date.now() - new Date(lastPM.date).getTime()) / 86400000)
    : eq.pmInterval + 10;

  const healthScore = MLEngine.calculateHealthScore(
    sensorData,
    maintenanceHistory,
    eq.opHours,
    eq.lifeHours
  );

  const riskFactors = generateRiskFactors(sensorData, eq.opHours, eq.lifeHours);

  const failureProbability = MLEngine.calculateFailureProbability(
    healthScore,
    daysSinceLastPM,
    eq.pmInterval,
    riskFactors
  );

  // Calculate health trend (daily change in health score - negative means degrading)
  const healthTrendValue = healthScore > 70 ? 0.5 : healthScore > 50 ? -0.5 : -1.5;
  const predictedFailureDate = MLEngine.predictFailureDate(healthScore, healthTrendValue, 30);

  const recommendations = MLEngine.generateMaintenanceRecommendations(
    healthScore,
    failureProbability,
    riskFactors,
    daysSinceLastPM,
    eq.pmInterval
  );

  const lastMaintenance = new Date();
  lastMaintenance.setDate(lastMaintenance.getDate() - daysSinceLastPM);

  const nextMaintenance = new Date(lastMaintenance);
  nextMaintenance.setDate(nextMaintenance.getDate() + eq.pmInterval);

  return {
    equipmentId: eq.id,
    equipmentCode: eq.code,
    equipmentName: eq.name,
    healthScore,
    status: MLEngine.getHealthStatus(healthScore),
    failureProbability,
    predictedFailureDate,
    daysUntilMaintenance: Math.max(0, eq.pmInterval - daysSinceLastPM),
    riskFactors,
    recommendations,
    sensorData,
    maintenanceHistory,
    operatingHours: eq.opHours,
    expectedLifeHours: eq.lifeHours,
    lastMaintenanceDate: lastMaintenance.toISOString().split('T')[0],
    nextScheduledMaintenance: nextMaintenance.toISOString().split('T')[0],
  };
}

function generateRiskFactors(
  sensorData: ReturnType<typeof generateMockSensorData>,
  opHours: number,
  lifeHours: number
): EquipmentHealth['riskFactors'] {
  const factors: EquipmentHealth['riskFactors'] = [];

  // Check sensors
  sensorData.forEach(sensor => {
    if (sensor.status === 'CRITICAL') {
      factors.push({
        id: `RISK-${sensor.sensorId}`,
        name: sensor.name,
        severity: 'CRITICAL',
        contribution: 30,
        description: `${sensor.name} đang ở mức nguy hiểm (${sensor.value} ${sensor.unit})`,
        trend: 'WORSENING',
      });
    } else if (sensor.status === 'WARNING') {
      factors.push({
        id: `RISK-${sensor.sensorId}`,
        name: sensor.name,
        severity: 'HIGH',
        contribution: 15,
        description: `${sensor.name} đang ở mức cảnh báo (${sensor.value} ${sensor.unit})`,
        trend: 'STABLE',
      });
    }
  });

  // Check age
  const ageRatio = opHours / lifeHours;
  if (ageRatio > 0.9) {
    factors.push({
      id: 'RISK-AGE',
      name: 'Tuổi thọ',
      severity: 'CRITICAL',
      contribution: 35,
      description: `Thiết bị đã hoạt động ${Math.round(ageRatio * 100)}% tuổi thọ dự kiến`,
      trend: 'WORSENING',
    });
  } else if (ageRatio > 0.75) {
    factors.push({
      id: 'RISK-AGE',
      name: 'Tuổi thọ',
      severity: 'HIGH',
      contribution: 20,
      description: `Thiết bị đã hoạt động ${Math.round(ageRatio * 100)}% tuổi thọ dự kiến`,
      trend: 'STABLE',
    });
  }

  return factors;
}

// Generate AI insights
function generateAIInsights(): AIInsight[] {
  const insights: AIInsight[] = [
    {
      id: 'INS-001',
      category: 'FORECASTING',
      type: 'PREDICTION',
      priority: 'HIGH',
      title: 'Dự báo tăng nhu cầu Thép cuộn HRC',
      description: 'Model dự báo nhu cầu Thép cuộn HRC sẽ tăng 25% trong 2 tuần tới do mùa cao điểm',
      impact: 'Cần tăng lượng đặt hàng để tránh stockout',
      confidence: 87,
      dataPoints: 180,
      generatedAt: new Date().toISOString(),
      actionUrl: '/ai/forecasting',
      actionLabel: 'Xem chi tiết dự báo',
    },
    {
      id: 'INS-002',
      category: 'MAINTENANCE',
      type: 'ALERT',
      priority: 'CRITICAL',
      title: 'Cảnh báo sự cố CNC Mill Haas VF-2',
      description: 'Phân tích sensor cho thấy rung động bất thường, xác suất hỏng hóc trong 7 ngày: 45%',
      impact: 'Cần bảo trì ngay để tránh downtime không kế hoạch',
      confidence: 92,
      dataPoints: 2400,
      generatedAt: new Date().toISOString(),
      actionUrl: '/ai/predictive-maintenance',
      actionLabel: 'Xem trạng thái thiết bị',
    },
    {
      id: 'INS-003',
      category: 'QUALITY',
      type: 'ALERT',
      priority: 'MEDIUM',
      title: 'Phát hiện pattern lỗi ở line 3',
      description: 'Tỷ lệ lỗi tại line 3 tăng 15% so với tuần trước, chủ yếu ở công đoạn mài',
      impact: 'Cần kiểm tra máy mài và training lại operator',
      confidence: 78,
      dataPoints: 540,
      generatedAt: new Date(Date.now() - 3600000).toISOString(),
      actionUrl: '/quality',
      actionLabel: 'Xem báo cáo chất lượng',
    },
    {
      id: 'INS-004',
      category: 'EFFICIENCY',
      type: 'OPPORTUNITY',
      priority: 'MEDIUM',
      title: 'Cơ hội cải thiện OEE tại Work Center WC-002',
      description: 'Phân tích cho thấy thời gian setup có thể giảm 20% bằng SMED',
      impact: 'Tăng OEE từ 72% lên 78%, tiết kiệm 12 giờ/tuần',
      confidence: 85,
      dataPoints: 320,
      generatedAt: new Date(Date.now() - 7200000).toISOString(),
      actionUrl: '/production/oee',
      actionLabel: 'Xem OEE Dashboard',
    },
    {
      id: 'INS-005',
      category: 'COST',
      type: 'RECOMMENDATION',
      priority: 'LOW',
      title: 'Cơ hội tiết kiệm chi phí nguyên liệu',
      description: 'Phân tích giá cho thấy có thể tiết kiệm 8% nếu đặt hàng Nhôm tấm theo lô lớn hơn',
      impact: 'Tiết kiệm ước tính 45 triệu VND/quý',
      confidence: 72,
      dataPoints: 90,
      generatedAt: new Date(Date.now() - 86400000).toISOString(),
      actionUrl: '/purchasing',
      actionLabel: 'Xem phân tích mua hàng',
    },
  ];

  return insights;
}

// Generate anomalies
function generateAnomalies(): Anomaly[] {
  const anomalies: Anomaly[] = [
    {
      id: 'ANO-001',
      type: 'PRODUCTION',
      severity: 'HIGH',
      entityId: 'LINE-002',
      entityName: 'Production Line 2',
      metric: 'Sản lượng',
      expectedValue: 185,
      actualValue: 120,
      deviation: -35.1,
      detectedAt: new Date(Date.now() - 1800000).toISOString(),
      status: 'NEW',
      possibleCauses: ['Thiếu nguyên liệu', 'Lỗi thiết bị', 'Thiếu nhân lực'],
      suggestedActions: ['Kiểm tra nguồn nguyên liệu', 'Kiểm tra trạng thái máy', 'Điều phối thêm nhân lực'],
    },
    {
      id: 'ANO-002',
      type: 'QUALITY',
      severity: 'MEDIUM',
      entityId: 'WC-MILL-01',
      entityName: 'Milling Station',
      metric: 'Tỷ lệ lỗi',
      expectedValue: 2.1,
      actualValue: 4.2,
      deviation: 100,
      detectedAt: new Date(Date.now() - 3600000).toISOString(),
      status: 'INVESTIGATING',
      possibleCauses: ['Mòn dao cắt', 'Lỗi setup', 'Nguyên liệu kém chất lượng'],
      suggestedActions: ['Thay dao mới', 'Kiểm tra lại setup', 'Kiểm tra chất lượng nguyên liệu'],
    },
    {
      id: 'ANO-003',
      type: 'EQUIPMENT',
      severity: 'CRITICAL',
      entityId: 'CNC-001',
      entityName: 'CNC Mill Haas VF-2',
      metric: 'Nhiệt độ spindle',
      expectedValue: 63,
      actualValue: 78,
      deviation: 23.8,
      detectedAt: new Date(Date.now() - 900000).toISOString(),
      status: 'NEW',
      possibleCauses: ['Hệ thống làm mát lỗi', 'Quá tải', 'Bôi trơn không đủ'],
      suggestedActions: ['Kiểm tra coolant', 'Giảm tốc độ cắt', 'Bôi trơn spindle'],
    },
    {
      id: 'ANO-004',
      type: 'INVENTORY',
      severity: 'LOW',
      entityId: 'COMP-MOTOR-01',
      entityName: 'Motor servo',
      metric: 'Xuất kho',
      expectedValue: 20,
      actualValue: 28,
      deviation: 40,
      detectedAt: new Date(Date.now() - 7200000).toISOString(),
      status: 'RESOLVED',
      possibleCauses: ['Đơn hàng gấp', 'Dự báo sai', 'Lỗi nhập liệu'],
      suggestedActions: ['Cập nhật dự báo', 'Kiểm tra đơn hàng', 'Đối chiếu sổ sách'],
    },
  ];

  return anomalies;
}

// =============================================================================
// GET /api/v2/ai
// =============================================================================
export const GET = withAuth(async (request: NextRequest, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const searchParams = request.nextUrl.searchParams;
    const view = searchParams.get('view') || 'dashboard';
    const itemId = searchParams.get('itemId');
    const equipmentId = searchParams.get('equipmentId');

    switch (view) {
      case 'dashboard': {
        const insights = generateAIInsights();
        const anomalies = generateAnomalies();
        const equipmentInputs = await fetchEquipmentList();
        const equipmentList = equipmentInputs.map(eq => generateEquipmentHealth(eq));

        return NextResponse.json({
          success: true,
          data: {
            summary: {
              totalInsights: insights.length,
              criticalInsights: insights.filter(i => i.priority === 'CRITICAL').length,
              activeAnomalies: anomalies.filter(a => a.status !== 'RESOLVED').length,
              equipmentAtRisk: equipmentList.filter(e => e.status === 'AT_RISK' || e.status === 'CRITICAL').length,
              avgHealthScore: equipmentList.length > 0
                ? Math.round(equipmentList.reduce((sum, e) => sum + e.healthScore, 0) / equipmentList.length)
                : 0,
            },
            recentInsights: insights.slice(0, 5),
            recentAnomalies: anomalies.filter(a => a.status !== 'RESOLVED').slice(0, 5),
            equipmentOverview: equipmentList.map(e => ({
              id: e.equipmentId,
              code: e.equipmentCode,
              name: e.equipmentName,
              healthScore: e.healthScore,
              status: e.status,
            })),
          },
        });
      }

      case 'forecasting': {
        if (itemId) {
          const item = await fetchForecastItemById(itemId);
          if (!item) {
            return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
          }
          return NextResponse.json({
            success: true,
            data: generateDemandForecast(item),
          });
        }

        // Return list of all items with forecast summary
        const forecastItems = await fetchForecastItems();
        const forecasts = forecastItems.map(item => {
          const forecast = generateDemandForecast(item);
          return {
            itemId: item.id,
            itemCode: item.code,
            itemName: item.name,
            currentStock: item.stock,
            avgDailyDemand: item.avgDemand,
            trendDirection: forecast.trendDirection,
            accuracy: forecast.metrics.accuracy,
            hasRecommendations: forecast.recommendations.length > 0,
            criticalRecommendations: forecast.recommendations.filter(r => r.priority === 'HIGH').length,
          };
        });

        return NextResponse.json({
          success: true,
          data: { items: forecasts },
        });
      }

      case 'forecasting-list': {
        const allItems = await fetchForecastItems();
        const forecastsList = allItems.map(item => generateDemandForecast(item));
        return NextResponse.json({
          success: true,
          data: { forecasts: forecastsList },
        });
      }

      case 'maintenance': {
        if (equipmentId) {
          const eq = await fetchEquipmentById(equipmentId);
          if (!eq) {
            return NextResponse.json({ success: false, error: 'Equipment not found' }, { status: 404 });
          }
          return NextResponse.json({
            success: true,
            data: generateEquipmentHealth(eq),
          });
        }

        // Return list of all equipment with health summary
        const maintenanceEquipment = await fetchEquipmentList();
        const healthList = maintenanceEquipment.map(eq => {
          const health = generateEquipmentHealth(eq);
          return {
            equipmentId: eq.id,
            equipmentCode: eq.code,
            equipmentName: eq.name,
            healthScore: health.healthScore,
            status: health.status,
            failureProbability: health.failureProbability,
            daysUntilMaintenance: health.daysUntilMaintenance,
            hasRecommendations: health.recommendations.length > 0,
            criticalRecommendations: health.recommendations.filter(r => r.priority === 'CRITICAL').length,
          };
        });

        return NextResponse.json({
          success: true,
          data: { equipment: healthList },
        });
      }

      case 'maintenance-list': {
        const allEquipment = await fetchEquipmentList();
        const fullHealthList = allEquipment.map(eq => generateEquipmentHealth(eq));
        return NextResponse.json({
          success: true,
          data: { equipment: fullHealthList },
        });
      }

      case 'anomalies': {
        const status = searchParams.get('status');
        let anomalies = generateAnomalies();

        if (status) {
          anomalies = anomalies.filter(a => a.status === status);
        }

        return NextResponse.json({
          success: true,
          data: { anomalies },
        });
      }

      case 'insights': {
        const category = searchParams.get('category');
        const priority = searchParams.get('priority');
        let insights = generateAIInsights();

        if (category) {
          insights = insights.filter(i => i.category === category);
        }
        if (priority) {
          insights = insights.filter(i => i.priority === priority);
        }

        // Group by category
        const grouped = insights.reduce((acc, insight) => {
          if (!acc[insight.category]) {
            acc[insight.category] = [];
          }
          acc[insight.category].push(insight);
          return acc;
        }, {} as Record<string, AIInsight[]>);

        return NextResponse.json({
          success: true,
          data: {
            insights,
            grouped,
            summary: {
              total: insights.length,
              byCategory: Object.entries(grouped).map(([cat, items]) => ({
                category: cat,
                count: items.length,
              })),
              byPriority: {
                critical: insights.filter(i => i.priority === 'CRITICAL').length,
                high: insights.filter(i => i.priority === 'HIGH').length,
                medium: insights.filter(i => i.priority === 'MEDIUM').length,
                low: insights.filter(i => i.priority === 'LOW').length,
              },
            },
          },
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown view: ${view}` },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/v2/ai' });
    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'AI_PROCESSING_ERROR' },
      { status: 500 }
    );
  }
});

// =============================================================================
// POST /api/v2/ai
// =============================================================================
export const POST = withAuth(async (request: NextRequest, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const bodySchema = z.object({
      action: z.enum(['generate_forecast', 'acknowledge_insight', 'dismiss_anomaly', 'schedule_maintenance']),
      data: z.record(z.string(), z.unknown()),
    });
    const rawBody = await request.json();
    const parseResult = bodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const body = parseResult.data;
    const { action, data } = body;

    switch (action) {
      case 'generate_forecast': {
        const { itemId: forecastItemId } = data;
        const item = await fetchForecastItemById(forecastItemId as string);
        if (!item) {
          return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
        }

        const forecast = generateDemandForecast(item);
        return NextResponse.json({
          success: true,
          message: `Đã tạo dự báo cho ${item.name}`,
          data: forecast,
        });
      }

      case 'acknowledge_insight': {
        const { insightId } = data;
        return NextResponse.json({
          success: true,
          message: `Insight ${insightId} đã được xác nhận`,
        });
      }

      case 'dismiss_anomaly': {
        const { anomalyId, reason } = data;
        return NextResponse.json({
          success: true,
          message: `Anomaly ${anomalyId} đã được loại bỏ`,
          data: { anomalyId, status: 'DISMISSED', reason },
        });
      }

      case 'schedule_maintenance': {
        const { equipmentId, maintenanceType, scheduledDate } = data;
        return NextResponse.json({
          success: true,
          message: `Đã lên lịch bảo trì ${maintenanceType} cho thiết bị ${equipmentId}`,
          data: { equipmentId, maintenanceType, scheduledDate, status: 'SCHEDULED' },
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/v2/ai' });
    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'AI_PROCESSING_ERROR' },
      { status: 500 }
    );
  }
});
