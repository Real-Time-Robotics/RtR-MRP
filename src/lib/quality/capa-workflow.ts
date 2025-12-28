// lib/quality/capa-workflow.ts
import { prisma } from "@/lib/prisma";

export type CAPAStatus =
  | "open"
  | "root_cause_analysis"
  | "action_planning"
  | "implementation"
  | "verification"
  | "completed"
  | "closed";

export type CAPAType = "CORRECTIVE" | "PREVENTIVE";

interface CAPATransition {
  from: CAPAStatus[];
  to: CAPAStatus;
  action: string;
  requiredRole?: string[];
  requiredFields?: string[];
}

export const CAPA_TRANSITIONS: CAPATransition[] = [
  {
    from: ["open"],
    to: "root_cause_analysis",
    action: "START_RCA",
  },
  {
    from: ["root_cause_analysis"],
    to: "action_planning",
    action: "COMPLETE_RCA",
    requiredFields: ["rootCause", "rcaMethod"],
  },
  {
    from: ["action_planning"],
    to: "implementation",
    action: "START_IMPLEMENTATION",
  },
  {
    from: ["implementation"],
    to: "verification",
    action: "COMPLETE_ACTIONS",
  },
  {
    from: ["verification"],
    to: "completed",
    action: "VERIFY_EFFECTIVENESS",
    requiredFields: ["verificationResults", "effectivenessScore"],
  },
  {
    from: ["completed"],
    to: "closed",
    action: "CLOSE_CAPA",
    requiredRole: ["quality_manager", "admin"],
    requiredFields: ["closureNotes"],
  },
];

export function getAvailableCAPATransitions(
  currentStatus: CAPAStatus,
  userRole: string
): CAPATransition[] {
  return CAPA_TRANSITIONS.filter(
    (t) =>
      t.from.includes(currentStatus) &&
      (!t.requiredRole || t.requiredRole.includes(userRole))
  );
}

export async function transitionCAPA(
  capaId: string,
  action: string,
  userId: string,
  data?: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const capa = await prisma.cAPA.findUnique({ where: { id: capaId } });
  if (!capa) return { success: false, error: "CAPA not found" };

  const transition = CAPA_TRANSITIONS.find(
    (t) => t.from.includes(capa.status as CAPAStatus) && t.action === action
  );

  if (!transition) {
    return { success: false, error: "Invalid transition" };
  }

  // Validate required fields
  if (transition.requiredFields) {
    for (const field of transition.requiredFields) {
      const capaField = capa[field as keyof typeof capa];
      const dataField = data?.[field];
      if (!dataField && !capaField) {
        return { success: false, error: `Missing required field: ${field}` };
      }
    }
  }

  const updateData: Record<string, unknown> = {
    status: transition.to,
    ...data,
  };

  // Add timestamps based on action
  if (action === "COMPLETE_RCA") {
    updateData.rcaCompletedBy = userId;
    updateData.rcaCompletedAt = new Date();
  } else if (action === "VERIFY_EFFECTIVENESS") {
    updateData.verifiedBy = userId;
    updateData.verifiedAt = new Date();
  } else if (action === "CLOSE_CAPA") {
    updateData.closedBy = userId;
    updateData.closedAt = new Date();
  }

  await prisma.cAPA.update({
    where: { id: capaId },
    data: updateData,
  });

  // Log history
  await prisma.cAPAHistory.create({
    data: {
      capaId,
      action,
      fromStatus: capa.status,
      toStatus: transition.to,
      userId,
    },
  });

  return { success: true };
}

export async function generateCAPANumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.cAPA.count({
    where: {
      capaNumber: {
        startsWith: `CAPA-${year}`,
      },
    },
  });
  return `CAPA-${year}-${String(count + 1).padStart(4, "0")}`;
}

export const CAPA_STATUS_CONFIG: Record<
  CAPAStatus,
  { label: string; color: string }
> = {
  open: { label: "Open", color: "bg-blue-100 text-blue-800" },
  root_cause_analysis: { label: "RCA", color: "bg-purple-100 text-purple-800" },
  action_planning: { label: "Planning", color: "bg-amber-100 text-amber-800" },
  implementation: { label: "In Progress", color: "bg-orange-100 text-orange-800" },
  verification: { label: "Verification", color: "bg-yellow-100 text-yellow-800" },
  completed: { label: "Completed", color: "bg-green-100 text-green-800" },
  closed: { label: "Closed", color: "bg-gray-100 text-gray-800" },
};
