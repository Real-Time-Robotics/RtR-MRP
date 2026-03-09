import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createJournalEntry,
  postJournalEntry,
  voidJournalEntry,
  reverseJournalEntry,
  getAccountBalance,
  getTrialBalance,
  postPurchaseInvoiceToGL,
  postSalesInvoiceToGL,
} from '../gl-engine';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    journalEntry: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    journalLine: {
      findMany: vi.fn(),
    },
    gLAccount: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    purchaseInvoice: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    salesInvoice: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';

const mockPrisma = prisma as unknown as {
  journalEntry: {
    findFirst: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  journalLine: { findMany: ReturnType<typeof vi.fn> };
  gLAccount: {
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  purchaseInvoice: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  salesInvoice: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

describe('GL Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createJournalEntry', () => {
    it('should create a balanced journal entry', async () => {
      mockPrisma.journalEntry.findFirst.mockResolvedValue(null);
      mockPrisma.journalEntry.create.mockResolvedValue({
        id: 'je-1',
        entryNumber: 'JE-202603-00001',
      });

      const result = await createJournalEntry(
        {
          entryDate: new Date('2026-03-01'),
          description: 'Test entry',
          lines: [
            { accountId: 'acc-1', debitAmount: 100, creditAmount: 0 },
            { accountId: 'acc-2', debitAmount: 0, creditAmount: 100 },
          ],
        },
        'user-1'
      );

      expect(result.entryId).toBe('je-1');
      expect(result.entryNumber).toBe('JE-202603-00001');
      expect(mockPrisma.journalEntry.create).toHaveBeenCalledOnce();
    });

    it('should throw if debits != credits', async () => {
      mockPrisma.journalEntry.findFirst.mockResolvedValue(null);

      await expect(
        createJournalEntry(
          {
            entryDate: new Date(),
            description: 'Unbalanced',
            lines: [
              { accountId: 'acc-1', debitAmount: 100, creditAmount: 0 },
              { accountId: 'acc-2', debitAmount: 0, creditAmount: 50 },
            ],
          },
          'user-1'
        )
      ).rejects.toThrow('Journal entry not balanced');
    });

    it('should increment entry number from last entry', async () => {
      mockPrisma.journalEntry.findFirst.mockResolvedValue({
        entryNumber: `JE-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-00005`,
      });
      mockPrisma.journalEntry.create.mockImplementation(({ data }: { data: { entryNumber: string } }) => {
        return Promise.resolve({ id: 'je-2', entryNumber: data.entryNumber });
      });

      const result = await createJournalEntry(
        {
          entryDate: new Date(),
          description: 'Test',
          lines: [
            { accountId: 'a', debitAmount: 50, creditAmount: 0 },
            { accountId: 'b', debitAmount: 0, creditAmount: 50 },
          ],
        },
        'user-1'
      );

      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      expect(result.entryNumber).toContain(`JE-${year}${month}-00006`);
    });

    it('should pass source and sourceId', async () => {
      mockPrisma.journalEntry.findFirst.mockResolvedValue(null);
      mockPrisma.journalEntry.create.mockResolvedValue({
        id: 'je-1',
        entryNumber: 'JE-202603-00001',
      });

      await createJournalEntry(
        {
          entryDate: new Date(),
          description: 'Test',
          lines: [
            { accountId: 'a', debitAmount: 10, creditAmount: 0 },
            { accountId: 'b', debitAmount: 0, creditAmount: 10 },
          ],
        },
        'user-1',
        'AP_INVOICE',
        'inv-1'
      );

      const createCall = mockPrisma.journalEntry.create.mock.calls[0][0];
      expect(createCall.data.source).toBe('AP_INVOICE');
      expect(createCall.data.sourceId).toBe('inv-1');
    });
  });

  describe('postJournalEntry', () => {
    it('should post a draft entry', async () => {
      mockPrisma.journalEntry.findUnique.mockResolvedValue({
        id: 'je-1',
        status: 'DRAFT',
        lines: [
          { debitAmount: 100, creditAmount: 0 },
          { debitAmount: 0, creditAmount: 100 },
        ],
      });
      mockPrisma.journalEntry.update.mockResolvedValue({});

      await postJournalEntry('je-1', 'user-1');

      expect(mockPrisma.journalEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'je-1' },
          data: expect.objectContaining({ status: 'POSTED', postedBy: 'user-1' }),
        })
      );
    });

    it('should throw if entry not found', async () => {
      mockPrisma.journalEntry.findUnique.mockResolvedValue(null);
      await expect(postJournalEntry('bad-id', 'user-1')).rejects.toThrow('Journal entry not found');
    });

    it('should throw if already posted', async () => {
      mockPrisma.journalEntry.findUnique.mockResolvedValue({ id: 'je-1', status: 'POSTED', lines: [] });
      await expect(postJournalEntry('je-1', 'user-1')).rejects.toThrow('already posted');
    });

    it('should throw if voided', async () => {
      mockPrisma.journalEntry.findUnique.mockResolvedValue({ id: 'je-1', status: 'VOID', lines: [] });
      await expect(postJournalEntry('je-1', 'user-1')).rejects.toThrow('Cannot post a voided entry');
    });

    it('should throw if lines are unbalanced', async () => {
      mockPrisma.journalEntry.findUnique.mockResolvedValue({
        id: 'je-1',
        status: 'DRAFT',
        lines: [
          { debitAmount: 100, creditAmount: 0 },
          { debitAmount: 0, creditAmount: 90 },
        ],
      });
      await expect(postJournalEntry('je-1', 'user-1')).rejects.toThrow('not balanced');
    });
  });

  describe('voidJournalEntry', () => {
    it('should void an entry', async () => {
      mockPrisma.journalEntry.findUnique.mockResolvedValue({ id: 'je-1', status: 'POSTED' });
      mockPrisma.journalEntry.update.mockResolvedValue({});

      await voidJournalEntry('je-1');

      expect(mockPrisma.journalEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'VOID' }),
        })
      );
    });

    it('should throw if not found', async () => {
      mockPrisma.journalEntry.findUnique.mockResolvedValue(null);
      await expect(voidJournalEntry('bad')).rejects.toThrow('not found');
    });

    it('should throw if already voided', async () => {
      mockPrisma.journalEntry.findUnique.mockResolvedValue({ id: 'je-1', status: 'VOID' });
      await expect(voidJournalEntry('je-1')).rejects.toThrow('already voided');
    });
  });

  describe('reverseJournalEntry', () => {
    it('should throw if original not found', async () => {
      mockPrisma.journalEntry.findUnique.mockResolvedValue(null);
      await expect(reverseJournalEntry('bad', new Date(), 'user-1')).rejects.toThrow('not found');
    });

    it('should throw if not posted', async () => {
      mockPrisma.journalEntry.findUnique.mockResolvedValue({
        id: 'je-1',
        status: 'DRAFT',
        lines: [],
      });
      await expect(reverseJournalEntry('je-1', new Date(), 'user-1')).rejects.toThrow('only reverse posted');
    });

    it('should throw if already reversed', async () => {
      mockPrisma.journalEntry.findUnique.mockResolvedValue({
        id: 'je-1',
        status: 'POSTED',
        reversedBy: 'je-2',
        lines: [],
      });
      await expect(reverseJournalEntry('je-1', new Date(), 'user-1')).rejects.toThrow('already reversed');
    });

    it('should create a reversing entry with swapped debits/credits', async () => {
      // Original entry lookup
      mockPrisma.journalEntry.findUnique.mockResolvedValueOnce({
        id: 'je-1',
        status: 'POSTED',
        reversedBy: null,
        entryNumber: 'JE-202603-00001',
        description: 'Original',
        lines: [
          { accountId: 'acc-1', description: 'Debit', debitAmount: 100, creditAmount: 0, departmentId: null, projectId: null, costCenterId: null },
          { accountId: 'acc-2', description: 'Credit', debitAmount: 0, creditAmount: 100, departmentId: null, projectId: null, costCenterId: null },
        ],
      });
      // generateJournalEntryNumber for the reversal
      mockPrisma.journalEntry.findFirst.mockResolvedValue(null);
      // create the reversal
      mockPrisma.journalEntry.create.mockResolvedValue({ id: 'je-rev', entryNumber: 'JE-202603-00001' });
      // postJournalEntry: findUnique for the new reversal entry
      mockPrisma.journalEntry.findUnique.mockResolvedValueOnce({
        id: 'je-rev',
        status: 'DRAFT',
        lines: [
          { debitAmount: 0, creditAmount: 100 },
          { debitAmount: 100, creditAmount: 0 },
        ],
      });
      mockPrisma.journalEntry.update.mockResolvedValue({});

      const result = await reverseJournalEntry('je-1', new Date(), 'user-1');
      expect(result.entryId).toBe('je-rev');

      // Check that create was called with swapped amounts
      const createCall = mockPrisma.journalEntry.create.mock.calls[0][0];
      const lines = createCall.data.lines.create;
      // First original line was debit 100 / credit 0, so reversed is debit 0 / credit 100
      expect(lines[0].debitAmount).toBe(0);
      expect(lines[0].creditAmount).toBe(100);
      expect(lines[1].debitAmount).toBe(100);
      expect(lines[1].creditAmount).toBe(0);
    });
  });

  describe('getAccountBalance', () => {
    it('should throw if account not found', async () => {
      mockPrisma.gLAccount.findUnique.mockResolvedValue(null);
      await expect(getAccountBalance('bad')).rejects.toThrow('Account not found');
    });

    it('should calculate DEBIT normal balance correctly', async () => {
      mockPrisma.gLAccount.findUnique.mockResolvedValue({
        id: 'acc-1',
        normalBalance: 'DEBIT',
      });
      mockPrisma.journalLine.findMany.mockResolvedValue([
        { debitAmount: 200, creditAmount: 0 },
        { debitAmount: 0, creditAmount: 50 },
      ]);

      const result = await getAccountBalance('acc-1');
      expect(result.debit).toBe(200);
      expect(result.credit).toBe(50);
      expect(result.balance).toBe(150); // DEBIT normal: debit - credit
    });

    it('should calculate CREDIT normal balance correctly', async () => {
      mockPrisma.gLAccount.findUnique.mockResolvedValue({
        id: 'acc-1',
        normalBalance: 'CREDIT',
      });
      mockPrisma.journalLine.findMany.mockResolvedValue([
        { debitAmount: 30, creditAmount: 0 },
        { debitAmount: 0, creditAmount: 100 },
      ]);

      const result = await getAccountBalance('acc-1');
      expect(result.balance).toBe(70); // CREDIT normal: credit - debit
    });

    it('should apply asOfDate filter', async () => {
      mockPrisma.gLAccount.findUnique.mockResolvedValue({ id: 'acc-1', normalBalance: 'DEBIT' });
      mockPrisma.journalLine.findMany.mockResolvedValue([]);

      const asOfDate = new Date('2026-03-01');
      await getAccountBalance('acc-1', asOfDate);

      const whereClause = mockPrisma.journalLine.findMany.mock.calls[0][0].where;
      expect(whereClause.journalEntry.postingDate).toEqual({ lte: asOfDate });
    });
  });

  describe('getTrialBalance', () => {
    it('should return accounts with activity only', async () => {
      mockPrisma.gLAccount.findMany.mockResolvedValue([
        { id: 'acc-1', accountNumber: '1000', name: 'Cash', accountType: 'ASSET', isActive: true, normalBalance: 'DEBIT' },
        { id: 'acc-2', accountNumber: '2000', name: 'AP', accountType: 'LIABILITY', isActive: true, normalBalance: 'CREDIT' },
      ]);
      // getAccountBalance calls for each account
      mockPrisma.gLAccount.findUnique
        .mockResolvedValueOnce({ id: 'acc-1', normalBalance: 'DEBIT' })
        .mockResolvedValueOnce({ id: 'acc-2', normalBalance: 'CREDIT' });
      mockPrisma.journalLine.findMany
        .mockResolvedValueOnce([{ debitAmount: 100, creditAmount: 0 }]) // acc-1 has activity
        .mockResolvedValueOnce([]); // acc-2 has no activity

      const result = await getTrialBalance();
      expect(result).toHaveLength(1);
      expect(result[0].accountNumber).toBe('1000');
    });
  });

  describe('postPurchaseInvoiceToGL', () => {
    it('should throw if invoice not found', async () => {
      mockPrisma.purchaseInvoice.findUnique.mockResolvedValue(null);
      await expect(
        postPurchaseInvoiceToGL('bad', 'user-1', 'ap-acc', 'exp-acc')
      ).rejects.toThrow('Invoice not found');
    });

    it('should throw if already posted', async () => {
      mockPrisma.purchaseInvoice.findUnique.mockResolvedValue({ glPosted: true });
      await expect(
        postPurchaseInvoiceToGL('inv-1', 'user-1', 'ap-acc', 'exp-acc')
      ).rejects.toThrow('already posted');
    });
  });

  describe('postSalesInvoiceToGL', () => {
    it('should throw if invoice not found', async () => {
      mockPrisma.salesInvoice.findUnique.mockResolvedValue(null);
      await expect(
        postSalesInvoiceToGL('bad', 'user-1', 'ar-acc', 'rev-acc')
      ).rejects.toThrow('Invoice not found');
    });

    it('should throw if already posted', async () => {
      mockPrisma.salesInvoice.findUnique.mockResolvedValue({ glPosted: true });
      await expect(
        postSalesInvoiceToGL('inv-1', 'user-1', 'ar-acc', 'rev-acc')
      ).rejects.toThrow('already posted');
    });
  });
});
