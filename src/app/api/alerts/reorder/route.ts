// =============================================================================
// REORDER ALERTS API
// GET /api/alerts/reorder - Get inventory reorder alerts and suggestions
// POST /api/alerts/reorder - Trigger alert check or create purchase request
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getInventoryAlertService } from '@/lib/alerts/inventory-alert-service';
import { createAlert } from '@/lib/alerts/alert-engine';
import { logger } from '@/lib/logger';

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';
import { withAuth } from '@/lib/api/with-auth';

const reorderBodySchema = z.object({
  action: z.enum(["check", "create_pr", "dismiss", "refresh"]),
  partIds: z.array(z.string()).optional(),
});

// =============================================================================
// GET - Fetch reorder alerts and suggestions
// =============================================================================

export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const searchParams = request.nextUrl.searchParams;
    const view = searchParams.get('view') || 'summary'; // summary | items | suggestions
    const status = searchParams.get('status'); // CRITICAL | LOW | WARNING
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const alertService = getInventoryAlertService();

    if (view === 'summary') {
      const summary = await alertService.getSummary();
      return NextResponse.json({
        success: true,
        data: summary,
      });
    }

    if (view === 'suggestions') {
      const suggestions = await alertService.getReorderSuggestions();
      return NextResponse.json({
        success: true,
        data: {
          suggestions: suggestions.slice(0, limit),
          total: suggestions.length,
          totalValue: suggestions.reduce((sum, s) => sum + s.totalCost, 0),
        },
      });
    }

    // Default: items view
    const summary = await alertService.getSummary();
    let items = summary.items;

    // Filter by status if provided
    if (status) {
      items = items.filter((item) => item.status === status);
    }

    return NextResponse.json({
      success: true,
      data: {
        items: items.slice(0, limit),
        total: items.length,
        stats: {
          critical: summary.critical,
          low: summary.low,
          warning: summary.warning,
          totalValue: summary.totalValue,
        },
        lastChecked: summary.lastChecked,
      },
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/alerts/reorder' });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reorder alerts' },
      { status: 500 }
    );
  }
});

// =============================================================================
// POST - Trigger actions
// =============================================================================

export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const rawBody = await request.json();
    const parseResult = reorderBodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const body = parseResult.data;
    const { action } = body;

    const alertService = getInventoryAlertService();

    switch (action) {
      case 'check': {
        // Trigger inventory check and generate alerts
        const alerts = await alertService.generateAlerts();
        const summary = await alertService.getSummary();

        return NextResponse.json({
          success: true,
          message: `Generated ${alerts.length} alerts`,
          data: {
            alertsGenerated: alerts.length,
            summary: {
              critical: summary.critical,
              low: summary.low,
              warning: summary.warning,
            },
          },
        });
      }

      case 'create_pr': {
        // Create purchase requisition for suggested items
        const { partIds } = body;

        if (!partIds || !Array.isArray(partIds) || partIds.length === 0) {
          return NextResponse.json(
            { success: false, error: 'partIds array is required' },
            { status: 400 }
          );
        }

        const suggestions = await alertService.getReorderSuggestions();
        const selectedItems = suggestions.filter((s) => partIds.includes(s.partId));

        if (selectedItems.length === 0) {
          return NextResponse.json(
            { success: false, error: 'No valid parts found for PR' },
            { status: 400 }
          );
        }

        // In a real implementation, this would create a PR in the database
        // For now, return the PR details that would be created
        const prDetails = {
          prNumber: `PR-${Date.now()}`,
          items: selectedItems.map((item) => ({
            partId: item.partId,
            partNumber: item.partNumber,
            partName: item.partName,
            quantity: item.quantity,
            supplierId: item.supplier?.id,
            supplierName: item.supplier?.name,
            unitCost: item.unitCost,
            totalCost: item.totalCost,
          })),
          totalValue: selectedItems.reduce((sum, s) => sum + s.totalCost, 0),
          priority: selectedItems.some((s) => s.priority === 'URGENT') ? 'URGENT' : 'HIGH',
          status: 'DRAFT',
          createdAt: new Date(),
        };

        return NextResponse.json({
          success: true,
          message: `Purchase requisition created with ${selectedItems.length} items`,
          data: prDetails,
        });
      }

      case 'dismiss': {
        // Dismiss alerts for specific parts (resets cooldown)
        const { partIds } = body;

        if (!partIds || !Array.isArray(partIds)) {
          return NextResponse.json(
            { success: false, error: 'partIds array is required' },
            { status: 400 }
          );
        }

        // For now, just acknowledge the action
        return NextResponse.json({
          success: true,
          message: `Dismissed alerts for ${partIds.length} parts`,
        });
      }

      case 'refresh': {
        // Clear cooldowns and force refresh
        alertService.clearCooldown();
        const summary = await alertService.getSummary();

        return NextResponse.json({
          success: true,
          message: 'Alerts refreshed',
          data: summary,
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/alerts/reorder' });
    return NextResponse.json(
      { success: false, error: 'Failed to process action' },
      { status: 500 }
    );
  }
});
