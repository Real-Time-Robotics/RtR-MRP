// =============================================================================
// SCHEDULE OPTIMIZER - Optimization Algorithms for Production Scheduling
// =============================================================================
// Multiple optimization algorithms for finding optimal production schedules
// Part of Phase 3: Autonomous Operations - Auto-Scheduling Feature
// =============================================================================

import {
  WorkOrderScheduleInfo,
  WorkCenterCapacityInfo,
  ScheduleSuggestion,
  SchedulingAlgorithm,
  DailyCapacity,
} from './scheduling-engine';

// =============================================================================
// TYPES
// =============================================================================

export interface OptimizationResult {
  algorithm: SchedulingAlgorithm;
  schedule: ScheduledWorkOrder[];
  metrics: OptimizationMetrics;
  executionTimeMs: number;
  iterations?: number;
  converged?: boolean;
}

export interface ScheduledWorkOrder {
  workOrderId: string;
  woNumber: string;
  workCenterId: string;
  workCenterName: string;
  startDate: Date;
  endDate: Date;
  operations: ScheduledOperation[];
  priority: number;
  originalIndex: number;
}

export interface ScheduledOperation {
  operationId: string;
  operationNumber: number;
  name: string;
  workCenterId: string;
  startDate: Date;
  endDate: Date;
  setupTime: number;
  runTime: number;
}

export interface OptimizationMetrics {
  makespan: number; // Total days to complete all
  totalSetupTime: number; // Hours
  avgFlowTime: number; // Average time from release to completion
  maxLateness: number; // Days (positive = late)
  totalLateness: number;
  onTimeCount: number;
  lateCount: number;
  utilizationScore: number; // 0-100
  balanceScore: number; // 0-100, higher = more balanced
  fitnessScore: number; // Combined score for comparison
}

export interface GeneticConfig {
  populationSize: number;
  generations: number;
  mutationRate: number;
  crossoverRate: number;
  elitismCount: number;
  tournamentSize: number;
  convergenceThreshold: number;
}

export interface OptimizationWeights {
  makespan: number;
  lateness: number;
  setupTime: number;
  utilization: number;
  balance: number;
}

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

export const DEFAULT_GENETIC_CONFIG: GeneticConfig = {
  populationSize: 50,
  generations: 100,
  mutationRate: 0.1,
  crossoverRate: 0.8,
  elitismCount: 2,
  tournamentSize: 5,
  convergenceThreshold: 0.001,
};

export const DEFAULT_WEIGHTS: OptimizationWeights = {
  makespan: 0.3,
  lateness: 0.3,
  setupTime: 0.15,
  utilization: 0.15,
  balance: 0.1,
};

// =============================================================================
// SCHEDULE OPTIMIZER CLASS
// =============================================================================

export class ScheduleOptimizer {
  private static instance: ScheduleOptimizer;
  private weights: OptimizationWeights;

  private constructor() {
    this.weights = DEFAULT_WEIGHTS;
  }

  public static getInstance(): ScheduleOptimizer {
    if (!ScheduleOptimizer.instance) {
      ScheduleOptimizer.instance = new ScheduleOptimizer();
    }
    return ScheduleOptimizer.instance;
  }

  setWeights(weights: Partial<OptimizationWeights>): void {
    this.weights = { ...this.weights, ...weights };
  }

  // ===========================================================================
  // MAIN OPTIMIZATION METHODS
  // ===========================================================================

  async optimize(
    workOrders: WorkOrderScheduleInfo[],
    capacities: WorkCenterCapacityInfo[],
    algorithm: SchedulingAlgorithm
  ): Promise<OptimizationResult> {
    const startTime = Date.now();

    let result: OptimizationResult;

    switch (algorithm) {
      case 'priority_first':
        result = this.optimizeByPriority(workOrders, capacities);
        break;
      case 'due_date_first':
        result = this.optimizeByDueDate(workOrders, capacities);
        break;
      case 'shortest_first':
        result = this.optimizeByShortestFirst(workOrders, capacities);
        break;
      case 'setup_minimize':
        result = this.optimizeBySetupTime(workOrders, capacities);
        break;
      case 'balanced_load':
        result = this.balanceWorkload(workOrders, capacities);
        break;
      case 'genetic':
        result = await this.runGeneticAlgorithm(workOrders, capacities);
        break;
      default:
        result = this.optimizeByPriority(workOrders, capacities);
    }

    result.executionTimeMs = Date.now() - startTime;
    return result;
  }

