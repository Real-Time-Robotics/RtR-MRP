// src/lib/compliance/password-policy.ts
// Password Policy and Validation System

import { prisma } from "@/lib/prisma";

// Common passwords list (top 100 most common)
const COMMON_PASSWORDS = new Set([
  "password",
  "123456",
  "12345678",
  "qwerty",
  "abc123",
  "monkey",
  "1234567",
  "letmein",
  "trustno1",
  "dragon",
  "baseball",
  "iloveyou",
  "master",
  "sunshine",
  "ashley",
  "bailey",
  "passw0rd",
  "shadow",
  "123123",
  "654321",
  "superman",
  "qazwsx",
  "michael",
  "football",
  "password1",
  "password123",
  "welcome",
  "welcome1",
  "admin",
  "admin123",
  "login",
  "hello",
  "charlie",
  "donald",
  "password!",
  "qwerty123",
  "password2",
  "qwerty1",
  "1q2w3e4r",
  "1234",
  "12345",
  "123456789",
  "1234567890",
  "000000",
  "111111",
  "121212",
  "555555",
  "666666",
  "696969",
  "7777777",
]);

export interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecial: boolean;
  preventReuse: number;
  maxAgeDays: number;
  warnDaysBeforeExpiry: number;
  maxFailedAttempts: number;
  lockoutDurationMinutes: number;
  preventUsername: boolean;
  preventCommonPasswords: boolean;
}

// Default enterprise password policy
export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 12,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecial: true,
  preventReuse: 12,
  maxAgeDays: 90,
  warnDaysBeforeExpiry: 14,
  maxFailedAttempts: 5,
  lockoutDurationMinutes: 30,
  preventUsername: true,
  preventCommonPasswords: true,
};

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  strength: "weak" | "fair" | "good" | "strong";
  score: number;
}

// Get active password policy
export async function getActivePasswordPolicy(): Promise<PasswordPolicy> {
  const policy = await prisma.passwordPolicy.findFirst({
    where: { isDefault: true },
  });

  if (!policy) {
    return DEFAULT_PASSWORD_POLICY;
  }

  return {
    minLength: policy.minLength,
    maxLength: policy.maxLength,
    requireUppercase: policy.requireUppercase,
    requireLowercase: policy.requireLowercase,
    requireNumbers: policy.requireNumbers,
    requireSpecial: policy.requireSpecial,
    preventReuse: policy.preventReuse,
    maxAgeDays: policy.maxAgeDays,
    warnDaysBeforeExpiry: policy.warnDaysBeforeExpiry,
    maxFailedAttempts: policy.maxFailedAttempts,
    lockoutDurationMinutes: policy.lockoutDurationMinutes,
    preventUsername: policy.preventUsername,
    preventCommonPasswords: policy.preventCommonPasswords,
  };
}

// Validate password against policy
export async function validatePassword(
  password: string,
  userId?: string,
  username?: string
): Promise<PasswordValidationResult> {
  const policy = await getActivePasswordPolicy();
  const errors: string[] = [];
  let score = 0;

  // Length checks
  if (password.length < policy.minLength) {
    errors.push(`Password must be at least ${policy.minLength} characters`);
  } else {
    score += 20;
    if (password.length >= 16) score += 10;
    if (password.length >= 20) score += 10;
  }

  if (password.length > policy.maxLength) {
    errors.push(`Password must not exceed ${policy.maxLength} characters`);
  }

  // Character requirements
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  if (policy.requireUppercase && !hasUppercase) {
    errors.push("Password must contain at least one uppercase letter");
  } else if (hasUppercase) {
    score += 15;
  }

  if (policy.requireLowercase && !hasLowercase) {
    errors.push("Password must contain at least one lowercase letter");
  } else if (hasLowercase) {
    score += 15;
  }

  if (policy.requireNumbers && !hasNumbers) {
    errors.push("Password must contain at least one number");
  } else if (hasNumbers) {
    score += 15;
  }

  if (policy.requireSpecial && !hasSpecial) {
    errors.push("Password must contain at least one special character");
  } else if (hasSpecial) {
    score += 15;
  }

  // Username check
  if (policy.preventUsername && username) {
    if (password.toLowerCase().includes(username.toLowerCase())) {
      errors.push("Password cannot contain your username");
      score -= 20;
    }
  }

  // Common passwords check
  if (policy.preventCommonPasswords) {
    if (COMMON_PASSWORDS.has(password.toLowerCase())) {
      errors.push("This password is too common");
      score = Math.min(score, 20);
    }
  }

  // Check for sequential/repeated characters
  if (/(.)\1{2,}/.test(password)) {
    errors.push("Password cannot contain 3 or more repeated characters");
    score -= 10;
  }

  if (/(?:012|123|234|345|456|567|678|789|890|abc|bcd|cde|xyz)/i.test(password)) {
    score -= 10;
  }

  // Check password history if userId provided
  if (userId && policy.preventReuse > 0) {
    const reused = await checkPasswordHistory(userId, password, policy.preventReuse);
    if (reused) {
      errors.push(`Cannot reuse any of your last ${policy.preventReuse} passwords`);
    }
  }

  // Determine strength
  let strength: "weak" | "fair" | "good" | "strong";
  if (score < 30) strength = "weak";
  else if (score < 50) strength = "fair";
  else if (score < 70) strength = "good";
  else strength = "strong";

  return {
    valid: errors.length === 0,
    errors,
    strength,
    score: Math.max(0, Math.min(100, score)),
  };
}

