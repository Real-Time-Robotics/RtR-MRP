// src/lib/finance/gl-engine.ts
// General Ledger Transaction Engine

import { prisma } from "@/lib/prisma";
import type { JournalEntryInput } from "./types";

/**
 * Generate next journal entry number
 */
async function generateJournalEntryNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, "0");
  const prefix = `JE-${year}${month}-`;

  const lastEntry = await prisma.journalEntry.findFirst({
    where: { entryNumber: { startsWith: prefix } },
    orderBy: { entryNumber: "desc" },
  });

  const lastNumber = lastEntry
    ? parseInt(lastEntry.entryNumber.replace(prefix, ""))
    : 0;

  return `${prefix}${String(lastNumber + 1).padStart(5, "0")}`;
}

/**
 * Create a manual journal entry
 */
export async function createJournalEntry(
  input: JournalEntryInput,
  userId: string,
  source: string = "MANUAL",
  sourceId?: string
): Promise<{ entryId: string; entryNumber: string }> {
  const entryNumber = await generateJournalEntryNumber();

  // Validate debits = credits
  let totalDebit = 0;
  let totalCredit = 0;
  for (const line of input.lines) {
    totalDebit += line.debitAmount;
    totalCredit += line.creditAmount;
  }

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(
      `Journal entry not balanced: Debits ($${totalDebit.toFixed(2)}) ≠ Credits ($${totalCredit.toFixed(2)})`
    );
  }

  // Create entry with lines
  const entry = await prisma.journalEntry.create({
    data: {
      entryNumber,
      entryDate: input.entryDate,
      postingDate: input.entryDate,
      entryType: "STANDARD",
      source,
      sourceId,
      description: input.description,
      reference: input.reference,
      totalDebit,
      totalCredit,
      status: "DRAFT",
      createdBy: userId,
      lines: {
        create: input.lines.map((line, index) => ({
          lineNumber: index + 1,
          accountId: line.accountId,
          description: line.description,
          debitAmount: line.debitAmount,
          creditAmount: line.creditAmount,
          departmentId: line.departmentId,
          projectId: line.projectId,
          costCenterId: line.costCenterId,
        })),
      },
    },
  });

  return {
    entryId: entry.id,
    entryNumber: entry.entryNumber,
  };
}

/**
 * Post a journal entry
 */
export async function postJournalEntry(
  entryId: string,
  userId: string
): Promise<void> {
  const entry = await prisma.journalEntry.findUnique({
    where: { id: entryId },
    include: { lines: true },
  });

  if (!entry) {
    throw new Error("Journal entry not found");
  }

  if (entry.status === "POSTED") {
    throw new Error("Journal entry already posted");
  }

  if (entry.status === "VOID") {
    throw new Error("Cannot post a voided entry");
  }

  // Validate debits = credits again
  let totalDebit = 0;
  let totalCredit = 0;
  for (const line of entry.lines) {
    totalDebit += line.debitAmount;
    totalCredit += line.creditAmount;
  }

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error("Journal entry not balanced");
  }

  await prisma.journalEntry.update({
    where: { id: entryId },
    data: {
      status: "POSTED",
      postedBy: userId,
      postedAt: new Date(),
    },
  });
}

/**
 * Void a journal entry
 */
export async function voidJournalEntry(entryId: string): Promise<void> {
  const entry = await prisma.journalEntry.findUnique({
    where: { id: entryId },
  });

  if (!entry) {
    throw new Error("Journal entry not found");
  }

  if (entry.status === "VOID") {
    throw new Error("Journal entry already voided");
  }

  await prisma.journalEntry.update({
    where: { id: entryId },
    data: {
      status: "VOID",
      updatedAt: new Date(),
    },
  });
}

/**
 * Create reversing entry
 */
export async function reverseJournalEntry(
  entryId: string,
  reversalDate: Date,
  userId: string
): Promise<{ entryId: string; entryNumber: string }> {
  const original = await prisma.journalEntry.findUnique({
    where: { id: entryId },
    include: { lines: true },
  });

  if (!original) {
    throw new Error("Original entry not found");
  }

  if (original.status !== "POSTED") {
    throw new Error("Can only reverse posted entries");
  }

  if (original.reversedBy) {
    throw new Error("Entry already reversed");
  }

  // Create reversal entry with debits and credits swapped
  const reversalInput: JournalEntryInput = {
    entryDate: reversalDate,
    description: `Reversal of ${original.entryNumber}: ${original.description}`,
    reference: original.entryNumber,
    lines: original.lines.map((line) => ({
      accountId: line.accountId,
      description: line.description || undefined,
      debitAmount: line.creditAmount, // Swap debit/credit
      creditAmount: line.debitAmount,
      departmentId: line.departmentId || undefined,
      projectId: line.projectId || undefined,
      costCenterId: line.costCenterId || undefined,
    })),
  };

  const reversal = await createJournalEntry(
    reversalInput,
    userId,
    "REVERSING",
    entryId
  );

  // Update reversal entry type and link
  await prisma.journalEntry.update({
    where: { id: reversal.entryId },
    data: {
      entryType: "REVERSING",
      reversalOf: entryId,
    },
  });

  // Mark original as reversed
  await prisma.journalEntry.update({
    where: { id: entryId },
    data: {
      reversedBy: reversal.entryId,
    },
  });

  // Auto-post the reversal
  await postJournalEntry(reversal.entryId, userId);

  return reversal;
}

/**
 * Get account balance
 */
