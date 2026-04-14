/**
 * PR Service — integration tests.
 *
 * These tests hit a real Postgres via Prisma. They are skipped automatically
 * when DATABASE_URL is unset OR when RUN_INTEGRATION_TESTS !== '1'. To run:
 *
 *   DATABASE_URL=postgresql://… RUN_INTEGRATION_TESTS=1 \
 *     npx vitest run src/lib/purchasing/__tests__/pr-service.integration.test.ts
 *
 * Each test owns the rows it creates and cleans them up in afterAll. No
 * shared fixtures across tests so they can run in any order.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { PRService } from '../pr-service';

const ENABLED =
  process.env.RUN_INTEGRATION_TESTS === '1' && !!process.env.DATABASE_URL;

const d = ENABLED ? describe : describe.skip;

d('PRService (integration)', () => {
  let userId: string;
  const createdPRIds: string[] = [];

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email: `pr-int-${Date.now()}@test.local`,
        name: 'PR Integration User',
        password: 'not-a-real-hash',
        role: 'user',
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    if (createdPRIds.length > 0) {
      await prisma.purchaseRequest.deleteMany({
        where: { id: { in: createdPRIds } },
      });
    }
    if (userId) {
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  it('creates a PR with lines and computes estimatedTotal', async () => {
    const pr = await PRService.createPR(
      {
        title: 'Integration Test PR',
        priority: 'NORMAL',
        requiredDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        lines: [
          { itemDescription: 'Widget A', requestedQty: 10, estimatedPrice: 50000 },
          { itemDescription: 'Widget B', requestedQty: 5, estimatedPrice: 100000 },
        ],
      },
      userId,
    );
    createdPRIds.push(pr.id);

    expect(pr.prNumber).toMatch(/^PR-\d{4}-\d{5}$/);
    expect(pr.status).toBe('DRAFT');
    expect(pr.lines).toHaveLength(2);
    expect(Number(pr.estimatedTotal)).toBe(1_000_000);
  });

  it('records history on create, submit, approve', async () => {
    const pr = await PRService.createPR(
      {
        title: 'History Test',
        requiredDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        lines: [{ itemDescription: 'X', requestedQty: 1, estimatedPrice: 100 }],
      },
      userId,
    );
    createdPRIds.push(pr.id);

    await PRService.submitPR(pr.id, userId);
    await PRService.approvePR(pr.id, userId, 'OK');

    const history = await prisma.pRHistory.findMany({
      where: { prId: pr.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(history.map((h) => h.action)).toEqual([
      'CREATED',
      'SUBMITTED',
      'APPROVED',
    ]);
  });

  it('rejectPR rejects with reason and stores it', async () => {
    const pr = await PRService.createPR(
      {
        title: 'Reject Test',
        requiredDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        lines: [{ itemDescription: 'Y', requestedQty: 1, estimatedPrice: 100 }],
      },
      userId,
    );
    createdPRIds.push(pr.id);

    await PRService.submitPR(pr.id, userId);
    const rejected = await PRService.rejectPR(
      pr.id,
      userId,
      'Budget exceeded - please reduce quantity',
    );

    expect(rejected.status).toBe('REJECTED');
    expect(rejected.rejectionReason).toBe(
      'Budget exceeded - please reduce quantity',
    );
    expect(rejected.rejectedBy).toBe(userId);
  });

  it('rejectPR throws when reason is too short', async () => {
    const pr = await PRService.createPR(
      {
        title: 'Reject Short Test',
        requiredDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        lines: [{ itemDescription: 'Z', requestedQty: 1, estimatedPrice: 100 }],
      },
      userId,
    );
    createdPRIds.push(pr.id);
    await PRService.submitPR(pr.id, userId);

    await expect(PRService.rejectPR(pr.id, userId, 'short')).rejects.toMatchObject({
      code: 'PR_REJECTION_REASON_REQUIRED',
    });
  });

  it('revisePR clears rejection metadata and bumps revisionNumber', async () => {
    const pr = await PRService.createPR(
      {
        title: 'Revise Test',
        requiredDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        lines: [{ itemDescription: 'Q', requestedQty: 1, estimatedPrice: 100 }],
      },
      userId,
    );
    createdPRIds.push(pr.id);

    await PRService.submitPR(pr.id, userId);
    await PRService.rejectPR(pr.id, userId, 'Needs different supplier');
    const revised = await PRService.revisePR(pr.id, userId, {
      title: 'Revise Test (v2)',
    });

    expect(revised.status).toBe('REVISED');
    expect(revised.revisionNumber).toBe(2);
    expect(revised.rejectionReason).toBeNull();
    expect(revised.title).toBe('Revise Test (v2)');
  });

  it('updatePR is rejected for non-requester', async () => {
    const pr = await PRService.createPR(
      {
        title: 'Update Auth Test',
        requiredDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        lines: [{ itemDescription: 'W', requestedQty: 1, estimatedPrice: 100 }],
      },
      userId,
    );
    createdPRIds.push(pr.id);

    await expect(
      PRService.updatePR(pr.id, 'some-other-user-id', { title: 'hax' }),
    ).rejects.toMatchObject({ code: 'PR_FORBIDDEN' });
  });

  it('searchPRs returns paginated result', async () => {
    const result = await PRService.searchPRs({
      requesterId: userId,
      page: 1,
      limit: 5,
    });

    expect(result).toHaveProperty('items');
    expect(result).toHaveProperty('pagination.page', 1);
    expect(result).toHaveProperty('pagination.limit', 5);
    expect(result.pagination.total).toBeGreaterThan(0);
  });

  it('getPRDetailShaped returns { pr, approval, conversion, lines, history }', async () => {
    const pr = await PRService.createPR(
      {
        title: 'Shape Test',
        requiredDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        lines: [{ itemDescription: 'S', requestedQty: 2, estimatedPrice: 250 }],
      },
      userId,
    );
    createdPRIds.push(pr.id);

    const detail = await PRService.getPRDetailShaped(pr.id);
    expect(detail.pr.id).toBe(pr.id);
    expect(detail.pr.requester?.id).toBe(userId);
    expect(detail.approval.status).toBe('NOT_SUBMITTED');
    expect(detail.conversion.converted).toBe(false);
    expect(detail.lines).toHaveLength(1);
    expect(detail.history.length).toBeGreaterThanOrEqual(1);
  });

  it('trackPRLineById returns the PR + (null) PO line when not yet ordered', async () => {
    const pr = await PRService.createPR(
      {
        title: 'Track Test',
        requiredDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        lines: [{ itemDescription: 'T', requestedQty: 1, estimatedPrice: 100 }],
      },
      userId,
    );
    createdPRIds.push(pr.id);

    const lineId = pr.lines[0].id;
    const tracking = await PRService.trackPRLineById(lineId);
    expect(tracking.line.id).toBe(lineId);
    expect(tracking.line.pr.prNumber).toBe(pr.prNumber);
    expect(tracking.poLine).toBeNull();
  });
});
