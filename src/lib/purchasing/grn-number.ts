import { prisma } from '@/lib/prisma';

export async function generateGRNNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `GRN-${year}-`;

  const lastGRN = await prisma.goodsReceiptNote.findFirst({
    where: { grnNumber: { startsWith: prefix } },
    orderBy: { grnNumber: 'desc' },
    select: { grnNumber: true },
  });

  let sequence = 1;
  if (lastGRN) {
    const lastSeq = parseInt(lastGRN.grnNumber.replace(prefix, ''), 10);
    if (!isNaN(lastSeq)) sequence = lastSeq + 1;
  }

  return `${prefix}${String(sequence).padStart(4, '0')}`;
}
