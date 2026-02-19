/**
 * API: Entity Search
 * GET - Search entities by type for linking in messages
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/api/with-auth';
import { LinkedEntityType, ENTITY_CONFIG } from '@/types/discussions';
import { logger } from '@/lib/logger';

import { checkReadEndpointLimit } from '@/lib/rate-limit';
interface EntitySearchResult {
  id: string;
  type: LinkedEntityType;
  title: string;
  subtitle?: string;
  icon?: string;
  status?: string;
  url: string;
}

export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as LinkedEntityType;
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!type || !ENTITY_CONFIG[type]) {
      return NextResponse.json(
        { error: 'Invalid entity type' },
        { status: 400 }
      );
    }

    let results: EntitySearchResult[] = [];

    switch (type) {
      case 'PART':
        const parts = await prisma.part.findMany({
          where: {
            OR: [
              { partNumber: { contains: query, mode: 'insensitive' } },
              { name: { contains: query, mode: 'insensitive' } },
            ],
          },
          take: limit,
          orderBy: { updatedAt: 'desc' },
        });
        results = parts.map((p) => ({
          id: p.id,
          type: 'PART' as LinkedEntityType,
          title: `${p.partNumber} - ${p.name}`,
          subtitle: `${p.category} | Unit: ${p.unit}`,
          icon: 'Package',
          status: p.lifecycleStatus,
          url: `/parts/${p.id}`,
        }));
        break;

      case 'BOM':
        const boms = await prisma.bomHeader.findMany({
          where: {
            OR: [
              { version: { contains: query, mode: 'insensitive' } },
              { product: { name: { contains: query, mode: 'insensitive' } } },
              { product: { sku: { contains: query, mode: 'insensitive' } } },
            ],
          },
          include: { product: true },
          take: limit,
          orderBy: { createdAt: 'desc' },
        });
        results = boms.map((b) => ({
          id: b.id,
          type: 'BOM' as LinkedEntityType,
          title: `${b.product.sku} - ${b.product.name}`,
          subtitle: `Version ${b.version}`,
          icon: 'FileStack',
          status: b.status,
          url: `/bom/${b.id}`,
        }));
        break;

      case 'WORK_ORDER':
        const workOrders = await prisma.workOrder.findMany({
          where: {
            OR: [
              { woNumber: { contains: query, mode: 'insensitive' } },
              { product: { name: { contains: query, mode: 'insensitive' } } },
            ],
          },
          include: { product: true },
          take: limit,
          orderBy: { createdAt: 'desc' },
        });
        results = workOrders.map((wo) => ({
          id: wo.id,
          type: 'WORK_ORDER' as LinkedEntityType,
          title: `${wo.woNumber}`,
          subtitle: `${wo.product?.name || 'N/A'} | Qty: ${wo.quantity}`,
          icon: 'ClipboardList',
          status: wo.status,
          url: `/work-orders/${wo.id}`,
        }));
        break;

      case 'PURCHASE_ORDER':
        const purchaseOrders = await prisma.purchaseOrder.findMany({
          where: {
            OR: [
              { poNumber: { contains: query, mode: 'insensitive' } },
              { supplier: { name: { contains: query, mode: 'insensitive' } } },
            ],
          },
          include: { supplier: true },
          take: limit,
          orderBy: { createdAt: 'desc' },
        });
        results = purchaseOrders.map((po) => ({
          id: po.id,
          type: 'PURCHASE_ORDER' as LinkedEntityType,
          title: po.poNumber,
          subtitle: po.supplier?.name || 'N/A',
          icon: 'ShoppingCart',
          status: po.status,
          url: `/purchase-orders/${po.id}`,
        }));
        break;

      case 'SALES_ORDER':
        const salesOrders = await prisma.salesOrder.findMany({
          where: {
            OR: [
              { orderNumber: { contains: query, mode: 'insensitive' } },
              { customer: { name: { contains: query, mode: 'insensitive' } } },
            ],
          },
          include: { customer: true },
          take: limit,
          orderBy: { createdAt: 'desc' },
        });
        results = salesOrders.map((so) => ({
          id: so.id,
          type: 'SALES_ORDER' as LinkedEntityType,
          title: so.orderNumber,
          subtitle: so.customer?.name || 'N/A',
          icon: 'Receipt',
          status: so.status,
          url: `/sales-orders/${so.id}`,
        }));
        break;

      case 'SUPPLIER':
        const suppliers = await prisma.supplier.findMany({
          where: {
            OR: [
              { code: { contains: query, mode: 'insensitive' } },
              { name: { contains: query, mode: 'insensitive' } },
            ],
          },
          take: limit,
          orderBy: { name: 'asc' },
        });
        results = suppliers.map((s) => ({
          id: s.id,
          type: 'SUPPLIER' as LinkedEntityType,
          title: `${s.code} - ${s.name}`,
          subtitle: s.country || 'N/A',
          icon: 'Truck',
          status: s.status,
          url: `/suppliers/${s.id}`,
        }));
        break;

      case 'CUSTOMER':
        const customers = await prisma.customer.findMany({
          where: {
            OR: [
              { code: { contains: query, mode: 'insensitive' } },
              { name: { contains: query, mode: 'insensitive' } },
            ],
          },
          take: limit,
          orderBy: { name: 'asc' },
        });
        results = customers.map((c) => ({
          id: c.id,
          type: 'CUSTOMER' as LinkedEntityType,
          title: `${c.code} - ${c.name}`,
          subtitle: c.type || 'N/A',
          icon: 'Users',
          status: c.status,
          url: `/customers/${c.id}`,
        }));
        break;

      case 'INVENTORY':
        const inventory = await prisma.inventory.findMany({
          where: {
            OR: [
              { part: { partNumber: { contains: query, mode: 'insensitive' } } },
              { part: { name: { contains: query, mode: 'insensitive' } } },
              { lotNumber: { contains: query, mode: 'insensitive' } },
            ],
          },
          include: { part: true, warehouse: true },
          take: limit,
          orderBy: { updatedAt: 'desc' },
        });
        results = inventory.map((inv) => ({
          id: inv.id,
          type: 'INVENTORY' as LinkedEntityType,
          title: `${inv.part?.partNumber || 'N/A'} - ${inv.part?.name || 'N/A'}`,
          subtitle: `Qty: ${inv.quantity} | ${inv.warehouse?.name || 'N/A'}`,
          icon: 'Warehouse',
          status: inv.quantity > 0 ? 'In Stock' : 'Out of Stock',
          url: `/inventory/${inv.id}`,
        }));
        break;

      case 'QC_REPORT':
        // QC reports might not exist yet, return empty
        results = [];
        break;

      case 'MRP_RUN':
        // MRP runs might not exist yet, return empty
        results = [];
        break;
    }

    return NextResponse.json({ results });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/discussions/entities/search' });
    return NextResponse.json(
      { error: 'Failed to search entities' },
      { status: 500 }
    );
  }
});
