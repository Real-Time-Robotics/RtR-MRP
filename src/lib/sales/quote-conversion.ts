import { prisma } from '@/lib/prisma';
import { generateSONumber } from './so-number';

interface ConversionOptions {
  quotationId: string;
  userId: string;
  sourceType: 'quote_auto' | 'quote_manual';
  overrides?: {
    requiredDate?: string;
    promisedDate?: string;
    priority?: string;
    notes?: string;
  };
}

export interface ConversionResult {
  salesOrderId: string;
  orderNumber: string;
  quotationId: string;
  quoteNumber: string;
  linesConverted: number;
  totalAmount: number;
  unmappedParts: string[];
}

export async function convertQuotationToSO(
  options: ConversionOptions
): Promise<ConversionResult> {
  const { quotationId, userId, sourceType, overrides } = options;

  // 1. Load quotation with items
  const quotation = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: {
      items: {
        include: {
          part: { select: { id: true, partNumber: true, name: true } },
        },
      },
      customer: { select: { id: true, name: true } },
    },
  });

  if (!quotation) {
    throw new Error('Báo giá không tồn tại');
  }

  if (quotation.salesOrderId) {
    throw new Error('Báo giá đã được chuyển đổi thành đơn hàng');
  }

  if (quotation.status !== 'sent' && quotation.status !== 'accepted') {
    throw new Error(
      `Chỉ có thể chuyển đổi báo giá ở trạng thái "sent" hoặc "accepted". Trạng thái hiện tại: ${quotation.status}`
    );
  }

  if (quotation.items.length === 0) {
    throw new Error('Báo giá không có sản phẩm');
  }

  // 2. Map QuotationItem.partId → SalesOrderLine.productId
  // Strategy: Find Product with sku matching Part.partNumber
  const partNumbers = quotation.items.map((item) => item.part.partNumber);
  const products = await prisma.product.findMany({
    where: { sku: { in: partNumbers } },
    select: { id: true, sku: true },
  });

  const skuToProductId = new Map(products.map((p) => [p.sku, p.id]));
  const unmappedParts: string[] = [];

  const lineItems = quotation.items.map((item, index) => {
    const productId = skuToProductId.get(item.part.partNumber);
    if (!productId) {
      unmappedParts.push(
        `${item.part.partNumber} (${item.part.name})`
      );
    }

    // Calculate line total with discount
    const discountMultiplier = 1 - (item.discountPercent || 0) / 100;
    const lineTotal = item.quantity * item.unitPrice * discountMultiplier;

    return {
      lineNumber: index + 1,
      productId: productId || '', // Will fail validation if empty
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discountPercent || 0,
      lineTotal: Math.round(lineTotal * 100) / 100,
      status: 'pending',
    };
  });

  // 3. If any parts couldn't be mapped, throw with details
  if (unmappedParts.length > 0) {
    throw new Error(
      `Không tìm thấy Product tương ứng cho các Part: ${unmappedParts.join(', ')}. ` +
      `Cần tạo Product với SKU trùng partNumber trước khi chuyển đổi.`
    );
  }

  // 4. Generate SO number and create in transaction
  const orderNumber = await generateSONumber();
  const now = new Date();

  // Calculate total from lines
  const totalAmount = lineItems.reduce((sum, line) => sum + (line.lineTotal || 0), 0);

  const result = await prisma.$transaction(async (tx) => {
    // Create SalesOrder
    const salesOrder = await tx.salesOrder.create({
      data: {
        orderNumber,
        customerId: quotation.customerId,
        orderDate: now,
        requiredDate: overrides?.requiredDate
          ? new Date(overrides.requiredDate)
          : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // Default: +30 days
        promisedDate: overrides?.promisedDate
          ? new Date(overrides.promisedDate)
          : undefined,
        priority: overrides?.priority || 'normal',
        status: 'draft',
        sourceType,
        totalAmount: Math.round(totalAmount * 100) / 100,
        currency: quotation.currency,
        notes: overrides?.notes || quotation.notes || `Chuyển đổi từ báo giá ${quotation.quoteNumber}`,
        lines: {
          create: lineItems,
        },
      },
    });

    // Update quotation: link to SO + set status
    await tx.quotation.update({
      where: { id: quotationId },
      data: {
        salesOrderId: salesOrder.id,
        status: 'converted',
        acceptedAt: quotation.acceptedAt || now,
      },
    });

    return salesOrder;
  });

  return {
    salesOrderId: result.id,
    orderNumber: result.orderNumber,
    quotationId: quotation.id,
    quoteNumber: quotation.quoteNumber,
    linesConverted: lineItems.length,
    totalAmount: Math.round(totalAmount * 100) / 100,
    unmappedParts: [],
  };
}
