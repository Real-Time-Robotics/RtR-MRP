/**
 * PR Service — guard-clause unit tests.
 * Deep DB-path coverage is intentionally deferred to integration tests
 * against a real database; these tests exercise the validation logic that
 * runs before Prisma is touched.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PRService, PRServiceError } from '../pr-service';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    purchaseRequest: { findFirst: vi.fn().mockResolvedValue(null) },
    $transaction: vi.fn(),
  },
  default: {},
}));

describe('PRService guard clauses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createPR throws when no lines provided', async () => {
    await expect(
      PRService.createPR(
        {
          title: 'Test',
          requiredDate: new Date(),
          lines: [],
        },
        'user-1',
      ),
    ).rejects.toBeInstanceOf(PRServiceError);
  });

  it('rejectPR requires reason >= 10 chars', async () => {
    await expect(
      PRService.rejectPR('pr-1', 'user-1', 'short'),
    ).rejects.toMatchObject({
      code: 'PR_REJECTION_REASON_REQUIRED',
    });
  });

  it('rejectPR requires non-whitespace reason', async () => {
    await expect(
      PRService.rejectPR('pr-1', 'user-1', '   '),
    ).rejects.toMatchObject({
      code: 'PR_REJECTION_REASON_REQUIRED',
    });
  });

  it('convertToPO throws on empty batch', async () => {
    await expect(
      PRService.convertToPO([], 'user-1'),
    ).rejects.toMatchObject({
      code: 'PR_EMPTY_BATCH',
    });
  });

  it('PRServiceError carries code', () => {
    const e = new PRServiceError('x', 'FOO');
    expect(e.code).toBe('FOO');
    expect(e).toBeInstanceOf(Error);
  });
});
