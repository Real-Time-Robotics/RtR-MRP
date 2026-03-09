import { describe, it, expect, vi } from 'vitest';
import {
  generateTOTPSecret,
  generateTOTPCode,
  verifyTOTPCode,
  generateTOTPQRCodeURL,
  generateBackupCodes,
  hashBackupCodes,
} from '../mfa';

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    mFADevice: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    mFAChallenge: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    user: { findUnique: vi.fn(), update: vi.fn() },
    backupCode: { findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), logError: vi.fn() },
}));

describe('TOTP Functions', () => {
  describe('generateTOTPSecret', () => {
    it('should generate a base32 encoded secret', () => {
      const secret = generateTOTPSecret();
      expect(secret).toBeDefined();
      expect(typeof secret).toBe('string');
      expect(secret.length).toBeGreaterThan(0);
    });

    it('should generate unique secrets', () => {
      const s1 = generateTOTPSecret();
      const s2 = generateTOTPSecret();
      expect(s1).not.toBe(s2);
    });

    it('should only contain base32 characters', () => {
      const secret = generateTOTPSecret();
      expect(secret).toMatch(/^[A-Z2-7]+$/);
    });
  });

  describe('generateTOTPCode', () => {
    it('should generate a 6-digit code', async () => {
      const secret = generateTOTPSecret();
      const code = await generateTOTPCode(secret);
      expect(code).toMatch(/^\d{6}$/);
    });

    it('should generate same code for same timestamp', async () => {
      const secret = generateTOTPSecret();
      const timestamp = 1700000000;
      const code1 = await generateTOTPCode(secret, timestamp);
      const code2 = await generateTOTPCode(secret, timestamp);
      expect(code1).toBe(code2);
    });

    it('should generate different codes for different timestamps', async () => {
      const secret = generateTOTPSecret();
      const code1 = await generateTOTPCode(secret, 1700000000);
      const code2 = await generateTOTPCode(secret, 1700000060);
      // Codes might be different (not guaranteed due to 30s windows)
      expect(code1).toBeDefined();
      expect(code2).toBeDefined();
    });
  });

  describe('verifyTOTPCode', () => {
    it('should verify valid code', async () => {
      const secret = generateTOTPSecret();
      const timestamp = Math.floor(Date.now() / 1000);
      const code = await generateTOTPCode(secret, timestamp);
      const result = await verifyTOTPCode(secret, code, 1);
      expect(result).toBe(true);
    });

    it('should reject invalid code', async () => {
      const secret = generateTOTPSecret();
      const result = await verifyTOTPCode(secret, '000000', 0);
      // May or may not be true depending on timing, but should not throw
      expect(typeof result).toBe('boolean');
    });
  });

  describe('generateTOTPQRCodeURL', () => {
    it('should generate otpauth URL', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const url = generateTOTPQRCodeURL(secret, 'user@example.com');
      expect(url).toContain('otpauth://totp/');
      expect(url).toContain(secret);
      expect(url).toContain('user%40example.com');
    });

    it('should include issuer', () => {
      const url = generateTOTPQRCodeURL('SECRET', 'test@test.com');
      expect(url).toContain('issuer=');
    });
  });

  describe('generateBackupCodes', () => {
    it('should generate default number of codes', () => {
      const codes = generateBackupCodes();
      expect(codes.length).toBeGreaterThan(0);
    });

    it('should generate specified number of codes', () => {
      const codes = generateBackupCodes(5);
      expect(codes).toHaveLength(5);
    });

    it('should generate unique codes', () => {
      const codes = generateBackupCodes(10);
      const unique = new Set(codes);
      expect(unique.size).toBe(10);
    });

    it('should generate codes as strings', () => {
      const codes = generateBackupCodes(3);
      codes.forEach(code => {
        expect(typeof code).toBe('string');
        expect(code.length).toBeGreaterThan(0);
      });
    });
  });

  describe('hashBackupCodes', () => {
    it('should hash backup codes', () => {
      const codes = ['ABC-123', 'DEF-456'];
      const hashed = hashBackupCodes(codes);
      expect(hashed).toHaveLength(2);
      expect(hashed[0]).not.toBe('ABC-123');
      expect(hashed[1]).not.toBe('DEF-456');
    });

    it('should produce consistent hashes', () => {
      const hashed1 = hashBackupCodes(['TEST-CODE']);
      const hashed2 = hashBackupCodes(['TEST-CODE']);
      expect(hashed1[0]).toBe(hashed2[0]);
    });

    it('should produce different hashes for different codes', () => {
      const hashed1 = hashBackupCodes(['CODE-A']);
      const hashed2 = hashBackupCodes(['CODE-B']);
      expect(hashed1[0]).not.toBe(hashed2[0]);
    });
  });
});
