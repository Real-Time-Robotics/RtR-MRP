// lib/quality/ncr-workflow.ts
import { prisma } from "@/lib/prisma";

export type NCRStatus =
  | "open"
  | "under_review"
  | "pending_disposition"
  | "disposition_approved"
  | "in_rework"
  | "pending_verification"
  | "completed"
  | "closed"
  | "voided";

export type NCRDisposition =
  | "USE_AS_IS"
  | "REWORK"
  | "REPAIR"
  | "RETURN_TO_VENDOR"
  | "SCRAP"
  | "SORT";

interface NCRTransition {
  from: NCRStatus[];
  to: NCRStatus;
  action: string;
  requiredRole?: string[];
  requiresApproval?: boolean;
  requiredFields?: string[];
}

export const NCR_TRANSITIONS: NCRTransition[] = [
  {
    from: ["open"],
    to: "under_review",
    action: "START_REVIEW",
    requiredFields: ["description", "quantityAffected"],
  },
  {
    from: ["open", "under_review"],
    to: "pending_disposition",
    action: "SUBMIT_FOR_DISPOSITION",
    requiredFields: ["containmentAction", "preliminaryCause"],
  },
  {
    from: ["pending_disposition"],
    to: "disposition_approved",
    action: "APPROVE_DISPOSITION",
    requiredRole: ["quality_manager", "admin"],
    requiresApproval: true,
    requiredFields: ["disposition", "dispositionReason"],
  },
  {
    from: ["disposition_approved"],
    to: "in_rework",
    action: "START_REWORK",
    requiredFields: ["reworkInstructions"],
  },
  {
    from: ["disposition_approved"],
    to: "completed",
    action: "COMPLETE_DISPOSITION",
  },
  {
    from: ["in_rework"],
    to: "pending_verification",
    action: "COMPLETE_REWORK",
  },
  {
    from: ["pending_verification"],
    to: "completed",
    action: "VERIFY_REWORK",
    requiredRole: ["quality_inspector", "quality_manager"],
  },
  {
    from: ["completed"],
    to: "closed",
    action: "CLOSE_NCR",
    requiredFields: ["closureNotes"],
  },
  {
    from: ["open", "under_review", "pending_disposition"],
    to: "voided",
    action: "VOID_NCR",
    requiredRole: ["quality_manager", "admin"],
  },
];

export function canTransition(
  currentStatus: NCRStatus,
  targetStatus: NCRStatus,
  userRole: string
): boolean {
  const transition = NCR_TRANSITIONS.find(
    (t) => t.from.includes(currentStatus) && t.to === targetStatus
  );

  if (!transition) return false;

  if (transition.requiredRole && !transition.requiredRole.includes(userRole)) {
    return false;
  }

  return true;
}

export function getAvailableTransitions(
  currentStatus: NCRStatus,
  userRole: string
): NCRTransition[] {
  return NCR_TRANSITIONS.filter(
    (t) =>
      t.from.includes(currentStatus) &&
      (!t.requiredRole || t.requiredRole.includes(userRole))
  );
}

export async function transitionNCR(
  ncrId: string,
  action: string,
  userId: string,
  data?: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const ncr = await prisma.nCR.findUnique({ where: { id: ncrId } });
  if (!ncr) return { success: false, error: "NCR not found" };

  const transition = NCR_TRANSITIONS.find(
    (t) => t.from.includes(ncr.status as NCRStatus) && t.action === action
  );

  if (!transition) {
    return { success: false, error: "Invalid transition" };
  }

  // Validate required fields
  if (transition.requiredFields) {
    for (const field of transition.requiredFields) {
      const ncrField = ncr[field as keyof typeof ncr];
      const dataField = data?.[field];
      if (!dataField && !ncrField) {
        return { success: false, error: `Missing required field: ${field}` };
      }
    }
  }

  // Build update data
  const updateData: Record<string, unknown> = {
    status: transition.to,
    ...data,
  };

  // Add timestamps based on action
  if (action === "APPROVE_DISPOSITION") {
    updateData.dispositionApprovedBy = userId;
    updateData.dispositionApprovedAt = new Date();
  } else if (action === "CLOSE_NCR") {
    updateData.closedBy = userId;
    updateData.closedAt = new Date();
  }

  await prisma.nCR.update({
    where: { id: ncrId },
    data: updateData,
  });

  // Log history
  await prisma.nCRHistory.create({
    data: {
      ncrId,
      action,
      fromStatus: ncr.status,
      toStatus: transition.to,
      userId,
    },
  });

  return { success: true };
}

export async function generateNCRNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `NCR-${year}-`;

  // Use findMany with orderBy to get the last number, avoiding count() race condition
  const lastNCR = await prisma.nCR.findFirst({
    where: { ncrNumber: { startsWith: prefix } },
    orderBy: { ncrNumber: 'desc' },
    select: { ncrNumber: true },
  });

  let nextNumber = 1;
  if (lastNCR?.ncrNumber) {
    const lastSuffix = lastNCR.ncrNumber.replace(prefix, '');
    const parsed = parseInt(lastSuffix, 10);
    if (!isNaN(parsed)) nextNumber = parsed + 1;
  }

  return `${prefix}${String(nextNumber).padStart(4, "0")}`;
}

export const NCR_STATUS_CONFIG: Record<
  NCRStatus,
  { label: string; color: string }
> = {
  open: { label: "Open", color: "bg-blue-100 text-blue-800" },
  under_review: { label: "Under Review", color: "bg-purple-100 text-purple-800" },
  pending_disposition: { label: "Pending Disposition", color: "bg-amber-100 text-amber-800" },
  disposition_approved: { label: "Approved", color: "bg-teal-100 text-teal-800" },
  in_rework: { label: "In Rework", color: "bg-orange-100 text-orange-800" },
  pending_verification: { label: "Pending Verify", color: "bg-yellow-100 text-yellow-800" },
  completed: { label: "Completed", color: "bg-green-100 text-green-800" },
  closed: { label: "Closed", color: "bg-gray-100 text-gray-800" },
  voided: { label: "Voided", color: "bg-red-100 text-red-800" },
};