  // ===========================================================================
  // PRIORITY-BASED SCHEDULING
  // ===========================================================================

  optimizeByPriority(
    workOrders: WorkOrderScheduleInfo[],
    capacities: WorkCenterCapacityInfo[]
  ): OptimizationResult {
    const priorityOrder: Record<string, number> = {
      critical: 0,
      high: 1,
      normal: 2,
      low: 3,
    };

    // Sort by priority, then by due date
    const sorted = [...workOrders].sort((a, b) => {
      const pA = priorityOrder[a.priority] ?? 2;
      const pB = priorityOrder[b.priority] ?? 2;
      if (pA !== pB) return pA - pB;

      // Secondary: due date (earlier first)
      if (a.dueDate && b.dueDate) {
        return a.dueDate.getTime() - b.dueDate.getTime();
      }
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    });

    return this.scheduleSequentially(sorted, capacities, 'priority_first');
  }

  // ===========================================================================
  // DUE DATE (EDD) SCHEDULING
  // ===========================================================================

  optimizeByDueDate(
    workOrders: WorkOrderScheduleInfo[],
    capacities: WorkCenterCapacityInfo[]
  ): OptimizationResult {
    // Earliest Due Date (EDD) rule
    const sorted = [...workOrders].sort((a, b) => {
      if (a.dueDate && b.dueDate) {
        return a.dueDate.getTime() - b.dueDate.getTime();
      }
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    });

    return this.scheduleSequentially(sorted, capacities, 'due_date_first');
  }

  // ===========================================================================
  // SHORTEST PROCESSING TIME (SPT)
  // ===========================================================================

  optimizeByShortestFirst(
    workOrders: WorkOrderScheduleInfo[],
    capacities: WorkCenterCapacityInfo[]
  ): OptimizationResult {
    // Shortest Processing Time (SPT) rule
    const sorted = [...workOrders].sort(
      (a, b) => a.estimatedDuration - b.estimatedDuration
    );

    return this.scheduleSequentially(sorted, capacities, 'shortest_first');
  }

  // ===========================================================================
  // SETUP TIME MINIMIZATION
  // ===========================================================================