export async function getAccountBalance(
  accountId: string,
  asOfDate?: Date
): Promise<{ debit: number; credit: number; balance: number }> {
  const account = await prisma.gLAccount.findUnique({
    where: { id: accountId },
  });

  if (!account) {
    throw new Error("Account not found");
  }

  const whereClause: Record<string, unknown> = {
    accountId,
    journalEntry: {
      status: "POSTED",
    },
  };

  if (asOfDate) {
    whereClause.journalEntry = {
      ...whereClause.journalEntry as object,
      postingDate: { lte: asOfDate },
    };
  }

  const lines = await prisma.journalLine.findMany({
    where: whereClause,
    include: { journalEntry: true },
  });

  let totalDebit = 0;
  let totalCredit = 0;

  for (const line of lines) {
    totalDebit += line.debitAmount;
    totalCredit += line.creditAmount;
  }

  // Calculate balance based on normal balance
  const balance =
    account.normalBalance === "DEBIT"
      ? totalDebit - totalCredit
      : totalCredit - totalDebit;

  return { debit: totalDebit, credit: totalCredit, balance };
}

/**
 * Get trial balance
 */
export async function getTrialBalance(asOfDate?: Date): Promise<
  {
    accountNumber: string;
    accountName: string;
    accountType: string;
    debit: number;
    credit: number;
    balance: number;
  }[]
> {
  const accounts = await prisma.gLAccount.findMany({
    where: { isActive: true },
    orderBy: { accountNumber: "asc" },
  });

  const results = [];

  for (const account of accounts) {
    const { debit, credit, balance } = await getAccountBalance(
      account.id,
      asOfDate
    );

    // Only include accounts with activity
    if (debit > 0 || credit > 0) {
      results.push({
        accountNumber: account.accountNumber,
        accountName: account.name,
        accountType: account.accountType,
        debit,
        credit,
        balance,
      });
    }
  }

  return results;
}

/**
 * Post purchase invoice to GL
 */
export async function postPurchaseInvoiceToGL(
  invoiceId: string,
  userId: string,
  apAccountId: string,
  expenseAccountId: string
): Promise<void> {
  const invoice = await prisma.purchaseInvoice.findUnique({
    where: { id: invoiceId },
    include: { supplier: true, lines: true },
  });

  if (!invoice) throw new Error("Invoice not found");
  if (invoice.glPosted) throw new Error("Invoice already posted");

  const entryInput: JournalEntryInput = {
    entryDate: invoice.invoiceDate,
    description: `Purchase Invoice ${invoice.invoiceNumber} - ${invoice.supplier.name}`,
    reference: invoice.invoiceNumber,
    lines: [
      // Debit: Expense/Inventory
      {
        accountId: expenseAccountId,
        description: "Purchase",
        debitAmount: invoice.subtotal,
        creditAmount: 0,
      },
      // Credit: Accounts Payable
      {
        accountId: apAccountId,
        description: `AP - ${invoice.supplier.name}`,
        debitAmount: 0,
        creditAmount: invoice.totalAmount,
      },
    ],
  };

  // Add tax if applicable
  if (invoice.taxAmount > 0) {
    entryInput.lines[0].debitAmount = invoice.subtotal + invoice.taxAmount;
  }

  const entry = await createJournalEntry(
    entryInput,
    userId,
    "AP_INVOICE",
    invoiceId
  );

  await postJournalEntry(entry.entryId, userId);

  await prisma.purchaseInvoice.update({
    where: { id: invoiceId },
    data: {
      glPosted: true,
      glPostedAt: new Date(),
    },
  });
}

/**
 * Post sales invoice to GL
 */
export async function postSalesInvoiceToGL(
  invoiceId: string,
  userId: string,
  arAccountId: string,
  revenueAccountId: string,
  cogsAccountId?: string,
  inventoryAccountId?: string
): Promise<void> {
  const invoice = await prisma.salesInvoice.findUnique({
    where: { id: invoiceId },
    include: { customer: true, lines: true },
  });

  if (!invoice) throw new Error("Invoice not found");
  if (invoice.glPosted) throw new Error("Invoice already posted");

  const lines: JournalEntryInput["lines"] = [
    // Debit: Accounts Receivable
    {
      accountId: arAccountId,
      description: `AR - ${invoice.customer.name}`,
      debitAmount: invoice.totalAmount,
      creditAmount: 0,
    },
    // Credit: Revenue
    {
      accountId: revenueAccountId,
      description: "Product Revenue",
      debitAmount: 0,
      creditAmount: invoice.subtotal,
    },
  ];

  // Add tax if applicable
  if (invoice.taxAmount > 0 && invoice.subtotal !== invoice.totalAmount) {
    lines[1].creditAmount = invoice.totalAmount;
  }

  // Add COGS entry if we have cost info
  if (invoice.totalCost && invoice.totalCost > 0 && cogsAccountId && inventoryAccountId) {
    lines.push(
      {
        accountId: cogsAccountId,
        description: "Cost of Goods Sold",
        debitAmount: invoice.totalCost,
        creditAmount: 0,
      },
      {
        accountId: inventoryAccountId,
        description: "Inventory Relief",
        debitAmount: 0,
        creditAmount: invoice.totalCost,
      }
    );
  }

  const entryInput: JournalEntryInput = {
    entryDate: invoice.invoiceDate,
    description: `Sales Invoice ${invoice.invoiceNumber} - ${invoice.customer.name}`,
    reference: invoice.invoiceNumber,
    lines,
  };

  const entry = await createJournalEntry(
    entryInput,
    userId,
    "AR_INVOICE",
    invoiceId
  );

  await postJournalEntry(entry.entryId, userId);

  await prisma.salesInvoice.update({
    where: { id: invoiceId },
    data: {
      glPosted: true,
      glPostedAt: new Date(),
    },
  });
}
