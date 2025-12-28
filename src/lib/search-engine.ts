// lib/search-engine.ts
import { prisma } from "./prisma";

export interface SearchResult {
  type: "part" | "supplier" | "order" | "po" | "customer" | "product";
  id: string;
  title: string;
  subtitle: string;
  link: string;
  metadata?: Record<string, unknown>;
}

export async function globalSearch(
  query: string,
  limit: number = 20
): Promise<SearchResult[]> {
  if (!query || query.length < 2) return [];

  const results: SearchResult[] = [];

  // Search Parts
  const parts = await prisma.part.findMany({
    where: {
      OR: [
        { partNumber: { contains: query, mode: "insensitive" } },
        { name: { contains: query, mode: "insensitive" } },
        { category: { contains: query, mode: "insensitive" } },
      ],
    },
    take: 5,
  });

  parts.forEach((part) => {
    results.push({
      type: "part",
      id: part.id,
      title: `${part.partNumber} • ${part.name}`,
      subtitle: `Category: ${part.category}`,
      link: `/inventory/${part.id}`,
    });
  });

  // Search Suppliers
  const suppliers = await prisma.supplier.findMany({
    where: {
      OR: [
        { code: { contains: query, mode: "insensitive" } },
        { name: { contains: query, mode: "insensitive" } },
      ],
    },
    take: 5,
  });

  suppliers.forEach((supplier) => {
    results.push({
      type: "supplier",
      id: supplier.id,
      title: `${supplier.code} • ${supplier.name}`,
      subtitle: `${supplier.country}`,
      link: `/suppliers/${supplier.id}`,
    });
  });

  // Search Sales Orders
  const salesOrders = await prisma.salesOrder.findMany({
    where: {
      OR: [
        { orderNumber: { contains: query, mode: "insensitive" } },
        { customer: { name: { contains: query, mode: "insensitive" } } },
      ],
    },
    include: { customer: true },
    take: 5,
  });

  salesOrders.forEach((order) => {
    results.push({
      type: "order",
      id: order.id,
      title: order.orderNumber,
      subtitle: `Customer: ${order.customer.name} • ${order.status}`,
      link: `/orders/${order.id}`,
    });
  });

  // Search Purchase Orders
  const purchaseOrders = await prisma.purchaseOrder.findMany({
    where: {
      OR: [
        { poNumber: { contains: query, mode: "insensitive" } },
        { supplier: { name: { contains: query, mode: "insensitive" } } },
      ],
    },
    include: { supplier: true },
    take: 5,
  });

  purchaseOrders.forEach((po) => {
    results.push({
      type: "po",
      id: po.id,
      title: po.poNumber,
      subtitle: `Supplier: ${po.supplier.name} • ${po.status}`,
      link: `/purchasing/${po.id}`,
    });
  });

  // Search Customers
  const customers = await prisma.customer.findMany({
    where: {
      OR: [
        { code: { contains: query, mode: "insensitive" } },
        { name: { contains: query, mode: "insensitive" } },
      ],
    },
    take: 5,
  });

  customers.forEach((customer) => {
    results.push({
      type: "customer",
      id: customer.id,
      title: customer.name,
      subtitle: `${customer.type || "Customer"} • ${customer.country || ""}`,
      link: `/customers/${customer.id}`,
    });
  });

  // Search Products
  const products = await prisma.product.findMany({
    where: {
      OR: [
        { sku: { contains: query, mode: "insensitive" } },
        { name: { contains: query, mode: "insensitive" } },
      ],
    },
    take: 5,
  });

  products.forEach((product) => {
    results.push({
      type: "product",
      id: product.id,
      title: `${product.sku} • ${product.name}`,
      subtitle: `Product`,
      link: `/bom/${product.id}`,
    });
  });

  return results.slice(0, limit);
}

// Search within specific entity type
export async function searchParts(query: string, limit: number = 10) {
  return prisma.part.findMany({
    where: {
      OR: [
        { partNumber: { contains: query, mode: "insensitive" } },
        { name: { contains: query, mode: "insensitive" } },
        { category: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
      ],
    },
    take: limit,
    orderBy: { name: "asc" },
  });
}

export async function searchSuppliers(query: string, limit: number = 10) {
  return prisma.supplier.findMany({
    where: {
      OR: [
        { code: { contains: query, mode: "insensitive" } },
        { name: { contains: query, mode: "insensitive" } },
        { country: { contains: query, mode: "insensitive" } },
      ],
    },
    take: limit,
    orderBy: { name: "asc" },
  });
}

export async function searchOrders(query: string, limit: number = 10) {
  return prisma.salesOrder.findMany({
    where: {
      OR: [
        { orderNumber: { contains: query, mode: "insensitive" } },
        { customer: { name: { contains: query, mode: "insensitive" } } },
      ],
    },
    include: { customer: { select: { name: true } } },
    take: limit,
    orderBy: { createdAt: "desc" },
  });
}

export async function searchPurchaseOrders(query: string, limit: number = 10) {
  return prisma.purchaseOrder.findMany({
    where: {
      OR: [
        { poNumber: { contains: query, mode: "insensitive" } },
        { supplier: { name: { contains: query, mode: "insensitive" } } },
      ],
    },
    include: { supplier: { select: { name: true } } },
    take: limit,
    orderBy: { createdAt: "desc" },
  });
}
