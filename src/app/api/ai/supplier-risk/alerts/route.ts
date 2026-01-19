// =============================================================================
// AI SUPPLIER RISK - ALERTS API ROUTE
// GET /api/ai/supplier-risk/alerts - Get alerts and watchlist
// POST /api/ai/supplier-risk/alerts - Manage alerts
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getEarlyWarningSystem } from '@/lib/ai/supplier-risk';

// =============================================================================
// GET - Alerts Summary and Watchlist
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const view = searchParams.get('view') || 'summary';
    const supplierId = searchParams.get('supplierId');
    const severity = searchParams.get('severity');
    const category = searchParams.get('category');

    const warningSystem = getEarlyWarningSystem();

    switch (view) {
      case 'summary': {
        const summary = await warningSystem.getAlertSummary();

        return NextResponse.json({
          success: true,
          data: {
            totalActiveAlerts: summary.totalActiveAlerts,
            alertsBySeverity: summary.alertsBySeverity,
            alertsByCategory: summary.alertsByCategory,
            criticalSuppliers: summary.criticalSuppliers,
            trendAnalysis: summary.trendAnalysis,
            recentAlerts: summary.recentAlerts.slice(0, 10).map((a) => ({
              id: a.id,
              supplierId: a.supplierId,
              supplierName: a.supplierName,
              category: a.category,
              severity: a.severity,
              status: a.status,
              title: a.title,
              description: a.description,
              detectedAt: a.detectedAt.toISOString(),
              affectedPartsCount: a.affectedParts.length,
            })),
          },
          generatedAt: new Date().toISOString(),
        });
      }

      case 'watchlist': {
        const watchlist = await warningSystem.getWatchlist();

        return NextResponse.json({
          success: true,
          data: {
            watchlist: watchlist.map((w) => ({
              supplierId: w.supplierId,
              supplierName: w.supplierName,
              supplierCode: w.supplierCode,
              country: w.country,
              watchReason: w.watchReason,
              addedAt: w.addedAt.toISOString(),
              riskScore: w.riskScore,
              activeAlerts: w.activeAlerts,
              monitoringLevel: w.monitoringLevel,
              reviewDate: w.reviewDate.toISOString(),
              latestAlertTitle: w.latestAlert?.title || null,
              latestAlertSeverity: w.latestAlert?.severity || null,
            })),
            count: watchlist.length,
            byCriticalLevel: {
              critical: watchlist.filter((w) => w.monitoringLevel === 'critical').length,
              enhanced: watchlist.filter((w) => w.monitoringLevel === 'enhanced').length,
              standard: watchlist.filter((w) => w.monitoringLevel === 'standard').length,
            },
          },
          generatedAt: new Date().toISOString(),
        });
      }

      case 'supplier': {
        if (!supplierId) {
          return NextResponse.json(
            { success: false, error: 'supplierId is required for supplier view' },
            { status: 400 }
          );
        }

        const alerts = await warningSystem.monitorSupplier(supplierId);
        const warningSignals = await warningSystem.getEarlyWarningSignals(supplierId);

        return NextResponse.json({
          success: true,
          data: {
            supplierId,
            alerts: alerts.map((a) => ({
              id: a.id,
              category: a.category,
              severity: a.severity,
              status: a.status,
              title: a.title,
              description: a.description,
              detectedAt: a.detectedAt.toISOString(),
              metrics: a.metrics,
              affectedParts: a.affectedParts,
              recommendedActions: a.recommendedActions,
              escalationPath: a.escalationPath,
            })),
            warningSignals: warningSignals.map((s) => ({
              type: s.type,
              description: s.description,
              severity: s.severity,
              confidence: s.confidence,
              indicators: s.indicators,
              timeframe: s.timeframe,
            })),
            alertCount: alerts.length,
            signalCount: warningSignals.length,
          },
          generatedAt: new Date().toISOString(),
        });
      }

      case 'all': {
        const summary = await warningSystem.getAlertSummary();

        // Filter alerts if specified
        let filteredAlerts = summary.recentAlerts;
        if (severity) {
          filteredAlerts = filteredAlerts.filter((a) => a.severity === severity);
        }
        if (category) {
          filteredAlerts = filteredAlerts.filter((a) => a.category === category);
        }

        return NextResponse.json({
          success: true,
          data: {
            alerts: filteredAlerts.map((a) => ({
              id: a.id,
              supplierId: a.supplierId,
              supplierName: a.supplierName,
              supplierCode: a.supplierCode,
              category: a.category,
              severity: a.severity,
              status: a.status,
              title: a.title,
              description: a.description,
              detectedAt: a.detectedAt.toISOString(),
              metrics: a.metrics,
              affectedParts: a.affectedParts,
              recommendedActions: a.recommendedActions,
              escalationPath: a.escalationPath,
            })),
            count: filteredAlerts.length,
            filters: { severity, category },
          },
          generatedAt: new Date().toISOString(),
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid view. Use: summary, watchlist, supplier, all' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[Supplier Risk API] Alerts Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST - Manage Alerts
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { action, alertId, userId, resolution } = body;

    const warningSystem = getEarlyWarningSystem();

    switch (action) {
      case 'acknowledge': {
        if (!alertId || !userId) {
          return NextResponse.json(
            { success: false, error: 'alertId and userId are required' },
            { status: 400 }
          );
        }

        const alert = await warningSystem.acknowledgeAlert(alertId, userId);

        return NextResponse.json({
          success: true,
          message: 'Alert acknowledged',
          data: alert,
          generatedAt: new Date().toISOString(),
        });
      }

      case 'resolve': {
        if (!alertId || !userId) {
          return NextResponse.json(
            { success: false, error: 'alertId and userId are required' },
            { status: 400 }
          );
        }

        const alert = await warningSystem.resolveAlert(alertId, userId, resolution || '');

        return NextResponse.json({
          success: true,
          message: 'Alert resolved',
          data: alert,
          generatedAt: new Date().toISOString(),
        });
      }

      case 'scan': {
        const summary = await warningSystem.runMonitoringScan();

        return NextResponse.json({
          success: true,
          message: 'Monitoring scan completed',
          data: {
            totalActiveAlerts: summary.totalActiveAlerts,
            alertsBySeverity: summary.alertsBySeverity,
            newAlerts: summary.recentAlerts.slice(0, 10).map((a) => ({
              id: a.id,
              supplierName: a.supplierName,
              title: a.title,
              severity: a.severity,
            })),
          },
          generatedAt: new Date().toISOString(),
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action. Use: acknowledge, resolve, scan' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[Supplier Risk API] Alert Action Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
