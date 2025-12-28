// src/lib/compliance/itar-controls.ts
// ITAR (International Traffic in Arms Regulations) Controls System

import { prisma } from "@/lib/prisma";
import { createAuditEntry } from "./audit-trail";

// US Person status types
export type USPersonStatus =
  | "US_CITIZEN"
  | "PERMANENT_RESIDENT"
  | "NOT_US_PERSON"
  | "PENDING_VERIFICATION";

// USML Categories (US Munitions List)
export const USML_CATEGORIES = {
  I: "Firearms, Close Assault Weapons and Combat Shotguns",
  II: "Guns and Armament",
  III: "Ammunition/Ordnance",
  IV: "Launch Vehicles, Guided Missiles, Ballistic Missiles, Rockets, Torpedoes, Bombs, and Mines",
  V: "Explosives and Energetic Materials, Propellants, Incendiary Agents and Their Constituents",
  VI: "Surface Vessels of War and Special Naval Equipment",
  VII: "Ground Vehicles",
  VIII: "Aircraft and Related Articles",
  IX: "Military Training Equipment and Training",
  X: "Personal Protective Equipment",
  XI: "Military Electronics",
  XII: "Fire Control, Laser, Imaging, and Guidance Equipment",
  XIII: "Materials and Miscellaneous Articles",
  XIV: "Toxicological Agents, Including Chemical Agents, Biological Agents, and Associated Equipment",
  XV: "Spacecraft and Related Articles",
  XVI: "Nuclear Weapons Related Articles",
  XVII: "Classified Articles, Technical Data, and Defense Services Not Otherwise Enumerated",
  XVIII: "Directed Energy Weapons",
  XIX: "Gas Turbine Engines and Associated Equipment",
  XX: "Submersible Vessels and Related Articles",
  XXI: "Articles, Technical Data, and Defense Services Not Otherwise Enumerated",
} as const;

export type USMLCategory = keyof typeof USML_CATEGORIES;

// ITAR marking templates
export const ITAR_MARKINGS = {
  standard:
    "WARNING: This document contains technical data whose export is restricted by the Arms Export Control Act (Title 22, U.S.C., Sec 2751, et seq.) or the Export Administration Act of 1979, as amended, Title 50, U.S.C., App. 2401 et seq. Violations of these export laws are subject to severe criminal penalties. Disseminate in accordance with provisions of DoD Directive 5230.25.",
  short:
    "ITAR CONTROLLED - Export Restricted - U.S. Persons Only",
  footer:
    "This material is subject to the export control laws of the United States. Distribution to foreign nationals or foreign entities is prohibited without prior authorization from the U.S. Department of State.",
};

// Check if user is verified US Person
export async function isVerifiedUSPerson(userId: string): Promise<{
  verified: boolean;
  status: USPersonStatus | null;
  certifiedAt: Date | null;
  certifiedBy: string | null;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      itarCertified: true,
      itarCertifiedAt: true,
      itarCertifiedBy: true,
      usPersonStatus: true,
    },
  });

  if (!user) {
    return { verified: false, status: null, certifiedAt: null, certifiedBy: null };
  }

  const isUSPerson =
    user.usPersonStatus === "US_CITIZEN" ||
    user.usPersonStatus === "PERMANENT_RESIDENT";

  return {
    verified: user.itarCertified && isUSPerson,
    status: user.usPersonStatus as USPersonStatus | null,
    certifiedAt: user.itarCertifiedAt,
    certifiedBy: user.itarCertifiedBy,
  };
}

// Certify user as US Person
export async function certifyUSPerson(
  userId: string,
  status: "US_CITIZEN" | "PERMANENT_RESIDENT",
  certifiedBy: string,
  context?: { ipAddress?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        usPersonStatus: status,
        itarCertified: true,
        itarCertifiedAt: new Date(),
        itarCertifiedBy: certifiedBy,
      },
    });

    // Log the certification
    await createAuditEntry(
      {
        action: "UPDATE",
        entityType: "User",
        entityId: userId,
        fieldName: "itarCertified",
        oldValue: "false",
        newValue: "true",
        changeSummary: `User certified as ${status} for ITAR access`,
        isComplianceEvent: true,
        retentionCategory: "permanent",
      },
      { userId: certifiedBy, ipAddress: context?.ipAddress }
    );

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Certification failed",
    };
  }
}

