// src/lib/compliance/index.ts
// Compliance Module Exports

// Electronic Signatures (21 CFR Part 11)
export {
  createElectronicSignature,
  verifySignatureChain,
  getSignatureHistory,
  checkRequiredSignatures,
  getWorkflowStatus,
  SIGNATURE_MEANINGS,
  DEFAULT_WORKFLOWS,
  type SignatureRequest,
  type SignatureResult,
  type SignatureMeaning,
  type SignatureAction,
} from "./electronic-signature";

// Multi-Factor Authentication — now handled by RTR Auth Gateway
// MFA exports removed: setupMFA, verifyMFASetup, etc.

// Enhanced Audit Trail
export {
  createAuditEntry,
  createBatchAuditEntries,
  verifyAuditTrailIntegrity,
  searchAuditTrail,
  getEntityHistory,
  getSecurityEvents,
  getComplianceEvents,
  generateAuditReport,
  createAuditMiddleware,
  type AuditAction,
  type AuditContext,
  type AuditEntryInput,
  type AuditSearchParams,
  type RetentionCategory,
} from "./audit-trail";

// Password Policy
export {
  validatePassword,
  getActivePasswordPolicy,
  addToPasswordHistory,
  isPasswordExpired,
  isPasswordExpiringSoon,
  handleFailedLogin,
  resetFailedLoginAttempts,
  isAccountLocked,
  getPasswordStrengthMeter,
  DEFAULT_PASSWORD_POLICY,
  type PasswordPolicy,
  type PasswordValidationResult,
} from "./password-policy";

// Session Management — now handled by RTR Auth Gateway
// Exports removed: createSession, validateSession, etc.

// ITAR Controls
export {
  isVerifiedUSPerson,
  certifyUSPerson,
  revokeUSPersonCertification,
  registerITARControlledItem,
  isITARControlled,
  checkITARAccess,
  getITARAccessLog,
  getITARControlledItems,
  getITARComplianceSummary,
  declassifyITARItem,
  USML_CATEGORIES,
  ITAR_MARKINGS,
  type USPersonStatus,
  type USMLCategory,
} from "./itar-controls";
