// src/lib/feature-flags.ts — Feature flags for progressive rollout (Sprint 27)

export const FEATURE_FLAGS = {
  SIDEBAR_V2: process.env.NEXT_PUBLIC_SIDEBAR_V2 !== 'false', // default true (TIP-06)

  // TIP-08: hide 5 cụm khỏi sidebar default. Set true to show.
  SHOW_FINANCE: process.env.NEXT_PUBLIC_SHOW_FINANCE === 'true',
  SHOW_AI_ML: process.env.NEXT_PUBLIC_SHOW_AI_ML === 'true',
  SHOW_MULTITENANT: process.env.NEXT_PUBLIC_SHOW_MULTITENANT === 'true',
  SHOW_MOBILE: process.env.NEXT_PUBLIC_SHOW_MOBILE === 'true',
  SHOW_COMPLIANCE: process.env.NEXT_PUBLIC_SHOW_COMPLIANCE === 'true',
} as const;

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;
