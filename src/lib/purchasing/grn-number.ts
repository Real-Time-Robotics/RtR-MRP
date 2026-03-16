import { prisma } from '@/lib/prisma';

export async function generateGRNNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `GRN-${year}-`;

  const lastGRN = await prisma.goodsReceiptNote.findFirst({
    where: { grnNumber: { startsWith: prefix } },
    orderBy: { grnNumber: 'desc' },
    select: { grnNumber: true },
  });

  let nextNumber = 1;
  if (lastGRN) {
    const lastNumber = parseInt(lastGRN.grnNumber.replace(prefix, ''), 10);
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  return `${prefix}${String(nextNumber).padStart(5, '0')}`;
}
