interface QuotationItemInput {
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  taxRate?: number;
}

export function calculateLineTotal(item: QuotationItemInput): number {
  const subtotal = item.quantity * item.unitPrice;
  const discount = subtotal * ((item.discountPercent || 0) / 100);
  const afterDiscount = subtotal - discount;
  const tax = afterDiscount * ((item.taxRate || 0) / 100);
  return Math.round((afterDiscount + tax) * 100) / 100;
}

export function calculateQuotationTotals(
  items: QuotationItemInput[],
  orderDiscountPercent: number = 0
) {
  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  const lineDiscounts = items.reduce(
    (sum, item) =>
      sum + item.quantity * item.unitPrice * ((item.discountPercent || 0) / 100),
    0
  );

  const afterLineDiscounts = subtotal - lineDiscounts;
  const orderDiscount = afterLineDiscounts * (orderDiscountPercent / 100);
  const discountAmount = lineDiscounts + orderDiscount;

  const taxAmount = items.reduce((sum, item) => {
    const lineSubtotal =
      item.quantity * item.unitPrice * (1 - (item.discountPercent || 0) / 100);
    return sum + lineSubtotal * ((item.taxRate || 0) / 100);
  }, 0);

  const totalAmount = subtotal - discountAmount + taxAmount;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discountAmount: Math.round(discountAmount * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
  };
}
