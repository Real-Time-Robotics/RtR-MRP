import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPasswordResetToken } = vi.hoisted(() => ({
  mockPasswordResetToken: {
    findUnique: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    passwordResetToken: mockPasswordResetToken,
  },
}));

import { validateResetToken, validateResetTokenWithUser, TokenValidationError } from '../password-reset-utils';

describe('Password Reset Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('TokenValidationError', () => {
    it('should create error with code', () => {
      const err = new TokenValidationError('test', 'NOT_FOUND');
      expect(err.message).toBe('test');
      expect(err.code).toBe('NOT_FOUND');
      expect(err.name).toBe('TokenValidationError');
    });
  });

  describe('validateResetToken', () => {
    it('should return valid token', async () => {
      const token = {
        id: '1',
        token: 'abc',
        userId: 'u1',
        expiresAt: new Date(Date.now() + 3600000),
        usedAt: null,
        createdAt: new Date(),
      };
      mockPasswordResetToken.findUnique.mockResolvedValue(token);
      const result = await validateResetToken('abc');
      expect(result.token).toBe('abc');
    });

    it('should throw NOT_FOUND for missing token', async () => {
      mockPasswordResetToken.findUnique.mockResolvedValue(null);
      await expect(validateResetToken('invalid')).rejects.toThrow(TokenValidationError);
      try {
        await validateResetToken('invalid');
      } catch (e: any) {
        expect(e.code).toBe('NOT_FOUND');
      }
    });

    it('should throw ALREADY_USED for used token', async () => {
      mockPasswordResetToken.findUnique.mockResolvedValue({
        token: 'abc',
        usedAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      });
      try {
        await validateResetToken('abc');
      } catch (e: any) {
        expect(e.code).toBe('ALREADY_USED');
      }
    });

    it('should throw EXPIRED for expired token', async () => {
      mockPasswordResetToken.findUnique.mockResolvedValue({
        token: 'abc',
        usedAt: null,
        expiresAt: new Date(Date.now() - 3600000),
      });
      try {
        await validateResetToken('abc');
      } catch (e: any) {
        expect(e.code).toBe('EXPIRED');
      }
    });
  });

  describe('validateResetTokenWithUser', () => {
    it('should return token with user', async () => {
      const token = {
        id: '1',
        token: 'abc',
        userId: 'u1',
        expiresAt: new Date(Date.now() + 3600000),
        usedAt: null,
        createdAt: new Date(),
        user: { id: 'u1', email: 'test@test.com', password: 'hashed' },
      };
      mockPasswordResetToken.findUnique.mockResolvedValue(token);
      const result = await validateResetTokenWithUser('abc');
      expect(result.user.email).toBe('test@test.com');
    });

    it('should throw NOT_FOUND', async () => {
      mockPasswordResetToken.findUnique.mockResolvedValue(null);
      await expect(validateResetTokenWithUser('invalid')).rejects.toThrow(TokenValidationError);
    });
  });
});
