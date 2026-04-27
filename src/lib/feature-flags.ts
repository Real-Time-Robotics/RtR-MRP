// src/lib/feature-flags.ts — Feature flags for progressive rollout (Sprint 27)

export const FEATURE_FLAGS = {
  SIDEBAR_V2: process.env.NEXT_PUBLIC_SIDEBAR_V2 !== 'false', // default true
} as const;