// Check password against history
async function checkPasswordHistory(
  userId: string,
  password: string,
  historyCount: number
): Promise<boolean> {
  const history = await prisma.passwordHistory.findMany({
    where: { userId },
    orderBy: { changedAt: "desc" },
    take: historyCount,
  });

  const bcrypt = await import("bcryptjs");
  for (const entry of history) {
    const isMatch = await bcrypt.compare(password, entry.passwordHash);
    if (isMatch) return true;
  }

  return false;
}

// Add password to history
export async function addToPasswordHistory(
  userId: string,
  passwordHash: string,
  reason: string = "user_initiated",
  changedBy?: string
): Promise<void> {
  await prisma.passwordHistory.create({
    data: {
      userId,
      passwordHash,
      changeReason: reason,
      changedBy,
    },
  });
}

// Check if password is expired
export async function isPasswordExpired(userId: string): Promise<{
  expired: boolean;
  expiresAt?: Date;
  mustChange: boolean;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordChangedAt: true, mustChangePassword: true },
  });

  if (!user) {
    return { expired: false, mustChange: false };
  }

  if (user.mustChangePassword) {
    return { expired: true, mustChange: true };
  }

  const policy = await getActivePasswordPolicy();

  if (policy.maxAgeDays === 0) {
    return { expired: false, mustChange: false };
  }

  const passwordAge = user.passwordChangedAt || new Date(0);
  const expiresAt = new Date(passwordAge);
  expiresAt.setDate(expiresAt.getDate() + policy.maxAgeDays);

  return {
    expired: new Date() > expiresAt,
    expiresAt,
    mustChange: false,
  };
}

// Check if password is expiring soon
export async function isPasswordExpiringSoon(userId: string): Promise<{
  expiringSoon: boolean;
  daysRemaining?: number;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordChangedAt: true },
  });

  if (!user?.passwordChangedAt) {
    return { expiringSoon: false };
  }

  const policy = await getActivePasswordPolicy();

  if (policy.maxAgeDays === 0) {
    return { expiringSoon: false };
  }

  const expiresAt = new Date(user.passwordChangedAt);
  expiresAt.setDate(expiresAt.getDate() + policy.maxAgeDays);

  const daysRemaining = Math.ceil(
    (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return {
    expiringSoon: daysRemaining <= policy.warnDaysBeforeExpiry && daysRemaining > 0,
    daysRemaining: Math.max(0, daysRemaining),
  };
}

// Handle failed login attempt
export async function handleFailedLogin(userId: string): Promise<{
  locked: boolean;
  lockedUntil?: Date;
  attemptsRemaining: number;
}> {
  const policy = await getActivePasswordPolicy();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { failedLoginCount: true, lockedUntil: true },
  });

  if (!user) {
    return { locked: false, attemptsRemaining: policy.maxFailedAttempts };
  }

  // Check if still locked
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return {
      locked: true,
      lockedUntil: user.lockedUntil,
      attemptsRemaining: 0,
    };
  }

  const newCount = user.failedLoginCount + 1;
  const shouldLock = newCount >= policy.maxFailedAttempts;

  const lockedUntil = shouldLock
    ? new Date(Date.now() + policy.lockoutDurationMinutes * 60 * 1000)
    : null;

  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginCount: shouldLock ? 0 : newCount,
      lockedUntil,
    },
  });

  return {
    locked: shouldLock,
    lockedUntil: lockedUntil || undefined,
    attemptsRemaining: Math.max(0, policy.maxFailedAttempts - newCount),
  };
}

// Reset failed login attempts on successful login
export async function resetFailedLoginAttempts(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginCount: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    },
  });
}

// Check if user account is locked
export async function isAccountLocked(userId: string): Promise<{
  locked: boolean;
  lockedUntil?: Date;
  reason?: string;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lockedUntil: true, status: true },
  });

  if (!user) {
    return { locked: false };
  }

  if (user.status === "suspended" || user.status === "inactive") {
    return { locked: true, reason: `Account is ${user.status}` };
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return {
      locked: true,
      lockedUntil: user.lockedUntil,
      reason: "Too many failed login attempts",
    };
  }

  return { locked: false };
}

// Generate password strength meter data
export function getPasswordStrengthMeter(password: string): {
  score: number;
  label: string;
  color: string;
  suggestions: string[];
} {
  let score = 0;
  const suggestions: string[] = [];

  // Length scoring
  if (password.length >= 8) score += 10;
  if (password.length >= 12) score += 15;
  if (password.length >= 16) score += 10;
  if (password.length < 12) suggestions.push("Use at least 12 characters");

  // Character variety scoring
  if (/[A-Z]/.test(password)) score += 15;
  else suggestions.push("Add uppercase letters");

  if (/[a-z]/.test(password)) score += 15;
  else suggestions.push("Add lowercase letters");

  if (/[0-9]/.test(password)) score += 15;
  else suggestions.push("Add numbers");

  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 20;
  else suggestions.push("Add special characters");

  // Penalty for common patterns
  if (/(.)\1{2,}/.test(password)) {
    score -= 15;
    suggestions.push("Avoid repeated characters");
  }

  if (/^[a-zA-Z]+$/.test(password)) {
    score -= 10;
    suggestions.push("Mix different character types");
  }

  score = Math.max(0, Math.min(100, score));

  let label: string;
  let color: string;

  if (score < 30) {
    label = "Weak";
    color = "red";
  } else if (score < 50) {
    label = "Fair";
    color = "orange";
  } else if (score < 70) {
    label = "Good";
    color = "yellow";
  } else {
    label = "Strong";
    color = "green";
  }

  return { score, label, color, suggestions: suggestions.slice(0, 3) };
}
