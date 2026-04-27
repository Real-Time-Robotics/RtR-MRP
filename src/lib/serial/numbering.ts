// src/lib/serial/numbering.ts — Serial number generation service (Sprint 27)
// Atomic counter with month rollover, retry on conflict

import { PrismaClient, Prisma } from '@prisma/client';
import prismaDefault from '@/lib/prisma';

// =============================================================================
// ERRORS
// =============================================================================

export class SerialNumberingRuleNotFoundError extends Error {
  constructor(moduleDesignId: string) {
    super(`SerialNumberingRule not found for moduleDesignId: ${moduleDesignId}`);
    this.name = 'SerialNumberingRuleNotFoundError';
  }
}

export class SerialGenerationConflictError extends Error {
  constructor() {
    super('Serial generation failed after max retries due to concurrent conflicts');
    this.name = 'SerialGenerationConflictError';
  }
}

// =============================================================================
// HELPERS
// =============================================================================

/** Format date as DDMMYY string (e.g., 09/10/2025 → "091025") */
export function formatSerialDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear() % 100).padStart(2, '0');
  return `${dd}${mm}${yy}`;
}

/** Compute MMYY as integer (e.g., Oct 2025 → 1025, Sep 2025 → 925) */
export function computeMMYY(d: Date): number {
  const month = d.getMonth() + 1;
  const year = d.getFullYear() % 100;
  return month * 100 + year;
}

// =============================================================================
// GENERATE SERIAL
// =============================================================================

export interface GenerateSerialOptions {
  moduleDesignId: string;
  now?: Date;
  prismaClient?: PrismaClient;
}

const MAX_RETRIES = 3;

export async function generateSerial(opts: GenerateSerialOptions): Promise<string> {
  const prisma = opts.prismaClient || prismaDefault;
  const now = opts.now || new Date();
  const currentMMYY = computeMMYY(now);
  const ddmmyy = formatSerialDate(now);

  // Verify rule exists
  const ruleCheck = await prisma.serialNumberingRule.findUnique({
    where: { moduleDesignId: opts.moduleDesignId },
  });
  if (!ruleCheck) {
    throw new SerialNumberingRuleNotFoundError(opts.moduleDesignId);
  }

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const serial = await prisma.$transaction(async (tx) => {
        // Re-read rule inside transaction for atomicity
        const rule = await tx.serialNumberingRule.findUnique({
          where: { moduleDesignId: opts.moduleDesignId },
        });
        if (!rule) {
          throw new SerialNumberingRuleNotFoundError(opts.moduleDesignId);
        }

        let newCounter: number;
        if (rule.counterLastMMYY !== currentMMYY) {
          // Month rollover — reset counter
          newCounter = 1;
        } else {
          newCounter = rule.counter + 1;
        }

        // Update rule atomically
        await tx.serialNumberingRule.update({
          where: { id: rule.id },
          data: {
            counter: newCounter,
            counterLastMMYY: currentMMYY,
          },
        });

        // Format serial: {prefix}-{version}-{ddmmyy}-{###}
        const counterStr = newCounter > 999
          ? String(newCounter)
          : String(newCounter).padStart(3, '0');

        return `${rule.prefix}-${rule.version}-${ddmmyy}-${counterStr}`;
      }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });

      return serial;
    } catch (error) {
      // P2034 = write conflict in serializable transaction
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034' &&
        attempt < MAX_RETRIES - 1
      ) {
        // Random backoff 10-50ms
        const delay = 10 + Math.random() * 40;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw error;
    }
  }

  throw new SerialGenerationConflictError();
}