// Revoke US Person certification
export async function revokeUSPersonCertification(
  userId: string,
  revokedBy: string,
  reason: string,
  context?: { ipAddress?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        itarCertified: false,
        usPersonStatus: "NOT_US_PERSON",
      },
    });

    // Log the revocation
    await createAuditEntry(
      {
        action: "UPDATE",
        entityType: "User",
        entityId: userId,
        fieldName: "itarCertified",
        oldValue: "true",
        newValue: "false",
        changeSummary: `ITAR certification revoked: ${reason}`,
        isSecurityEvent: true,
        isComplianceEvent: true,
        retentionCategory: "permanent",
      },
      { userId: revokedBy, ipAddress: context?.ipAddress }
    );

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Revocation failed",
    };
  }
}

// Register an item as ITAR controlled
export async function registerITARControlledItem(options: {
  entityType: string;
  entityId: string;
  usmlCategory?: USMLCategory;
  eccn?: string;
  controlReason: string;
  markingText?: string;
  classifiedBy: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    // Check if already registered
    const existing = await prisma.iTARControlledItem.findUnique({
      where: {
        entityType_entityId: {
          entityType: options.entityType,
          entityId: options.entityId,
        },
      },
    });

    if (existing) {
      return { success: false, error: "Item is already registered as ITAR controlled" };
    }

    const marking = options.markingText || ITAR_MARKINGS.short;

    const item = await prisma.iTARControlledItem.create({
      data: {
        entityType: options.entityType,
        entityId: options.entityId,
        usmlCategory: options.usmlCategory,
        eccn: options.eccn,
        controlReason: options.controlReason,
        markingRequired: true,
        markingText: marking,
        requiresUsPersonVerification: true,
        classifiedBy: options.classifiedBy,
        status: "active",
        reviewDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year review
      },
    });

    // Log the classification
    await createAuditEntry(
      {
        action: "CREATE",
        entityType: "ITARControlledItem",
        entityId: item.id,
        changeSummary: `Classified ${options.entityType} ${options.entityId} as ITAR controlled`,
        isComplianceEvent: true,
        retentionCategory: "permanent",
      },
      { userId: options.classifiedBy }
    );

    return { success: true, id: item.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Registration failed",
    };
  }
}

// Check if item is ITAR controlled
export async function isITARControlled(
  entityType: string,
  entityId: string
): Promise<{
  controlled: boolean;
  item?: {
    id: string;
    usmlCategory: string | null;
    eccn: string | null;
    markingText: string | null;
    requiresUSPerson: boolean;
  };
}> {
  const item = await prisma.iTARControlledItem.findUnique({
    where: {
      entityType_entityId: { entityType, entityId },
    },
  });

  if (!item || item.status !== "active") {
    return { controlled: false };
  }

  return {
    controlled: true,
    item: {
      id: item.id,
      usmlCategory: item.usmlCategory,
      eccn: item.eccn,
      markingText: item.markingText,
      requiresUSPerson: item.requiresUsPersonVerification,
    },
  };
}

