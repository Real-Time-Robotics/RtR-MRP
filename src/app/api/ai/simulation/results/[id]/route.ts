// =============================================================================
// SIMULATION RESULTS API - Get specific result
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getScenarioBuilder,
  getImpactAnalyzer,
  getAIScenarioAnalyzer,
} from '@/lib/ai/simulation';

// In-memory cache (shared with main route - in production use Redis)
const simulationCache = new Map<string, any>();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check cache first
    const cached = simulationCache.get(id);
    if (cached) {
      return NextResponse.json(cached);
    }

    return NextResponse.json(
      { error: 'Result not found or expired' },
      { status: 404 }
    );
  } catch (error) {
    console.error('[Results API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch result' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    // Get cached result
    const cached = simulationCache.get(id);
    if (!cached) {
      return NextResponse.json(
        { error: 'Result not found' },
        { status: 404 }
      );
    }

    switch (action) {
      case 'generateExecutiveSummary': {
        const aiAnalyzer = getAIScenarioAnalyzer();
        const summary = await aiAnalyzer.generateExecutiveSummary(
          cached.scenario,
          cached.simulationResult,
          cached.aiInsight
        );

        return NextResponse.json({
          success: true,
          executiveSummary: summary,
        });
      }

      case 'generateWhatIfQuestions': {
        const aiAnalyzer = getAIScenarioAnalyzer();
        const questions = aiAnalyzer.generateWhatIfQuestions(
          cached.scenario,
          cached.simulationResult
        );

        return NextResponse.json({
          success: true,
          questions,
        });
      }

      case 'export': {
        const format = body.format || 'json';

        if (format === 'json') {
          return NextResponse.json(cached);
        }

        // CSV export for timeline data
        if (format === 'csv') {
          const timeline = cached.simulationResult?.timeline || [];
          const csv = [
            'Week,Date,Demand,Supply,Inventory,CapacityUsed,CapacityAvailable,Stockouts',
            ...timeline.map((t: any) =>
              [t.week, t.date, t.demand, t.supply, t.inventory, t.capacityUsed, t.capacityAvailable, t.stockouts].join(',')
            ),
          ].join('\n');

          return new NextResponse(csv, {
            headers: {
              'Content-Type': 'text/csv',
              'Content-Disposition': `attachment; filename="simulation-${id}.csv"`,
            },
          });
        }

        return NextResponse.json(
          { error: 'Unsupported format' },
          { status: 400 }
        );
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[Results API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const deleted = simulationCache.delete(id);

    return NextResponse.json({
      success: deleted,
      message: deleted ? 'Result deleted' : 'Result not found',
    });
  } catch (error) {
    console.error('[Results API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete result' },
      { status: 500 }
    );
  }
}
