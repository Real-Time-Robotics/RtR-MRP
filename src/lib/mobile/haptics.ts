// Haptic feedback utilities for mobile devices
import { clientLogger } from '@/lib/client-logger';

export type HapticPattern =
  | "light"
  | "medium"
  | "heavy"
  | "success"
  | "warning"
  | "error"
  | "selection";

// Vibration patterns in milliseconds
const PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 40,
  success: [50, 50, 50],
  warning: [100, 50, 100],
  error: [100, 50, 100, 50, 100],
  selection: 5,
};

// Check if haptics are supported
export function supportsHaptics(): boolean {
  return "vibrate" in navigator;
}

// Trigger haptic feedback
export function haptic(pattern: HapticPattern = "medium"): boolean {
  if (!supportsHaptics()) {
    return false;
  }

  const vibrationPattern = PATTERNS[pattern];
  return navigator.vibrate(vibrationPattern);
}

// Stop any ongoing vibration
export function stopHaptic(): void {
  if (supportsHaptics()) {
    navigator.vibrate(0);
  }
}

// Custom vibration pattern
export function customHaptic(pattern: number | number[]): boolean {
  if (!supportsHaptics()) {
    return false;
  }

  return navigator.vibrate(pattern);
}

// Haptic feedback for specific actions
export const hapticFeedback = {
  // Scan success
  scanSuccess: () => haptic("success"),

  // Scan error
  scanError: () => haptic("error"),

  // Item selected
  itemSelected: () => haptic("selection"),

  // Button pressed
  buttonPress: () => haptic("light"),

  // Form submitted
  formSubmit: () => haptic("medium"),

  // Warning alert
  warning: () => haptic("warning"),

  // Error alert
  error: () => haptic("error"),

  // Refresh gesture
  refresh: () => haptic("medium"),

  // Pull to refresh complete
  refreshComplete: () => haptic("success"),

  // Swipe action
  swipe: () => haptic("light"),

  // Long press start
  longPressStart: () => haptic("medium"),

  // Long press end
  longPressEnd: () => haptic("light"),
};

// Audio feedback for devices that support it
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext ||
      (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioContext;
}

export interface BeepOptions {
  frequency?: number;
  duration?: number;
  volume?: number;
  type?: OscillatorType;
}

// Play a beep sound
export function playBeep(options: BeepOptions = {}): void {
  const {
    frequency = 1800,
    duration = 100,
    volume = 0.1,
    type = "sine",
  } = options;

  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;
    gainNode.gain.value = volume;

    oscillator.start();
    oscillator.stop(ctx.currentTime + duration / 1000);
  } catch (error) {
    clientLogger.warn("Failed to play beep", error);
  }
}

// Sound effects for specific actions
export const soundFeedback = {
  // Success beep
  success: () =>
    playBeep({ frequency: 2000, duration: 100, volume: 0.1 }),

  // Error beep
  error: () => {
    playBeep({ frequency: 400, duration: 200, volume: 0.1 });
  },

  // Scan beep
  scan: () =>
    playBeep({ frequency: 1800, duration: 80, volume: 0.1 }),

  // Warning beep
  warning: () => {
    playBeep({ frequency: 800, duration: 150, volume: 0.1 });
    setTimeout(() => playBeep({ frequency: 800, duration: 150, volume: 0.1 }), 200);
  },

  // Confirmation
  confirm: () => {
    playBeep({ frequency: 1500, duration: 100, volume: 0.1 });
    setTimeout(() => playBeep({ frequency: 2000, duration: 100, volume: 0.1 }), 120);
  },
};

// Combined feedback (haptic + sound)
export const feedback = {
  scanSuccess: () => {
    hapticFeedback.scanSuccess();
    soundFeedback.scan();
  },

  scanError: () => {
    hapticFeedback.scanError();
    soundFeedback.error();
  },

  success: () => {
    hapticFeedback.scanSuccess();
    soundFeedback.success();
  },

  error: () => {
    hapticFeedback.error();
    soundFeedback.error();
  },

  warning: () => {
    hapticFeedback.warning();
    soundFeedback.warning();
  },

  confirm: () => {
    hapticFeedback.formSubmit();
    soundFeedback.confirm();
  },
};
