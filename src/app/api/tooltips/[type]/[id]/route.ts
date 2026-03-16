// =============================================================================
// CONTEXTUAL TOOLTIP API
// GET /api/tooltips/:type/:id
// Returns summary data for entity hover tooltips
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

type RouteParams = { params: Promise<{ type: string; id: string }> };

async function getPartTooltip(id: string) {
  const part = await prisma.part.findUnique({
    where: { id },
    select: {
      id: true,
      partNumber: true,
      name: true,
      category: true,
      unitCost: true,
      unit: true,
      safetyStock: true,
      reorderPoint: true,
      leadTimeDays: true,
      status: true,
      makeOrBuy: true,
    },
  });

  if (!part) return null;

  // Get current stock from inventory (sum across warehouses)
  const inventoryAgg = await prisma.inventory.aggregate({
    where: { partId: id },
    _sum: { quantity: true, reservedQty: true },
  });

  const quantityOnHand = inventoryAgg._sum.quantity ?? 0;
  const quantityAllocated = inventoryAgg._sum.reservedQty ?? 0;

  return {
    ...part,
    quantityOnHand,
    quantityAllocated,
    quantityAvailable: quantityOnHand - quantityAllocated,
  };
}

async function getSupplierTooltip(id: string) {
  const supplier = await prisma.supplier.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      name: true,
      country: true,
      rating: true,
      leadTimeDays: true,
      status: true,
      contactName: true,
      contactEmail: true,
      ndaaCompliant: true,
    },
  });

  if (!supplier) return null;

  // Count active POs
  const activePOCount = await prisma.purchaseOrder.count({
    where: { supplierId: id, status: { notIn: ['received', 'cancelled'] } },
  });

  return {
    ...supplier,
    activePOCount,
  };
}

async function getPOTooltip(id: string) {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      supplier: { select: { name: true, code: true } },
      _count: { select: { lines: true } },
    },
  });

  if (!po) return null;

  return {
    id: po.id,
    poNumber: po.poNumber,
    status: po.status,
    totalAmount: po.totalAmount,
    currency: po.currency,
    orderDate: po.orderDate,
    expectedDate: po.expectedDate,
    supplierName: po.supplier?.name,
    supplierCode: po.supplier?.code,
    lineCount: po._count.lines,
  };
}

async function getSOTooltip(id: string) {
  const so = await prisma.salesOrder.findUnique({
    where: { id },
    include: {
      customer: { select: { name: true, code: true } },
      _count: { select: { lines: true } },
    },
  });

  if (!so) return null;

  return {
    id: so.id,
    orderNumber: so.orderNumber,
    status: so.status,
    totalAmount: so.totalAmount,
    currency: so.currency,
    orderDate: so.orderDate,
    requiredDate: so.requiredDate,
    customerName: so.customer?.name,
    lineCount: so._count.lines,
  };
}

async function getWOTooltip(id: string) {
  const wo = await prisma.workOrder.findUnique({
    where: { id },
    include: {
      product: { select: { sku: true, name: true } },
    },
  });

  if (!wo) return null;

  const progress = wo.quantity > 0 ? Math.round((wo.completedQty / wo.quantity) * 100) : 0;

  return {
    id: wo.id,
    woNumber: wo.woNumber,
    status: wo.status,
    quantity: wo.quantity,
    completedQuantity: wo.completedQty,
    dueDate: wo.dueDate,
    priority: wo.priority,
    partNumber: wo.product?.sku,
    partName: wo.product?.name,
    progress,
  };
}

async function getWarehouseTooltip(id: string) {
  const warehouse = await prisma.warehouse.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      name: true,
      location: true,
      type: true,
      status: true,
    },
  });

  if (!warehouse) return null;

  const itemCount = await prisma.inventory.count({
    where: { warehouseId: id },
  });

  const stockAgg = await prisma.inventory.aggregate({
    where: { warehouseId: id },
    _sum: { quantity: true },
  });

  return {
    ...warehouse,
    itemCount,
    totalStock: stockAgg._sum.quantity ?? 0,
  };
}

async function getProductTooltip(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      sku: true,
      name: true,
      basePrice: true,
      status: true,
      assemblyHours: true,
    },
  });

  if (!product) return null;

  const activeWOCount = await prisma.workOrder.count({
    where: { productId: id, status: { notIn: ['completed', 'cancelled'] } },
  });

  return {
    ...product,
    activeWOCount,
  };
}

async function getCustomerTooltip(id: string) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      name: true,
      country: true,
      contactName: true,
      contactEmail: true,
      paymentTerms: true,
      creditLimit: true,
      status: true,
    },
  });

  if (!customer) return null;

  const activeSOCount = await prisma.salesOrder.count({
    where: { customerId: id, status: { notIn: ['completed', 'cancelled'] } },
  });

  return {
    ...customer,
    activeSOCount,
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Auth check — tooltips expose business data
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, id } = await params;

    let data = null;

    switch (type.toLowerCase()) {
      case 'part':
        data = await getPartTooltip(id);
        break;
      case 'supplier':
        data = await getSupplierTooltip(id);
        break;
      case 'po':
        data = await getPOTooltip(id);
        break;
      case 'so':
        data = await getSOTooltip(id);
        break;
      case 'wo':
        data = await getWOTooltip(id);
        break;
      case 'customer':
        data = await getCustomerTooltip(id);
        break;
      case 'warehouse':
        data = await getWarehouseTooltip(id);
        break;
      case 'product':
        data = await getProductTooltip(id);
        break;
      default:
        return NextResponse.json(
          { error: `Unknown entity type: ${type}` },
          { status: 400 }
        );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Entity not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'private, max-age=300', // 5 min cache
      },
    });
  } catch (error) {
    console.error('[Tooltip API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tooltip data' },
      { status: 500 }
    );
  }
}
