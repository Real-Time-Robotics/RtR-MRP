import { prisma } from '@/lib/prisma';

export async function generateSONumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `SO-${year}-`;

  const lastOrder = await prisma.salesOrder.findFirst({
    where: { orderNumber: { startsWith: prefix } },
    orderBy: { orderNumber: 'desc' },
    select: { orderNumber: true },
  });

  let nextNumber = 1;
  if (lastOrder) {
    const lastNumber = parseInt(lastOrder.orderNumber.replace(prefix, ''), 10);
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  return `${prefix}${String(nextNumber).padStart(5, '0')}`;
}
