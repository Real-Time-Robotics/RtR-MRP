// =============================================================================
// DESIGN TOKENS
// =============================================================================

export const MOBILE_TOKENS = {
  safeArea: {
    top: 'env(safe-area-inset-top, 0px)',
    bottom: 'env(safe-area-inset-bottom, 0px)',
    left: 'env(safe-area-inset-left, 0px)',
    right: 'env(safe-area-inset-right, 0px)',
  },
};

// =============================================================================
// HAPTIC FEEDBACK
// =============================================================================

export const haptic = {
  light: () => navigator?.vibrate?.(10),
  medium: () => navigator?.vibrate?.(20),
  heavy: () => navigator?.vibrate?.(30),
  success: () => navigator?.vibrate?.([10, 30, 10]),
  warning: () => navigator?.vibrate?.([20, 40, 20]),
  error: () => navigator?.vibrate?.([30, 50, 30, 50, 30]),
  selection: () => navigator?.vibrate?.(5),
};
