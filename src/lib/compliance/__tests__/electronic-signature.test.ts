import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  SIGNATURE_MEANINGS,
  createElectronicSignature,
  verifySignatureChain,
  getSignatureHistory,
  checkRequiredSignatures,
  getWorkflowStatus,
  DEFAULT_WORKFLOWS,
} from '../electronic-signature';
import type { SignatureRequest, SignatureVerification } from '../electronic-signature';

// ---- mocks ----

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    user: { findUnique: vi.fn() },
    electronicSignature: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

const { mockBcrypt } = vi.hoisted(() => ({
  mockBcrypt: { compare: vi.fn() },
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), logError: vi.fn() },
}));
vi.mock('bcryptjs', () => mockBcrypt);

// ---- helpers ----

function makeRequest(overrides?: Partial<SignatureRequest>): SignatureRequest {
  return {
    userId: 'user-1',
    entityType: 'NCR',
    entityId: 'ncr-1',
    action: 'APPROVE',
    verificationMethod: 'password',
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
    ...overrides,
  };
}

function makeVerification(overrides?: Partial<SignatureVerification>): SignatureVerification {
  return { password: 'secret123', ...overrides };
}

// ---- tests ----

describe('Electronic Signature', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ----- SIGNATURE_MEANINGS -----

  describe('SIGNATURE_MEANINGS', () => {
    it('should contain all 8 meaning keys', () => {
      const keys = Object.keys(SIGNATURE_MEANINGS);
      expect(keys).toEqual([
        'APPROVE', 'REJECT', 'REVIEW', 'RELEASE', 'VERIFY', 'COMPLETE', 'AUTHOR', 'WITNESS',
      ]);
    });
  });

  // ----- DEFAULT_WORKFLOWS -----

  describe('DEFAULT_WORKFLOWS', () => {
    it('should define NCR, CAPA, WorkOrder, Inspection workflows', () => {
      expect(Object.keys(DEFAULT_WORKFLOWS)).toEqual(['NCR', 'CAPA', 'WorkOrder', 'Inspection']);
    });

    it('should have ordered required signatures for each workflow', () => {
      for (const wf of Object.values(DEFAULT_WORKFLOWS)) {
        const orders = wf.requiredSignatures.map((s) => s.order);
        expect(orders).toEqual([...orders].sort((a, b) => a - b));
      }
    });
  });

  // ----- createElectronicSignature -----

  describe('createElectronicSignature', () => {
    it('should return error when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await createElectronicSignature(makeRequest(), makeVerification());
      expect(result).toEqual({ success: false, error: 'User not found' });
    });

    it('should return error when user is not active', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', password: 'hashed', status: 'suspended', mfaEnabled: false });

      const result = await createElectronicSignature(makeRequest(), makeVerification());
      expect(result).toEqual({ success: false, error: 'User account is not active' });
    });

    it('should return error when password is invalid', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', password: 'hashed', status: 'active', mfaEnabled: false });
      mockBcrypt.compare.mockResolvedValue(false);

      const result = await createElectronicSignature(makeRequest(), makeVerification());
      expect(result).toEqual({ success: false, error: 'Invalid password' });
    });

    it('should create signature successfully with password verification', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', password: 'hashed', status: 'active', mfaEnabled: false });
      mockBcrypt.compare.mockResolvedValue(true);
      mockPrisma.electronicSignature.findFirst.mockResolvedValue(null);
      mockPrisma.electronicSignature.create.mockResolvedValue({ id: 'sig-1', signatureHash: 'abc123' });

      const result = await createElectronicSignature(makeRequest(), makeVerification());

      expect(result.success).toBe(true);
      expect(result.signatureId).toBe('sig-1');
      expect(result.signatureHash).toBe('abc123');
    });

    it('should chain to previous signature when one exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', password: 'hashed', status: 'active', mfaEnabled: false });
      mockBcrypt.compare.mockResolvedValue(true);
      mockPrisma.electronicSignature.findFirst.mockResolvedValue({ id: 'prev-sig', chainHash: 'prevhash' });
      mockPrisma.electronicSignature.create.mockResolvedValue({ id: 'sig-2', signatureHash: 'def456' });

      const result = await createElectronicSignature(makeRequest(), makeVerification());
      expect(result.success).toBe(true);

      const createCall = mockPrisma.electronicSignature.create.mock.calls[0][0];
      expect(createCall.data.previousSignatureId).toBe('prev-sig');
      expect(createCall.data.chainHash).toHaveLength(64);
    });

    it('should use custom meaning if provided', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', password: 'hashed', status: 'active', mfaEnabled: false });
      mockBcrypt.compare.mockResolvedValue(true);
      mockPrisma.electronicSignature.findFirst.mockResolvedValue(null);
      mockPrisma.electronicSignature.create.mockResolvedValue({ id: 'sig-3', signatureHash: 'ghi789' });

      await createElectronicSignature(makeRequest({ meaning: 'Custom meaning' }), makeVerification());
      const data = mockPrisma.electronicSignature.create.mock.calls[0][0].data;
      expect(data.meaning).toBe('Custom meaning');
    });

    it('should use default meaning from SIGNATURE_MEANINGS if none provided', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', password: 'hashed', status: 'active', mfaEnabled: false });
      mockBcrypt.compare.mockResolvedValue(true);
      mockPrisma.electronicSignature.findFirst.mockResolvedValue(null);
      mockPrisma.electronicSignature.create.mockResolvedValue({ id: 'sig-4', signatureHash: 'jkl012' });

      await createElectronicSignature(makeRequest({ action: 'REVIEW', meaning: undefined }), makeVerification());
      const data = mockPrisma.electronicSignature.create.mock.calls[0][0].data;
      expect(data.meaning).toBe(SIGNATURE_MEANINGS.REVIEW);
    });

    it('should verify via MFA TOTP when mfaEnabled', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', password: 'hashed', status: 'active', mfaEnabled: true });
      mockPrisma.electronicSignature.findFirst.mockResolvedValue(null);
      mockPrisma.electronicSignature.create.mockResolvedValue({ id: 'sig-5', signatureHash: 'mno345' });

      const result = await createElectronicSignature(
        makeRequest({ verificationMethod: 'mfa_totp' }),
        { totpCode: '123456' },
      );
      expect(result.success).toBe(true);
    });

    it('should fail MFA TOTP when mfaEnabled is false', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', password: 'hashed', status: 'active', mfaEnabled: false });

      const result = await createElectronicSignature(
        makeRequest({ verificationMethod: 'mfa_totp' }),
        { totpCode: '123456' },
      );
      expect(result).toEqual({ success: false, error: 'MFA is not enabled for this user' });
    });

    it('should return error for invalid verification method', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', password: 'hashed', status: 'active', mfaEnabled: false });

      const result = await createElectronicSignature(
        makeRequest({ verificationMethod: 'biometric' }),
        {},
      );
      expect(result).toEqual({ success: false, error: 'Invalid verification method' });
    });

    it('should handle exceptions and return error', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('DB down'));

      const result = await createElectronicSignature(makeRequest(), makeVerification());
      expect(result.success).toBe(false);
      expect(result.error).toBe('DB down');
    });

    it('should handle non-Error exceptions', async () => {
      mockPrisma.user.findUnique.mockRejectedValue('some string error');

      const result = await createElectronicSignature(makeRequest(), makeVerification());
      expect(result.success).toBe(false);
      expect(result.error).toBe('Signature failed');
    });
  });

  // ----- verifySignatureChain -----

  describe('verifySignatureChain', () => {
    it('should return valid with 0 signatures when none exist', async () => {
      mockPrisma.electronicSignature.findMany.mockResolvedValue([]);

      const result = await verifySignatureChain('NCR', 'ncr-1');
      expect(result).toEqual({ valid: true, signatures: 0 });
    });

    it('should validate a single signature chain', async () => {
      const ts = new Date('2025-01-01T00:00:00Z');
      // We need to compute what the expected hash should be
      const { createHash } = await import('crypto');
      const hashInput = JSON.stringify({
        userId: 'u1', entityType: 'NCR', entityId: 'ncr-1',
        action: 'APPROVE',
        meaning: 'I approve',
        timestamp: ts.toISOString(),
      });
      const expectedSigHash = createHash('sha256').update(hashInput).digest('hex');
      const expectedChainHash = createHash('sha256').update(expectedSigHash).digest('hex');

      mockPrisma.electronicSignature.findMany.mockResolvedValue([
        {
          id: 'sig-1', userId: 'u1', entityType: 'NCR', entityId: 'ncr-1',
          action: 'APPROVE', meaning: 'I approve', signedAt: ts,
          signatureHash: expectedSigHash, chainHash: expectedChainHash,
          user: { id: 'u1', name: 'User', email: 'u@t.com' },
        },
      ]);

      const result = await verifySignatureChain('NCR', 'ncr-1');
      expect(result).toEqual({ valid: true, signatures: 1 });
    });

    it('should detect signature hash mismatch', async () => {
      const ts = new Date('2025-01-01T00:00:00Z');
      mockPrisma.electronicSignature.findMany.mockResolvedValue([
        {
          id: 'sig-1', userId: 'u1', entityType: 'NCR', entityId: 'ncr-1',
          action: 'APPROVE', meaning: 'I approve', signedAt: ts,
          signatureHash: 'tampered-hash', chainHash: 'some-chain',
          user: { id: 'u1', name: 'User', email: 'u@t.com' },
        },
      ]);

      const result = await verifySignatureChain('NCR', 'ncr-1');
      expect(result.valid).toBe(false);
      expect(result.brokenAt).toBe('sig-1');
      expect(result.error).toContain('Signature hash mismatch');
    });

    it('should detect chain hash mismatch', async () => {
      const ts = new Date('2025-01-01T00:00:00Z');
      const { createHash } = await import('crypto');
      const hashInput = JSON.stringify({
        userId: 'u1', entityType: 'NCR', entityId: 'ncr-1',
        action: 'APPROVE', meaning: 'I approve',
        timestamp: ts.toISOString(),
      });
      const correctSigHash = createHash('sha256').update(hashInput).digest('hex');

      mockPrisma.electronicSignature.findMany.mockResolvedValue([
        {
          id: 'sig-1', userId: 'u1', entityType: 'NCR', entityId: 'ncr-1',
          action: 'APPROVE', meaning: 'I approve', signedAt: ts,
          signatureHash: correctSigHash, chainHash: 'wrong-chain-hash',
          user: { id: 'u1', name: 'User', email: 'u@t.com' },
        },
      ]);

      const result = await verifySignatureChain('NCR', 'ncr-1');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Chain hash mismatch');
    });

    it('should handle exceptions', async () => {
      mockPrisma.electronicSignature.findMany.mockRejectedValue(new Error('DB error'));

      const result = await verifySignatureChain('NCR', 'ncr-1');
      expect(result).toEqual({ valid: false, signatures: 0, error: 'DB error' });
    });

    it('should handle non-Error exceptions', async () => {
      mockPrisma.electronicSignature.findMany.mockRejectedValue('string error');

      const result = await verifySignatureChain('NCR', 'ncr-1');
      expect(result).toEqual({ valid: false, signatures: 0, error: 'Verification failed' });
    });
  });

  // ----- getSignatureHistory -----

  describe('getSignatureHistory', () => {
    it('should return mapped signature history', async () => {
      mockPrisma.electronicSignature.findMany.mockResolvedValue([
        {
          id: 'sig-1', action: 'APPROVE', meaning: 'I approve',
          signedAt: new Date('2025-06-01'), verificationMethod: 'password',
          ipAddress: '1.2.3.4',
          user: { id: 'u1', name: 'Alice', email: 'alice@test.com' },
        },
      ]);

      const history = await getSignatureHistory('NCR', 'ncr-1');
      expect(history).toHaveLength(1);
      expect(history[0]).toEqual({
        id: 'sig-1',
        action: 'APPROVE',
        meaning: 'I approve',
        signedAt: expect.any(Date),
        signedBy: { id: 'u1', name: 'Alice', email: 'alice@test.com' },
        verificationMethod: 'password',
        ipAddress: '1.2.3.4',
        isChainValid: true,
      });
    });

    it('should return empty array when no signatures', async () => {
      mockPrisma.electronicSignature.findMany.mockResolvedValue([]);
      const history = await getSignatureHistory('NCR', 'ncr-1');
      expect(history).toEqual([]);
    });
  });

  // ----- checkRequiredSignatures -----

  describe('checkRequiredSignatures', () => {
    it('should report complete when all required signatures exist', async () => {
      mockPrisma.electronicSignature.findMany.mockResolvedValue([
        { action: 'APPROVE' },
        { action: 'REVIEW' },
      ]);

      const result = await checkRequiredSignatures('NCR', 'ncr-1', ['APPROVE', 'REVIEW']);
      expect(result.complete).toBe(true);
      expect(result.missing).toEqual([]);
      expect(result.signatures).toEqual({ APPROVE: true, REVIEW: true });
    });

    it('should report missing signatures', async () => {
      mockPrisma.electronicSignature.findMany.mockResolvedValue([
        { action: 'APPROVE' },
      ]);

      const result = await checkRequiredSignatures('NCR', 'ncr-1', ['APPROVE', 'REVIEW', 'VERIFY']);
      expect(result.complete).toBe(false);
      expect(result.missing).toEqual(['REVIEW', 'VERIFY']);
    });

    it('should handle empty required actions', async () => {
      mockPrisma.electronicSignature.findMany.mockResolvedValue([]);

      const result = await checkRequiredSignatures('NCR', 'ncr-1', []);
      expect(result.complete).toBe(true);
      expect(result.missing).toEqual([]);
    });
  });

  // ----- getWorkflowStatus -----

  describe('getWorkflowStatus', () => {
    it('should return hasWorkflow false for unknown entity type', async () => {
      const result = await getWorkflowStatus('UnknownType', 'id-1');
      expect(result).toEqual({ hasWorkflow: false });
    });

    it('should return workflow status for NCR with no signatures', async () => {
      mockPrisma.electronicSignature.findMany.mockResolvedValue([]);

      const result = await getWorkflowStatus('NCR', 'ncr-1');
      expect(result.hasWorkflow).toBe(true);
      expect(result.isComplete).toBe(false);
      expect(result.progress).toEqual({ completed: 0, total: 3, percentage: 0 });
      expect(result.currentStep).toBe('AUTHOR');
    });

    it('should reflect completed steps for NCR', async () => {
      mockPrisma.electronicSignature.findMany.mockResolvedValue([
        { action: 'AUTHOR', user: { id: 'u1', name: 'Alice', role: 'quality' }, signedAt: new Date() },
        { action: 'REVIEW', user: { id: 'u2', name: 'Bob', role: 'quality_manager' }, signedAt: new Date() },
      ]);

      const result = await getWorkflowStatus('NCR', 'ncr-1');
      expect(result.hasWorkflow).toBe(true);
      expect(result.progress).toEqual({ completed: 2, total: 3, percentage: 67 });
      expect(result.currentStep).toBe('APPROVE');
      expect(result.isComplete).toBe(false);
    });

    it('should mark workflow complete when all steps signed', async () => {
      mockPrisma.electronicSignature.findMany.mockResolvedValue([
        { action: 'AUTHOR', user: { id: 'u1', name: 'A', role: 'quality' }, signedAt: new Date() },
        { action: 'REVIEW', user: { id: 'u2', name: 'B', role: 'quality_manager' }, signedAt: new Date() },
        { action: 'APPROVE', user: { id: 'u3', name: 'C', role: 'admin' }, signedAt: new Date() },
      ]);

      const result = await getWorkflowStatus('NCR', 'ncr-1');
      expect(result.isComplete).toBe(true);
      expect(result.currentStep).toBe(null);
      expect(result.progress?.percentage).toBe(100);
    });

    it('should return correct steps for CAPA workflow', async () => {
      mockPrisma.electronicSignature.findMany.mockResolvedValue([]);

      const result = await getWorkflowStatus('CAPA', 'capa-1');
      expect(result.hasWorkflow).toBe(true);
      expect((result as any).steps).toHaveLength(4);
      expect(result.progress).toEqual({ completed: 0, total: 4, percentage: 0 });
    });

    it('should return correct steps for WorkOrder workflow', async () => {
      mockPrisma.electronicSignature.findMany.mockResolvedValue([]);

      const result = await getWorkflowStatus('WorkOrder', 'wo-1');
      expect(result.hasWorkflow).toBe(true);
      expect((result as any).steps).toHaveLength(3);
    });

    it('should return correct steps for Inspection workflow', async () => {
      mockPrisma.electronicSignature.findMany.mockResolvedValue([]);

      const result = await getWorkflowStatus('Inspection', 'insp-1');
      expect(result.hasWorkflow).toBe(true);
      expect((result as any).steps).toHaveLength(3);
    });
  });
});