// Check and log ITAR access
export async function checkITARAccess(options: {
  userId: string;
  entityType: string;
  entityId: string;
  accessType: "VIEW" | "DOWNLOAD" | "EXPORT" | "MODIFY";
  purpose?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<{
  granted: boolean;
  reason?: string;
  logId?: string;
}> {
  // Check if item is ITAR controlled
  const controlStatus = await isITARControlled(options.entityType, options.entityId);

  if (!controlStatus.controlled) {
    return { granted: true }; // Not ITAR controlled
  }

  // Check user's US Person status
  const personStatus = await isVerifiedUSPerson(options.userId);
  const granted = personStatus.verified;
  const reason = granted ? undefined : "User is not a verified US Person";

  // Log the access attempt
  const log = await prisma.iTARAccessLog.create({
    data: {
      userId: options.userId,
      controlledItemId: controlStatus.item!.id,
      accessType: options.accessType,
      accessGranted: granted,
      denialReason: reason,
      usPersonVerified: personStatus.verified,
      verificationMethod: personStatus.verified ? "certification" : undefined,
      purpose: options.purpose,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
    },
  });

  // Also log to audit trail
  await createAuditEntry(
    {
      action: granted ? "READ" : "ACCESS_DENIED",
      entityType: options.entityType,
      entityId: options.entityId,
      changeSummary: granted
        ? `ITAR controlled item accessed: ${options.accessType}`
        : `ITAR access denied: ${reason}`,
      isSecurityEvent: !granted,
      isComplianceEvent: true,
      retentionCategory: "permanent",
    },
    {
      userId: options.userId,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
    }
  );

  return { granted, reason, logId: log.id };
}

// Get ITAR access log for an item
export async function getITARAccessLog(options: {
  controlledItemId?: string;
  entityType?: string;
  entityId?: string;
  userId?: string;
  limit?: number;
  offset?: number;
}) {
  let itemId = options.controlledItemId;

  // Find item ID if entity info provided
  if (!itemId && options.entityType && options.entityId) {
    const item = await prisma.iTARControlledItem.findUnique({
      where: {
        entityType_entityId: {
          entityType: options.entityType,
          entityId: options.entityId,
        },
      },
    });
    itemId = item?.id;
  }

  if (!itemId && !options.userId) {
    return { logs: [], total: 0 };
  }

  const where: Record<string, unknown> = {};
  if (itemId) where.controlledItemId = itemId;
  if (options.userId) where.userId = options.userId;

  const [logs, total] = await Promise.all([
    prisma.iTARAccessLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        controlledItem: {
          select: { entityType: true, entityId: true, usmlCategory: true },
        },
      },
      orderBy: { accessedAt: "desc" },
      take: options.limit || 50,
      skip: options.offset || 0,
    }),
    prisma.iTARAccessLog.count({ where }),
  ]);

  return { logs, total };
}

// Get all ITAR controlled items
export async function getITARControlledItems(options?: {
  usmlCategory?: USMLCategory;
  status?: "active" | "declassified" | "superseded";
  limit?: number;
  offset?: number;
}) {
  const where: Record<string, unknown> = {};
  if (options?.usmlCategory) where.usmlCategory = options.usmlCategory;
  if (options?.status) where.status = options.status;

  const [items, total] = await Promise.all([
    prisma.iTARControlledItem.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    }),
    prisma.iTARControlledItem.count({ where }),
  ]);

  return { items, total };
}

// Get ITAR compliance summary
export async function getITARComplianceSummary() {
  const [
    totalControlledItems,
    certifiedUsers,
    accessDenials24h,
    itemsByCategory,
    upcomingReviews,
  ] = await Promise.all([
    prisma.iTARControlledItem.count({ where: { status: "active" } }),
    prisma.user.count({ where: { itarCertified: true } }),
    prisma.iTARAccessLog.count({
      where: {
        accessGranted: false,
        accessedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.iTARControlledItem.groupBy({
      by: ["usmlCategory"],
      where: { status: "active" },
      _count: true,
    }),
    prisma.iTARControlledItem.count({
      where: {
        status: "active",
        reviewDate: {
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Next 30 days
        },
      },
    }),
  ]);

  return {
    totalControlledItems,
    certifiedUsers,
    accessDenials24h,
    itemsByCategory: itemsByCategory.reduce(
      (acc, item) => ({
        ...acc,
        [item.usmlCategory || "Uncategorized"]: item._count,
      }),
      {} as Record<string, number>
    ),
    upcomingReviews,
  };
}

// Declassify an ITAR item
export async function declassifyITARItem(
  controlledItemId: string,
  declassifiedBy: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const item = await prisma.iTARControlledItem.findUnique({
      where: { id: controlledItemId },
    });

    if (!item) {
      return { success: false, error: "Item not found" };
    }

    await prisma.iTARControlledItem.update({
      where: { id: controlledItemId },
      data: { status: "declassified" },
    });

    await createAuditEntry(
      {
        action: "UPDATE",
        entityType: "ITARControlledItem",
        entityId: controlledItemId,
        fieldName: "status",
        oldValue: "active",
        newValue: "declassified",
        changeSummary: `ITAR item declassified: ${reason}`,
        isComplianceEvent: true,
        retentionCategory: "permanent",
      },
      { userId: declassifiedBy }
    );

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Declassification failed",
    };
  }
}
