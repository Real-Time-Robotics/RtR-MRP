import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import prisma from "@/lib/prisma";
import { checkReadEndpointLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export const GET = withAuth(async (request, _context, _session) => {
  const rateLimitResult = await checkReadEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const format = searchParams.get("format") || "json";

    let data: Record<string, unknown>[];

    switch (type) {
      case "savings":
        data = await exportSavingsReport();
        break;
      case "roadmap":
        data = await exportRoadmapReport();
        break;
      case "autonomy":
        data = await exportAutonomyReport();
        break;
      default:
        return NextResponse.json(
          { error: "Invalid type. Use: savings, roadmap, or autonomy" },
          { status: 400 }
        );
    }

    if (format === "csv") {
      const csv = convertToCSV(data);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${type}_report.csv"`,
        },
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    logger.logError(
      error instanceof Error ? error : new Error(String(error)),
      { context: "GET /api/cost-optimization/export" }
    );
    return NextResponse.json(
      { error: "Failed to export report" },
      { status: 500 }
    );
  }
});

async function exportSavingsReport(): Promise<Record<string, unknown>[]> {
  const actions = await prisma.costReductionAction.findMany({
    where: { status: "COMPLETED_ACTION" },
    include: {
      part: { select: { partNumber: true } },
      phase: {
        include: {
          costTarget: { select: { name: true } },
        },
      },
      owner: { select: { name: true } },
    },
    orderBy: { annualSavings: "desc" },
  });

  return actions.map((a) => ({
    target: a.phase.costTarget.name,
    phase: a.phase.name,
    action: a.description,
    type: a.type,
    part: a.part?.partNumber || "",
    savingsPerUnit: a.savingsPerUnit,
    annualSavings: a.annualSavings,
    owner: a.owner.name,
    completedDate: a.actualCompletionDate?.toISOString() || "",
  }));
}

async function exportRoadmapReport(): Promise<Record<string, unknown>[]> {
  const targets = await prisma.costTarget.findMany({
    include: {
      product: { select: { name: true } },
      phases: {
        include: {
          actions: {
            include: { owner: { select: { name: true } } },
          },
        },
        orderBy: { targetDate: "asc" },
      },
    },
  });

  // Flatten to rows
  const rows: Record<string, unknown>[] = [];
  for (const target of targets) {
    for (const phase of target.phases) {
      if (phase.actions.length === 0) {
        rows.push({
          target: target.name,
          product: target.product.name,
          targetStatus: target.status,
          phase: phase.name,
          phaseStatus: phase.status,
          action: "",
          actionType: "",
          savingsPerUnit: "",
          annualSavings: "",
          progress: "",
          owner: "",
        });
      }
      for (const action of phase.actions) {
        rows.push({
          target: target.name,
          product: target.product.name,
          targetStatus: target.status,
          phase: phase.name,
          phaseStatus: phase.status,
          action: action.description,
          actionType: action.type,
          savingsPerUnit: action.savingsPerUnit,
          annualSavings: action.annualSavings,
          progress: `${action.progressPercent}%`,
          owner: action.owner.name,
        });
      }
    }
  }
  return rows;
}

async function exportAutonomyReport(): Promise<Record<string, unknown>[]> {
  const parts = await prisma.partAutonomyStatus.findMany({
    include: {
      part: { select: { partNumber: true, description: true } },
    },
    orderBy: { currentCost: "desc" },
  });

  return parts.map((p) => ({
    partNumber: p.part.partNumber,
    description: p.part.description || "",
    status: p.status,
    currentSource: p.currentSource,
    currentCost: p.currentCost,
    makeCapability: `${p.makeCapabilityPercent}%`,
    makeTargetDate: p.makeTargetDate?.toISOString() || "",
    ndaaCompliant: p.ndaaCompliant ? "Yes" : "No",
    itarControlled: p.itarControlled ? "Yes" : "No",
  }));
}

function convertToCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return "";

  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers
      .map((h) => {
        const val = row[h];
        if (val === null || val === undefined) return "";
        const str = String(val);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      })
      .join(",")
  );

  return [headers.join(","), ...rows].join("\n");
}
