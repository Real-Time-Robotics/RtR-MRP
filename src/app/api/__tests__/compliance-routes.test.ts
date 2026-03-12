/**
 * Compliance API Routes Tests
 * Tests for /api/compliance/signatures, /api/compliance/mfa/verify, /api/compliance/mfa/setup
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    logError: vi.fn(),
  },
}));

vi.mock('@/lib/compliance', () => ({
  createElectronicSignature: vi.fn(),
  verifySignatureChain: vi.fn(),
  getSignatureHistory: vi.fn(),
  getWorkflowStatus: vi.fn(),
  setupMFA: vi.fn(),
  verifyMFASetup: vi.fn(),
  verifyMFALogin: vi.fn(),
  createMFAChallenge: vi.fn(),
  verifyMFAChallenge: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkWriteEndpointLimit: vi.fn(() => Promise.resolve(null)),
  checkReadEndpointLimit: vi.fn(() => Promise.resolve(null)),
}));

import { auth } from '@/lib/auth';
import {
  createElectronicSignature,
  setupMFA,
  verifyMFASetup,
  verifyMFALogin,
  createMFAChallenge,
  verifyMFAChallenge,
} from '@/lib/compliance';

const mockContext = { params: Promise.resolve({}) };

const mockAdminSession = {
  user: { id: 'user-1', email: 'admin@test.com', role: 'admin', name: 'Admin User' },
};

const mockUserSession = {
  user: { id: 'user-2', email: 'user@test.com', role: 'user', name: 'Regular User' },
};

function createPostRequest(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('Compliance API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth as Mock).mockResolvedValue(mockAdminSession);
  });

  // ===========================================================================
  // POST /api/compliance/signatures
  // ===========================================================================
  describe('POST /api/compliance/signatures', () => {
    let POST: (...args: any[]) => Promise<Response>;

    beforeEach(async () => {
      // eslint-disable-next-line @next/next/no-assign-module-variable
      const module = await import('../compliance/signatures/route');
      POST = module.POST;
    });

    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = createPostRequest('http://localhost:3000/api/compliance/signatures', {
        entityType: 'PURCHASE_ORDER',
        entityId: 'po-1',
        action: 'APPROVE',
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 when user is not admin', async () => {
      (auth as Mock).mockResolvedValue(mockUserSession);

      const request = createPostRequest('http://localhost:3000/api/compliance/signatures', {
        entityType: 'PURCHASE_ORDER',
        entityId: 'po-1',
        action: 'APPROVE',
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should create signature successfully for valid request', async () => {
      (createElectronicSignature as Mock).mockResolvedValue({
        success: true,
        signatureId: 'sig-1',
        signatureHash: 'hash-abc123',
      });

      const request = createPostRequest('http://localhost:3000/api/compliance/signatures', {
        entityType: 'PURCHASE_ORDER',
        entityId: 'po-1',
        action: 'APPROVE',
        meaning: 'Approved for procurement',
        verificationMethod: 'password',
        password: 'secret123',
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.signatureId).toBe('sig-1');
      expect(data.signatureHash).toBe('hash-abc123');
      expect(createElectronicSignature).toHaveBeenCalledOnce();
    });

    it('should return 400 for invalid action type', async () => {
      const request = createPostRequest('http://localhost:3000/api/compliance/signatures', {
        entityType: 'PURCHASE_ORDER',
        entityId: 'po-1',
        action: 'INVALID_ACTION', // Not in the enum
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 400 when missing required fields', async () => {
      const request = createPostRequest('http://localhost:3000/api/compliance/signatures', {
        entityType: 'PURCHASE_ORDER',
        // missing entityId and action
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it('should return 400 when createElectronicSignature fails', async () => {
      (createElectronicSignature as Mock).mockResolvedValue({
        success: false,
        error: 'Invalid password',
      });

      const request = createPostRequest('http://localhost:3000/api/compliance/signatures', {
        entityType: 'PURCHASE_ORDER',
        entityId: 'po-1',
        action: 'APPROVE',
        password: 'wrong-password',
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid password');
    });
  });

  // ===========================================================================
  // POST /api/compliance/mfa/verify
  // ===========================================================================
  describe('POST /api/compliance/mfa/verify', () => {
    let POST: (...args: any[]) => Promise<Response>;

    beforeEach(async () => {
      // eslint-disable-next-line @next/next/no-assign-module-variable
      const module = await import('../compliance/mfa/verify/route');
      POST = module.POST;
    });

    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = createPostRequest('http://localhost:3000/api/compliance/mfa/verify', {
        action: 'login',
        userId: 'user-1',
        code: '123456',
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
    });

    it('should verify MFA login successfully', async () => {
      (verifyMFALogin as Mock).mockResolvedValue({ success: true });

      const request = createPostRequest('http://localhost:3000/api/compliance/mfa/verify', {
        action: 'login',
        userId: 'user-1',
        code: '123456',
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(verifyMFALogin).toHaveBeenCalledWith('user-1', '123456', expect.any(String));
    });

    it('should return 400 when MFA login verification fails', async () => {
      (verifyMFALogin as Mock).mockResolvedValue({ success: false, error: 'Invalid code' });

      const request = createPostRequest('http://localhost:3000/api/compliance/mfa/verify', {
        action: 'login',
        userId: 'user-1',
        code: '000000',
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid code');
    });

    it('should return 400 for login action without userId', async () => {
      const request = createPostRequest('http://localhost:3000/api/compliance/mfa/verify', {
        action: 'login',
        code: '123456',
        // missing userId
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it('should create MFA challenge', async () => {
      (createMFAChallenge as Mock).mockResolvedValue({
        challengeId: 'challenge-1',
        expiresAt: new Date().toISOString(),
      });

      const request = createPostRequest('http://localhost:3000/api/compliance/mfa/verify', {
        action: 'challenge',
        userId: 'user-1',
        purpose: 'signature',
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.challengeId).toBe('challenge-1');
    });

    it('should verify MFA challenge', async () => {
      (verifyMFAChallenge as Mock).mockResolvedValue({ success: true });

      const request = createPostRequest('http://localhost:3000/api/compliance/mfa/verify', {
        action: 'verify-challenge',
        challengeId: 'challenge-1',
        code: '123456',
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 400 for invalid action', async () => {
      const request = createPostRequest('http://localhost:3000/api/compliance/mfa/verify', {
        action: 'invalid',
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid action');
    });
  });

  // ===========================================================================
  // POST /api/compliance/mfa/setup
  // ===========================================================================
  describe('POST /api/compliance/mfa/setup', () => {
    let POST: (...args: any[]) => Promise<Response>;

    beforeEach(async () => {
      // eslint-disable-next-line @next/next/no-assign-module-variable
      const module = await import('../compliance/mfa/setup/route');
      POST = module.POST;
    });

    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = createPostRequest('http://localhost:3000/api/compliance/mfa/setup', {
        action: 'setup',
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
    });

    it('should return 403 for non-admin users', async () => {
      (auth as Mock).mockResolvedValue(mockUserSession);

      const request = createPostRequest('http://localhost:3000/api/compliance/mfa/setup', {
        action: 'setup',
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(403);
    });

    it('should setup MFA successfully', async () => {
      (setupMFA as Mock).mockResolvedValue({
        success: true,
        deviceId: 'device-1',
        secret: 'JBSWY3DPEHPK3PXP',
        qrCodeUrl: 'otpauth://totp/RTR:admin@test.com?secret=...',
        backupCodes: ['code1', 'code2', 'code3'],
      });

      const request = createPostRequest('http://localhost:3000/api/compliance/mfa/setup', {
        action: 'setup',
        deviceName: 'My Authenticator',
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.deviceId).toBe('device-1');
      expect(data.secret).toBeDefined();
      expect(data.qrCodeUrl).toBeDefined();
      expect(data.backupCodes).toHaveLength(3);
      expect(setupMFA).toHaveBeenCalledWith('user-1', 'My Authenticator');
    });

    it('should return 400 when MFA setup fails', async () => {
      (setupMFA as Mock).mockResolvedValue({
        success: false,
        error: 'MFA already enabled',
      });

      const request = createPostRequest('http://localhost:3000/api/compliance/mfa/setup', {
        action: 'setup',
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('MFA already enabled');
    });

    it('should verify MFA setup with code and deviceId', async () => {
      (verifyMFASetup as Mock).mockResolvedValue({ success: true });

      const request = createPostRequest('http://localhost:3000/api/compliance/mfa/setup', {
        action: 'verify',
        code: '123456',
        deviceId: 'device-1',
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(verifyMFASetup).toHaveBeenCalledWith('user-1', 'device-1', '123456');
    });

    it('should return 400 for verify action without code', async () => {
      const request = createPostRequest('http://localhost:3000/api/compliance/mfa/setup', {
        action: 'verify',
        deviceId: 'device-1',
        // missing code
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid action', async () => {
      const request = createPostRequest('http://localhost:3000/api/compliance/mfa/setup', {
        action: 'invalid',
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid action');
    });
  });
});
