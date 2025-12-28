// lib/ai/scenario-engine.ts

export interface ScenarioParams {
  demandChange: number; // -50 to +50 percent
  leadTimeIncrease: number; // 0 to 30 days
  supplierUnavailable?: string; // supplier ID
  newOrderQty?: number;
  newOrderDate?: Date;
}

export interface ScenarioResult {
  scenario: ScenarioParams;
  impacts: {
    stockOuts: number;
    ordersAtRisk: number;
    safetyCoverageDays: number;
    capitalNeeded: number;
    currentStockOuts: number;
    currentOrdersAtRisk: number;
    currentSafetyCoverage: number;
    currentCapital: number;
  };
  criticalImpacts: string[];
  mitigationSuggestions: string[];
}

export function runScenarioSimulation(
  params: ScenarioParams
): ScenarioResult {
  // Calculate base values (would use real data in production)
  const baseStockOuts = 0;
  const baseOrdersAtRisk = 1;
  const baseSafetyCoverage = 45;
  const baseCapital = 125000;

  // Calculate impacts based on scenario parameters
  let stockOutsIncrease = 0;
  let ordersAtRiskIncrease = 0;
  let safetyCoverageDecrease = 0;
  let capitalIncrease = 0;

  // Demand change impact
  if (params.demandChange > 0) {
    stockOutsIncrease += Math.floor(params.demandChange / 10);
    ordersAtRiskIncrease += Math.floor(params.demandChange / 15);
    safetyCoverageDecrease += Math.floor(params.demandChange / 2);
    capitalIncrease += Math.floor(params.demandChange * 1200);
  }

  // Lead time increase impact
  if (params.leadTimeIncrease > 0) {
    stockOutsIncrease += Math.floor(params.leadTimeIncrease / 5);
    ordersAtRiskIncrease += Math.floor(params.leadTimeIncrease / 7);
    safetyCoverageDecrease += Math.floor(params.leadTimeIncrease / 2);
    capitalIncrease += params.leadTimeIncrease * 800;
  }

  // Supplier unavailable impact
  if (params.supplierUnavailable) {
    stockOutsIncrease += 2;
    ordersAtRiskIncrease += 1;
    safetyCoverageDecrease += 15;
    capitalIncrease += 25000;
  }

  // New order impact
  if (params.newOrderQty && params.newOrderQty > 0) {
    const daysUntilDue = params.newOrderDate
      ? Math.ceil(
          (params.newOrderDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
      : 30;

    if (daysUntilDue < 21) {
      ordersAtRiskIncrease += 1;
    }
    capitalIncrease += params.newOrderQty * 2000;
  }

  const impacts = {
    stockOuts: baseStockOuts + stockOutsIncrease,
    ordersAtRisk: baseOrdersAtRisk + ordersAtRiskIncrease,
    safetyCoverageDays: Math.max(0, baseSafetyCoverage - safetyCoverageDecrease),
    capitalNeeded: baseCapital + capitalIncrease,
    currentStockOuts: baseStockOuts,
    currentOrdersAtRisk: baseOrdersAtRisk,
    currentSafetyCoverage: baseSafetyCoverage,
    currentCapital: baseCapital,
  };

  // Generate critical impacts
  const criticalImpacts: string[] = [];
  if (params.supplierUnavailable) {
    criticalImpacts.push(
      "Critical parts from supplier will have no supply source"
    );
  }
  if (stockOutsIncrease > 2) {
    criticalImpacts.push(
      `${stockOutsIncrease} parts at risk of stock-out within 30 days`
    );
  }
  if (ordersAtRiskIncrease > 0) {
    criticalImpacts.push(
      `${ordersAtRiskIncrease} additional orders may be delayed`
    );
  }
  if (safetyCoverageDecrease > 20) {
    criticalImpacts.push("Safety stock coverage drops below target threshold");
  }

  // Generate mitigation suggestions
  const mitigationSuggestions: string[] = [];
  if (params.supplierUnavailable) {
    mitigationSuggestions.push("Qualify backup supplier immediately");
    mitigationSuggestions.push("Build strategic buffer stock for critical parts");
  }
  if (params.demandChange > 20) {
    mitigationSuggestions.push("Increase safety stock levels by 30%");
    mitigationSuggestions.push("Negotiate volume commitments with key suppliers");
  }
  if (params.leadTimeIncrease > 10) {
    mitigationSuggestions.push("Expedite existing open orders");
    mitigationSuggestions.push("Consider air freight for critical shipments");
  }
  if (capitalIncrease > 30000) {
    mitigationSuggestions.push("Review payment terms with suppliers");
    mitigationSuggestions.push("Consider JIT arrangements for non-critical items");
  }

  return {
    scenario: params,
    impacts,
    criticalImpacts,
    mitigationSuggestions,
  };
}

// Predefined scenarios for quick simulation
export const predefinedScenarios = {
  demandSurge: {
    name: "Demand Surge (+30%)",
    params: {
      demandChange: 30,
      leadTimeIncrease: 0,
    },
  },
  supplyDisruption: {
    name: "Supply Chain Disruption",
    params: {
      demandChange: 0,
      leadTimeIncrease: 14,
    },
  },
  peakSeason: {
    name: "Peak Season",
    params: {
      demandChange: 25,
      leadTimeIncrease: 7,
    },
  },
  economicDownturn: {
    name: "Economic Downturn (-20% demand)",
    params: {
      demandChange: -20,
      leadTimeIncrease: 0,
    },
  },
};
