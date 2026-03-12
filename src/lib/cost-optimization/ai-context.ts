import prisma from "@/lib/prisma";

export interface AIContext {
  topCostParts?: Array<{
    partNumber: string;
    description: string;
    cost: number;
    source: string;
    ndaaCompliant: boolean;
  }>;
  autonomyStatus?: {
    makeCount: number;
    inDevCount: number;
    buyCount: number;
    autonomyPercent: number;
  };
  recentSavings?: {
    ytdTotal: number;
    topActions: Array<{
      description: string;
      savings: number;
      status: string;
    }>;
  };
  activeTargets?: Array<{
    name: string;
    currentCost: number;
    targetCost: number;
    progress: number;
    status: string;
  }>;
}

export async function buildAIContext(): Promise<AIContext> {
  const context: AIContext = {};

  // Get top cost parts with autonomy status
  const topParts = await prisma.part.findMany({
    orderBy: { unitCost: "desc" },
    take: 10,
    include: {
      autonomyStatus: true,
    },
  });

  context.topCostParts = topParts.map((p) => ({
    partNumber: p.partNumber,
    description: p.description || "",
    cost: p.unitCost || 0,
    source: p.autonomyStatus?.currentSource || "BUY_SOURCE",
    ndaaCompliant: p.autonomyStatus?.ndaaCompliant || false,
  }));

  // Get autonomy status
  const autonomyStats = await prisma.partAutonomyStatus.groupBy({
    by: ["status"],
    _count: { id: true },
  });

  const makeCount =
    autonomyStats.find((s) => s.status === "MAKE")?._count.id || 0;
  const inDevCount =
    autonomyStats.find((s) => s.status === "IN_DEVELOPMENT")?._count.id || 0;
  const buyCount = autonomyStats
    .filter(
      (s) => s.status === "BUY_STRATEGIC" || s.status === "BUY_REQUIRED"
    )
    .reduce((sum, s) => sum + s._count.id, 0);
  const total = makeCount + inDevCount + buyCount;

  context.autonomyStatus = {
    makeCount,
    inDevCount,
    buyCount,
    autonomyPercent: total > 0 ? Math.round((makeCount / total) * 100) : 0,
  };

  // Get recent completed savings actions
  const recentActions = await prisma.costReductionAction.findMany({
    where: { status: "COMPLETED_ACTION" },
    orderBy: { actualCompletionDate: "desc" },
    take: 5,
  });

  context.recentSavings = {
    ytdTotal: recentActions.reduce((sum, a) => sum + a.annualSavings, 0),
    topActions: recentActions.map((a) => ({
      description: a.description,
      savings: a.annualSavings,
      status: a.status,
    })),
  };

  // Get active cost targets
  const activeTargets = await prisma.costTarget.findMany({
    where: { status: { in: ["ACTIVE", "ON_TRACK", "AT_RISK"] } },
    include: {
      phases: {
        include: {
          actions: { select: { progressPercent: true } },
        },
      },
    },
  });

  context.activeTargets = activeTargets.map((t) => {
    const allActions = t.phases.flatMap((p) => p.actions);
    const avgProgress =
      allActions.length > 0
        ? allActions.reduce((sum, a) => sum + a.progressPercent, 0) /
          allActions.length
        : 0;

    return {
      name: t.name,
      currentCost: t.currentCost,
      targetCost: t.targetCost,
      progress: Math.round(avgProgress),
      status: t.status,
    };
  });

  return context;
}

export function formatContextForAI(context: AIContext): string {
  const sections: string[] = [];

  if (context.topCostParts?.length) {
    sections.push(
      `## Top Cost Parts:\n${context.topCostParts
        .map(
          (p) =>
            `- ${p.partNumber}: $${p.cost} (${p.source}) ${
              p.ndaaCompliant ? "NDAA OK" : "Non-NDAA"
            }`
        )
        .join("\n")}`
    );
  }

  if (context.autonomyStatus) {
    sections.push(
      `## Autonomy Status:\n- Make: ${context.autonomyStatus.makeCount} parts\n- In Development: ${context.autonomyStatus.inDevCount} parts\n- Buy: ${context.autonomyStatus.buyCount} parts\n- Overall: ${context.autonomyStatus.autonomyPercent}% autonomous`
    );
  }

  if (context.recentSavings) {
    sections.push(
      `## Recent Savings:\n- YTD Total: $${context.recentSavings.ytdTotal.toLocaleString()}\n- Top Actions:\n${context.recentSavings.topActions
        .map((a) => `  - ${a.description}: $${a.savings.toLocaleString()}/year`)
        .join("\n")}`
    );
  }

  if (context.activeTargets?.length) {
    sections.push(
      `## Active Cost Targets:\n${context.activeTargets
        .map(
          (t) =>
            `- ${t.name}: $${t.currentCost} -> $${t.targetCost} (${t.progress}% complete, ${t.status})`
        )
        .join("\n")}`
    );
  }

  return sections.join("\n\n");
}
