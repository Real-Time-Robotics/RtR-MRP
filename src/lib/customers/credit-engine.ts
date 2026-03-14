import { prisma } from '@/lib/prisma';

export async function calculateCreditUsed(customerId: string): Promise<number> {
  const result = await prisma.salesOrder.aggregate({
    where: {
      customerId,
      status: {
        in: ['confirmed', 'in_production', 'partially_shipped', 'shipped', 'delivered'],
      },
    },
    _sum: {
      totalAmount: true,
    },
  });

  return result._sum.totalAmount || 0;
}

export async function updateCustomerCreditUsed(customerId: string): Promise<void> {
  const creditUsed = await calculateCreditUsed(customerId);

  await prisma.customer.update({
    where: { id: customerId },
    data: { creditUsed },
  });
}

export async function checkCreditAvailable(
  customerId: string,
  orderAmount: number
): Promise<{
  available: boolean;
  creditLimit: number;
  creditUsed: number;
  remaining: number;
}> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { creditLimit: true, creditUsed: true },
  });

  if (!customer) {
    throw new Error('Khách hàng không tồn tại');
  }

  // creditLimit = 0 means unlimited
  if (customer.creditLimit === 0) {
    return {
      available: true,
      creditLimit: 0,
      creditUsed: customer.creditUsed,
      remaining: Infinity,
    };
  }

  const remaining = customer.creditLimit - customer.creditUsed;
  const available = remaining >= orderAmount;

  return {
    available,
    creditLimit: customer.creditLimit,
    creditUsed: customer.creditUsed,
    remaining: Math.round(remaining * 100) / 100,
  };
}

export function getPaymentTermsDays(terms: string): number {
  const map: Record<string, number> = {
    IMMEDIATE: 0,
    NET_15: 15,
    NET_30: 30,
    NET_45: 45,
    NET_60: 60,
    NET_90: 90,
  };
  return map[terms] || 30;
}
