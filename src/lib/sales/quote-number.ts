import { prisma } from '@/lib/prisma';

export async function generateQuoteNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `QT-${year}-`;

  const lastQuote = await prisma.quotation.findFirst({
    where: { quoteNumber: { startsWith: prefix } },
    orderBy: { quoteNumber: 'desc' },
    select: { quoteNumber: true },
  });

  let nextNumber = 1;
  if (lastQuote) {
    const lastNumber = parseInt(lastQuote.quoteNumber.replace(prefix, ''), 10);
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  return `${prefix}${String(nextNumber).padStart(5, '0')}`;
}
