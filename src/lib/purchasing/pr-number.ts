import { prisma } from '@/lib/prisma';

export async function generatePRNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PR-${year}-`;

  const lastPR = await prisma.purchaseRequest.findFirst({
    where: { prNumber: { startsWith: prefix } },
    orderBy: { prNumber: 'desc' },
    select: { prNumber: true },
  });

  let nextNumber = 1;
  if (lastPR) {
    const lastNumber = parseInt(lastPR.prNumber.replace(prefix, ''), 10);
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  return `${prefix}${String(nextNumber).padStart(5, '0')}`;
}
