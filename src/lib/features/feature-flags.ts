import prisma from "../prisma";

export const FEATURE_FLAGS = {
  USE_WIP_WAREHOUSE: "use_wip_warehouse",
  USE_FG_WAREHOUSE: "use_fg_warehouse",
  USE_SHIP_WAREHOUSE: "use_ship_warehouse",
} as const;

export type FeatureFlagKey = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];

export async function isFeatureEnabled(flagName: FeatureFlagKey): Promise<boolean> {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: flagName },
  });
  return setting?.value === "true";
}

export async function getAllFeatureFlags(): Promise<Record<string, boolean>> {
  const settings = await prisma.systemSetting.findMany({
    where: {
      key: { in: Object.values(FEATURE_FLAGS) },
    },
  });

  const flags: Record<string, boolean> = {};
  for (const key of Object.values(FEATURE_FLAGS)) {
    const setting = settings.find((s) => s.key === key);
    flags[key] = setting?.value === "true";
  }
  return flags;
}

export async function setFeatureFlag(
  flagName: FeatureFlagKey,
  value: boolean,
  userId?: string
): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key: flagName },
    create: {
      key: flagName,
      value: value.toString(),
      updatedBy: userId,
    },
    update: {
      value: value.toString(),
      updatedBy: userId,
    },
  });
}
