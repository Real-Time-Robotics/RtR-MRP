// Simulation Components
export { ScenarioWizard } from './scenario-wizard';
export { ScenarioCard } from './scenario-card';
export { ImpactComparison } from './impact-comparison';
export { BottleneckAnalysis } from './bottleneck-analysis';

// Chart components are heavy (recharts ~500KB) - consumers should use
// next/dynamic to import these:
//   const SimulationResultsChart = dynamic(
//     () => import('@/components/ai/simulation/simulation-results-chart').then(mod => mod.SimulationResultsChart),
//     { ssr: false }
//   );
// For backward compatibility, we still export them here, but prefer dynamic import in pages.
export { SimulationResultsChart } from './simulation-results-chart';
export { MonteCarloChart } from './monte-carlo-chart';
