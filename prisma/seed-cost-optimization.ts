import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function seedCostOptimization() {
  console.log("Seeding cost optimization data...");

  // Clean cost optimization data first (order matters for foreign keys)
  await prisma.savingsRecord.deleteMany();
  await prisma.costReductionAction.deleteMany();
  await prisma.costReductionPhase.deleteMany();
  await prisma.costTarget.deleteMany();
  await prisma.substituteEvaluation.deleteMany();
  await prisma.makeVsBuyAnalysis.deleteMany();
  await prisma.partAutonomyStatus.deleteMany();

  console.log("Cleared existing cost optimization data");

  // Get references
  const admin = await prisma.user.findFirst({ where: { email: "admin@rtr.com" } });
  if (!admin) throw new Error("Admin user not found. Run main seed first.");

  const product = await prisma.product.findFirst({ where: { sku: "HERA-X8-PRO" } });
  if (!product) throw new Error("Product HERA-X8-PRO not found. Run main seed first.");

  // Get existing parts
  const existingParts = await prisma.part.findMany({
    where: {
      partNumber: {
        in: ["PRT-FC-001", "PRT-MT-001", "PRT-BAT-001", "PRT-ESC-001", "PRT-GPS-001"],
      },
    },
  });
  const partMap = new Map(existingParts.map((p) => [p.partNumber, p]));

  // Create additional parts needed for cost optimization
  const newParts = await Promise.all([
    prisma.part.create({
      data: {
        partNumber: "PRT-GMB-001",
        name: "Camera Gimbal 3-Axis",
        category: "Payload",
        description: "3-axis stabilized camera gimbal for drone payload",
        unit: "pcs",
        isCritical: true,
        status: "active",
        specs: { create: { weightKg: 0.35 } },
        costs: { create: { unitCost: 150.0 } },
        planning: { create: { minStockLevel: 5, reorderPoint: 10, safetyStock: 3 } },
      },
    }),
    prisma.part.create({
      data: {
        partNumber: "PRT-FRM-001",
        name: "Carbon Fiber Frame",
        category: "Airframe",
        description: "Lightweight carbon fiber drone frame",
        unit: "pcs",
        isCritical: true,
        status: "active",
        specs: { create: { weightKg: 1.2 } },
        costs: { create: { unitCost: 120.0 } },
        planning: { create: { minStockLevel: 10, reorderPoint: 20, safetyStock: 5 } },
      },
    }),
    prisma.part.create({
      data: {
        partNumber: "PRT-SNS-001",
        name: "IMU ICM-42688-P",
        category: "Sensors",
        description: "6-axis inertial measurement unit",
        unit: "pcs",
        status: "active",
        specs: { create: { weightKg: 0.005 } },
        costs: { create: { unitCost: 18.0 } },
        planning: { create: { minStockLevel: 20, reorderPoint: 50, safetyStock: 10 } },
      },
    }),
    prisma.part.create({
      data: {
        partNumber: "PRT-SNS-002",
        name: "Barometer BMP390",
        category: "Sensors",
        description: "High-precision barometric pressure sensor",
        unit: "pcs",
        status: "active",
        specs: { create: { weightKg: 0.002 } },
        costs: { create: { unitCost: 12.0 } },
        planning: { create: { minStockLevel: 20, reorderPoint: 50, safetyStock: 10 } },
      },
    }),
    prisma.part.create({
      data: {
        partNumber: "PRT-SNS-003",
        name: "Magnetometer LIS3MDL",
        category: "Sensors",
        description: "3-axis digital magnetic sensor",
        unit: "pcs",
        status: "active",
        specs: { create: { weightKg: 0.002 } },
        costs: { create: { unitCost: 8.0 } },
        planning: { create: { minStockLevel: 20, reorderPoint: 50, safetyStock: 10 } },
      },
    }),
    prisma.part.create({
      data: {
        partNumber: "PRT-PRP-001",
        name: "CF Propeller 15x5",
        category: "Propulsion",
        description: "Carbon fiber propeller 15x5 inch",
        unit: "pcs",
        status: "active",
        specs: { create: { weightKg: 0.03 } },
        costs: { create: { unitCost: 12.0 } },
        planning: { create: { minStockLevel: 40, reorderPoint: 80, safetyStock: 20 } },
      },
    }),
    prisma.part.create({
      data: {
        partNumber: "PRT-WIR-001",
        name: "Wiring Harness",
        category: "Electrical",
        description: "Complete wiring harness assembly",
        unit: "pcs",
        status: "active",
        specs: { create: { weightKg: 0.15 } },
        costs: { create: { unitCost: 25.0 } },
        planning: { create: { minStockLevel: 15, reorderPoint: 30, safetyStock: 5 } },
      },
    }),
    prisma.part.create({
      data: {
        partNumber: "PRT-RCV-001",
        name: "RC Receiver 2.4GHz",
        category: "Communications",
        description: "Long-range 2.4GHz receiver module",
        unit: "pcs",
        status: "active",
        specs: { create: { weightKg: 0.01 } },
        costs: { create: { unitCost: 45.0 } },
        planning: { create: { minStockLevel: 10, reorderPoint: 20, safetyStock: 5 } },
      },
    }),
    prisma.part.create({
      data: {
        partNumber: "PRT-VTX-001",
        name: "Video TX 1.2W",
        category: "Communications",
        description: "1.2W video transmitter for FPV",
        unit: "pcs",
        status: "active",
        specs: { create: { weightKg: 0.02 } },
        costs: { create: { unitCost: 65.0 } },
        planning: { create: { minStockLevel: 10, reorderPoint: 20, safetyStock: 5 } },
      },
    }),
    prisma.part.create({
      data: {
        partNumber: "PRT-LED-001",
        name: "Navigation LED Kit",
        category: "Electrical",
        description: "Navigation and strobe LED kit",
        unit: "set",
        status: "active",
        specs: { create: { weightKg: 0.05 } },
        costs: { create: { unitCost: 15.0 } },
        planning: { create: { minStockLevel: 20, reorderPoint: 40, safetyStock: 10 } },
      },
    }),
  ]);

  // Build complete part map
  for (const p of newParts) {
    partMap.set(p.partNumber, p);
  }

  console.log("Created additional parts for cost optimization");

  // ─────────────────────────────────────────────────────────────────────────
  // PART AUTONOMY STATUS
  // ─────────────────────────────────────────────────────────────────────────
  const autonomyData = [
    { partNumber: "PRT-FC-001", status: "EVALUATE" as const, source: "BUY_SOURCE" as const, cost: 280, leadTime: 21, capability: 60, ndaa: false, itar: false, makeTarget: new Date("2027-06-30"), makeCost: 85, makeInvestment: 45000, rdProgress: 30, rdBlockers: ["SMT equipment needed", "Firmware engineer hiring"] },
    { partNumber: "PRT-MT-001", status: "MAKE" as const, source: "MAKE_SOURCE" as const, cost: 60, leadTime: 5, capability: 100, ndaa: true, itar: false },
    { partNumber: "PRT-BAT-001", status: "IN_DEVELOPMENT" as const, source: "BUY_SOURCE" as const, cost: 180, leadTime: 30, capability: 40, ndaa: false, itar: false, makeTarget: new Date("2027-03-31"), makeCost: 95, makeInvestment: 25000, rdProgress: 40, rdBlockers: ["Cell chemistry testing"] },
    { partNumber: "PRT-GMB-001", status: "EVALUATE" as const, source: "BUY_SOURCE" as const, cost: 150, leadTime: 28, capability: 30, ndaa: false, itar: false, makeTarget: new Date("2027-09-30"), makeCost: 55, makeInvestment: 35000, rdProgress: 10 },
    { partNumber: "PRT-FRM-001", status: "MAKE" as const, source: "MAKE_SOURCE" as const, cost: 120, leadTime: 7, capability: 100, ndaa: true, itar: false },
    { partNumber: "PRT-ESC-001", status: "IN_DEVELOPMENT" as const, source: "BUY_SOURCE" as const, cost: 25, leadTime: 14, capability: 85, ndaa: false, itar: false, makeTarget: new Date("2026-09-30"), makeCost: 10, makeInvestment: 15000, rdProgress: 85, rdBlockers: [] },
    { partNumber: "PRT-GPS-001", status: "EVALUATE" as const, source: "BUY_SOURCE" as const, cost: 80, leadTime: 21, capability: 0, ndaa: false, itar: false },
    { partNumber: "PRT-SNS-001", status: "BUY_STRATEGIC" as const, source: "BUY_SOURCE" as const, cost: 18, leadTime: 14, capability: 0, ndaa: true, itar: false },
    { partNumber: "PRT-SNS-002", status: "BUY_STRATEGIC" as const, source: "BUY_SOURCE" as const, cost: 12, leadTime: 14, capability: 0, ndaa: true, itar: false },
    { partNumber: "PRT-SNS-003", status: "BUY_STRATEGIC" as const, source: "BUY_SOURCE" as const, cost: 8, leadTime: 14, capability: 0, ndaa: true, itar: false },
    { partNumber: "PRT-PRP-001", status: "MAKE" as const, source: "MAKE_SOURCE" as const, cost: 12, leadTime: 3, capability: 100, ndaa: true, itar: false },
    { partNumber: "PRT-WIR-001", status: "EVALUATE" as const, source: "BUY_SOURCE" as const, cost: 25, leadTime: 7, capability: 50, ndaa: true, itar: false },
    { partNumber: "PRT-RCV-001", status: "BUY_STRATEGIC" as const, source: "BUY_SOURCE" as const, cost: 45, leadTime: 21, capability: 0, ndaa: true, itar: false },
    { partNumber: "PRT-VTX-001", status: "BUY_STRATEGIC" as const, source: "BUY_SOURCE" as const, cost: 65, leadTime: 21, capability: 0, ndaa: true, itar: false },
    { partNumber: "PRT-LED-001", status: "MAKE" as const, source: "MAKE_SOURCE" as const, cost: 15, leadTime: 2, capability: 100, ndaa: true, itar: false },
  ];

  for (const a of autonomyData) {
    const part = partMap.get(a.partNumber);
    if (!part) { console.warn(`Part ${a.partNumber} not found, skipping autonomy`); continue; }

    await prisma.partAutonomyStatus.create({
      data: {
        partId: part.id,
        status: a.status,
        currentSource: a.source,
        currentCost: a.cost,
        currentLeadTimeDays: a.leadTime,
        makeCapabilityPercent: a.capability,
        ndaaCompliant: a.ndaa,
        itarControlled: a.itar,
        makeTargetDate: a.makeTarget || null,
        makeCostEstimate: a.makeCost || null,
        makeInvestmentRequired: a.makeInvestment || null,
        rdProgressPercent: a.rdProgress || null,
        rdBlockers: a.rdBlockers || [],
      },
    });
  }

  console.log("Created 15 part autonomy statuses");

  // ─────────────────────────────────────────────────────────────────────────
  // MAKE VS BUY ANALYSES
  // ─────────────────────────────────────────────────────────────────────────
  const fcPart = partMap.get("PRT-FC-001")!;
  const escPart = partMap.get("PRT-ESC-001")!;
  const gpsPart = partMap.get("PRT-GPS-001")!;

  await prisma.makeVsBuyAnalysis.createMany({
    data: [
      {
        partId: fcPart.id,
        buyPrice: 280,
        buyMOQ: 50,
        buyLeadTimeDays: 21,
        buyRisks: ["Single source dependency", "NDAA non-compliant", "Price volatility"],
        makeCostEstimate: 85,
        makeInvestmentRequired: 45000,
        makeLeadTimeDays: 5,
        makeTimelineMonths: 12,
        makeCapabilityGapsJson: JSON.stringify(["SMT assembly line", "Firmware development", "EMC testing equipment"]),
        savingsPerUnit: 195,
        annualVolumeEstimate: 500,
        annualSavings: 97500,
        breakEvenUnits: 231,
        breakEvenMonths: 6,
        npv3Year: 245000,
        financialScore: 9.2,
        capabilityScore: 7.5,
        strategicScore: 9.0,
        overallScore: 8.6,
        recommendation: "STRONG_MAKE",
        recommendationRationale: "Excellent ROI with 6-month payback. Strategic alignment with NDAA compliance and autonomy goals.",
        conditions: ["Hire firmware engineer", "Procure SMT equipment", "Complete EMC certification"],
        decision: "DECIDE_MAKE",
        decisionDate: new Date("2026-01-15"),
        status: "ANALYSIS_DECIDED",
        createdById: admin.id,
      },
      {
        partId: escPart.id,
        buyPrice: 25,
        buyMOQ: 100,
        buyLeadTimeDays: 14,
        buyRisks: ["Non-NDAA compliant", "Limited customization"],
        makeCostEstimate: 10,
        makeInvestmentRequired: 15000,
        makeLeadTimeDays: 3,
        makeTimelineMonths: 6,
        makeCapabilityGapsJson: JSON.stringify(["SMT assembly for ESC boards"]),
        savingsPerUnit: 15,
        annualVolumeEstimate: 2000,
        annualSavings: 30000,
        breakEvenUnits: 1000,
        breakEvenMonths: 6,
        npv3Year: 72000,
        financialScore: 8.5,
        capabilityScore: 8.0,
        strategicScore: 7.8,
        overallScore: 8.1,
        recommendation: "STRONG_MAKE",
        recommendationRationale: "Strong financial case with existing SMT capabilities. 85% R&D complete.",
        conditions: ["Complete firmware validation", "Thermal testing"],
        decision: "DECIDE_MAKE",
        decisionDate: new Date("2025-11-01"),
        status: "ANALYSIS_DECIDED",
        createdById: admin.id,
      },
      {
        partId: gpsPart.id,
        buyPrice: 80,
        buyMOQ: 50,
        buyLeadTimeDays: 21,
        buyRisks: ["Supply chain disruption"],
        makeCostEstimate: 120,
        makeInvestmentRequired: 80000,
        makeLeadTimeDays: 10,
        makeTimelineMonths: 18,
        makeCapabilityGapsJson: JSON.stringify(["RF design expertise", "GNSS firmware", "Antenna design"]),
        savingsPerUnit: -40,
        annualVolumeEstimate: 500,
        annualSavings: -20000,
        breakEvenUnits: 0,
        breakEvenMonths: 0,
        npv3Year: -140000,
        financialScore: 1.5,
        capabilityScore: 2.0,
        strategicScore: 4.2,
        overallScore: 2.6,
        recommendation: "STRONG_BUY",
        recommendationRationale: "Making GPS modules in-house is not cost-effective. Consider substitute with NDAA-compliant supplier instead.",
        conditions: ["Evaluate Quectel LC29H as NDAA-compliant substitute"],
        decision: "DECIDE_BUY",
        decisionDate: new Date("2026-02-01"),
        status: "ANALYSIS_DECIDED",
        createdById: admin.id,
      },
    ],
  });

  console.log("Created 3 Make vs Buy analyses");

  // ─────────────────────────────────────────────────────────────────────────
  // COST TARGET + PHASES + ACTIONS
  // ─────────────────────────────────────────────────────────────────────────
  const costTarget = await prisma.costTarget.create({
    data: {
      productId: product.id,
      name: "Hera Drone V2 - 50% Cost Reduction",
      currentCost: 1250,
      targetCost: 625,
      targetDate: new Date("2027-03-31"),
      status: "ACTIVE",
      createdById: admin.id,
    },
  });

  // Phase 1: Quick Wins (COMPLETED)
  const phase1 = await prisma.costReductionPhase.create({
    data: {
      costTargetId: costTarget.id,
      name: "Quick Wins",
      targetCost: 1050,
      targetDate: new Date("2026-06-30"),
      status: "COMPLETED",
    },
  });

  const mtrPart = partMap.get("PRT-MT-001")!;
  const frmPart = partMap.get("PRT-FRM-001")!;
  const sns1Part = partMap.get("PRT-SNS-001")!;

  // Phase 1 Actions (all COMPLETED)
  const action1_1 = await prisma.costReductionAction.create({
    data: {
      phaseId: phase1.id,
      type: "PROCESS_IMPROVE",
      partId: mtrPart.id,
      description: "Motor winding optimization - reduce material waste",
      currentCost: 65,
      targetCost: 60,
      savingsPerUnit: 5,
      annualVolume: 2000,
      annualSavings: 10000,
      investmentRequired: 2000,
      breakEvenUnits: 400,
      roiMonths: 3,
      startDate: new Date("2026-01-15"),
      targetCompletionDate: new Date("2026-03-31"),
      actualCompletionDate: new Date("2026-03-15"),
      status: "COMPLETED_ACTION",
      progressPercent: 100,
      riskLevel: "LOW",
      notes: "Optimized winding process reduced copper waste by 8%",
      ownerId: admin.id,
    },
  });

  const action1_2 = await prisma.costReductionAction.create({
    data: {
      phaseId: phase1.id,
      type: "SUPPLIER_OPTIMIZE",
      partId: sns1Part.id,
      description: "Sensor consolidation - bundle IMU+Baro+Mag orders",
      currentCost: 38,
      targetCost: 31,
      savingsPerUnit: 7,
      annualVolume: 500,
      annualSavings: 3500,
      investmentRequired: 0,
      breakEvenUnits: 0,
      roiMonths: 0,
      startDate: new Date("2026-01-01"),
      targetCompletionDate: new Date("2026-04-30"),
      actualCompletionDate: new Date("2026-04-10"),
      status: "COMPLETED_ACTION",
      progressPercent: 100,
      riskLevel: "LOW",
      notes: "Negotiated 18% volume discount with TDK for bundled sensor order",
      ownerId: admin.id,
    },
  });

  const action1_3 = await prisma.costReductionAction.create({
    data: {
      phaseId: phase1.id,
      type: "PROCESS_IMPROVE",
      partId: frmPart.id,
      description: "Frame carbon fiber optimization - reduce offcut waste",
      currentCost: 135,
      targetCost: 120,
      savingsPerUnit: 15,
      annualVolume: 500,
      annualSavings: 7500,
      investmentRequired: 5000,
      breakEvenUnits: 334,
      roiMonths: 8,
      startDate: new Date("2026-02-01"),
      targetCompletionDate: new Date("2026-05-31"),
      actualCompletionDate: new Date("2026-05-20"),
      status: "COMPLETED_ACTION",
      progressPercent: 100,
      riskLevel: "LOW",
      notes: "New nesting software reduced carbon fiber waste from 22% to 9%",
      ownerId: admin.id,
    },
  });

  // Phase 2: Make vs Buy (IN_PROGRESS)
  const phase2 = await prisma.costReductionPhase.create({
    data: {
      costTargetId: costTarget.id,
      name: "Make vs Buy",
      targetCost: 850,
      targetDate: new Date("2026-09-30"),
      status: "IN_PROGRESS",
    },
  });

  await prisma.costReductionAction.createMany({
    data: [
      {
        phaseId: phase2.id,
        type: "MAKE_VS_BUY",
        partId: escPart.id,
        description: "ESC self-manufacture - complete R&D and start production",
        currentCost: 25,
        targetCost: 10,
        savingsPerUnit: 15,
        annualVolume: 2000,
        annualSavings: 30000,
        investmentRequired: 15000,
        breakEvenUnits: 1000,
        roiMonths: 6,
        startDate: new Date("2026-03-01"),
        targetCompletionDate: new Date("2026-09-30"),
        status: "IN_PROGRESS_ACTION",
        progressPercent: 85,
        riskLevel: "MEDIUM",
        riskNotes: "Firmware thermal management needs validation",
        notes: "85% R&D complete. Pilot batch of 50 units produced successfully.",
        ownerId: admin.id,
      },
      {
        phaseId: phase2.id,
        type: "MAKE_VS_BUY",
        partId: partMap.get("PRT-BAT-001")!.id,
        description: "Battery local assembly - cell sourcing + pack assembly",
        currentCost: 180,
        targetCost: 95,
        savingsPerUnit: 85,
        annualVolume: 500,
        annualSavings: 42500,
        investmentRequired: 25000,
        breakEvenUnits: 295,
        roiMonths: 7,
        startDate: new Date("2026-04-01"),
        targetCompletionDate: new Date("2026-12-31"),
        status: "IN_PROGRESS_ACTION",
        progressPercent: 40,
        riskLevel: "HIGH",
        riskNotes: "Battery cell chemistry testing ongoing. Safety certification required.",
        notes: "Cell sourcing from CATL confirmed. BMS design 60% complete.",
        ownerId: admin.id,
      },
      {
        phaseId: phase2.id,
        type: "SUBSTITUTE",
        partId: gpsPart.id,
        description: "GPS substitute - Quectel LC29H (NDAA compliant)",
        currentCost: 80,
        targetCost: 35,
        savingsPerUnit: 45,
        annualVolume: 500,
        annualSavings: 22500,
        investmentRequired: 3000,
        breakEvenUnits: 67,
        roiMonths: 2,
        startDate: new Date("2026-05-01"),
        targetCompletionDate: new Date("2026-08-31"),
        status: "TESTING_ACTION",
        progressPercent: 60,
        riskLevel: "MEDIUM",
        riskNotes: "Compatibility testing with existing firmware needed",
        notes: "Sample received. Position accuracy within spec. Integration testing in progress.",
        ownerId: admin.id,
      },
    ],
  });

  // Phase 3: Strategic Make (PLANNED)
  const phase3 = await prisma.costReductionPhase.create({
    data: {
      costTargetId: costTarget.id,
      name: "Strategic Make",
      targetCost: 700,
      targetDate: new Date("2026-12-31"),
      status: "PLANNED",
    },
  });

  await prisma.costReductionAction.createMany({
    data: [
      {
        phaseId: phase3.id,
        type: "MAKE_VS_BUY",
        partId: fcPart.id,
        description: "Flight Controller R&D - STM32F7 based custom FC",
        currentCost: 280,
        targetCost: 85,
        savingsPerUnit: 195,
        annualVolume: 500,
        annualSavings: 97500,
        investmentRequired: 45000,
        breakEvenUnits: 231,
        roiMonths: 6,
        targetCompletionDate: new Date("2027-06-30"),
        status: "APPROVED",
        progressPercent: 0,
        riskLevel: "HIGH",
        riskNotes: "Requires SMT equipment and firmware engineer",
        notes: "Approved by engineering board. Budget allocated for Q2 2026.",
        ownerId: admin.id,
      },
      {
        phaseId: phase3.id,
        type: "MAKE_VS_BUY",
        partId: partMap.get("PRT-GMB-001")!.id,
        description: "Camera Gimbal development - custom 3-axis stabilizer",
        currentCost: 150,
        targetCost: 55,
        savingsPerUnit: 95,
        annualVolume: 500,
        annualSavings: 47500,
        investmentRequired: 35000,
        breakEvenUnits: 369,
        roiMonths: 9,
        targetCompletionDate: new Date("2027-09-30"),
        status: "IDEA",
        progressPercent: 0,
        riskLevel: "HIGH",
        riskNotes: "Complex mechanical design. Requires precision CNC capability.",
        notes: "Feasibility study pending. Need to evaluate CNC partnership.",
        ownerId: admin.id,
      },
    ],
  });

  // Phase 4: Scale & Optimize (PLANNED)
  const phase4 = await prisma.costReductionPhase.create({
    data: {
      costTargetId: costTarget.id,
      name: "Scale & Optimize",
      targetCost: 625,
      targetDate: new Date("2027-03-31"),
      status: "PLANNED",
    },
  });

  await prisma.costReductionAction.createMany({
    data: [
      {
        phaseId: phase4.id,
        type: "PROCESS_IMPROVE",
        description: "Assembly line automation - reduce labor cost per unit",
        currentCost: 75,
        targetCost: 50,
        savingsPerUnit: 25,
        annualVolume: 500,
        annualSavings: 12500,
        investmentRequired: 50000,
        breakEvenUnits: 2000,
        roiMonths: 48,
        targetCompletionDate: new Date("2027-03-31"),
        status: "IDEA",
        progressPercent: 0,
        riskLevel: "MEDIUM",
        notes: "Requires production volume > 500/year to justify investment",
        ownerId: admin.id,
      },
      {
        phaseId: phase4.id,
        type: "LOCALIZE",
        partId: partMap.get("PRT-WIR-001")!.id,
        description: "Wiring harness localization - local supplier development",
        currentCost: 25,
        targetCost: 15,
        savingsPerUnit: 10,
        annualVolume: 500,
        annualSavings: 5000,
        investmentRequired: 2000,
        breakEvenUnits: 200,
        roiMonths: 5,
        targetCompletionDate: new Date("2027-02-28"),
        status: "IDEA",
        progressPercent: 0,
        riskLevel: "LOW",
        notes: "Two local cable assembly shops identified for evaluation",
        ownerId: admin.id,
      },
    ],
  });

  console.log("Created cost target with 4 phases and 10 actions");

  // ─────────────────────────────────────────────────────────────────────────
  // SAVINGS RECORDS (verified, YTD total: $24,900)
  // ─────────────────────────────────────────────────────────────────────────
  await prisma.savingsRecord.createMany({
    data: [
      {
        actionId: action1_1.id,
        source: "PROCESS_IMPROVEMENT",
        partId: mtrPart.id,
        description: "Motor winding optimization - Q1/Q2 realized savings",
        savingsPerUnit: 5,
        unitsAffected: 1800,
        totalSavings: 9000,
        periodStart: new Date("2026-01-01"),
        periodEnd: new Date("2026-06-30"),
        verified: true,
        verifiedById: admin.id,
        verifiedAt: new Date("2026-07-05"),
      },
      {
        actionId: action1_2.id,
        source: "SUPPLIER_NEGOTIATION",
        partId: sns1Part.id,
        description: "Sensor consolidation - Q1/Q2 volume discount savings",
        savingsPerUnit: 7,
        unitsAffected: 450,
        totalSavings: 3150,
        periodStart: new Date("2026-01-01"),
        periodEnd: new Date("2026-06-30"),
        verified: true,
        verifiedById: admin.id,
        verifiedAt: new Date("2026-07-05"),
      },
      {
        actionId: action1_3.id,
        source: "PROCESS_IMPROVEMENT",
        partId: frmPart.id,
        description: "Frame carbon optimization - Q1/Q2 waste reduction savings",
        savingsPerUnit: 15,
        unitsAffected: 450,
        totalSavings: 6750,
        periodStart: new Date("2026-01-01"),
        periodEnd: new Date("2026-06-30"),
        verified: true,
        verifiedById: admin.id,
        verifiedAt: new Date("2026-07-05"),
      },
      {
        actionId: null,
        source: "SAVINGS_MAKE_VS_BUY",
        partId: escPart.id,
        description: "ESC pilot batch - 400 units produced in-house at $10 vs $25 buy",
        savingsPerUnit: 15,
        unitsAffected: 400,
        totalSavings: 6000,
        periodStart: new Date("2026-07-01"),
        periodEnd: new Date("2026-09-30"),
        verified: true,
        verifiedById: admin.id,
        verifiedAt: new Date("2026-10-05"),
      },
    ],
  });

  console.log("Created 4 savings records (YTD total: $24,900)");
  console.log("Cost optimization seed completed!");
}
