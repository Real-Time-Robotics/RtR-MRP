// =============================================================================
// SCENARIOS API - Manage simulation scenarios
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getScenarioBuilder,
  SCENARIO_TEMPLATES,
  ScenarioType,
  DemandScenarioConfig,
  SupplyScenarioConfig,
  CapacityScenarioConfig,
  CustomScenarioConfig,
} from '@/lib/ai/simulation';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, ...params } = body;

    const builder = getScenarioBuilder();

    switch (action) {
      case 'create': {
        const { name, type, config, description, horizonDays, tags } = params;

        if (!name || !type) {
          return NextResponse.json(
            { error: 'Name and type are required' },
            { status: 400 }
          );
        }

        let scenario;
        switch (type as ScenarioType) {
          case 'demand':
            scenario = builder.buildDemandScenario(
              name,
              config as DemandScenarioConfig['parameters'],
              { description, createdBy: session.user?.id }
            );
            break;
          case 'supply':
            scenario = builder.buildSupplyScenario(
              name,
              config as SupplyScenarioConfig['parameters'],
              { description, createdBy: session.user?.id }
            );
            break;
          case 'capacity':
            scenario = builder.buildCapacityScenario(
              name,
              config as CapacityScenarioConfig['parameters'],
              { description, createdBy: session.user?.id }
            );
            break;
          case 'custom':
            scenario = builder.buildCustomScenario(
              name,
              config as CustomScenarioConfig['parameters'],
              { description, createdBy: session.user?.id }
            );
            break;
          default:
            return NextResponse.json(
              { error: 'Invalid scenario type' },
              { status: 400 }
            );
        }

        if (horizonDays) {
          builder.updateScenario(scenario.id, { simulationHorizonDays: horizonDays });
        }
        if (tags) {
          builder.updateScenario(scenario.id, { tags });
        }

        // Validate
        const validation = builder.validateScenario(scenario);

        return NextResponse.json({
          success: true,
          scenario,
          validation,
        });
      }

      case 'createFromTemplate': {
        const { templateId, name, parameterOverrides } = params;

        if (!templateId) {
          return NextResponse.json(
            { error: 'Template ID is required' },
            { status: 400 }
          );
        }

        const scenario = builder.createFromTemplate(templateId, {
          name,
          createdBy: session.user?.id,
          parameterOverrides,
        });

        if (!scenario) {
          return NextResponse.json(
            { error: 'Template not found' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          scenario,
        });
      }

      case 'clone': {
        const { scenarioId, newName } = params;

        if (!scenarioId) {
          return NextResponse.json(
            { error: 'Scenario ID is required' },
            { status: 400 }
          );
        }

        const cloned = builder.cloneScenario(scenarioId, newName);

        if (!cloned) {
          return NextResponse.json(
            { error: 'Scenario not found' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          scenario: cloned,
        });
      }

      case 'update': {
        const { scenarioId, updates } = params;

        if (!scenarioId) {
          return NextResponse.json(
            { error: 'Scenario ID is required' },
            { status: 400 }
          );
        }

        const updated = builder.updateScenario(scenarioId, updates);

        if (!updated) {
          return NextResponse.json(
            { error: 'Scenario not found' },
            { status: 404 }
          );
        }

        const validation = builder.validateScenario(updated);

        return NextResponse.json({
          success: true,
          scenario: updated,
          validation,
        });
      }

      case 'delete': {
        const { scenarioId } = params;

        if (!scenarioId) {
          return NextResponse.json(
            { error: 'Scenario ID is required' },
            { status: 400 }
          );
        }

        const deleted = builder.deleteScenario(scenarioId);

        return NextResponse.json({
          success: deleted,
          message: deleted ? 'Scenario deleted' : 'Scenario not found',
        });
      }

      case 'validate': {
        const { scenarioId } = params;

        if (!scenarioId) {
          return NextResponse.json(
            { error: 'Scenario ID is required' },
            { status: 400 }
          );
        }

        const scenario = builder.getScenario(scenarioId);
        if (!scenario) {
          return NextResponse.json(
            { error: 'Scenario not found' },
            { status: 404 }
          );
        }

        const validation = builder.validateScenario(scenario);

        return NextResponse.json({
          success: true,
          validation,
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[Scenarios API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process request', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type');
    const category = searchParams.get('category');

    const builder = getScenarioBuilder();

    // Get single scenario
    if (id) {
      const scenario = builder.getScenario(id);
      if (!scenario) {
        return NextResponse.json(
          { error: 'Scenario not found' },
          { status: 404 }
        );
      }

      const validation = builder.validateScenario(scenario);

      return NextResponse.json({
        scenario,
        validation,
      });
    }

    // Get all scenarios with optional filtering
    let scenarios = builder.getAllScenarios();
    if (type) {
      scenarios = scenarios.filter((s) => s.type === type);
    }

    // Get templates
    let templates = builder.getTemplates(category || undefined);

    // Get template categories
    const categories = builder.getTemplateCategories();

    return NextResponse.json({
      scenarios,
      templates,
      categories,
      stats: {
        totalScenarios: scenarios.length,
        byType: {
          demand: scenarios.filter((s) => s.type === 'demand').length,
          supply: scenarios.filter((s) => s.type === 'supply').length,
          capacity: scenarios.filter((s) => s.type === 'capacity').length,
          custom: scenarios.filter((s) => s.type === 'custom').length,
        },
        totalTemplates: templates.length,
      },
    });
  } catch (error) {
    console.error('[Scenarios API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scenarios' },
      { status: 500 }
    );
  }
}