  optimizeBySetupTime(
    workOrders: WorkOrderScheduleInfo[],
    capacities: WorkCenterCapacityInfo[]
  ): OptimizationResult {
    // Group by work center, then by product family to minimize changeovers
    const groups = new Map<string, WorkOrderScheduleInfo[]>();

    for (const wo of workOrders) {
      const key = `${wo.workCenterId || 'unassigned'}-${wo.productCode.substring(0, 3)}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(wo);
    }

    // Sort within each group by due date
    const sorted: WorkOrderScheduleInfo[] = [];
    for (const group of groups.values()) {
      group.sort((a, b) => {
        if (a.dueDate && b.dueDate) {
          return a.dueDate.getTime() - b.dueDate.getTime();
        }
        return 0;
      });
      sorted.push(...group);
    }

    return this.scheduleSequentially(sorted, capacities, 'setup_minimize');
  }

  // ===========================================================================
  // BALANCED WORKLOAD
  // ===========================================================================

  balanceWorkload(
    workOrders: WorkOrderScheduleInfo[],
    capacities: WorkCenterCapacityInfo[]
  ): OptimizationResult {
    const schedule: ScheduledWorkOrder[] = [];
    const workCenterLoads = new Map<string, number>();

    // Initialize loads
    for (const cap of capacities) {
      workCenterLoads.set(cap.id, 0);
    }

    // Sort by due date first, then assign to least loaded work center
    const sorted = [...workOrders].sort((a, b) => {
      if (a.dueDate && b.dueDate) {
        return a.dueDate.getTime() - b.dueDate.getTime();
      }
      return 0;
    });

    for (let i = 0; i < sorted.length; i++) {
      const wo = sorted[i];

      // Find least loaded work center that can handle this work order
      let bestWorkCenter: WorkCenterCapacityInfo | null = null;
      let minLoad = Infinity;

      for (const cap of capacities) {
        // Check if work center is compatible
        if (wo.workCenterId && wo.workCenterId !== cap.id) continue;

        const currentLoad = workCenterLoads.get(cap.id) || 0;
        const totalCapacity = cap.dailyCapacity.reduce(
          (sum, dc) => sum + dc.availableHours,
          0
        );

        if (currentLoad + wo.estimatedDuration <= totalCapacity && currentLoad < minLoad) {
          minLoad = currentLoad;
          bestWorkCenter = cap;
        }
      }

      if (bestWorkCenter) {
        const startDate = this.findNextAvailableSlot(bestWorkCenter, workCenterLoads.get(bestWorkCenter.id) || 0);
        const endDate = this.calculateEndDate(startDate, wo.estimatedDuration, bestWorkCenter);

        schedule.push({
          workOrderId: wo.id,
          woNumber: wo.woNumber,
          workCenterId: bestWorkCenter.id,
          workCenterName: bestWorkCenter.name,
          startDate,
          endDate,
          operations: [],
          priority: i + 1,
          originalIndex: i,
        });

        workCenterLoads.set(
          bestWorkCenter.id,
          (workCenterLoads.get(bestWorkCenter.id) || 0) + wo.estimatedDuration
        );
      }
    }

    return {
      algorithm: 'balanced_load',
      schedule,
      metrics: this.calculateMetrics(schedule, sorted, capacities),
      executionTimeMs: 0,
    };
  }

  // ===========================================================================
  // GENETIC ALGORITHM
  // ===========================================================================

  async runGeneticAlgorithm(
    workOrders: WorkOrderScheduleInfo[],
    capacities: WorkCenterCapacityInfo[],
    config: Partial<GeneticConfig> = {}
  ): Promise<OptimizationResult> {
    const cfg = { ...DEFAULT_GENETIC_CONFIG, ...config };

    // Initialize population
    let population = this.initializePopulation(workOrders, cfg.populationSize);
    let bestFitness = -Infinity;
    let bestChromosome: number[] = [];
    let stagnationCount = 0;

    for (let gen = 0; gen < cfg.generations; gen++) {
      // Evaluate fitness
      const fitnessScores = population.map(chromosome =>
        this.evaluateFitness(chromosome, workOrders, capacities)
      );

      // Track best
      const maxFitness = Math.max(...fitnessScores);
      const maxIndex = fitnessScores.indexOf(maxFitness);

      if (maxFitness > bestFitness) {
        bestFitness = maxFitness;
        bestChromosome = [...population[maxIndex]];
        stagnationCount = 0;
      } else {
        stagnationCount++;
      }

      // Check convergence
      if (stagnationCount > cfg.generations * 0.2) {
        break;
      }

      // Create next generation
      const nextGen: number[][] = [];

      // Elitism
      const sorted = population
        .map((c, i) => ({ chromosome: c, fitness: fitnessScores[i] }))
        .sort((a, b) => b.fitness - a.fitness);

      for (let i = 0; i < cfg.elitismCount; i++) {
        nextGen.push([...sorted[i].chromosome]);
      }

      // Selection, crossover, mutation
      while (nextGen.length < cfg.populationSize) {
        const parent1 = this.tournamentSelect(population, fitnessScores, cfg.tournamentSize);
        const parent2 = this.tournamentSelect(population, fitnessScores, cfg.tournamentSize);

        let child1 = [...parent1];
        let child2 = [...parent2];

        if (Math.random() < cfg.crossoverRate) {
          [child1, child2] = this.crossover(parent1, parent2);
        }

        if (Math.random() < cfg.mutationRate) {
          child1 = this.mutate(child1);
        }
        if (Math.random() < cfg.mutationRate) {
          child2 = this.mutate(child2);
        }

        nextGen.push(child1);
        if (nextGen.length < cfg.populationSize) {
          nextGen.push(child2);
        }
      }

      population = nextGen;
    }

    // Decode best chromosome to schedule
    const orderedWorkOrders = bestChromosome.map(i => workOrders[i]);
    const result = this.scheduleSequentially(orderedWorkOrders, capacities, 'genetic');

    return {
      ...result,
      iterations: cfg.generations,
      converged: stagnationCount > cfg.generations * 0.2,
    };
  }

  private initializePopulation(
    workOrders: WorkOrderScheduleInfo[],
    size: number
  ): number[][] {
    const population: number[][] = [];
    const baseSequence = workOrders.map((_, i) => i);

    for (let i = 0; i < size; i++) {
      // Shuffle for random initial population
      const chromosome = [...baseSequence];
      for (let j = chromosome.length - 1; j > 0; j--) {
        const k = Math.floor(Math.random() * (j + 1));
        [chromosome[j], chromosome[k]] = [chromosome[k], chromosome[j]];
      }
      population.push(chromosome);
    }

    return population;
  }

  private evaluateFitness(
    chromosome: number[],
    workOrders: WorkOrderScheduleInfo[],
    capacities: WorkCenterCapacityInfo[]
  ): number {
    const orderedWOs = chromosome.map(i => workOrders[i]);
    const result = this.scheduleSequentially(orderedWOs, capacities, 'genetic');
    return result.metrics.fitnessScore;
  }

  private tournamentSelect(
    population: number[][],
    fitnessScores: number[],
    tournamentSize: number
  ): number[] {
    let best: number[] = [];
    let bestFitness = -Infinity;

    for (let i = 0; i < tournamentSize; i++) {
      const idx = Math.floor(Math.random() * population.length);
      if (fitnessScores[idx] > bestFitness) {
        bestFitness = fitnessScores[idx];
        best = population[idx];
      }
    }

    return best;
  }

  private crossover(parent1: number[], parent2: number[]): [number[], number[]] {
    // Order crossover (OX)
    const size = parent1.length;
    const start = Math.floor(Math.random() * size);
    const end = start + Math.floor(Math.random() * (size - start));

    const child1 = new Array(size).fill(-1);
    const child2 = new Array(size).fill(-1);

    // Copy segment from parents
    for (let i = start; i <= end; i++) {
      child1[i] = parent1[i];
      child2[i] = parent2[i];
    }

    // Fill remaining positions
    this.fillChild(child1, parent2, end + 1);
    this.fillChild(child2, parent1, end + 1);

    return [child1, child2];
  }

  private fillChild(child: number[], parent: number[], startPos: number): void {
    let pos = startPos % child.length;
    for (const gene of parent) {
      if (!child.includes(gene)) {
        while (child[pos] !== -1) {
          pos = (pos + 1) % child.length;
        }
        child[pos] = gene;
        pos = (pos + 1) % child.length;
      }
    }
  }

  private mutate(chromosome: number[]): number[] {
    const result = [...chromosome];
    const i = Math.floor(Math.random() * result.length);
    const j = Math.floor(Math.random() * result.length);
    [result[i], result[j]] = [result[j], result[i]];
    return result;
  }

  // ===========================================================================
  // COMMON SCHEDULING LOGIC
  // ===========================================================================

  private scheduleSequentially(
    workOrders: WorkOrderScheduleInfo[],
    capacities: WorkCenterCapacityInfo[],
    algorithm: SchedulingAlgorithm
  ): OptimizationResult {
    const schedule: ScheduledWorkOrder[] = [];
    const workCenterNextAvailable = new Map<string, Date>();

    // Initialize with current time
    const now = new Date();
    for (const cap of capacities) {
      workCenterNextAvailable.set(cap.id, now);
    }

    for (let i = 0; i < workOrders.length; i++) {
      const wo = workOrders[i];

      // Find best work center
      let targetWorkCenter = capacities.find(c => c.id === wo.workCenterId);
      if (!targetWorkCenter && capacities.length > 0) {
        targetWorkCenter = capacities[0]; // Default to first available
      }

      if (!targetWorkCenter) continue;

      // Get earliest start considering material availability
      const materialReady = wo.materialStatus.expectedReadyDate || now;
      const wcAvailable = workCenterNextAvailable.get(targetWorkCenter.id) || now;
      const startDate = new Date(Math.max(materialReady.getTime(), wcAvailable.getTime()));

      // Calculate end date
      const endDate = this.calculateEndDate(startDate, wo.estimatedDuration, targetWorkCenter);

      schedule.push({
        workOrderId: wo.id,
        woNumber: wo.woNumber,
        workCenterId: targetWorkCenter.id,
        workCenterName: targetWorkCenter.name,
        startDate,
        endDate,
        operations: this.scheduleOperations(wo, targetWorkCenter, startDate),
        priority: i + 1,
        originalIndex: workOrders.indexOf(wo),
      });

      // Update work center availability
      workCenterNextAvailable.set(targetWorkCenter.id, endDate);
    }

    return {
      algorithm,
      schedule,
      metrics: this.calculateMetrics(schedule, workOrders, capacities),
      executionTimeMs: 0,
    };
  }

  private scheduleOperations(
    wo: WorkOrderScheduleInfo,
    workCenter: WorkCenterCapacityInfo,
    woStartDate: Date
  ): ScheduledOperation[] {
    const operations: ScheduledOperation[] = [];
    let currentDate = new Date(woStartDate);

    for (const op of wo.operations) {
      const totalTime = op.plannedSetupTime + op.plannedRunTime;
      const endDate = this.calculateEndDate(currentDate, totalTime, workCenter);

      operations.push({
        operationId: op.id,
        operationNumber: op.operationNumber,
        name: op.name,
        workCenterId: op.workCenterId,
        startDate: new Date(currentDate),
        endDate,
        setupTime: op.plannedSetupTime,
        runTime: op.plannedRunTime,
      });

      currentDate = endDate;
    }

    return operations;
  }

  private findNextAvailableSlot(
    workCenter: WorkCenterCapacityInfo,
    currentLoad: number
  ): Date {
    const now = new Date();
    let hoursToSkip = currentLoad;

    for (const dc of workCenter.dailyCapacity) {
      if (dc.date < now) continue;
      if (dc.availableHours > 0) {
        if (hoursToSkip >= dc.availableHours) {
          hoursToSkip -= dc.availableHours;
        } else {
          return dc.date;
        }
      }
    }

    return now;
  }

  private calculateEndDate(
    startDate: Date,
    durationHours: number,
    workCenter: WorkCenterCapacityInfo
  ): Date {
    let remainingHours = durationHours;
    const currentDate = new Date(startDate);
    const hoursPerDay = workCenter.capacityPerDay;

    while (remainingHours > 0) {
      const dayOfWeek = currentDate.getDay();
      const isWorkingDay = workCenter.workingDays.includes(dayOfWeek);

      if (isWorkingDay) {
        const hoursToUse = Math.min(remainingHours, hoursPerDay);
        remainingHours -= hoursToUse;

        if (remainingHours <= 0) {
          // Add partial day hours
          const endHour = parseInt(workCenter.workingHoursStart.split(':')[0]) +
            Math.ceil(hoursToUse);
          currentDate.setHours(Math.min(endHour, 17), 0, 0, 0);
          break;
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return currentDate;
  }

  private calculateMetrics(
    schedule: ScheduledWorkOrder[],
    workOrders: WorkOrderScheduleInfo[],
    capacities: WorkCenterCapacityInfo[]
  ): OptimizationMetrics {
    if (schedule.length === 0) {
      return {
        makespan: 0,
        totalSetupTime: 0,
        avgFlowTime: 0,
        maxLateness: 0,
        totalLateness: 0,
        onTimeCount: 0,
        lateCount: 0,
        utilizationScore: 0,
        balanceScore: 100,
        fitnessScore: 0,
      };
    }

    const now = new Date();

    // Calculate makespan
    const lastEnd = Math.max(...schedule.map(s => s.endDate.getTime()));
    const firstStart = Math.min(...schedule.map(s => s.startDate.getTime()));
    const makespan = (lastEnd - firstStart) / (1000 * 60 * 60 * 24);

    // Calculate lateness
    let totalLateness = 0;
    let maxLateness = 0;
    let onTimeCount = 0;
    let lateCount = 0;

    for (const scheduled of schedule) {
      const wo = workOrders.find(w => w.id === scheduled.workOrderId);
      if (wo?.dueDate) {
        const lateness = (scheduled.endDate.getTime() - wo.dueDate.getTime()) / (1000 * 60 * 60 * 24);
        if (lateness > 0) {
          totalLateness += lateness;
          lateCount++;
          maxLateness = Math.max(maxLateness, lateness);
        } else {
          onTimeCount++;
        }
      } else {
        onTimeCount++;
      }
    }

    // Calculate flow time
    const flowTimes = schedule.map(s =>
      (s.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    const avgFlowTime = flowTimes.reduce((a, b) => a + b, 0) / flowTimes.length;

    // Calculate setup time
    const totalSetupTime = schedule.reduce((sum, s) =>
      sum + s.operations.reduce((opSum, op) => opSum + op.setupTime, 0),
      0
    );

    // Calculate utilization
    const workCenterHours = new Map<string, number>();
    for (const s of schedule) {
      const hours = (s.endDate.getTime() - s.startDate.getTime()) / (1000 * 60 * 60);
      workCenterHours.set(
        s.workCenterId,
        (workCenterHours.get(s.workCenterId) || 0) + hours
      );
    }

    let totalUtilization = 0;
    for (const cap of capacities) {
      const scheduled = workCenterHours.get(cap.id) || 0;
      const available = cap.dailyCapacity.reduce((sum, dc) => sum + dc.availableHours, 0);
      if (available > 0) {
        totalUtilization += (scheduled / available) * 100;
      }
    }
    const utilizationScore = totalUtilization / capacities.length;

    // Calculate balance
    const loads = Array.from(workCenterHours.values());
    const avgLoad = loads.reduce((a, b) => a + b, 0) / loads.length || 0;
    const variance = loads.reduce((sum, l) => sum + Math.pow(l - avgLoad, 2), 0) / loads.length;
    const stdDev = Math.sqrt(variance);
    const balanceScore = avgLoad > 0 ? Math.max(0, 100 - (stdDev / avgLoad) * 100) : 100;

    // Calculate fitness score
    const fitnessScore = this.calculateFitnessScore({
      makespan,
      totalSetupTime,
      avgFlowTime,
      maxLateness,
      totalLateness,
      onTimeCount,
      lateCount,
      utilizationScore,
      balanceScore,
      fitnessScore: 0,
    });

    return {
      makespan,
      totalSetupTime,
      avgFlowTime,
      maxLateness,
      totalLateness,
      onTimeCount,
      lateCount,
      utilizationScore,
      balanceScore,
      fitnessScore,
    };
  }

  private calculateFitnessScore(metrics: OptimizationMetrics): number {
    // Normalize and weight each component
    const makespanScore = Math.max(0, 100 - metrics.makespan * 2);
    const latenessScore = Math.max(0, 100 - metrics.totalLateness * 10);
    const setupScore = Math.max(0, 100 - metrics.totalSetupTime);

    return (
      makespanScore * this.weights.makespan +
      latenessScore * this.weights.lateness +
      setupScore * this.weights.setupTime +
      metrics.utilizationScore * this.weights.utilization +
      metrics.balanceScore * this.weights.balance
    );
  }

  // ===========================================================================
  // COMPARISON
  // ===========================================================================

  async compareAlgorithms(
    workOrders: WorkOrderScheduleInfo[],
    capacities: WorkCenterCapacityInfo[]
  ): Promise<Map<SchedulingAlgorithm, OptimizationResult>> {
    const algorithms: SchedulingAlgorithm[] = [
      'priority_first',
      'due_date_first',
      'shortest_first',
      'setup_minimize',
      'balanced_load',
    ];

    const results = new Map<SchedulingAlgorithm, OptimizationResult>();

    for (const algorithm of algorithms) {
      const result = await this.optimize(workOrders, capacities, algorithm);
      results.set(algorithm, result);
    }

    return results;
  }

  findBestAlgorithm(
    results: Map<SchedulingAlgorithm, OptimizationResult>
  ): { algorithm: SchedulingAlgorithm; result: OptimizationResult } {
    let bestAlgorithm: SchedulingAlgorithm = 'priority_first';
    let bestFitness = -Infinity;

    for (const [algorithm, result] of results) {
      if (result.metrics.fitnessScore > bestFitness) {
        bestFitness = result.metrics.fitnessScore;
        bestAlgorithm = algorithm;
      }
    }

    return {
      algorithm: bestAlgorithm,
      result: results.get(bestAlgorithm)!,
    };
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const scheduleOptimizer = ScheduleOptimizer.getInstance();

export function getScheduleOptimizer(): ScheduleOptimizer {
  return ScheduleOptimizer.getInstance();
}
